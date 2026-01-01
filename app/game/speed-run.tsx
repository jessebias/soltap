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
const INITIAL_DURATION = 1200; // Start with 1.2 seconds to tap
const MIN_DURATION = 350; // Cap speed at 350ms (extremely fast)
const SPEED_INCREMENT = 80; // Milliseconds faster per tap
const TARGET_SIZE = 80;

// Colors
const DARK_BG = '#000000';
const ZONE_ACTIVE = '#14F195'; // Solana Green
const ZONE_FAIL = '#FF3B30';
const SOLANA_PURPLE = '#9945FF';

const { width, height } = Dimensions.get('window');
// Calculate safe bounds for random placement (avoiding header/footer)
const MIN_Y = 150;
const MAX_Y = height - 200;
const MIN_X = 20;
const MAX_X = width - TARGET_SIZE - 20;

type GameState = 'intro' | 'playing' | 'result';

export default function SpeedRunGame() {
    const router = useRouter();
    const [gameState, setGameState] = useState<GameState>('intro');
    const [streak, setStreak] = useState(0);
    const [currentDuration, setCurrentDuration] = useState(INITIAL_DURATION);

    // Target Position
    const [targetPos, setTargetPos] = useState({ x: 0, y: 0 });

    // Timer refs
    const timerRef = useRef<number | null>(null);
    const gameStartRef = useRef<number>(0); // To track total survival time if needed

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
        return () => stopGame();
    }, []);

    const stopGame = () => {
        if (timerRef.current) clearTimeout(timerRef.current);
    };

    const startGame = () => {
        setGameState('playing');
        setStreak(0);
        setCurrentDuration(INITIAL_DURATION);
        gameStartRef.current = Date.now();
        spawnTarget(INITIAL_DURATION);
    };

    const spawnTarget = (duration: number) => {
        // Stop previous timer
        if (timerRef.current) clearTimeout(timerRef.current);

        // Randomize position
        const x = Math.floor(Math.random() * (MAX_X - MIN_X + 1)) + MIN_X;
        const y = Math.floor(Math.random() * (MAX_Y - MIN_Y + 1)) + MIN_Y;
        setTargetPos({ x, y });

        // Start Timer for this round using the PASSED duration (sync)
        timerRef.current = setTimeout(() => {
            handleTimeout();
        }, duration) as unknown as number;
    };

    const handleTimeout = () => {
        // Target disappeared before tap -> Game Over
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setGameState('result');
    };

    const handleTap = () => {
        if (gameState !== 'playing') return;

        // Success!
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newStreak = streak + 1;
        setStreak(newStreak);

        // Calculate new duration (Exponential Decay for smooth flow)
        // 5% faster each tap feels much fairer than linear subtraction
        const nextDuration = Math.max(MIN_DURATION, Math.floor(currentDuration * 0.95));
        setCurrentDuration(nextDuration);

        // Respawn immediately with NEW duration
        spawnTarget(nextDuration);
    };

    const handleBackgroundTap = () => {
        if (gameState !== 'playing') return;
        // Missed the target -> Game Over
        stopGame();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setGameState('result');
    };

    const handleSubmitScore = async () => {
        if (paymentProcessing) return;
        setPaymentProcessing(true);
        try {
            const result = await requestPayment();
            if (result.verified) {
                await submitScore(0, result.wallet, result.signature, 'progressive_speed', streak);
                setShowLeaderboard(true);
            }
        } catch (error) {
            console.error(error);
            alert("Payment failed. Try again.");
        } finally {
            setPaymentProcessing(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    {gameState === 'playing' && (
                        <View style={styles.hudContainer}>
                            <Text style={styles.hudLabel}>SPEED</Text>
                            <Text style={styles.hudValue}>{currentDuration}ms</Text>
                        </View>
                    )}
                </View>

                {/* Game Area */}
                {gameState === 'playing' && (
                    <View style={styles.gameArea}>
                        {/* Background Layer: Miss Detection */}
                        <Pressable
                            style={styles.backgroundLayer}
                            onPress={handleBackgroundTap}
                        />

                        {/* Target Layer: Success Detection */}
                        <TouchableOpacity
                            style={[
                                styles.target,
                                { left: targetPos.x, top: targetPos.y }
                            ]}
                            activeOpacity={0.8}
                            onPress={handleTap}
                        >
                            <View style={styles.innerTarget} />
                        </TouchableOpacity>

                        {/* Streak Counter (Visual Only) */}
                        <Text style={styles.bgStreak} pointerEvents="none">
                            {streak}
                        </Text>
                    </View>
                )}

                {/* Intro Screen */}
                {gameState === 'intro' && (
                    <Pressable style={styles.fullScreenPressable} onPress={startGame}>
                        <View style={styles.centerContent}>
                            <Text style={styles.mainTitle}>START</Text>
                            <Text style={styles.subTitle}>SPEED RUN</Text>

                            <View style={styles.introContainer}>
                                <Animated.Text style={[styles.tapPrompt, animatedPulseStyle]}>TAP ANYWHERE TO START</Animated.Text>
                                <Text style={styles.instructionText}>
                                    Tap the target before it vanishes.{'\n'}It gets faster every time.
                                </Text>
                            </View>
                        </View>
                    </Pressable>
                )}

                {/* Result Screen */}
                {gameState === 'result' && (
                    <Pressable style={styles.fullScreenPressable} onPress={startGame}>
                        <View style={styles.centerContent}>
                            <Text style={styles.resultLabel}>LONGEST STREAK</Text>
                            <Text style={styles.resultScore}>{streak}</Text>

                            <Text style={styles.restartText}>TAP TO RETRY</Text>
                        </View>
                    </Pressable>
                )}
            </SafeAreaView>

            {/* UI Overlays (Result Actions) */}
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
                            Submitting a score requires a small on-chain verification.
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
                gameMode="progressive_speed"
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
        zIndex: 20,
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    hudContainer: {
        alignItems: 'flex-end',
    },
    hudLabel: {
        color: '#888',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    hudValue: {
        color: SOLANA_PURPLE,
        fontSize: 16,
        fontWeight: '900',
        fontVariant: ['tabular-nums'],
    },
    gameArea: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    },
    backgroundLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1,
    },
    target: {
        position: 'absolute',
        zIndex: 10, // Ensure target is above background
        width: TARGET_SIZE,
        height: TARGET_SIZE,
        borderRadius: TARGET_SIZE / 2,
        backgroundColor: 'rgba(255,255,255,0.1)', // Halo
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerTarget: {
        width: TARGET_SIZE - 20,
        height: TARGET_SIZE - 20,
        borderRadius: (TARGET_SIZE - 20) / 2,
        backgroundColor: ZONE_ACTIVE,
        shadowColor: ZONE_ACTIVE,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    },
    bgStreak: {
        position: 'absolute',
        width: '100%',
        textAlign: 'center',
        top: height / 2 - 100,
        fontSize: 120,
        fontWeight: '900',
        color: 'rgba(255,255,255,0.05)',
        pointerEvents: 'none',
    },
    fullScreenPressable: {
        flex: 1,
        width: '100%',
        zIndex: 20,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
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
        color: '#FF9500', // Orange for Speed
        opacity: 1,
        letterSpacing: 4,
        marginTop: 16,
        textAlign: 'center',
        fontWeight: '700',
        textTransform: 'uppercase',
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
        fontSize: 80,
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
        zIndex: 30,
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
