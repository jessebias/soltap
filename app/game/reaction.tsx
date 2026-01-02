import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { Dimensions, Pressable, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { submitScore } from '../../lib/leaderboard';
import { requestPayment } from '../../lib/solana';

type GameState = 'idle' | 'waiting' | 'go' | 'fail' | 'result';

const { width } = Dimensions.get('window');

// Solana Brand Colors
const SOLANA_GREEN = '#14F195';
const SOLANA_PURPLE = '#9945FF';
const DARK_BG = '#000000';
const DEEP_BG = '#101012';
const NEON_RED = '#FF3B30'; // Sleek red for fail state

const TITLE_SIZE = width * 0.14;

export default function ReactionGame() {
    const router = useRouter();
    const [gameState, setGameState] = useState<GameState>('idle');
    const [resultMs, setResultMs] = useState<number>(0);
    const [timerId, setTimerId] = useState<NodeJS.Timeout | number | null>(null);
    const goTimeRef = useRef<number>(0);

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

    const getGradientColors = (): [string, string, ...string[]] => {
        switch (gameState) {
            case 'idle':
                // Sleek dark gradient
                return [DEEP_BG, DARK_BG];
            case 'waiting':
                // Deep purple hue indicating anticipation
                return ['#1e0a33', '#000000'];
            case 'go':
                // Flashy Solana Green
                return [SOLANA_GREEN, '#14F195'];
            case 'fail':
                // Error state
                return [NEON_RED, '#8a0000'];
            case 'result':
                // The Signature Solana Gradient
                return [SOLANA_PURPLE, SOLANA_GREEN];
            default:
                return [DEEP_BG, DARK_BG];
        }
    };

    const getTitle = () => {
        switch (gameState) {
            case 'idle': return 'START';
            case 'waiting': return 'WAIT';
            case 'go': return 'TAP!';
            case 'fail': return 'TOO SOON';
            case 'result': return `${resultMs}ms`;
        }
    };

    const getSubtitle = () => {
        switch (gameState) {
            case 'idle': return 'REACTION TEST';
            case 'waiting': return 'HOLD STEADY...';
            case 'go': return '';
            case 'fail': return 'YOU FUMBLED';
            case 'result': return getResultLabel(resultMs);
        }
    };

    const getResultLabel = (ms: number) => {
        if (ms < 180) return 'GOD MODE';
        if (ms < 250) return 'DIAMOND HANDS';
        if (ms < 350) return 'AVERAGE';
        return 'PAPER HANDS';
    };

    // Text color logic: Black on Green (Go), White on others
    const getTextColor = () => (gameState === 'go' ? 'black' : 'white');

    const startGame = () => {
        setGameState('waiting');
        const delay = 2000 + Math.random() * 4000;
        const id = setTimeout(() => {
            handleGo();
        }, delay);
        setTimerId(id);
    };

    const handleGo = () => {
        setGameState('go');
        goTimeRef.current = performance.now();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    };

    const handleTooSoon = () => {
        if (timerId) clearTimeout(timerId);
        setGameState('fail');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    };

    const handleFinish = () => {
        const ms = Math.round(performance.now() - goTimeRef.current);
        setResultMs(ms);
        setGameState('result');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handlePress = () => {
        if (gameState === 'idle') {
            startGame();
        } else if (gameState === 'waiting') {
            handleTooSoon();
        } else if (gameState === 'go') {
            handleFinish();
        } else {
            setGameState('idle');
        }
    };

    const [paymentProcessing, setPaymentProcessing] = useState(false);

    const handleSubmitScore = async () => {
        if (paymentProcessing) return;
        setPaymentProcessing(true);
        try {
            // Request Payment & Verify on-chain
            const result = await requestPayment();

            if (result.verified) {
                // Submit proven score to Leaderboard
                await submitScore(resultMs, result.wallet, result.signature, 'reaction_test');
                // Leaderboard is now only on home screen, so we just acknowledge success
                alert("Score Submitted Successfully!");
                router.back(); // Optional: go back to menu? No, let them retry.
            }
        } catch (error: any) {
            console.error(error);
            // Inform user of failure
            alert("Payment failed or timed out. Please try again.");
        } finally {
            setPaymentProcessing(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style={gameState === 'go' ? 'dark' : 'light'} />

            {/* Back Button */}
            <SafeAreaView style={styles.backButtonContainer} pointerEvents="box-none">
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
            </SafeAreaView>

            {/* Main Game Touch Area */}
            <Pressable style={StyleSheet.absoluteFill} onPress={handlePress}>
                <LinearGradient
                    colors={getGradientColors()}
                    style={styles.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.center}>
                        <Text style={[styles.h1, { color: getTextColor() }]}>{getTitle()}</Text>
                        <Text style={[
                            styles.p,
                            { color: gameState === 'idle' ? SOLANA_GREEN : getTextColor() }
                        ]}>
                            {getSubtitle()}
                        </Text>

                        {gameState === 'idle' && (
                            <View style={styles.introContainer}>
                                <Animated.Text style={[styles.tapPrompt, animatedPulseStyle]}>TAP ANYWHERE TO START</Animated.Text>
                                <Text style={styles.instructionText}>
                                    Wait for green.{'\n'}Tap immediately.
                                </Text>
                            </View>
                        )}

                        {gameState === 'result' && (
                            <View style={{ alignItems: 'center' }}>
                                <Animated.Text
                                    entering={FadeIn.delay(200).duration(600)}
                                    style={[styles.restartText, animatedPulseStyle]}
                                >
                                    TAP TO RETRY
                                </Animated.Text>

                                {/* Submit Score Button - Needs to stop propagation if pressing specific button */}
                            </View>
                        )}
                    </View>

                    {gameState === 'idle' && (
                        <View style={styles.brandingContainer}>
                            <LinearGradient
                                colors={[SOLANA_PURPLE, SOLANA_GREEN]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.brandingBar}
                            />
                        </View>
                    )}
                </LinearGradient>
            </Pressable>

            {/* UI Overlays */}
            <SafeAreaView pointerEvents="box-none" style={styles.overlayContainer}>
                {gameState === 'result' && (
                    <View style={styles.bottomActions} pointerEvents="box-none">
                        <TouchableOpacity
                            style={[styles.submitBtn, paymentProcessing && { opacity: 0.5 }]}
                            onPress={handleSubmitScore}
                            disabled={paymentProcessing}
                        >
                            <Text style={styles.submitBtnText}>
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
                            <Ionicons name="home-outline" size={24} color="white" />
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>

            {/* Leaderboard only accessible from home now */}
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        width: '100%',
    },
    h1: {
        fontSize: TITLE_SIZE,
        fontWeight: '900',
        letterSpacing: 1,
        textAlign: 'center',
        textTransform: 'uppercase',
    },
    p: {
        fontSize: 16,
        opacity: 0.8,
        letterSpacing: 4,
        marginTop: 16,
        textAlign: 'center',
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    restartText: {
        fontSize: 16,
        color: 'white',
        marginTop: 40,
        fontWeight: '700',
        letterSpacing: 2,
        opacity: 0.9,
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
    brandingContainer: {
        position: 'absolute',
        bottom: 50,
        alignItems: 'center',
    },
    brandingBar: {
        width: 60,
        height: 4,
        borderRadius: 2,
    },
    // Overlay styles
    overlayContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'space-between',
        padding: 20,
    },
    leaderboardBtn: {
        alignSelf: 'flex-end',
        padding: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        marginTop: 10,
    },
    leaderboardBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        letterSpacing: 1,
    },
    bottomActions: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginBottom: 80, // Space specifically for the button in result screen
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
    submitBtnText: {
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
    backButtonContainer: {
        position: 'absolute',
        top: 50,
        left: 20,
        zIndex: 100,
    },
    backButton: {
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 20,
    },
    menuBtn: {
        marginTop: 20,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 20,
    },
});
