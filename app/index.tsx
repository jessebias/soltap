import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Intro from '../components/Intro';
import Leaderboard from '../components/Leaderboard';

const DARK_BG = '#000000';
const DEEP_BG = '#101012';
const SOLANA_GREEN = '#14F195';
const SOLANA_PURPLE = '#9945FF';

export default function GameSelection() {
    const router = useRouter();
    const [showIntro, setShowIntro] = useState(true);
    const [showLeaderboard, setShowLeaderboard] = useState(false);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            <LinearGradient
                colors={[DEEP_BG, DARK_BG]}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.leaderboardBtn}
                        onPress={() => setShowLeaderboard(true)}
                    >
                        <Text style={styles.leaderboardBtnText}>🏆 LEADERBOARD</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <Text style={styles.title}>SOLTAP</Text>
                    <Text style={styles.subtitle}>SELECT MODE</Text>

                    <View style={styles.menu}>
                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => router.push('/game/reaction')}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['rgba(20, 241, 149, 0.15)', 'rgba(20, 241, 149, 0.05)']}
                                style={styles.cardGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={[styles.cardIcon, { color: SOLANA_GREEN }]}>⚡️</Text>
                                    <View>
                                        <Text style={[styles.cardTitle, { color: SOLANA_GREEN }]}>REACTION TEST</Text>
                                        <Text style={styles.cardDesc}>Single tap reflex challenge</Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.card}
                            onPress={() => router.push('/game/multi-zone')}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={['rgba(153, 69, 255, 0.15)', 'rgba(153, 69, 255, 0.05)']}
                                style={styles.cardGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <View style={styles.cardHeader}>
                                    <Text style={[styles.cardIcon, { color: SOLANA_PURPLE }]}>💠</Text>
                                    <View>
                                        <Text style={[styles.cardTitle, { color: SOLANA_PURPLE }]}>MULTI-ZONE</Text>
                                        <Text style={styles.cardDesc}>Grid reflex challenge</Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Branding Footer */}
                <View style={styles.brandingContainer}>
                    <LinearGradient
                        colors={[SOLANA_PURPLE, SOLANA_GREEN]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.brandingBar}
                    />
                </View>
            </LinearGradient>

            {showIntro && <Intro onFinish={() => setShowIntro(false)} />}

            <Leaderboard
                visible={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                // Default to reaction test or maybe add a "General" mode later?
                // For now, let's just show reaction_test or maybe make it selectable inside?
                // Or maybe we hide the specific leaderboard until a game is selected?
                // The user asked for "Leaderboard only shows up when in reaction test game" as a BUG.
                // So I will add it here, defaulting to 'reaction_test' is fine for now, 
                // or we could update Leaderboard component to have tabs. 
                // Let's stick to 'reaction_test' as default or pass undefined if we want to show all (needs backend support).
                // Actually, let's just default to 'reaction_test' for now to solve the "missing" issue.
                gameMode="reaction_test"
            />
        </View>
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
    header: {
        position: 'absolute',
        top: 60,
        right: 20,
        zIndex: 10,
    },
    leaderboardBtn: {
        padding: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
    },
    leaderboardBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        letterSpacing: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        color: 'white',
        textAlign: 'center',
        letterSpacing: 2,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: '#888',
        textAlign: 'center',
        letterSpacing: 4,
        marginBottom: 60,
        textTransform: 'uppercase',
    },
    menu: {
        gap: 20,
    },
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cardGradient: {
        padding: 24,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    cardIcon: {
        fontSize: 32,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4,
    },
    cardDesc: {
        color: '#AAA',
        fontSize: 14,
        fontWeight: '500',
    },
    brandingContainer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    brandingBar: {
        width: 60,
        height: 4,
        borderRadius: 2,
    },
});
