import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

interface IntroProps {
    onFinish: () => void;
}

export default function Intro({ onFinish }: IntroProps) {
    const ringOpacity = useRef(new Animated.Value(0)).current;
    const ringScale = useRef(new Animated.Value(0.82)).current;
    const textOpacity = useRef(new Animated.Value(0)).current;

    // Smooth transition
    const containerOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // Ring Animation
        const ringAnimation = Animated.sequence([
            Animated.parallel([
                Animated.timing(ringOpacity, {
                    toValue: 1,
                    duration: 480, // 0% -> 40% of 1.2s
                    useNativeDriver: true,
                }),
                Animated.timing(ringScale, {
                    toValue: 1,
                    duration: 480,
                    useNativeDriver: true,
                }),
            ]),
            Animated.timing(ringScale, {
                toValue: 1.05,
                duration: 360, // 40% -> 70% of 1.2s
                useNativeDriver: true,
            }),
            Animated.timing(ringScale, {
                toValue: 1,
                duration: 360, // 70% -> 100% of 1.2s
                useNativeDriver: true,
            }),
        ]);

        // Text Animation
        const textAnimation = Animated.sequence([
            Animated.delay(850), // 0.85s delay
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
        ]);

        // Full sequence: Intro -> Wait -> FadeOut
        Animated.sequence([
            Animated.parallel([ringAnimation, textAnimation]),
            Animated.delay(1000), // Hold for a moment to let the user see the full logo
            Animated.timing(containerOpacity, {
                toValue: 0,
                duration: 800, // Smooth fade out
                useNativeDriver: true,
            }),
        ]).start(() => {
            onFinish();
        });
    }, []);

    return (
        <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
            <Animated.View
                style={[
                    styles.ringContainer,
                    {
                        opacity: ringOpacity,
                        transform: [{ scale: ringScale }],
                    },
                ]}
            >
                <LinearGradient
                    colors={['#00ffa3', '#03e1ff', '#dc1fff']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBorder}
                >
                    <View style={styles.innerBlack} />
                </LinearGradient>
            </Animated.View>

            <Animated.View style={[styles.wordmark, { opacity: textOpacity }]}>
                <Text style={styles.text}>SOL</Text>
                <Text style={styles.text}>TAP</Text>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'black',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999, // Ensure it sits on top if needed
    },
    ringContainer: {
        width: 300,
        height: 300,
        position: 'absolute',
    },
    gradientBorder: {
        flex: 1,
        borderRadius: 150, // 50% of 300
        padding: 10,
    },
    innerBlack: {
        flex: 1,
        backgroundColor: 'black',
        borderRadius: 140, // 150 - 10
    },
    wordmark: {
        position: 'absolute',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
    },
    text: {
        color: 'white',
        fontSize: 32,
        letterSpacing: 0.35 * 32, // 0.35em approx 11.2px
        fontWeight: '400', // CSS default is usually 400 for sans-serif
        // System font usually works well for "Inter" lookalike
    },
});
