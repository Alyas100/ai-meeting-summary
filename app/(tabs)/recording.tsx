import { ThemedView } from '@/components/themed-view';
import { useMeetingContext } from '@/context/meeting-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Audio } from 'expo-av';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    PermissionsAndroid,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type SpeechRecognitionLike = {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    start: () => void;
    stop: () => void;
};

type NativeVoiceLike = {
    onSpeechResults?: ((event: { value?: string[] }) => void) | null;
    onSpeechPartialResults?: ((event: { value?: string[] }) => void) | null;
    onSpeechError?: ((event: unknown) => void) | null;
    start: (locale: string) => Promise<void>;
    stop: () => Promise<void>;
    destroy?: () => Promise<void>;
    removeAllListeners?: () => void;
};

let NativeVoice: NativeVoiceLike | null = null;
try {
    // Optional runtime dependency so web still builds even before native package is installed.
    NativeVoice = require('@react-native-voice/voice').default as NativeVoiceLike;
} catch {
    NativeVoice = null;
}

function formatDuration(totalSeconds: number): string {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [hrs, mins, secs].map((n) => n.toString().padStart(2, '0')).join(':');
}

export default function RecordingScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const pulseAnim = useRef(new Animated.Value(0.8)).current;
    const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
    const audioRecordingRef = useRef<Audio.Recording | null>(null);
    const webAudioRecorderRef = useRef<any>(null);
    const webAudioStreamRef = useRef<any>(null);
    const webAudioChunksRef = useRef<any[]>([]);

    const {
        isRecording,
        activeMeetingTitle,
        recordingStartedAt,
        stopRecording,
        recordingPreferences,
        attachRecordingToMeeting,
        currentTranscript,
        appendToCurrentTranscript,
    } = useMeetingContext();

    const [now, setNow] = useState(Date.now());
    const [manualLine, setManualLine] = useState('');
    const [micListening, setMicListening] = useState(false);
    const [micErrorText, setMicErrorText] = useState('');

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.5, duration: 800, useNativeDriver: false }),
                Animated.timing(pulseAnim, { toValue: 0.8, duration: 800, useNativeDriver: false }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [pulseAnim]);

    useEffect(() => {
        const intervalId = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(intervalId);
    }, []);

    useEffect(() => {
        if (!isRecording) {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            setMicListening(false);
        }
    }, [isRecording]);

    useEffect(() => {
        if (!isRecording || !recordingPreferences.saveRawAudio || Platform.OS === 'web') {
            return;
        }

        const startDeviceAudio = async () => {
            try {
                const permission = await Audio.requestPermissionsAsync();
                if (!permission.granted) {
                    setMicErrorText('Microphone permission is required to save raw recording.');
                    return;
                }

                await Audio.setAudioModeAsync({
                    allowsRecordingIOS: true,
                    playsInSilentModeIOS: true,
                });

                const recording = new Audio.Recording();
                await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
                await recording.startAsync();
                audioRecordingRef.current = recording;
            } catch {
                setMicErrorText('Unable to start local raw audio recording.');
            }
        };

        startDeviceAudio().catch(() => {
            setMicErrorText('Unable to start local raw audio recording.');
        });
    }, [isRecording, recordingPreferences.saveRawAudio]);

    const stopDeviceAudioRecording = async () => {
        if (!audioRecordingRef.current) {
            return undefined;
        }

        try {
            await audioRecordingRef.current.stopAndUnloadAsync();
            const uri = audioRecordingRef.current.getURI() ?? undefined;
            audioRecordingRef.current = null;
            return uri;
        } catch {
            audioRecordingRef.current = null;
            return undefined;
        }
    };

    const startWebAudioRecording = async () => {
        if (!isRecording || !recordingPreferences.saveRawAudio || Platform.OS !== 'web') {
            return;
        }

        const g = globalThis as any;
        if (!g.navigator?.mediaDevices?.getUserMedia || !g.MediaRecorder) {
            setMicErrorText('Browser audio capture is not available.');
            return;
        }

        if (webAudioRecorderRef.current) {
            return;
        }

        try {
            const stream = await g.navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new g.MediaRecorder(stream);
            webAudioChunksRef.current = [];

            recorder.ondataavailable = (event: any) => {
                if (event?.data && event.data.size > 0) {
                    webAudioChunksRef.current.push(event.data);
                }
            };

            recorder.start();
            webAudioStreamRef.current = stream;
            webAudioRecorderRef.current = recorder;
        } catch {
            setMicErrorText('Unable to capture browser microphone audio for saving.');
        }
    };

    const stopWebAudioRecording = async (): Promise<string | undefined> => {
        if (Platform.OS !== 'web' || !webAudioRecorderRef.current) {
            return undefined;
        }

        const g = globalThis as any;
        const recorder = webAudioRecorderRef.current;
        const stream = webAudioStreamRef.current;

        return await new Promise((resolve) => {
            recorder.onstop = () => {
                try {
                    const blob = new g.Blob(webAudioChunksRef.current, { type: 'audio/webm' });
                    const uri = g.URL?.createObjectURL ? g.URL.createObjectURL(blob) : undefined;
                    resolve(uri);
                } catch {
                    resolve(undefined);
                }
            };

            try {
                recorder.stop();
            } catch {
                resolve(undefined);
            }

            if (stream?.getTracks) {
                stream.getTracks().forEach((track: any) => track.stop());
            }

            webAudioRecorderRef.current = null;
            webAudioStreamRef.current = null;
            webAudioChunksRef.current = [];
        });
    };

    useEffect(() => {
        if (!isRecording || !recordingPreferences.saveRawAudio || Platform.OS !== 'web') {
            return;
        }

        void startWebAudioRecording();
    }, [isRecording, recordingPreferences.saveRawAudio]);

    useEffect(() => {
        if (!NativeVoice || Platform.OS === 'web') {
            return;
        }

        NativeVoice.onSpeechResults = (event: { value?: string[] }) => {
            const joined = (event.value ?? []).join(' ').trim();
            if (joined) {
                appendToCurrentTranscript(joined);
            }
        };

        NativeVoice.onSpeechPartialResults = (event: { value?: string[] }) => {
            const joined = (event.value ?? []).join(' ').trim();
            if (joined) {
                appendToCurrentTranscript(joined);
            }
        };

        NativeVoice.onSpeechError = () => {
            setMicListening(false);
            setMicErrorText('Speech recognition error. Try starting mic again.');
        };

        return () => {
            if (!NativeVoice) {
                return;
            }

            NativeVoice.destroy?.().catch(() => { });
            NativeVoice.removeAllListeners?.();
        };
    }, [appendToCurrentTranscript]);

    const elapsedSeconds = useMemo(() => {
        if (!isRecording || !recordingStartedAt) {
            return 0;
        }
        return Math.max(0, Math.floor((now - recordingStartedAt) / 1000));
    }, [isRecording, recordingStartedAt, now]);

    const canUseWebSpeech = useMemo(() => {
        if (Platform.OS !== 'web') {
            return false;
        }

        const w = globalThis as any;
        return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
    }, []);

    const startWebMic = () => {
        if (!canUseWebSpeech || micListening) {
            return;
        }

        const w = globalThis as any;
        const SpeechRecognitionCtor = w.SpeechRecognition || w.webkitSpeechRecognition;
        if (!SpeechRecognitionCtor) {
            return;
        }

        const recognition: SpeechRecognitionLike = new SpeechRecognitionCtor();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
            let merged = '';
            for (let i = event.resultIndex; i < event.results.length; i += 1) {
                merged += `${event.results[i][0].transcript} `;
            }
            if (merged.trim()) {
                appendToCurrentTranscript(merged);
            }
        };

        recognition.onerror = () => {
            setMicListening(false);
        };

        recognition.start();
        recognitionRef.current = recognition;
        setMicListening(true);
    };

    const stopWebMic = () => {
        if (!recognitionRef.current) {
            return;
        }
        recognitionRef.current.stop();
        recognitionRef.current = null;
        setMicListening(false);
    };

    const canUseNativeSpeech = useMemo(() => {
        return Platform.OS !== 'web' && Boolean(NativeVoice);
    }, []);

    const requestAndroidMicPermission = async (): Promise<boolean> => {
        if (Platform.OS !== 'android') {
            return true;
        }

        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
                title: 'Microphone Permission',
                message: 'The app needs microphone access for live meeting transcription.',
                buttonPositive: 'Allow',
            }
        );

        return granted === PermissionsAndroid.RESULTS.GRANTED;
    };

    const startNativeMic = async () => {
        if (!canUseNativeSpeech || !NativeVoice || micListening) {
            return;
        }

        const hasPermission = await requestAndroidMicPermission();
        if (!hasPermission) {
            setMicErrorText('Microphone permission denied. Enable it in system settings.');
            return;
        }

        try {
            setMicErrorText('');
            await NativeVoice.start('en-US');
            setMicListening(true);
        } catch {
            setMicListening(false);
            setMicErrorText('Unable to start native microphone recognition.');
        }
    };

    const stopNativeMic = async () => {
        if (!canUseNativeSpeech || !NativeVoice) {
            return;
        }

        try {
            await NativeVoice.stop();
        } catch {
            // no-op
        }
        setMicListening(false);
    };

    useEffect(() => {
        if (!isRecording) {
            return;
        }

        if (canUseWebSpeech && !micListening) {
            startWebMic();
            return;
        }

        if (canUseNativeSpeech && !micListening) {
            void startNativeMic();
        }
    }, [isRecording, canUseWebSpeech, canUseNativeSpeech, micListening]);

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: isDark ? '#000000' : '#f5f5f5',
        },
        header: {
            backgroundColor: isDark ? '#000' : '#fff',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottomColor: isDark ? '#333' : '#e5e5ea',
            borderBottomWidth: 1,
        },
        headerTitle: {
            fontSize: 14,
            fontWeight: '600',
            color: isDark ? '#fff' : '#000',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        minimizeButton: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
        },
        minimizeText: {
            color: '#0A84FF',
            fontSize: 14,
            fontWeight: '500',
        },
        contentContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 16,
        },
        timerSection: {
            alignItems: 'center',
            marginBottom: 20,
        },
        pulseRing: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#FF453A',
            marginBottom: 16,
            justifyContent: 'center',
            alignItems: 'center',
        },
        timer: {
            fontSize: 56,
            fontWeight: '300',
            color: isDark ? '#fff' : '#000',
            fontFamily: 'Courier New',
            letterSpacing: 2,
        },
        meetingTitle: {
            fontSize: 14,
            color: isDark ? '#aaa' : '#666',
            marginTop: 8,
            fontWeight: '500',
        },
        waveformContainer: {
            height: 120,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            marginVertical: 16,
        },
        waveformBar: {
            width: 4,
            backgroundColor: '#0A84FF',
            borderRadius: 2,
        },
        stopButton: {
            backgroundColor: '#FF453A',
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 12,
            marginBottom: 10,
        },
        stopButtonText: {
            color: '#fff',
            fontWeight: '700',
            fontSize: 16,
        },
        helperText: {
            color: isDark ? '#aaa' : '#666',
            fontSize: 12,
            marginBottom: 8,
        },
        supportText: {
            color: isDark ? '#aaa' : '#666',
            fontSize: 12,
            marginBottom: 10,
        },
        transcriptionContainer: {
            flex: 1,
            backgroundColor: isDark ? '#1c1c1e' : '#fff',
            borderRadius: 24,
            padding: 16,
            marginTop: 16,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
        },
        transcriptionTitle: {
            fontSize: 11,
            fontWeight: '700',
            color: isDark ? '#888' : '#999',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginBottom: 10,
        },
        webMicButtons: {
            flexDirection: 'row',
            gap: 8,
            marginBottom: 10,
        },
        micButton: {
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: '#0A84FF',
        },
        micButtonStop: {
            backgroundColor: '#FF453A',
        },
        micButtonText: {
            color: '#fff',
            fontSize: 12,
            fontWeight: '700',
        },
        manualInput: {
            backgroundColor: isDark ? '#2b2b2f' : '#f6f6f8',
            borderColor: isDark ? '#444' : '#d6d6db',
            borderWidth: 1,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 8,
            color: isDark ? '#fff' : '#000',
            marginBottom: 8,
        },
        addLineButton: {
            alignSelf: 'flex-end',
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: '#ec5b13',
            marginBottom: 12,
        },
        addLineButtonText: {
            color: '#fff',
            fontSize: 12,
            fontWeight: '700',
        },
        transcriptText: {
            fontSize: 14,
            color: isDark ? '#fff' : '#000',
            lineHeight: 20,
        },
        emptyState: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 24,
        },
        emptyTitle: {
            fontSize: 22,
            fontWeight: '700',
            color: isDark ? '#fff' : '#000',
            marginBottom: 8,
        },
        emptySubtitle: {
            color: isDark ? '#aaa' : '#666',
            textAlign: 'center',
            marginBottom: 16,
        },
        startButton: {
            backgroundColor: '#ec5b13',
            borderRadius: 12,
            paddingHorizontal: 20,
            paddingVertical: 12,
        },
        startButtonText: {
            color: '#fff',
            fontWeight: '700',
            fontSize: 16,
        },
    });

    const waveHeights = [32, 48, 80, 56, 96, 64, 112, 48, 80, 32];

    if (!isRecording) {
        return (
            <ThemedView style={styles.container}>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyTitle}>No Active Recording</Text>
                    <Text style={styles.emptySubtitle}>Start a new meeting from Home to begin live transcription.</Text>
                    <TouchableOpacity style={styles.startButton} onPress={() => router.push('/(tabs)/index')}>
                        <Text style={styles.startButtonText}>Go To Home</Text>
                    </TouchableOpacity>
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.minimizeButton} onPress={() => router.push('/(tabs)/index')}>
                    <Text style={[styles.headerTitle, { fontSize: 16 }]}>↓</Text>
                    <Text style={styles.minimizeText}>Minimize</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Active Recording</Text>
                <View style={{ width: 80 }} />
            </View>

            <View style={styles.contentContainer}>
                <View style={styles.timerSection}>
                    <Animated.View
                        style={[
                            styles.pulseRing,
                            {
                                transform: [{ scale: pulseAnim }],
                                opacity: pulseAnim.interpolate({
                                    inputRange: [0.8, 1.5],
                                    outputRange: [1, 0.4],
                                }),
                            },
                        ]}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF453A' }} />
                    </Animated.View>
                    <Text style={styles.timer}>{formatDuration(elapsedSeconds)}</Text>
                    <Text style={styles.meetingTitle}>{activeMeetingTitle}</Text>
                </View>

                <View style={styles.waveformContainer}>
                    {waveHeights.map((height, index) => (
                        <View key={index} style={[styles.waveformBar, { height }]} />
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.stopButton}
                    onPress={async () => {
                        stopWebMic();
                        void stopNativeMic();
                        const rawDeviceUri = await stopDeviceAudioRecording();
                        const rawWebUri = await stopWebAudioRecording();
                        const rawAudioUri = rawDeviceUri ?? rawWebUri;
                        const meetingId = stopRecording();
                        if (meetingId && rawAudioUri && recordingPreferences.saveRawAudio) {
                            await attachRecordingToMeeting(meetingId, rawAudioUri);
                        }
                        if (meetingId) {
                            router.push({
                                pathname: '/meeting/[id]',
                                params: { id: meetingId },
                            });
                            return;
                        }
                        router.push('/(tabs)/summary');
                    }}>
                    <Text style={styles.stopButtonText}>Stop Recording</Text>
                </TouchableOpacity>
                <Text style={styles.helperText}>Stopping generates a summary from your transcript.</Text>
            </View>

            <ScrollView style={styles.transcriptionContainer} showsVerticalScrollIndicator={false}>
                <Text style={styles.transcriptionTitle}>Live Transcription</Text>

                <Text style={styles.supportText}>
                    {canUseWebSpeech
                        ? micListening
                            ? 'Microphone is listening. Speak now.'
                            : 'Microphone is ready. If blocked, allow browser mic permission.'
                        : canUseNativeSpeech
                            ? micListening
                                ? 'Device microphone is listening. Speak now.'
                                : 'Tap Start Mic to begin native device transcription.'
                            : 'Native speech package is not available yet. Run install and rebuild the app.'}
                </Text>

                {recordingPreferences.saveRawAudio && Platform.OS !== 'web' && (
                    <Text style={styles.supportText}>
                        Raw audio saving is ON. File will stay local and follow your retention setting.
                    </Text>
                )}

                {recordingPreferences.saveRawAudio && Platform.OS === 'web' && (
                    <Text style={styles.supportText}>
                        Raw audio saving is ON for web session. Playback is available after stopping recording.
                    </Text>
                )}

                {!!micErrorText && <Text style={[styles.supportText, { color: '#FF453A' }]}>{micErrorText}</Text>}

                {(canUseWebSpeech || canUseNativeSpeech) && (
                    <View style={styles.webMicButtons}>
                        <TouchableOpacity
                            style={styles.micButton}
                            onPress={() => {
                                if (canUseWebSpeech) {
                                    startWebMic();
                                    return;
                                }
                                void startNativeMic();
                            }}
                            disabled={micListening}>
                            <Text style={styles.micButtonText}>{micListening ? 'Listening...' : 'Start Mic'}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.micButton, styles.micButtonStop]}
                            onPress={() => {
                                stopWebMic();
                                void stopNativeMic();
                            }}>
                            <Text style={styles.micButtonText}>Stop Mic</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TextInput
                    style={styles.manualInput}
                    placeholder="Manual transcript input (fallback)"
                    placeholderTextColor={isDark ? '#999' : '#666'}
                    value={manualLine}
                    onChangeText={setManualLine}
                />
                <TouchableOpacity
                    style={styles.addLineButton}
                    onPress={() => {
                        appendToCurrentTranscript(manualLine);
                        setManualLine('');
                    }}>
                    <Text style={styles.addLineButtonText}>Add Line</Text>
                </TouchableOpacity>

                <Text style={styles.transcriptText}>
                    {currentTranscript.trim() || 'Your live transcript will appear here while speaking/typing.'}
                </Text>
            </ScrollView>
        </ThemedView>
    );
}
