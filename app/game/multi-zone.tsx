import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import Leaderboard from '../../components/Leaderboard';
import { submitScore } from '../../lib/leaderboard';
import { requestPayment } from '../../lib/solana';

// Game Constants
const TOTAL_ROUNDS = 10;
const TIMEOUT_MS = 1500;
const PENALTY_WRONG_TAP = 150;
const PENALTY_TIMEOUT = 300;
const ZONES_COUNT = 4; // 2x2 Grid

// Colors
const DARK_BG = '#000000';
const ZONE_INACTIVE = '#1A1A1D';
const ZONE_ACTIVE = '#14F195'; // Solana Green
const ZONE_ERROR = '#FF3B30';
const SOLANA_PURPLE = '#9945FF';

const { width } = Dimensions.get('window');
const ZONE_SIZE = (width - 60) / 2;

type GameState = 'intro' | 'playing' | 'result';

export default function MultiZoneGame() {
    const router = useRouter();
    const [gameState, setGameState] = useState<GameState>('intro');
    const [round, setRound] = useState(0);
    const [activeZone, setActiveZone] = useState<number | null>(null);
    const [accumulatedMs, setAccumulatedMs] = useState(0);
    const [roundPenalties, setRoundPenalties] = useState(0);

    // Timer refs
    const roundStartRef = useRef<number>(0);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const nextRoundTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Animation for "Tap Prompt"
    const pulseOpacity = useSharedValue(1);

    React.useEffect(() => {
        pulseOpacity.value = withRepeat(
            withSequence(
                withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );
    }, []);

    const animatedPulseStyle = useAnimatedStyle(() => ({
        opacity: pulseOpacity.value,
    }));

    // Leaderboard State
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [paymentProcessing, setPaymentProcessing] = useState(false);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            clearTimers();
        };
    }, []);

    const clearTimers = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (nextRoundTimerRef.current) clearTimeout(nextRoundTimerRef.current);
    };

    const startGame = () => {
        setGameState('playing');
        setRound(0);
        setAccumulatedMs(0);
        setRoundPenalties(0);
        startNextRound(1);
    };

    const startNextRound = (nextRoundNum: number) => {
        setRound(nextRoundNum);
        setActiveZone(null);
        setRoundPenalties(0);

        // Random delay before activation (500ms - 2500ms)
        const delay = 500 + Math.random() * 2000;

        nextRoundTimerRef.current = setTimeout(() => {
            activateZone();
        }, delay) as unknown as NodeJS.Timeout;
    };

    const activateZone = () => {
        const nextZone = Math.floor(Math.random() * ZONES_COUNT);
        setActiveZone(nextZone);
        roundStartRef.current = performance.now();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Set Timeout Limit
        timeoutRef.current = setTimeout(() => {
            handleTimeout();
        }, TIMEOUT_MS) as unknown as NodeJS.Timeout;
    };

    const handleTimeout = () => {
        // Round failed (timeout)
        finishRound(TIMEOUT_MS + PENALTY_TIMEOUT);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };

    const handleZonePress = (index: number) => {
        if (activeZone === null) return; // Ignore if no zone is active

        if (index === activeZone) {
            // Correct Tap
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            const rawTime = performance.now() - roundStartRef.current;
            const roundTotal = rawTime + roundPenalties;

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            finishRound(roundTotal);
        } else {
            // Wrong Tap
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            setRoundPenalties(p => p + PENALTY_WRONG_TAP);
            // Visual feedback could go here (flash red)
        }
    };

    const finishRound = (ms: number) => {
        setAccumulatedMs(prev => prev + ms);
        setActiveZone(null);

        if (round >= TOTAL_ROUNDS) {
            endGame(ms); // Pass last round ms just to be safe, but mostly we rely on accumulatedMs update which is async... 
            // Better to calculate final score here
            setGameState('result');
        } else {
            startNextRound(round + 1);
        }
    };

    const getAverageTime = () => {
        return Math.round(accumulatedMs / TOTAL_ROUNDS);
    };

    const endGame = (lastRoundMs: number) => {
        // Logic handled in render mostly
    };

    const handleSubmitScore = async () => {
        if (paymentProcessing) return;
        setPaymentProcessing(true);
        try {
            const result = await requestPayment();
            if (result.verified) {
                await submitScore(getAverageTime(), result.wallet, result.signature, 'multi_zone');
                setShowLeaderboard(true);
            }
        } catch (error) {
            console.error(error);
            alert("Payment failed. Try again.");
        } finally {
            setPaymentProcessing(false);
        }
    };

    // Render Helpers
    const renderGrid = () => (
        <View style={styles.grid}>
            {Array.from({ length: ZONES_COUNT }).map((_, index) => {
                const isActive = activeZone === index;
                return (
                    <Pressable
                        key={index}
                        style={[
                            styles.zone,
                            { backgroundColor: isActive ? ZONE_ACTIVE : ZONE_INACTIVE },
                            isActive && styles.zoneActive
                        ]}
                        onPressIn={() => handleZonePress(index)}
                    >
                        {/* Inner glow or dot? */}
                    </Pressable>
                );
            })}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView style={styles.safeArea}>
                {/* Header / HUD */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    {gameState === 'playing' && (
                        <Text style={styles.hudText}>ROUND {round}/{TOTAL_ROUNDS}</Text>
                    )}
                </View>

                {gameState === 'intro' && (
                    <Pressable style={styles.fullScreenPressable} onPress={startGame}>
                        <View style={styles.centerContent}>
                            <Text style={styles.mainTitle}>START</Text>
                            <Text style={styles.subTitle}>MULTI-ZONE</Text>

                            <View style={styles.introContainer}>
                                <Animated.Text style={[styles.tapPrompt, animatedPulseStyle]}>TAP ANYWHERE TO START</Animated.Text>
                                <Text style={styles.instructionText}>
                                    Tap green zones.{'\n'}10 Rounds.
                                </Text>
                            </View>
                        </View>
                    </Pressable>
                )}

                {gameState === 'playing' && (
                    <View style={styles.gameContent}>
                        {renderGrid()}
                    </View>
                )}

                {gameState === 'result' && (
                    <Pressable style={styles.fullScreenPressable} onPress={startGame}>
                        <View style={styles.centerContent}>
                            <Text style={styles.resultLabel}>AVERAGE REACTION</Text>
                            <Text style={styles.resultScore}>{getAverageTime()}ms</Text>

                            <Text style={styles.restartText}>TAP TO RETRY</Text>
                        </View>
                    </Pressable>
                )}
            </SafeAreaView>

            {/* UI Overlays */}
            <SafeAreaView pointerEvents="box-none" style={styles.overlayContainer}>
                {gameState === 'result' && (
                    <View style={styles.bottomActions} pointerEvents="box-none">
                        <TouchableOpacity
                            style={[styles.submitBtn, paymentProcessing && { opacity: 0.5 }]}
                            onPress={handleSubmitScore}
                            disabled={paymentProcessing}
                        >
                            <Text style={styles.submitText}>
                                {paymentProcessing ? "VERIFYING..." : "SUBMIT SCORE"}
                            </Text>
                        </TouchableOpacity>
                        <Text style={styles.disclaimerText}>
                            Submitting a score requires a small on-chain verification to keep the leaderboard clean.
                        </Text>

                        <TouchableOpacity
                            style={styles.menuBtn}
                            onPress={() => router.back()}
                        >
                            <Text style={styles.menuBtnText}>MAIN MENU</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>

            <Leaderboard
                visible={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                gameMode="multi_zone"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: DARK_BG,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    hudText: {
        color: '#888',
        fontWeight: '700',
        letterSpacing: 2,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    gameContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: width - 40,
        gap: 10,
        justifyContent: 'center',
    },
    zone: {
        width: ZONE_SIZE,
        height: ZONE_SIZE,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: '#333',
    },
    zoneActive: {
        borderColor: 'white',
        shadowColor: ZONE_ACTIVE,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 10,
    },
    fullScreenPressable: {
        flex: 1,
        width: '100%',
    },
    mainTitle: {
        fontSize: width * 0.14,
        fontWeight: '900',
        letterSpacing: 1,
        textAlign: 'center',
        color: 'white',
        textTransform: 'uppercase',
    },
    subTitle: {
        fontSize: 16,
        color: '#9945FF', // SOLANA_PURPLE
        opacity: 1, // Make sure it pops
        letterSpacing: 4,
        marginTop: 16,
        textAlign: 'center',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    ctaBtn: {
        backgroundColor: 'white',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 30,
        marginBottom: 20,
    },
    ctaText: {
        color: 'black',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    },
    introContainer: {
        marginTop: 60,
        alignItems: 'center',
        gap: 20,
    },
    tapPrompt: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 2,
        opacity: 0.8,
    },
    instructionText: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        letterSpacing: 1,
    },
    resultLabel: {
        color: '#888',
        fontSize: 14,
        letterSpacing: 2,
        marginBottom: 10,
    },
    resultScore: {
        color: ZONE_ACTIVE,
        fontSize: 64,
        fontWeight: '900',
        marginBottom: 50,
    },
    restartText: {
        fontSize: 16,
        color: 'white',
        marginTop: 40,
        fontWeight: '700',
        letterSpacing: 2,
        opacity: 0.9,
    },
    // Overlay styles
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 20,
        zIndex: 10,
    },
    bottomActions: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 80,
    },
    submitBtn: {
        backgroundColor: 'white',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 30,
        shadowColor: 'black',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    submitText: {
        color: 'black',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    },
    disclaimerText: {
        color: 'white',
        opacity: 0.5,
        fontSize: 11,
        textAlign: 'center',
        marginTop: 12,
        maxWidth: 280,
        fontWeight: '500',
    },
    menuBtn: {
        marginTop: 20,
        padding: 10,
    },
    menuBtnText: {
        color: 'white',
        opacity: 0.6,
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 2,
    },
});
