import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useMeetingContext } from '../../context/meeting-context';

const SETTINGS_SECTIONS = [
    {
        title: 'ACCOUNT',
        items: [
            {
                icon: '🛡️',
                label: 'Security & Privacy',
                description: 'Two-factor authentication, data privacy',
            },
            {
                icon: '🔒',
                label: 'Change Password',
                description: 'Last changed 3 months ago',
            },
        ],
    },
    {
        title: 'PREFERENCES',
        items: [
            {
                icon: '🌙',
                label: 'Theme',
                description: 'Dark mode enabled',
            },
            {
                icon: '🔔',
                label: 'Notifications',
                description: 'All notifications enabled',
            },
            {
                icon: '🗣️',
                label: 'Language',
                description: 'English',
            },
        ],
    },
];

export default function SettingsScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const {
        recordingPreferences,
        setSaveRawAudioPreference,
        setRetentionDaysPreference,
    } = useMeetingContext();

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: isDark ? '#221610' : '#f8f6f6',
        },
        header: {
            backgroundColor: isDark ? '#221610' : '#f8f6f6',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomColor: isDark ? '#3a2a20' : '#e5e5ea',
            borderBottomWidth: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        backButton: {
            width: 32,
            height: 32,
            justifyContent: 'center',
            alignItems: 'center',
        },
        headerTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: isDark ? '#fff' : '#000',
            flex: 1,
        },
        saveButton: {
            fontSize: 13,
            fontWeight: '700',
            color: '#ec5b13',
        },
        contentContainer: {
            padding: 16,
        },
        profileSection: {
            alignItems: 'center',
            marginBottom: 20,
        },
        profileImageContainer: {
            width: 80,
            height: 80,
            borderRadius: 40,
            borderWidth: 2,
            borderColor: '#ec5b13',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: isDark ? '#3a2a20' : '#f0e6e0',
            marginBottom: 12,
        },
        profileImage: {
            width: 76,
            height: 76,
            borderRadius: 38,
            backgroundColor: '#ccc',
        },
        editButton: {
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#ec5b13',
            justifyContent: 'center',
            alignItems: 'center',
            borderWidth: 2,
            borderColor: isDark ? '#221610' : '#f8f6f6',
        },
        editButtonIcon: {
            color: '#fff',
            fontSize: 12,
        },
        profileName: {
            fontSize: 16,
            fontWeight: '700',
            color: isDark ? '#fff' : '#000',
            marginBottom: 2,
        },
        profileEmail: {
            fontSize: 12,
            color: isDark ? '#999' : '#666',
            marginBottom: 8,
        },
        planBadge: {
            paddingHorizontal: 10,
            paddingVertical: 4,
            backgroundColor: '#ec5b13',
            borderRadius: 12,
            marginTop: 4,
        },
        planText: {
            fontSize: 10,
            fontWeight: '700',
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
        },
        sectionTitle: {
            fontSize: 11,
            fontWeight: '700',
            color: '#ec5b13',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            marginTop: 16,
            marginBottom: 8,
            paddingHorizontal: 8,
        },
        settingsGroup: {
            backgroundColor: isDark ? '#3a2a20' : '#fff',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 16,
            borderColor: isDark ? '#5a3a2a' : '#e5e5ea',
            borderWidth: 1,
        },
        settingItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 12,
            gap: 12,
        },
        settingItemBorder: {
            borderBottomColor: isDark ? '#5a3a2a' : '#e5e5ea',
            borderBottomWidth: 1,
        },
        settingIcon: {
            width: 36,
            height: 36,
            borderRadius: 8,
            backgroundColor: isDark ? '#5a3a2a' : '#f0e6e0',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 16,
        },
        settingContent: {
            flex: 1,
        },
        settingLabel: {
            fontSize: 13,
            fontWeight: '600',
            color: isDark ? '#fff' : '#000',
        },
        settingDescription: {
            fontSize: 11,
            color: isDark ? '#999' : '#666',
            marginTop: 2,
        },
        chevron: {
            fontSize: 14,
            color: isDark ? '#999' : '#ccc',
            opacity: 0.6,
        },
        recordingCard: {
            backgroundColor: isDark ? '#3a2a20' : '#fff',
            borderRadius: 12,
            borderColor: isDark ? '#5a3a2a' : '#e5e5ea',
            borderWidth: 1,
            paddingVertical: 12,
            paddingHorizontal: 12,
            marginBottom: 16,
        },
        recordingRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
        },
        recordingTextWrap: {
            flex: 1,
        },
        recordingLabel: {
            fontSize: 13,
            fontWeight: '600',
            color: isDark ? '#fff' : '#000',
        },
        recordingDescription: {
            marginTop: 2,
            fontSize: 11,
            color: isDark ? '#999' : '#666',
        },
        retentionWrap: {
            marginTop: 12,
            borderTopColor: isDark ? '#5a3a2a' : '#e5e5ea',
            borderTopWidth: 1,
            paddingTop: 12,
        },
        retentionTitle: {
            fontSize: 11,
            fontWeight: '700',
            color: isDark ? '#aaa' : '#666',
            textTransform: 'uppercase',
            marginBottom: 8,
        },
        retentionChips: {
            flexDirection: 'row',
            gap: 8,
        },
        retentionChip: {
            borderRadius: 999,
            borderWidth: 1,
            borderColor: isDark ? '#5a3a2a' : '#ddd',
            backgroundColor: isDark ? '#2f221a' : '#fafafa',
            paddingHorizontal: 10,
            paddingVertical: 6,
        },
        retentionChipActive: {
            backgroundColor: '#ec5b13',
            borderColor: '#ec5b13',
        },
        retentionChipText: {
            color: isDark ? '#fff' : '#333',
            fontSize: 11,
            fontWeight: '700',
        },
        retentionChipTextActive: {
            color: '#fff',
        },
    });

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton}>
                    <Text style={{ fontSize: 16 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <TouchableOpacity>
                    <Text style={styles.saveButton}>Save</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.profileImageContainer}>
                        <View style={styles.profileImage} />
                        <TouchableOpacity style={styles.editButton}>
                            <Text style={styles.editButtonIcon}>✏️</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.profileName}>Alex Thompson</Text>
                    <Text style={styles.profileEmail}>alex.thompson@example.com</Text>
                    <View style={styles.planBadge}>
                        <Text style={styles.planText}>Premium Plan</Text>
                    </View>
                </View>

                {/* Settings Sections */}
                {SETTINGS_SECTIONS.map((section, secIdx) => (
                    <View key={secIdx}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        <View style={styles.settingsGroup}>
                            {section.items.map((item, itemIdx) => (
                                <TouchableOpacity
                                    key={itemIdx}
                                    style={[
                                        styles.settingItem,
                                        itemIdx < section.items.length - 1 && styles.settingItemBorder,
                                    ]}>
                                    <View style={styles.settingIcon}>{item.icon}</View>
                                    <View style={styles.settingContent}>
                                        <Text style={styles.settingLabel}>{item.label}</Text>
                                        <Text style={styles.settingDescription}>{item.description}</Text>
                                    </View>
                                    <Text style={styles.chevron}>›</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ))}

                <View>
                    <Text style={styles.sectionTitle}>Recording</Text>
                    <View style={styles.recordingCard}>
                        <View style={styles.recordingRow}>
                            <View style={styles.recordingTextWrap}>
                                <Text style={styles.recordingLabel}>Save raw recording (for playback)</Text>
                                <Text style={styles.recordingDescription}>
                                    UI option only for now. Storage behavior will be connected later.
                                </Text>
                            </View>
                            <Switch
                                value={recordingPreferences.saveRawAudio}
                                onValueChange={setSaveRawAudioPreference}
                                trackColor={{ false: isDark ? '#5a3a2a' : '#d3d3d3', true: '#ec5b13' }}
                                thumbColor="#ffffff"
                            />
                        </View>

                        <View style={[styles.retentionWrap, { opacity: recordingPreferences.saveRawAudio ? 1 : 0.45 }]}>
                            <Text style={styles.retentionTitle}>Retention Period</Text>
                            <View style={styles.retentionChips}>
                                {([7, 30, 90] as const).map((days) => {
                                    const active = recordingPreferences.retentionDays === days;
                                    return (
                                        <TouchableOpacity
                                            key={days}
                                            style={[styles.retentionChip, active && styles.retentionChipActive]}
                                            onPress={() => setRetentionDaysPreference(days)}>
                                            <Text
                                                style={[
                                                    styles.retentionChipText,
                                                    active && styles.retentionChipTextActive,
                                                ]}>
                                                {days} days
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </ThemedView>
    );
}
