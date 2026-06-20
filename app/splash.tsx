import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  StyleSheet,
  useWindowDimensions,
  Platform,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const SPLASH_ILLUSTRATION = require('../assets/images/splash-illustration.png');

export default function Splash() {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const colors = useMemo(
    () => ({
      background: scheme === 'light' ? '#F8FCFD' : '#0A111A',
      surface: scheme === 'light' ? '#FFFFFF' : '#1A232E',
      textPrimary: scheme === 'light' ? '#0A111A' : '#EAF2F8',
      textSecondary: scheme === 'light' ? '#4A6572' : '#A0B4C0',
      textMuted: scheme === 'light' ? '#7A919E' : '#7A919E',
      primary: '#4A9FC6',
      primaryDark: '#2E89B0',
      border: scheme === 'light' ? 'rgba(10,17,26,0.08)' : 'rgba(234,242,248,0.12)',
      shadow: '#000000',
      accent: scheme === 'light' ? '#EAF6F8' : '#2A3A48',
    }),
    [scheme]
  );

  // Design System
  const BASE_UNIT = 4;
  const spacing = (n: number) => n * BASE_UNIT;

  const typography = {
    hero: { fontSize: 44, lineHeight: 52, fontWeight: '900' as const },
    title: { fontSize: 34, lineHeight: 40, fontWeight: '800' as const },
    subtitle: { fontSize: 16, lineHeight: 22, fontWeight: '600' as const },
    body: { fontSize: 14, lineHeight: 20, fontWeight: '500' as const },
    caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
  };

  const radii = {
    sm: spacing(2),
    md: spacing(3),
    lg: spacing(4),
    xl: spacing(5),
  };

  const elevations = Platform.select({
    ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
    android: { elevation: 4 },
    web: { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
    default: {},
  });

  const breakpoints = { mobileMax: 479, tabletMax: 1023 };
  const maxContentWidth = 1240;

  const uiMode = useMemo<'mobile' | 'tablet' | 'desktop'>(() => {
    if (width <= breakpoints.mobileMax) return 'mobile';
    if (width <= breakpoints.tabletMax) return 'tablet';
    return 'desktop';
  }, [width]);

  const isMobile = uiMode === 'mobile';
  const isDesktop = uiMode === 'desktop';

  // Redirect desktop/tablet → login
  useEffect(() => {
    if (!isMobile) {
      router.replace('/login');
    }
  }, [isMobile]);

  if (!isMobile) return null;

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(fadeAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleGetStarted = () => {
    router.push('/login');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0.2, y: 0.1 }}
        end={{ x: 0.8, y: 0.95 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              padding: spacing(isDesktop ? 8 : 5),
            },
          ]}
        >
          <View style={[styles.illustrationWrap, { marginBottom: spacing(6) }]}>
            <Image
              source={SPLASH_ILLUSTRATION}
              style={{ width: '100%', height: undefined, aspectRatio: 1 }}
              resizeMode="contain"
              accessibilityLabel="UniPathway welcome illustration"
            />
          </View>

          <Text
            style={[typography.hero, { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing(3) }]}
            accessible
            accessibilityRole="header"
          >
            Welcome to Thuto-Bridge
          </Text>

          <Text
            style={[typography.subtitle, { color: colors.textSecondary, textAlign: 'center', marginBottom: spacing(8) }]}
          >
            Your all-in-one platform for university guidance, course discovery, and sponsorship insights.
          </Text>

          <Pressable
            onPress={handleGetStarted}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && { transform: [{ scale: 0.96 }], opacity: 0.95 },
            ]}
            accessibilityLabel="Get Started"
            accessibilityRole="button"
            accessibilityHint="Proceed to login"
          >
            <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}>
              Get Started
            </Text>
          </Pressable>

          <View style={[styles.features, { marginTop: spacing(6) }]}>
            {[
              { icon: 'school-outline', text: 'Personalized course recommendations' },
              { icon: 'wallet-outline', text: 'Scholarship opportunities' },
              { icon: 'people-outline', text: 'Role-based dashboards' },
            ].map((feature, idx) => (
              <View key={idx} style={styles.featureItem}>
                <Ionicons name={feature.icon as any} size={20} color={colors.accent} />
                <Text style={[typography.caption, { color: colors.textMuted, marginLeft: spacing(2) }]}>
                  {feature.text}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, justifyContent: 'center' },
  content: {
    alignItems: 'center',
    maxWidth: 1240,
    alignSelf: 'center',
    width: '100%',
  },
  illustrationWrap: { width: '60%', maxWidth: 320, alignSelf: 'center' },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    width: '80%',
    maxWidth: 320,
  },
  features: { alignItems: 'flex-start', width: '80%', gap: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'center' },
});