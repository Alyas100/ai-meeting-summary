import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

export type MeetingStatus = 'Summary Ready' | 'Processing';
export type RetentionDays = 7 | 30 | 90;

export type MeetingItem = {
    id: string;
    title: string;
    timeLabel: string;
    status: MeetingStatus;
    statusColor: string;
    icon: string;
    isFavorite?: boolean;
    durationSeconds?: number;
    createdAt?: number;
};

export type RecordingPreferences = {
    saveRawAudio: boolean;
    retentionDays: RetentionDays;
};

export type RecordingAsset = {
    uri: string;
    createdAt: number;
    expiresAt: number;
};

type MeetingSummariesMap = Record<string, string[]>;
type MeetingTranscriptsMap = Record<string, string>;
type MeetingRecordingsMap = Record<string, RecordingAsset>;

type MeetingContextValue = {
    meetings: MeetingItem[];
    meetingSummariesById: MeetingSummariesMap;
    meetingTranscriptsById: MeetingTranscriptsMap;
    meetingRecordingsById: MeetingRecordingsMap;
    recordingPreferences: RecordingPreferences;
    isRecording: boolean;
    activeMeetingTitle: string;
    recordingStartedAt: number | null;
    currentTranscript: string;
    latestSummaryBullets: string[];
    startRecording: (title?: string) => void;
    stopRecording: () => string | undefined;
    setCurrentTranscript: (text: string) => void;
    appendToCurrentTranscript: (segment: string) => void;
    toggleFavorite: (meetingId: string) => void;
    getSummaryForMeeting: (meetingId?: string) => string[];
    getTranscriptForMeeting: (meetingId?: string) => string;
    getRecordingForMeeting: (meetingId?: string) => RecordingAsset | undefined;
    attachRecordingToMeeting: (meetingId: string, tempUri: string) => Promise<string | undefined>;
    setSaveRawAudioPreference: (value: boolean) => void;
    setRetentionDaysPreference: (days: RetentionDays) => void;
};

const DEFAULT_MEETINGS: MeetingItem[] = [
    {
        id: 'seed-1',
        title: 'Project Sync: Q4 Goals',
        timeLabel: 'Today, 10:30 AM',
        status: 'Summary Ready',
        statusColor: '#34C759',
        icon: '🎙️',
        isFavorite: true,
        durationSeconds: 2700,
        createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    },
    {
        id: 'seed-2',
        title: 'Product Design Review',
        timeLabel: 'Yesterday, 2:15 PM',
        status: 'Processing',
        statusColor: '#FF9500',
        icon: '📄',
        isFavorite: true,
        durationSeconds: 1800,
        createdAt: Date.now() - 24 * 60 * 60 * 1000,
    },
    {
        id: 'seed-3',
        title: 'Team Standup',
        timeLabel: '2 days ago, 9:00 AM',
        status: 'Summary Ready',
        statusColor: '#34C759',
        icon: '👥',
        isFavorite: false,
        durationSeconds: 900,
        createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    },
];

const DEFAULT_BULLETS = [
    'The meeting started with project updates and priorities for the current sprint.',
    'The team aligned on blockers and confirmed owners for each open action item.',
    'Follow-up decisions will be finalized in the next review session.',
    'All participants agreed on timeline expectations for this week.',
];

const DEFAULT_TRANSCRIPT =
    'Project updates were shared. The team discussed priorities, blockers, and ownership for action items.';

const DEFAULT_RECORDING_PREFERENCES: RecordingPreferences = {
    saveRawAudio: false,
    retentionDays: 30,
};

const RECORDINGS_DIR = `${FileSystem.documentDirectory}meeting-recordings/`;

function makeFallbackSummary(title: string, durationSeconds: number): string[] {
    const mins = Math.max(1, Math.round(durationSeconds / 60));
    return [
        `Meeting "${title}" was recorded for about ${mins} minute${mins > 1 ? 's' : ''}.`,
        'Main discussion focused on priorities and delivery sequencing for upcoming work.',
        'The group identified risks and assigned clear owners for next steps.',
        'Action item: review progress in the next sync and close unresolved blockers.',
    ];
}

function summarizeTranscript(title: string, transcript: string, durationSeconds: number): string[] {
    const clean = transcript.replace(/\s+/g, ' ').trim();
    if (!clean) {
        return makeFallbackSummary(title, durationSeconds);
    }

    const sentences = clean
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

    const bullets: string[] = [];
    bullets.push(`Summary for "${title}":`);

    if (sentences.length > 0) {
        bullets.push(sentences[0]);
    }

    if (sentences.length > 1) {
        bullets.push(sentences[1]);
    }

    if (sentences.length > 2) {
        bullets.push(`Additional point: ${sentences[2]}`);
    }

    const mins = Math.max(1, Math.round(durationSeconds / 60));
    bullets.push(`Recording duration: about ${mins} minute${mins > 1 ? 's' : ''}.`);

    return bullets.slice(0, 4);
}

