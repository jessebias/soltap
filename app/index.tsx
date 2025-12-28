import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Intro from '../components/Intro';

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
    const [showIntro, setShowIntro] = useState(true);
    const [gameState, setGameState] = useState<GameState>('idle');
    const [resultMs, setResultMs] = useState<number>(0);
    const [timerId, setTimerId] = useState<NodeJS.Timeout | number | null>(null);
    const goTimeRef = useRef<number>(0);

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

    return (
        <Pressable style={styles.container} onPress={handlePress}>
            <StatusBar style={gameState === 'go' ? 'dark' : 'light'} />
            <LinearGradient
                colors={getGradientColors()}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.center}>
                    <Text style={[styles.h1, { color: getTextColor() }]}>{getTitle()}</Text>
                    <Text style={[styles.p, { color: getTextColor() }]}>{getSubtitle()}</Text>

                    {gameState === 'result' && (
                        <Animated.Text
                            entering={FadeIn.delay(200).duration(600)}
                            style={styles.restartText}
                        >
                            TAP TO RETRY
                        </Animated.Text>
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

            {showIntro && <Intro onFinish={() => setShowIntro(false)} />}
        </Pressable>
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
});
