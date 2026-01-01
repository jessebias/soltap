import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Dimensions, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Intro from '../components/Intro';
import Leaderboard from '../components/Leaderboard';
import SettingsModal from '../components/SettingsModal';

const { width } = Dimensions.get('window');

const DARK_BG = '#000000';
const DEEP_BG = '#050505';
const SOLANA_GREEN = '#14F195';
const SOLANA_PURPLE = '#9945FF';

export default function GameSelection() {
    const router = useRouter();
    const [showIntro, setShowIntro] = useState(true);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Background Gradient */}
            <LinearGradient
                colors={[DARK_BG, DEEP_BG, DARK_BG]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
            />

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => setShowLeaderboard(true)}
                    >
                        <Ionicons name="trophy-outline" size={24} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => setShowSettings(true)}
                    >
                        <Ionicons name="settings-outline" size={24} color="white" />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.heroSection}>
                        <Text style={styles.title}>SOLTAP</Text>
                        <Text style={styles.subtitle}>TRAIN TO EARN</Text>
                    </View>

                    {/* Reaction Test Card */}
                    <TouchableOpacity
                        style={[styles.card, styles.cardGreenBorder]}
                        onPress={() => router.push('/game/reaction')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['rgba(20, 241, 149, 0.05)', 'rgba(0,0,0,0)']}
                            style={styles.cardGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.cardContent}>
                                <View style={styles.cardRow}>
                                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(20, 241, 149, 0.1)' }]}>
                                        <Ionicons name="flash" size={24} color={SOLANA_GREEN} />
                                    </View>
                                    <View>
                                        <Text style={[styles.cardTitle, { color: SOLANA_GREEN }]}>REACTION</Text>
                                        <Text style={styles.cardDesc}>Reflex Test</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Multi-Zone Card */}
                    <TouchableOpacity
                        style={[styles.card, styles.cardPurpleBorder]}
                        onPress={() => router.push('/game/multi-zone')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['rgba(153, 69, 255, 0.05)', 'rgba(0,0,0,0)']}
                            style={styles.cardGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.cardContent}>
                                <View style={styles.cardRow}>
                                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(153, 69, 255, 0.1)' }]}>
                                        <Ionicons name="apps" size={24} color={SOLANA_PURPLE} />
                                    </View>
                                    <View>
                                        <Text style={[styles.cardTitle, { color: SOLANA_PURPLE }]}>MULTI-ZONE</Text>
                                        <Text style={styles.cardDesc}>Grid Challenge</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Speed Run Card */}
                    <TouchableOpacity
                        style={[styles.card, styles.cardWhiteBorder]}
                        onPress={() => router.push('/game/speed-run')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={['rgba(255, 255, 255, 0.05)', 'rgba(0,0,0,0)']}
                            style={styles.cardGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.cardContent}>
                                <View style={styles.cardRow}>
                                    <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                                        <Ionicons name="speedometer" size={24} color="white" />
                                    </View>
                                    <View>
                                        <Text style={[styles.cardTitle, { color: 'white' }]}>SPEED RUN</Text>
                                        <Text style={styles.cardDesc}>Endurance Test</Text>
                                    </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                </ScrollView>
            </SafeAreaView>

            {/* Branding Footer */}
            <View style={styles.brandingContainer}>
                <LinearGradient
                    colors={[SOLANA_PURPLE, SOLANA_GREEN]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.brandingBar}
                />
            </View>

            {showIntro && <Intro onFinish={() => setShowIntro(false)} />}

            <Leaderboard
                visible={showLeaderboard}
                onClose={() => setShowLeaderboard(false)}
                gameMode="reaction_test"
            />

            <SettingsModal
                visible={showSettings}
                onClose={() => setShowSettings(false)}
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
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 10,
        zIndex: 50,
    },
    iconButton: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 20,
    },
    scrollContent: {
        paddingTop: 40,
        paddingBottom: 100,
        paddingHorizontal: 20,
    },
    heroSection: {
        marginBottom: 60,
        alignItems: 'center',
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        color: 'white',
        textAlign: 'center',
        letterSpacing: 12,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 12,
        color: SOLANA_GREEN,
        textAlign: 'center',
        letterSpacing: 6,
        fontWeight: '700',
        textTransform: 'uppercase',
        opacity: 0.9,
    },
    card: {
        borderRadius: 20,
        marginBottom: 20,
        backgroundColor: '#0A0A0A',
    },
    // Crisp Borders (No Glows)
    cardGreenBorder: {
        borderWidth: 1,
        borderColor: 'rgba(20, 241, 149, 0.3)',
    },
    cardPurpleBorder: {
        borderWidth: 1,
        borderColor: 'rgba(153, 69, 255, 0.3)',
    },
    cardWhiteBorder: {
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    cardGradient: {
        borderRadius: 20,
        paddingHorizontal: 24,
        paddingVertical: 28,
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    cardDesc: {
        color: '#666',
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    brandingContainer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 5,
    },
    brandingBar: {
        width: 60,
        height: 4,
        borderRadius: 2,
    },
});
