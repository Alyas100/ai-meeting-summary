import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

export type MeetingStatus = 'Summary Ready' | 'Processing';

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

type MeetingSummariesMap = Record<string, string[]>;
type MeetingTranscriptsMap = Record<string, string>;

type MeetingContextValue = {
    meetings: MeetingItem[];
    meetingSummariesById: MeetingSummariesMap;
    meetingTranscriptsById: MeetingTranscriptsMap;
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
                const [storedMeetings, storedBullets, storedSummaryMap, storedTranscriptMap] = await Promise.all([
                    AsyncStorage.getItem(MEETINGS_STORAGE_KEY),
                    AsyncStorage.getItem(SUMMARY_STORAGE_KEY),
                    AsyncStorage.getItem(SUMMARY_BY_ID_STORAGE_KEY),
                    AsyncStorage.getItem(TRANSCRIPT_BY_ID_STORAGE_KEY),
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

    const value = useMemo(
        () => ({
            meetings,
            meetingSummariesById,
            meetingTranscriptsById,
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
        }),
        [
            meetings,
            meetingSummariesById,
            meetingTranscriptsById,
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