const DEFAULT_SUMMARY_BY_ID: MeetingSummariesMap = Object.fromEntries(
    DEFAULT_MEETINGS.map((meeting) => [meeting.id, makeFallbackSummary(meeting.title, meeting.durationSeconds ?? 600)])
);

const DEFAULT_TRANSCRIPT_BY_ID: MeetingTranscriptsMap = Object.fromEntries(
    DEFAULT_MEETINGS.map((meeting) => [meeting.id, DEFAULT_TRANSCRIPT])
);

const MEETINGS_STORAGE_KEY = 'ai-meeting-summary/meetings';
const SUMMARY_STORAGE_KEY = 'ai-meeting-summary/latest-summary';
const SUMMARY_BY_ID_STORAGE_KEY = 'ai-meeting-summary/summaries-by-id';
const TRANSCRIPT_BY_ID_STORAGE_KEY = 'ai-meeting-summary/transcripts-by-id';
const RECORDING_PREF_STORAGE_KEY = 'ai-meeting-summary/recording-preferences';
const RECORDINGS_BY_ID_STORAGE_KEY = 'ai-meeting-summary/recordings-by-id';

const MeetingContext = createContext<MeetingContextValue | undefined>(undefined);

function formatNowLabel(date: Date): string {
    const hours = date.getHours();
    const mins = date.getMinutes();
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 || 12;
    const paddedMins = mins.toString().padStart(2, '0');
    return `Today, ${h12}:${paddedMins} ${period}`;
}

