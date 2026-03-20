import { ThemedView } from '@/components/themed-view';
import { useMeetingContext } from '@/context/meeting-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function SummaryScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { latestSummaryBullets } = useMeetingContext();
    const [isSpeaking, setIsSpeaking] = useState(false);

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

        const utterance = new (globalThis as any).SpeechSynthesisUtterance(latestSummaryBullets.join('. '));
        utterance.lang = 'en-US';
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        setIsSpeaking(true);
        (globalThis as any).speechSynthesis.speak(utterance);
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
        playbackCard: {
            backgroundColor: '#fff',
            borderColor: '#000',
            borderWidth: 2,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: 12,
        },
        playButton: {
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: isSpeaking ? '#FF453A' : '#000',
            justifyContent: 'center',
            alignItems: 'center',
            flexShrink: 0,
        },
        playButtonText: {
            color: '#fff',
            fontSize: 20,
        },
        playbackText: {
            flex: 1,
        },
        playbackTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: '#000',
        },
        playbackSubtitle: {
            fontSize: 14,
            fontWeight: '500',
            color: '#666',
            marginTop: 2,
        },
        summaryContainer: {
            backgroundColor: '#fff',
            borderColor: '#000',
            borderWidth: 2,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
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
            marginBottom: 14,
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
        infoText: {
            fontSize: 12,
            color: '#666',
            marginTop: 8,
        },
    });

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton} onPress={() => router.push('/(tabs)/index')}>
                    <Text style={{ fontSize: 20 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerText}>Meeting Summary</Text>
                <View style={{ width: 32 }} />
            </View>

            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.playbackCard}>
                    <TouchableOpacity style={styles.playButton} onPress={speakSummary}>
                        <Text style={styles.playButtonText}>{isSpeaking ? '■' : '▶'}</Text>
                    </TouchableOpacity>
                    <View style={styles.playbackText}>
                        <Text style={styles.playbackTitle}>Listen to Summary</Text>
                        <Text style={styles.playbackSubtitle}>
                            {isSpeaking
                                ? 'Speaking summary...'
                                : Platform.OS === 'web'
                                    ? 'Tap play to hear your AI summary'
                                    : 'Voice playback available on web build'}
                        </Text>
                    </View>
                </View>

                <View style={styles.summaryContainer}>
                    <View style={styles.summaryHeader}>
                        <Text style={{ fontSize: 18 }}>💡</Text>
                        <Text style={styles.summaryTitle}>Summary</Text>
                    </View>

                    {latestSummaryBullets.map((bullet: string, idx: number) => (
                        <View style={styles.bulletItem} key={`bullet-${idx}`}>
                            <Text style={styles.bulletDot}>•</Text>
                            <Text style={styles.bulletText}>{bullet}</Text>
                        </View>
                    ))}

                    <Text style={styles.infoText}>Generated from the recording transcript after you stop recording.</Text>
                </View>
            </ScrollView>
        </ThemedView>
    );
}
