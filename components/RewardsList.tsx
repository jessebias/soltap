import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from './auth/auth-provider';

interface Reward {
    id: string;
    amount: string; // numeric in DB
    claimed: boolean;
    reward_tokens: {
        symbol: string;
        decimals: number;
    };
    seasons: {
        name: string;
    };
}

const SOLANA_GREEN = '#14F195';

export default function RewardsList() {
    return (
        <View style={styles.center}>
            <View style={styles.comingSoonContainer}>
                <Ionicons name="trophy" size={64} color={SOLANA_GREEN} style={{ marginBottom: 20 }} />
                <Text style={styles.comingSoonTitle}>Rewards – Coming Soon</Text>

                <Text style={styles.comingSoonText}>
                    We’re finalizing our on-chain reward system.{'\n'}
                    Early players will be eligible for future reward seasons.
                </Text>

                <View style={styles.divider} />

                <Text style={styles.comingSoonSubtext}>
                    Season 0 is live. Rewards activate in Season 1.
                </Text>
            </View>
        </View>
    );
}

// Internal component for V1.5 (Preserved)
function RewardsListInternal() {
    const { isAuthenticated, signIn, signOut, walletAddress, supabaseUser } = useAuth();
    // ... (rest of the logic is preserved below)
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [loading, setLoading] = useState(false);
    const [claimingId, setClaimingId] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthenticated) {
            fetchRewards();
        }
    }, [isAuthenticated]);


    const fetchRewards = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_rewards')
                .select(`
                    id, 
                    amount, 
                    claimed,
                    reward_tokens (symbol, decimals),
                    seasons (name)
                `)
                .order('created_at', { ascending: false });


            if (error) throw error;

            // Map joined data which might be returned as arrays
            const mappedData: Reward[] = (data || []).map((item: any) => ({
                id: item.id,
                amount: item.amount,
                claimed: item.claimed,
                reward_tokens: Array.isArray(item.reward_tokens) ? item.reward_tokens[0] : item.reward_tokens,
                seasons: Array.isArray(item.seasons) ? item.seasons[0] : item.seasons,
            }));

            setRewards(mappedData);
        } catch (error: any) {
            console.error('Error fetching rewards:', error);
            Alert.alert("Error", "Failed to load rewards: " + (error.message || "Unknown error"));
        } finally {
            setLoading(false);
        }
    };

    const handleClaim = async (reward: Reward) => {
        setClaimingId(reward.id);
        try {
            const { data, error } = await supabase.functions.invoke('claim-reward', {
                body: { reward_id: reward.id }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            Alert.alert("Success", "Reward claimed! It may take a moment to appear in your wallet.");
            // Refund/Refetch
            fetchRewards();
        } catch (error: any) {
            console.error('Claim error:', error);
            const errorMessage = error.message || (error.context ? JSON.stringify(error.context) : JSON.stringify(error));
            Alert.alert("Claim Failed", errorMessage);
        } finally {
            setClaimingId(null);
        }
    };

    if (!isAuthenticated) {
        return (
            <View style={styles.center}>
                <Text style={styles.prompt}>Connect wallet to view rewards</Text>
                <TouchableOpacity style={styles.connectBtn} onPress={() => signIn()}>
                    <Text style={styles.btnText}>CONNECT WALLET</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (loading && rewards.length === 0) {
        return (
            <View style={styles.center}>
                <ActivityIndicator color={SOLANA_GREEN} />
            </View>
        );
    }

    // Format atomic units to human-readable amount
    const formatAmount = (amount: string, decimals: number) => {
        const val = parseFloat(amount) / Math.pow(10, decimals);
        return val.toLocaleString(undefined, { maximumFractionDigits: 4 });
    };

    const renderItem = ({ item }: { item: Reward }) => (
        <View style={styles.card}>
            <View style={styles.info}>
                <Text style={styles.season}>{item.seasons?.name || 'Unknown Season'}</Text>
                <Text style={styles.amount}>
                    {formatAmount(item.amount, item.reward_tokens.decimals)} {item.reward_tokens.symbol}
                </Text>
            </View>
            <View style={styles.action}>
                {item.claimed ? (
                    <View style={styles.claimedBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#666" />
                        <Text style={styles.claimedText}>CLAIMED</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={[styles.claimBtn, claimingId === item.id && { opacity: 0.5 }]}
                        onPress={() => handleClaim(item)}
                        disabled={!!claimingId}
                    >
                        {claimingId === item.id ? (
                            <ActivityIndicator color="black" size="small" />
                        ) : (
                            <Text style={styles.claimText}>CLAIM</Text>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    return (
        <FlatList
            data={rewards}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
                isAuthenticated ? (
                    <View>
                        <View style={styles.header}>
                            <View>
                                <Text style={styles.walletInfo}>
                                    Wallet: {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
                                </Text>
                                <Text style={styles.debugInfo}>
                                    UID: {supabaseUser?.id?.slice(0, 8)}...
                                </Text>
                            </View>
                            <TouchableOpacity onPress={() => signOut()} style={styles.logoutBtn}>
                                <Text style={styles.logoutText}>LOGOUT</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : null
            }
            ListEmptyComponent={
                <Text style={styles.empty}>No rewards found yet. Keep playing!</Text>
            }
            refreshing={loading}
            onRefresh={fetchRewards}
        />
    );
}

const styles = StyleSheet.create({
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    list: {
        padding: 20,
    },
    prompt: {
        color: '#888',
        marginBottom: 20,
        fontSize: 16
    },
    connectBtn: {
        backgroundColor: 'white',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 20
    },
    btnText: {
        fontWeight: 'bold',
        color: 'black'
    },
    empty: {
        color: '#666',
        textAlign: 'center',
        marginTop: 40
    },
    card: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10
    },
    info: {
        gap: 4
    },
    season: {
        color: '#888',
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase'
    },
    amount: {
        color: 'white',
        fontWeight: '900',
        fontSize: 18,
        letterSpacing: 1
    },
    action: {
        alignItems: 'flex-end'
    },
    claimBtn: {
        backgroundColor: SOLANA_GREEN,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20
    },
    claimText: {
        color: 'black',
        fontWeight: '900',
        fontSize: 12
    },
    claimedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        opacity: 0.6
    },
    claimedText: {
        color: '#888',
        fontWeight: '700',
        fontSize: 12
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    walletInfo: {
        color: '#888',
        fontSize: 14,
        fontFamily: 'monospace'
    },
    debugInfo: {
        color: '#444',
        fontSize: 10,
        marginTop: 2,
        fontFamily: 'monospace'
    },
    logoutBtn: {
        padding: 8,
    },
    logoutText: {
        color: '#F00',
        fontWeight: 'bold',
        fontSize: 12
    },
    migrateBtn: {
        marginBottom: 20,
        backgroundColor: '#333',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center'
    },
    migrateText: {
        color: SOLANA_GREEN,
        fontWeight: 'bold',
        fontSize: 12
    },
    comingSoonContainer: {
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    comingSoonTitle: {
        color: 'white',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center'
    },
    comingSoonText: {
        color: '#CCC',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24
    },
    divider: {
        width: 100,
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.2)',
        marginBottom: 24
    },
    comingSoonSubtext: {
        color: SOLANA_GREEN,
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1
    }
});
