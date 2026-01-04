import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Score as ApiScore, fetchLeaderboard } from '../lib/leaderboard';
import RewardsList from './RewardsList';

// Colors matches app/index.tsx
const SOLANA_GREEN = '#14F195';
const SOLANA_PURPLE = '#9945FF';
const DARK_BG = '#000000';
const DEEP_BG = '#101012';

// UI Score Interface
interface Score {
    id: string;
    rank: number;
    wallet: string;
    timeMs: number;
    score?: number; // Streak
    date: string;
}

interface LeaderboardProps {
    visible: boolean;
    onClose: () => void;
    gameMode?: string;
}

export default function Leaderboard({ visible, onClose, gameMode = 'reaction_test' }: LeaderboardProps) {
    const [scores, setScores] = useState<Score[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeMode, setActiveMode] = useState(gameMode);

    // Sync state with prop when opening
    useEffect(() => {
        if (visible) {
            setActiveMode(gameMode);
        }
    }, [visible, gameMode]);

    // Fetch when activeMode changes
    useEffect(() => {
        if (visible) {
            loadLeaderboard();
        }
    }, [visible, activeMode]);

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            const data = await fetchLeaderboard(activeMode);
            // Map API data to UI data
            const mappedScores: Score[] = data.map((item: ApiScore, index: number) => ({
                id: item.id,
                rank: index + 1,
                wallet: formatWallet(item.wallet_address || 'ANON'),
                timeMs: item.time_ms,
                score: item.score,
                date: new Date(item.created_at).toLocaleDateString(),
            }));
            setScores(mappedScores);
        } catch (e: any) {
            console.error("Leaderboard Load Error:", e);
        } finally {
            setLoading(false);
        }
    };

    const formatWallet = (address: string) => {
        if (address.length < 8) return address;
        return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
    };

    const renderItem = ({ item }: { item: Score }) => {
        const isProgressive = activeMode === 'progressive_speed';

        return (
            <View style={styles.row}>
                <View style={styles.rankCol}>
                    <Text style={[
                        styles.rankText,
                        item.rank === 1 && { color: SOLANA_GREEN },
                        item.rank === 2 && { color: '#EEE' },
                        item.rank === 3 && { color: '#CCC' },
                    ]}>
                        #{item.rank}
                    </Text>
                </View>
                <View style={styles.walletCol}>
                    <Text style={styles.walletText}>{item.wallet}</Text>
                </View>
                <View style={styles.timeCol}>
                    <Text style={styles.timeText}>
                        {isProgressive ? `${item.score ?? 0}` : `${item.timeMs}ms`}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <StatusBar style="light" />
                <LinearGradient
                    colors={[DEEP_BG, DARK_BG]}
                    style={styles.gradient}
                >
                    <SafeAreaView style={styles.safeArea}>
                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>LEADERBOARD</Text>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <Text style={styles.closeText}>CLOSE</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Tabs */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tabButton, activeMode === 'reaction_test' && styles.activeTab]}
                                onPress={() => setActiveMode('reaction_test')}
                            >
                                <Text style={[styles.tabText, activeMode === 'reaction_test' && styles.activeTabText]}>REACTION</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.tabButton, activeMode === 'progressive_speed' && styles.activeTab]}
                                onPress={() => setActiveMode('progressive_speed')}
                            >
                                <Text style={[styles.tabText, activeMode === 'progressive_speed' && styles.activeTabText]}>SPEED</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.tabButton, activeMode === 'multi_zone' && styles.activeTab]}
                                onPress={() => setActiveMode('multi_zone')}
                            >
                                <Text style={[styles.tabText, activeMode === 'multi_zone' && styles.activeTabText]}>ZONES</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.tabButton, activeMode === 'rewards' && styles.activeTab]}
                                onPress={() => setActiveMode('rewards')}
                            >
                                <Text style={[styles.tabText, activeMode === 'rewards' && styles.activeTabText]}>REWARDS</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Column Headers (Hide in Rewards Mode) */}
                        {activeMode !== 'rewards' && (
                            <View style={styles.tableHeader}>
                                <Text style={[styles.headerText, styles.rankCol]}>RANK</Text>
                                <Text style={[styles.headerText, styles.walletCol]}>PLAYER</Text>
                                <Text style={[styles.headerText, styles.timeCol]}>
                                    {activeMode === 'progressive_speed' ? 'STREAK' : 'TIME'}
                                </Text>
                            </View>
                        )}

                        {/* List */}
                        {activeMode === 'rewards' ? (
                            <RewardsList />
                        ) : loading ? (
                            <View style={styles.loaderContainer}>
                                <ActivityIndicator size="large" color={SOLANA_GREEN} />
                            </View>
                        ) : (
                            <FlatList
                                data={scores}
                                renderItem={renderItem}
                                keyExtractor={(item) => item.id}
                                contentContainerStyle={styles.listContent}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={
                                    <Text style={styles.emptyText}>No scores yet. Be the first!</Text>
                                }
                            />
                        )}
                    </SafeAreaView>
                </LinearGradient>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DARK_BG,
    },
    gradient: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: 'white',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    closeBtn: {
        padding: 8,
    },
    closeText: {
        color: '#888',
        fontWeight: '700',
        fontSize: 14,
    },
    // Tabs
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        marginBottom: 8,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: SOLANA_GREEN,
    },
    tabText: {
        color: '#666',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 1,
    },
    activeTabText: {
        color: 'white',
    },
    // Table
    tableHeader: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        marginBottom: 8,
    },
    headerText: {
        color: '#666',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: '#666',
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        backgroundColor: 'rgba(26,26,29, 0.4)', // faint background
        marginBottom: 4,
        borderRadius: 8,
    },
    rankCol: {
        width: 60,
    },
    walletCol: {
        flex: 1,
    },
    timeCol: {
        width: 80,
        alignItems: 'flex-end',
    },
    rankText: {
        color: 'white',
        fontWeight: '900',
        fontSize: 16,
    },
    walletText: {
        color: '#BBB',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 14,
        fontWeight: '500',
    },
    timeText: {
        color: SOLANA_GREEN,
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 0.5,
    },
});
