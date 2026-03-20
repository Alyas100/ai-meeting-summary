import { ThemedView } from '@/components/themed-view';
import { MeetingItem, useMeetingContext } from '@/context/meeting-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Audio } from 'expo-av';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function MeetingDetailScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { id } = useLocalSearchParams<{ id?: string }>();
    const { meetings, getSummaryForMeeting, getTranscriptForMeeting, getRecordingForMeeting } = useMeetingContext();
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    const meeting = meetings.find((item: MeetingItem) => item.id === id);
    const summaryBullets = getSummaryForMeeting(id);
    const transcript = getTranscriptForMeeting(id);
    const rawRecording = getRecordingForMeeting(id);

    const speakSummary = () => {
        if (isSpeaking) {
            if (Platform.OS === 'web') {
                (globalThis as any).speechSynthesis?.cancel?.();
            }
            setIsSpeaking(false);
            return;
        }

        if (Platform.OS !== 'web' || !(globalThis as any).speechSynthesis) {
            return;
        }

        const utterance = new (globalThis as any).SpeechSynthesisUtterance(summaryBullets.join('. '));
        utterance.lang = 'en-US';
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        setIsSpeaking(true);
        (globalThis as any).speechSynthesis.speak(utterance);
    };

    const playSavedAudio = async () => {
        if (!rawRecording?.uri) {
            return;
        }

        if (isPlayingAudio) {
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => { });
            setIsPlayingAudio(false);
            return;
        }

        try {
            setIsPlayingAudio(true);
            const soundResult = await Audio.Sound.createAsync({ uri: rawRecording.uri });
            await soundResult.sound.playAsync();
            soundResult.sound.setOnPlaybackStatusUpdate((status) => {
                if (!status.isLoaded || status.didJustFinish) {
                    setIsPlayingAudio(false);
                    void soundResult.sound.unloadAsync();
                }
            });
        } catch {
            setIsPlayingAudio(false);
        }
    };

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#f5f5f5',
        },
        header: {
            backgroundColor: '#fff',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottomColor: '#e5e5ea',
            borderBottomWidth: 1,
        },
        headerButton: {
            width: 32,
            height: 32,
            justifyContent: 'center',
            alignItems: 'center',
        },
        headerText: {
            fontSize: 16,
            fontWeight: '700',
            color: '#000',
        },
        contentContainer: {
            padding: 16,
            paddingBottom: 24,
        },
        card: {
            backgroundColor: '#fff',
            borderColor: '#000',
            borderWidth: 2,
            borderRadius: 12,
            padding: 16,
            marginBottom: 16,
        },
        title: {
            fontSize: 20,
            fontWeight: '800',
            color: '#000',
            marginBottom: 6,
        },
        subtext: {
            fontSize: 13,
            color: '#555',
            marginBottom: 4,
        },
        badge: {
            alignSelf: 'flex-start',
            marginTop: 6,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
        },
        badgeText: {
            color: '#fff',
            fontSize: 11,
            fontWeight: '700',
        },
        playButton: {
            alignSelf: 'flex-start',
            marginTop: 8,
            borderRadius: 10,
            paddingHorizontal: 12,
            paddingVertical: 8,
            backgroundColor: isSpeaking ? '#FF453A' : '#000',
        },
        playButtonText: {
            color: '#fff',
            fontWeight: '700',
            fontSize: 12,
        },
        summaryHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: 12,
        },
        summaryTitle: {
            fontSize: 18,
            fontWeight: '900',
            color: '#000',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        bulletItem: {
            flexDirection: 'row',
            gap: 8,
            marginBottom: 12,
        },
        bulletDot: {
            fontSize: 16,
            marginTop: 2,
            color: '#000',
        },
        bulletText: {
            flex: 1,
            fontSize: 16,
            fontWeight: '700',
            color: '#000',
            lineHeight: 24,
        },
        transcriptText: {
            fontSize: 14,
            color: '#333',
            lineHeight: 22,
        },
        emptyText: {
            color: isDark ? '#999' : '#666',
            textAlign: 'center',
            marginTop: 12,
        },
    });

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
                    <Text style={{ fontSize: 20 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>Meeting Detail</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {meeting ? (
                    <>
                        <View style={styles.card}>
                            <Text style={styles.title}>{meeting.title}</Text>
                            <Text style={styles.subtext}>{meeting.timeLabel}</Text>
                            <Text style={styles.subtext}>
                                {meeting.durationSeconds
                                    ? `${Math.max(1, Math.round(meeting.durationSeconds / 60))} min`
                                    : 'Duration unavailable'}
                            </Text>
                            <View style={[styles.badge, { backgroundColor: meeting.statusColor }]}>
                                <Text style={styles.badgeText}>{meeting.status}</Text>
                            </View>
                            <TouchableOpacity style={styles.playButton} onPress={speakSummary}>
                                <Text style={styles.playButtonText}>
                                    {isSpeaking
                                        ? 'Stop Voice'
                                        : Platform.OS === 'web'
                                            ? 'Play Voice Summary'
                                            : 'Voice on Web'}
                                </Text>
                            </TouchableOpacity>

                            {rawRecording?.uri && (
                                <TouchableOpacity
                                    style={[styles.playButton, { backgroundColor: isPlayingAudio ? '#FF453A' : '#0A84FF' }]}
                                    onPress={playSavedAudio}>
                                    <Text style={styles.playButtonText}>
                                        {isPlayingAudio ? 'Stop Saved Audio' : 'Play Saved Recording'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.card}>
                            <View style={styles.summaryHeader}>
                                <Text style={{ fontSize: 18 }}>💡</Text>
                                <Text style={styles.summaryTitle}>Summary</Text>
                            </View>

                            {summaryBullets.map((bullet: string, idx: number) => (
                                <View style={styles.bulletItem} key={`detail-bullet-${idx}`}>
                                    <Text style={styles.bulletDot}>•</Text>
                                    <Text style={styles.bulletText}>{bullet}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.card}>
                            <View style={styles.summaryHeader}>
                                <Text style={{ fontSize: 18 }}>📝</Text>
                                <Text style={styles.summaryTitle}>Transcript</Text>
                            </View>
                            <Text style={styles.transcriptText}>{transcript || 'No transcript captured.'}</Text>
                        </View>
                    </>
                ) : (
                    <Text style={styles.emptyText}>Meeting not found.</Text>
                )}
            </ScrollView>
        </ThemedView>
    );
}
