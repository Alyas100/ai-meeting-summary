import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MeetingItem, useMeetingContext } from '../../context/meeting-context';

export default function FavoritesScreen() {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const { meetings, toggleFavorite } = useMeetingContext();
    const [query, setQuery] = useState('');

    const favoriteMeetings = useMemo(
        () => meetings.filter((meeting: MeetingItem) => meeting.isFavorite),
        [meetings]
    );

    const filteredFavorites = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        if (!normalized) {
            return favoriteMeetings;
        }

        return favoriteMeetings.filter(
            (meeting: MeetingItem) =>
                meeting.title.toLowerCase().includes(normalized) ||
                meeting.timeLabel.toLowerCase().includes(normalized) ||
                meeting.status.toLowerCase().includes(normalized)
        );
    }, [favoriteMeetings, query]);

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
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        headerButton: {
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
        },
        headerTitle: {
            fontSize: 16,
            fontWeight: '700',
            color: isDark ? '#fff' : '#000',
            flex: 1,
            textAlign: 'center',
            letterSpacing: 0.5,
        },
        contentContainer: {
            padding: 16,
        },
        searchContainer: {
            marginBottom: 16,
        },
        searchBar: {
            backgroundColor: isDark ? '#3a2a20' : '#e5e5ea',
            borderColor: isDark ? '#5a3a2a' : '#d5d5da',
            borderWidth: 0,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 12,
            color: isDark ? '#fff' : '#000',
            fontSize: 14,
        },
        favoriteItem: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
            backgroundColor: isDark ? '#3a2a20' : '#fff',
            paddingVertical: 12,
            paddingHorizontal: 12,
            borderRadius: 12,
            marginBottom: 12,
            borderColor: isDark ? '#5a3a2a' : '#e5e5ea',
            borderWidth: 1,
        },
        starIcon: {
            width: 40,
            height: 40,
            borderRadius: 8,
            backgroundColor: isDark ? '#5a3a2a' : '#f5f0ed',
            justifyContent: 'center',
            alignItems: 'center',
            fontSize: 20,
        },
        itemContent: {
            flex: 1,
        },
        itemHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 4,
        },
        itemTitle: {
            flex: 1,
            fontSize: 14,
            fontWeight: '700',
            color: isDark ? '#fff' : '#000',
        },
        statusBadge: {
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 4,
            marginLeft: 8,
        },
        statusText: {
            fontSize: 10,
            fontWeight: '700',
            color: '#fff',
            textTransform: 'uppercase',
        },
        itemDate: {
            fontSize: 12,
            fontWeight: '500',
            color: isDark ? '#aaa' : '#666',
        },
        chevronButton: {
            width: 32,
            height: 32,
            justifyContent: 'center',
            alignItems: 'center',
        },
        chevron: {
            fontSize: 14,
            color: isDark ? '#aaa' : '#666',
        },
    });

    return (
        <ThemedView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.headerButton}>
                    <Text style={{ fontSize: 16 }}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Favorites</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchBar}
                        placeholder="Search starred summaries"
                        placeholderTextColor={isDark ? '#aaa' : '#666'}
                        value={query}
                        onChangeText={setQuery}
                    />
                </View>

                {/* Favorites List */}
                {filteredFavorites.map((favorite: MeetingItem) => (
                    <TouchableOpacity
                        key={favorite.id}
                        style={styles.favoriteItem}
                        onPress={() =>
                            router.push({
                                pathname: '/meeting/[id]',
                                params: { id: favorite.id },
                            })
                        }>
                        <View style={styles.starIcon}>⭐</View>
                        <View style={styles.itemContent}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.itemTitle} numberOfLines={1}>
                                    {favorite.title}
                                </Text>
                                <View style={[styles.statusBadge, { backgroundColor: favorite.statusColor }]}>
                                    <Text style={styles.statusText}>{favorite.status.replace('Summary ', '')}</Text>
                                </View>
                            </View>
                            <Text style={styles.itemDate}>{favorite.timeLabel}</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.chevronButton}
                            onPress={(event) => {
                                event.stopPropagation();
                                toggleFavorite(favorite.id);
                            }}>
                            <Text style={styles.chevron}>★</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                ))}

                {filteredFavorites.length === 0 && (
                    <Text style={styles.itemDate}>No favorite meetings match your search.</Text>
                )}
            </ScrollView>
        </ThemedView>
    );
}