export function MeetingProvider({ children }: PropsWithChildren) {
    const [meetings, setMeetings] = useState<MeetingItem[]>(DEFAULT_MEETINGS);
    const [meetingSummariesById, setMeetingSummariesById] = useState<MeetingSummariesMap>(DEFAULT_SUMMARY_BY_ID);
    const [meetingTranscriptsById, setMeetingTranscriptsById] = useState<MeetingTranscriptsMap>(DEFAULT_TRANSCRIPT_BY_ID);
    const [meetingRecordingsById, setMeetingRecordingsById] = useState<MeetingRecordingsMap>({});
    const [recordingPreferences, setRecordingPreferences] = useState<RecordingPreferences>(DEFAULT_RECORDING_PREFERENCES);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingStartedAt, setRecordingStartedAt] = useState<number | null>(null);
    const [activeMeetingTitle, setActiveMeetingTitle] = useState('Team Sync - Q3 Planning');
    const [currentTranscript, setCurrentTranscript] = useState('');
    const [latestSummaryBullets, setLatestSummaryBullets] = useState<string[]>(DEFAULT_BULLETS);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        let isMounted = true;

        const hydrate = async () => {
            try {
                const [
                    storedMeetings,
                    storedBullets,
                    storedSummaryMap,
                    storedTranscriptMap,
                    storedPref,
                    storedRecordingMap,
                ] = await Promise.all([
                    AsyncStorage.getItem(MEETINGS_STORAGE_KEY),
                    AsyncStorage.getItem(SUMMARY_STORAGE_KEY),
                    AsyncStorage.getItem(SUMMARY_BY_ID_STORAGE_KEY),
                    AsyncStorage.getItem(TRANSCRIPT_BY_ID_STORAGE_KEY),
                    AsyncStorage.getItem(RECORDING_PREF_STORAGE_KEY),
                    AsyncStorage.getItem(RECORDINGS_BY_ID_STORAGE_KEY),
                ]);

                if (storedMeetings && isMounted) {
                    const parsedMeetings = JSON.parse(storedMeetings) as MeetingItem[];
                    if (Array.isArray(parsedMeetings) && parsedMeetings.length > 0) {
                        setMeetings(parsedMeetings);
                    }
                }

                if (storedBullets && isMounted) {
                    const parsedBullets = JSON.parse(storedBullets) as string[];
                    if (Array.isArray(parsedBullets) && parsedBullets.length > 0) {
                        setLatestSummaryBullets(parsedBullets);
                    }
                }

                if (storedSummaryMap && isMounted) {
                    const parsedSummaryMap = JSON.parse(storedSummaryMap) as MeetingSummariesMap;
                    if (parsedSummaryMap && typeof parsedSummaryMap === 'object') {
                        setMeetingSummariesById(parsedSummaryMap);
                    }
                }

                if (storedTranscriptMap && isMounted) {
                    const parsedTranscriptMap = JSON.parse(storedTranscriptMap) as MeetingTranscriptsMap;
                    if (parsedTranscriptMap && typeof parsedTranscriptMap === 'object') {
                        setMeetingTranscriptsById(parsedTranscriptMap);
                    }
                }

                if (storedPref && isMounted) {
                    const parsedPref = JSON.parse(storedPref) as RecordingPreferences;
                    if (parsedPref && typeof parsedPref === 'object') {
                        setRecordingPreferences({
                            saveRawAudio: Boolean(parsedPref.saveRawAudio),
                            retentionDays: ([7, 30, 90] as number[]).includes(Number(parsedPref.retentionDays))
                                ? (Number(parsedPref.retentionDays) as RetentionDays)
                                : 30,
                        });
                    }
                }

                if (storedRecordingMap && isMounted) {
                    const parsedRecordingMap = JSON.parse(storedRecordingMap) as MeetingRecordingsMap;
                    if (parsedRecordingMap && typeof parsedRecordingMap === 'object') {
                        setMeetingRecordingsById(parsedRecordingMap);
                    }
                }
            } catch {
                // Fall back to defaults when storage is unavailable.
            } finally {
                if (isMounted) {
                    setHydrated(true);
                }
            }
        };

        hydrate();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        AsyncStorage.setItem(MEETINGS_STORAGE_KEY, JSON.stringify(meetings)).catch(() => { });
    }, [meetings, hydrated]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        AsyncStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(latestSummaryBullets)).catch(() => { });
    }, [latestSummaryBullets, hydrated]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        AsyncStorage.setItem(SUMMARY_BY_ID_STORAGE_KEY, JSON.stringify(meetingSummariesById)).catch(() => { });
    }, [meetingSummariesById, hydrated]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        AsyncStorage.setItem(TRANSCRIPT_BY_ID_STORAGE_KEY, JSON.stringify(meetingTranscriptsById)).catch(() => { });
    }, [meetingTranscriptsById, hydrated]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        AsyncStorage.setItem(RECORDING_PREF_STORAGE_KEY, JSON.stringify(recordingPreferences)).catch(() => { });
    }, [recordingPreferences, hydrated]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }
        AsyncStorage.setItem(RECORDINGS_BY_ID_STORAGE_KEY, JSON.stringify(meetingRecordingsById)).catch(() => { });
    }, [meetingRecordingsById, hydrated]);

    useEffect(() => {
        if (!hydrated) {
            return;
        }

        const pruneExpired = async () => {
            const cutoff = Date.now() - recordingPreferences.retentionDays * 24 * 60 * 60 * 1000;
            const entries = Object.entries(meetingRecordingsById);
            const expired = entries.filter(([, asset]) => asset.createdAt < cutoff);

            if (expired.length === 0) {
                return;
            }

            await Promise.all(
                expired.map(([, asset]) =>
                    asset.uri.startsWith('blob:')
                        ? Promise.resolve().then(() => {
                            const urlApi = (globalThis as any).URL;
                            if (urlApi?.revokeObjectURL) {
                                urlApi.revokeObjectURL(asset.uri);
                            }
                        })
                        : FileSystem.deleteAsync(asset.uri, { idempotent: true }).catch(() => {
                            return;
                        })
                )
            );

            setMeetingRecordingsById((prev) => {
                const next = { ...prev };
                for (const [meetingId] of expired) {
                    delete next[meetingId];
                }
                return next;
            });
        };

        pruneExpired().catch(() => {
            // Ignore cleanup failures and continue app flow.
        });
    }, [recordingPreferences.retentionDays, meetingRecordingsById, hydrated]);

    const startRecording = (title?: string) => {
        if (isRecording) {
            return;
        }
        setActiveMeetingTitle(title?.trim() || 'Team Sync - Q3 Planning');
        setRecordingStartedAt(Date.now());
        setCurrentTranscript('');
        setIsRecording(true);
    };

    const appendToCurrentTranscript = (segment: string) => {
        const trimmed = segment.trim();
        if (!trimmed) {
            return;
        }

        setCurrentTranscript((prev) => {
            if (!prev.trim()) {
                return trimmed;
            }
            return `${prev} ${trimmed}`;
        });
    };

    const stopRecording = () => {
        if (!isRecording || !recordingStartedAt) {
            return undefined;
        }

        const endedAt = Date.now();
        const durationSeconds = Math.max(1, Math.floor((endedAt - recordingStartedAt) / 1000));
        const title = activeMeetingTitle;

        const nextMeeting: MeetingItem = {
            id: `rec-${endedAt}`,
            title,
            timeLabel: formatNowLabel(new Date(endedAt)),
            status: 'Summary Ready',
            statusColor: '#34C759',
            icon: '🎙️',
            isFavorite: false,
            durationSeconds,
            createdAt: endedAt,
        };

        const transcriptForSummary = currentTranscript.trim();
        const generatedSummary = summarizeTranscript(title, transcriptForSummary, durationSeconds);

        setLatestSummaryBullets(generatedSummary);
        setMeetingSummariesById((prev) => ({
            ...prev,
            [nextMeeting.id]: generatedSummary,
        }));

        setMeetingTranscriptsById((prev) => ({
            ...prev,
            [nextMeeting.id]: transcriptForSummary,
        }));

        setMeetings((prev) => [nextMeeting, ...prev]);
        setIsRecording(false);
        setRecordingStartedAt(null);
        setCurrentTranscript('');

        return nextMeeting.id;
    };

    const attachRecordingToMeeting = async (meetingId: string, tempUri: string) => {
        if (!recordingPreferences.saveRawAudio || !tempUri) {
            return undefined;
        }

        try {
            const createdAt = Date.now();
            const expiresAt = createdAt + recordingPreferences.retentionDays * 24 * 60 * 60 * 1000;

            if (tempUri.startsWith('blob:')) {
                setMeetingRecordingsById((prev) => ({
                    ...prev,
                    [meetingId]: {
                        uri: tempUri,
                        createdAt,
                        expiresAt,
                    },
                }));

                return tempUri;
            }

            const dirInfo = await FileSystem.getInfoAsync(RECORDINGS_DIR);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(RECORDINGS_DIR, { intermediates: true });
            }

            const extension = tempUri.includes('.') ? tempUri.substring(tempUri.lastIndexOf('.')) : '.m4a';
            const safeExt = extension.length <= 6 ? extension : '.m4a';
            const targetUri = `${RECORDINGS_DIR}${meetingId}${safeExt}`;

            await FileSystem.copyAsync({
                from: tempUri,
                to: targetUri,
            });

            setMeetingRecordingsById((prev) => ({
                ...prev,
                [meetingId]: {
                    uri: targetUri,
                    createdAt,
                    expiresAt,
                },
            }));

            return targetUri;
        } catch {
            return undefined;
        }
    };

    const getSummaryForMeeting = (meetingId?: string) => {
        if (!meetingId) {
            return latestSummaryBullets;
        }
        return meetingSummariesById[meetingId] ?? latestSummaryBullets;
    };

    const getTranscriptForMeeting = (meetingId?: string) => {
        if (!meetingId) {
            return currentTranscript;
        }
        return meetingTranscriptsById[meetingId] ?? '';
    };

    const getRecordingForMeeting = (meetingId?: string) => {
        if (!meetingId) {
            return undefined;
        }
        return meetingRecordingsById[meetingId];
    };

    const toggleFavorite = (meetingId: string) => {
        setMeetings((prev) =>
            prev.map((meeting) =>
                meeting.id === meetingId
                    ? {
                        ...meeting,
                        isFavorite: !meeting.isFavorite,
                    }
                    : meeting
            )
        );
    };

    const setSaveRawAudioPreference = (value: boolean) => {
        setRecordingPreferences((prev) => ({
            ...prev,
            saveRawAudio: value,
        }));
    };

    const setRetentionDaysPreference = (days: RetentionDays) => {
        setRecordingPreferences((prev) => ({
            ...prev,
            retentionDays: days,
        }));
    };

    const value = useMemo(
        () => ({
            meetings,
            meetingSummariesById,
            meetingTranscriptsById,
            meetingRecordingsById,
            recordingPreferences,
            isRecording,
            activeMeetingTitle,
            recordingStartedAt,
            currentTranscript,
            latestSummaryBullets,
            startRecording,
            stopRecording,
            setCurrentTranscript,
            appendToCurrentTranscript,
            toggleFavorite,
            getSummaryForMeeting,
            getTranscriptForMeeting,
            getRecordingForMeeting,
            attachRecordingToMeeting,
            setSaveRawAudioPreference,
            setRetentionDaysPreference,
        }),
        [
            meetings,
            meetingSummariesById,
            meetingTranscriptsById,
            meetingRecordingsById,
            recordingPreferences,
            isRecording,
            activeMeetingTitle,
            recordingStartedAt,
            currentTranscript,
            latestSummaryBullets,
        ]
    );

    return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
}

export function useMeetingContext() {
    const context = useContext(MeetingContext);
    if (!context) {
        throw new Error('useMeetingContext must be used within a MeetingProvider');
    }
    return context;
}
