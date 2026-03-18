import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MeetingItem, useMeetingContext } from '../../context/meeting-context';

type StatusFilter = 'all' | 'ready' | 'processing';
type SortOrder = 'newest' | 'oldest';

function getMeetingCreatedAt(meeting: MeetingItem): number {
    if (typeof meeting.createdAt === 'number') {
        return meeting.createdAt;
    }
    if (meeting.id.startsWith('rec-')) {
        const parsed = Number(meeting.id.replace('rec-', ''));
        return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
}

export default function HomeScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { meetings, isRecording, startRecording, toggleFavorite } = useMeetingContext();

    const [query, setQuery] = useState('');
    const [meetingTitleInput, setMeetingTitleInput] = useState('Team Sync - Q3 Planning');
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: isDark ? '#000' : '#f8f8f8',
        },
        header: {
            backgroundColor: isDark ? '#1c1c1e' : '#fff',
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 8,
            borderBottomColor: isDark ? '#333' : '#e5e5ea',
            borderBottomWidth: 1,
        },
        headerContent: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        headerTitle: {
            fontSize: 24,
            fontWeight: '700',
            color: isDark ? '#fff' : '#000',
        },
        settingsButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: isDark ? '#333' : '#f0f0f0',
            justifyContent: 'center',
            alignItems: 'center',
        },
        contentContainer: {
            padding: 16,
            paddingBottom: 28,
        },
        fieldLabel: {
            color: isDark ? '#aaa' : '#666',
            fontSize: 12,
            fontWeight: '600',
            marginBottom: 6,
            marginTop: 2,
            textTransform: 'uppercase',
        },
        searchInput: {
            backgroundColor: isDark ? '#333' : '#fff',
            borderColor: isDark ? '#555' : '#e5e5ea',
            borderWidth: 1,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: isDark ? '#fff' : '#000',
            fontSize: 16,
            marginBottom: 12,
        },
        chipsRow: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
            marginBottom: 12,
        },
        chip: {
            borderRadius: 999,
            borderWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 7,
            backgroundColor: isDark ? '#1c1c1e' : '#fff',
            borderColor: isDark ? '#444' : '#d6d6db',
        },
        chipActive: {
            backgroundColor: '#0A84FF',
            borderColor: '#0A84FF',
        },
        chipText: {
            color: isDark ? '#fff' : '#333',
            fontSize: 12,
            fontWeight: '700',
            textTransform: 'uppercase',
        },
        chipTextActive: {
            color: '#fff',
        },
        primaryAction: {
            backgroundColor: '#ec5b13',
            borderRadius: 12,
            paddingVertical: 16,
            paddingHorizontal: 16,
            marginBottom: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
        },
        primaryActionDisabled: {
            opacity: 0.65,
        },
        primaryActionIcon: {
            color: '#fff',
            fontSize: 24,
            fontWeight: '700',
        },
        primaryActionText: {
            color: '#fff',
            fontSize: 20,
            fontWeight: '800',
        },
        sectionTitle: {
            fontSize: 18,
            fontWeight: '600',
            color: isDark ? '#fff' : '#000',
            marginBottom: 12,
            marginTop: 12,
        },
        quickStatsContainer: {
            flexDirection: 'row',
            gap: 12,
            marginBottom: 20,
        },
        statCard: {
            flex: 1,
            paddingHorizontal: 12,
            paddingVertical: 14,
            borderRadius: 12,
            borderWidth: 1,
        },
        statCardPrimary: {
            backgroundColor: '#0A84FF',
            borderColor: '#0A84FF',
        },
        statCardSecondary: {
            backgroundColor: isDark ? '#333' : '#f5f5f5',
            borderColor: isDark ? '#555' : '#e5e5ea',
        },
        statLabel: {
            fontSize: 12,
            fontWeight: '500',
            marginBottom: 4,
            color: isDark ? '#aaa' : '#666',
        },
        statValue: {
            fontSize: 24,
            fontWeight: '700',
            color: isDark ? '#fff' : '#000',
        },
        statLabelBottom: {
            fontSize: 10,
            fontWeight: '600',
            marginTop: 4,
            textTransform: 'uppercase',
            color: isDark ? '#888' : '#999',
        },
        meetingCard: {
            backgroundColor: isDark ? '#1c1c1e' : '#fff',
            borderColor: isDark ? '#333' : '#e5e5ea',
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        meetingIcon: {
            width: 44,
            height: 44,
            borderRadius: 10,
            backgroundColor: isDark ? '#333' : '#f0f0f0',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 20,
        },
        meetingContent: {
            flex: 1,
        },
        meetingHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 4,
            gap: 8,
        },
        meetingTitle: {
            flex: 1,
            fontSize: 14,
            fontWeight: '600',
            color: isDark ? '#fff' : '#000',
        },
        statusBadge: {
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 6,
        },
        statusText: {
            fontSize: 11,
            fontWeight: '600',
            color: '#fff',
        },
        meetingTime: {
            fontSize: 12,
            fontWeight: '400',
            color: isDark ? '#999' : '#666',
        },
        emptyStateText: {
            color: isDark ? '#999' : '#666',
            marginTop: 6,
        },
    });

    const meetingCountText = `${meetings.length}`;
    const hours = meetings.reduce((acc: number, item: MeetingItem) => acc + (item.durationSeconds ?? 0), 0) / 3600;

    const visibleMeetings = useMemo(() => {
        const normalized = query.trim().toLowerCase();

        let next = meetings.filter((meeting: MeetingItem) => {
            const statusAllowed =
                statusFilter === 'all' ||
                (statusFilter === 'ready' && meeting.status === 'Summary Ready') ||
                (statusFilter === 'processing' && meeting.status === 'Processing');

            if (!statusAllowed) {
                return false;
            }

            if (!normalized) {
                return true;
            }

            return (
                meeting.title.toLowerCase().includes(normalized) ||
                meeting.timeLabel.toLowerCase().includes(normalized) ||
                meeting.status.toLowerCase().includes(normalized)
            );
        });

        next = next.sort((a: MeetingItem, b: MeetingItem) => {
            const aTime = getMeetingCreatedAt(a);
            const bTime = getMeetingCreatedAt(b);
            return sortOrder === 'newest' ? bTime - aTime : aTime - bTime;
        });

        return next;
    }, [meetings, query, statusFilter, sortOrder]);

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>My Meetings</Text>
                    <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/(tabs)/settings')}>
                        <Text style={{ fontSize: 20 }}>⚙️</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                <Text style={styles.fieldLabel}>Meeting Title</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Enter title for next recording"
                    placeholderTextColor={isDark ? '#999' : '#666'}
                    value={meetingTitleInput}
                    onChangeText={setMeetingTitleInput}
                />

                <TouchableOpacity
                    style={[styles.primaryAction, isRecording && styles.primaryActionDisabled]}
                    onPress={() => {
                        if (!isRecording) {
                            startRecording(meetingTitleInput);
                            router.push('/(tabs)/recording');
                        }
                    }}
                    activeOpacity={0.9}>
                    <Text style={styles.primaryActionIcon}>●</Text>
                    <Text style={styles.primaryActionText}>
                        {isRecording ? 'Recording In Progress' : 'Start New Meeting'}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>Quick Insights</Text>
                <View style={styles.quickStatsContainer}>
                    <View style={[styles.statCard, styles.statCardPrimary]}>
                        <Text style={[styles.statLabel, { color: '#fff' }]}>Total</Text>
                        <Text style={[styles.statValue, { color: '#fff' }]}>{meetingCountText}</Text>
                        <Text style={[styles.statLabelBottom, { color: '#fff', opacity: 0.8 }]}>Meetings</Text>
                    </View>
                    <View style={[styles.statCard, styles.statCardSecondary]}>
                        <Text style={styles.statLabel}>Hours</Text>
                        <Text style={styles.statValue}>{hours.toFixed(1)}</Text>
                        <Text style={styles.statLabelBottom}>Recorded</Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Recent Meetings</Text>

                <Text style={styles.fieldLabel}>Search</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search meetings..."
                    placeholderTextColor={isDark ? '#999' : '#666'}
                    value={query}
                    onChangeText={setQuery}
                />

                <Text style={styles.fieldLabel}>Status Filter</Text>
                <View style={styles.chipsRow}>
                    {(['all', 'ready', 'processing'] as StatusFilter[]).map((value) => {
                        const active = statusFilter === value;
                        const label = value === 'all' ? 'All' : value === 'ready' ? 'Ready' : 'Processing';
                        return (
                            <TouchableOpacity
                                key={value}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => setStatusFilter(value)}>
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.fieldLabel}>Sort</Text>
                <View style={styles.chipsRow}>
                    {(['newest', 'oldest'] as SortOrder[]).map((value) => {
                        const active = sortOrder === value;
                        const label = value === 'newest' ? 'Newest' : 'Oldest';
                        return (
                            <TouchableOpacity
                                key={value}
                                style={[styles.chip, active && styles.chipActive]}
                                onPress={() => setSortOrder(value)}>
                                <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {visibleMeetings.map((meeting: MeetingItem) => (
                    <TouchableOpacity
                        key={meeting.id}
                        style={styles.meetingCard}
                        onPress={() =>
                            router.push({
                                pathname: '/meeting/[id]',
                                params: { id: meeting.id },
                            })
                        }>
                        <View style={styles.meetingIcon}>
                            <Text>{meeting.icon}</Text>
                        </View>
                        <View style={styles.meetingContent}>
                            <View style={styles.meetingHeader}>
                                <Text style={styles.meetingTitle}>{meeting.title}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: meeting.statusColor }]}>
                                    <Text style={styles.statusText}>{meeting.status}</Text>
                                </View>
                            </View>
                            <Text style={styles.meetingTime}>{meeting.timeLabel}</Text>
                        </View>
                        <TouchableOpacity onPress={() => toggleFavorite(meeting.id)}>
                            <Text style={{ fontSize: 18 }}>{meeting.isFavorite ? '★' : '☆'}</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                ))}

                {visibleMeetings.length === 0 && (
                    <Text style={styles.emptyStateText}>No meetings match your current search and filters.</Text>
                )}
            </ScrollView>
        </ThemedView>
    );
}
