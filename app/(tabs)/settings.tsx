import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
            </ScrollView>
        </ThemedView>
    );
}
