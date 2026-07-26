import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  useWindowDimensions,
  Platform,
  AccessibilityInfo,
  ScrollView,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────
const PALETTE = {
  // Core Thuto Bridge colours used throughout the application
  backgroundLight: '#F8FCFD',
  backgroundDark:  '#0A111A',
  surfaceDark:     '#1E2A36',
  surfaceAltDark:  '#222B36',

  // Splash gradient based on the shared app background and primary colour
  gradientTop:     '#0A111A',
  gradientMid:     '#173247',
  gradientBottom:  '#4A9FC6',

  // Shared project primary colour and transparent variants
  primary:         '#4A9FC6',
  primarySoft:     'rgba(74,159,198,0.20)',
  primaryFaint:    'rgba(74,159,198,0.10)',

  // Text colours consistent with the dark application theme
  white:           '#FFFFFF',
  whiteHigh:       'rgba(234,242,248,0.96)',
  whiteMed:        'rgba(234,242,248,0.74)',
  whiteLow:        'rgba(234,242,248,0.42)',

  // Illustration colours derived from the shared blue/teal identity
  book1:           '#4A9FC6',
  book2:           '#78BEDD',
  book3:           '#75B8A6',
};

const BASE = 4;
const sp   = (n: number) => n * BASE;

const PRIVACY_POLICY_URL = 'https://thuto-bridge-web.web.app/privacy-policy/';
const TERMS_OF_USE_URL = 'https://thuto-bridge-web.web.app/terms-of-use/';
const SUPPORT_URL = 'https://thuto-bridge-web.web.app/support/';


// ─────────────────────────────────────────────────────────────────────────────
// Animated book SVG — single book rendered as a View composition
// Each book has a cover, spine, and page stack
// ─────────────────────────────────────────────────────────────────────────────
type BookProps = {
  color:    string;
  width:    number;
  height:   number;
  rotation: number;  // slight tilt
  delay:    number;
  reduceMotion: boolean;
};

function AnimatedBook({ color, width, height, rotation, delay, reduceMotion }: BookProps) {
  const translateY = useRef(new Animated.Value(reduceMotion ? 0 : -180)).current;
  const opacity    = useRef(new Animated.Value(reduceMotion ? 1 :  0  )).current;
  const scale      = useRef(new Animated.Value(reduceMotion ? 1 : 0.8 )).current;

  useEffect(() => {
    if (reduceMotion) return;

    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(translateY, {
          toValue:         0,
          useNativeDriver: true,
          damping:         13,
          stiffness:       160,
          mass:            0.9,
        }),
        Animated.timing(opacity, {
          toValue:         1,
          duration:        220,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue:         1,
          useNativeDriver: true,
          damping:         14,
          stiffness:       180,
        }),
      ]),
    ]).start();
  }, []);

  const darkColor = shadeColor(color, -28);
  const pageColor = 'rgba(255,255,255,0.92)';

  return (
    <Animated.View
      style={{
        width,
        height,
        opacity,
        transform: [
          { translateY },
          { scale },
          { rotate: `${rotation}deg` },
        ],
      }}
    >
      {/* Page stack (visible on the right edge) */}
      <View
        style={{
          position:        'absolute',
          right:           2,
          top:             height * 0.06,
          bottom:          height * 0.06,
          width:           width * 0.12,
          backgroundColor: pageColor,
          borderRadius:    2,
        }}
      />
      {/* Spine */}
      <View
        style={{
          position:        'absolute',
          left:            0,
          top:             0,
          bottom:          0,
          width:           width * 0.14,
          backgroundColor: darkColor,
          borderTopLeftRadius:    6,
          borderBottomLeftRadius: 6,
        }}
      />
      {/* Cover */}
      <View
        style={{
          position:            'absolute',
          left:                width * 0.14,
          right:               width * 0.12,
          top:                 0,
          bottom:              0,
          backgroundColor:     color,
          borderTopRightRadius:    6,
          borderBottomRightRadius: 6,
        }}
      >
        {/* Decorative lines on cover */}
        {[0.28, 0.45, 0.62].map((pct, i) => (
          <View
            key={i}
            style={{
              position:        'absolute',
              top:             `${pct * 100}%`,
              left:            sp(3),
              right:           sp(3),
              height:          1.5,
              borderRadius:    1,
              backgroundColor: 'rgba(255,255,255,0.35)',
            }}
          />
        ))}
        {/* Small circle / badge on cover */}
        <View
          style={{
            position:        'absolute',
            bottom:          sp(3),
            right:           sp(3),
            width:           sp(5),
            height:          sp(5),
            borderRadius:    sp(2.5),
            backgroundColor: 'rgba(255,255,255,0.22)',
          }}
        />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating particle — a tiny star/dot that drifts upward
// ─────────────────────────────────────────────────────────────────────────────
type ParticleProps = {
  x: number; startY: number; size: number; duration: number; delay: number; reduceMotion: boolean;
};

function FloatingParticle({ x, startY, size, duration, delay, reduceMotion }: ParticleProps) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) return;

    Animated.sequence([
      Animated.delay(delay),
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.7, duration: duration * 0.3, useNativeDriver: true }),
            Animated.timing(opacity, { toValue: 0,   duration: duration * 0.7, useNativeDriver: true }),
          ]),
          Animated.timing(translateY, { toValue: -80, duration, useNativeDriver: true }),
        ]),
      ),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position:        'absolute',
        left:            x,
        bottom:          startY,
        width:           size,
        height:          size,
        borderRadius:    size / 2,
        backgroundColor: PALETTE.primary,
        opacity,
        transform:       [{ translateY }],
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Glow pulse on the CTA button
// ─────────────────────────────────────────────────────────────────────────────
function useGlowPulse(delay = 1800) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 1100, useNativeDriver: false }),
          Animated.timing(glow, { toValue: 0, duration: 1100, useNativeDriver: false }),
        ]),
      ).start();
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return glow;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature row item
// ─────────────────────────────────────────────────────────────────────────────
function FeatureItem({ icon, text, delay, reduceMotion }: { icon: string; text: string; delay: number; reduceMotion: boolean }) {
  const translateX = useRef(new Animated.Value(reduceMotion ? 0 : -24)).current;
  const opacity    = useRef(new Animated.Value(reduceMotion ? 1 :  0 )).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 140 }),
        Animated.timing(opacity,    { toValue: 1, duration: 300,          useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        flexDirection:  'row',
        alignItems:     'center',
        gap:            sp(3),
        opacity,
        transform:      [{ translateX }],
      }}
    >
      <View
        style={{
          width:           sp(8),
          height:          sp(8),
          borderRadius:    sp(4),
          backgroundColor: PALETTE.primarySoft,
          borderWidth:     1,
          borderColor:     `${PALETTE.primary}55`,
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
        }}
      >
        <Ionicons name={icon as any} size={15} color={PALETTE.primary} />
      </View>
      <Text style={{ fontSize: 13, lineHeight: 18, color: PALETTE.whiteMed, fontWeight: '500', flex: 1 }}>
        {text}
      </Text>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main splash screen
// ─────────────────────────────────────────────────────────────────────────────
export default function Splash() {
  const { t } = useLanguage();
  const { width, height } = useWindowDimensions();

  const uiMode = useMemo<'mobile' | 'tablet' | 'desktop'>(() => {
    if (width <= 479) return 'mobile';
    if (width <= 1023) return 'tablet';
    return 'desktop';
  }, [width]);

  const isMobile = uiMode === 'mobile';
  const isShortScreen = height < 720;
  const isVeryShortScreen = height < 640;

  useEffect(() => {
    if (!isMobile) {
      router.replace('/login');
    }
  }, [isMobile]);

  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const bgOpacity = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(reduceMotion ? 0 : 24)).current;
  const headlineOp = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const subtitleOp = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const ctaScale = useRef(new Animated.Value(reduceMotion ? 1 : 0.9)).current;
  const ctaOp = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const featuresOp = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  const glowAnim = useGlowPulse(1800);

  useEffect(() => {
    if (reduceMotion) {
      bgOpacity.setValue(1);
      headlineY.setValue(0);
      headlineOp.setValue(1);
      subtitleOp.setValue(1);
      ctaScale.setValue(1);
      ctaOp.setValue(1);
      featuresOp.setValue(1);
      return;
    }

    const animation = Animated.sequence([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 360,
        useNativeDriver: true,
      }),
      Animated.delay(220),
      Animated.parallel([
        Animated.spring(headlineY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 140,
        }),
        Animated.timing(headlineOp, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(subtitleOp, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.spring(ctaScale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 16,
          stiffness: 170,
        }),
        Animated.timing(ctaOp, {
          toValue: 1,
          duration: 240,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(featuresOp, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => animation.stop();
  }, [
    bgOpacity,
    ctaOp,
    ctaScale,
    featuresOp,
    headlineOp,
    headlineY,
    reduceMotion,
    subtitleOp,
  ]);

  const bookWidth = Math.min(
    width * (isVeryShortScreen ? 0.145 : isShortScreen ? 0.17 : 0.19),
    76,
  );
  const bookHeight = bookWidth * 1.42;
  const illustrationHeight =
    bookHeight + (isVeryShortScreen ? sp(5) : isShortScreen ? sp(7) : sp(10));

  const particles = useMemo(
    () => [
      { x: width * 0.08, startY: 80, size: 4, duration: 2800, delay: 900 },
      { x: width * 0.22, startY: 130, size: 3, duration: 3400, delay: 1200 },
      { x: width * 0.72, startY: 95, size: 5, duration: 2600, delay: 1050 },
      { x: width * 0.88, startY: 140, size: 3, duration: 3200, delay: 1400 },
      { x: width * 0.5, startY: 60, size: 2, duration: 3000, delay: 1600 },
    ],
    [width],
  );

  const glowBorderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [`${PALETTE.primary}44`, `${PALETTE.primary}CC`],
  });

  const glowShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 0.55],
  });

  const openExternalLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('[Splash] Could not open external link:', error);
    }
  };

  if (!isMobile) return null;

  return (
    <View style={styles.screen}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}>
        <LinearGradient
          colors={[
            PALETTE.gradientTop,
            PALETTE.gradientMid,
            PALETTE.gradientBottom,
          ]}
          locations={[0, 0.54, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View
        pointerEvents="none"
        style={[
          styles.backgroundGlow,
          {
            top: Math.max(height * 0.08, 54),
            width: Math.min(width * 0.72, 320),
            height: Math.min(width * 0.72, 320),
            borderRadius: Math.min(width * 0.36, 160),
          },
        ]}
      />

      {particles.map((particle, index) => (
        <FloatingParticle
          key={`${particle.x}-${index}`}
          {...particle}
          reduceMotion={reduceMotion}
        />
      ))}

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              minHeight: Math.max(height, 640),
              paddingHorizontal: sp(5),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View style={[styles.brandRow, { opacity: bgOpacity }]}>
            <View style={styles.brandIcon}>
              <Ionicons name="school" size={17} color={PALETTE.primary} />
            </View>
            <Text style={styles.brandText}>Thuto-Bridge</Text>
          </Animated.View>

          <View
            style={[
              styles.hero,
              {
                paddingTop: isVeryShortScreen
                  ? sp(4)
                  : isShortScreen
                    ? sp(6)
                    : sp(9),
                paddingBottom: isVeryShortScreen ? sp(5) : sp(8),
              },
            ]}
          >
            <View
              style={[
                styles.illustration,
                {
                  height: illustrationHeight,
                  width: Math.min(width * 0.72, 310),
                  marginBottom: isVeryShortScreen
                    ? sp(4)
                    : isShortScreen
                      ? sp(5)
                      : sp(7),
                },
              ]}
            >
              <View
                style={[
                  styles.bookShadow,
                  {
                    width: bookWidth * 2.7,
                  },
                ]}
              />

              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: width * 0.04,
                }}
              >
                <AnimatedBook
                  color={PALETTE.book3}
                  width={bookWidth}
                  height={bookHeight}
                  rotation={-12}
                  delay={reduceMotion ? 0 : 500}
                  reduceMotion={reduceMotion}
                />
              </View>

              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: width * 0.04,
                }}
              >
                <AnimatedBook
                  color={PALETTE.book2}
                  width={bookWidth}
                  height={bookHeight}
                  rotation={10}
                  delay={reduceMotion ? 0 : 320}
                  reduceMotion={reduceMotion}
                />
              </View>

              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  alignSelf: 'center',
                }}
              >
                <AnimatedBook
                  color={PALETTE.book1}
                  width={bookWidth * 1.08}
                  height={bookHeight * 1.08}
                  rotation={0}
                  delay={reduceMotion ? 0 : 140}
                  reduceMotion={reduceMotion}
                />
              </View>

              <Animated.View
                style={[
                  styles.capBadge,
                  {
                    top: 0,
                    opacity: headlineOp,
                    transform: [{ translateY: headlineY }],
                  },
                ]}
              >
                <Ionicons
                  name="school"
                  size={isVeryShortScreen ? 21 : 25}
                  color={PALETTE.primary}
                />
              </Animated.View>
            </View>

            <Animated.View
              style={[
                styles.headlineGroup,
                {
                  opacity: headlineOp,
                  transform: [{ translateY: headlineY }],
                  marginBottom: isVeryShortScreen ? sp(2) : sp(3),
                },
              ]}
            >
              <View style={styles.eyebrow}>
                <View style={styles.eyebrowDot} />
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.82}
                  style={styles.eyebrowText}
                >
                  {t('YOUR ACADEMIC JOURNEY STARTS HERE')}
                </Text>
              </View>

              <Text
                style={[
                  styles.headline,
                  {
                    fontSize: isVeryShortScreen
                      ? 29
                      : isShortScreen
                        ? 32
                        : 35,
                    lineHeight: isVeryShortScreen
                      ? 34
                      : isShortScreen
                        ? 38
                        : 41,
                  },
                ]}
                accessible
                accessibilityRole="header"
              >
                {t('Learn.')} {t('Discover.')}{'\n'}
                <Text style={{ color: PALETTE.primary }}>
                  {t('Achieve.')}
                </Text>
              </Text>
            </Animated.View>

            <Animated.Text
              style={[
                styles.subtitle,
                {
                  opacity: subtitleOp,
                  marginBottom: isVeryShortScreen ? sp(4) : sp(6),
                },
              ]}
            >
              {t(
                'Your all-in-one platform for university guidance, course discovery, and scholarship insights across Botswana.',
              )}
            </Animated.Text>

            <Animated.View
              style={[
                styles.ctaContainer,
                {
                  opacity: ctaOp,
                  transform: [{ scale: ctaScale }],
                  marginBottom: isVeryShortScreen ? sp(5) : sp(6),
                },
              ]}
            >
              {Platform.OS === 'web' ? (
                <Pressable
                  onPress={() => router.push('/login')}
                  style={({ pressed }) => [
                    styles.ctaButton,
                    {
                      opacity: pressed ? 0.88 : 1,
                      transform: pressed ? [{ scale: 0.98 }] : [],
                      boxShadow: `0 6px 28px ${PALETTE.primary}55`,
                    } as any,
                  ]}
                  accessibilityLabel={t('Get Started')}
                  accessibilityRole="button"
                  accessibilityHint={t('Proceed to login')}
                >
                  <Text style={styles.ctaText}>{t('Get Started')}</Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={PALETTE.gradientTop}
                  />
                </Pressable>
              ) : (
                <Animated.View
                  style={[
                    styles.ctaGlow,
                    {
                      borderColor: glowBorderColor,
                      ...Platform.select({
                        ios: {
                          shadowColor: PALETTE.primary,
                          shadowOffset: { width: 0, height: 6 },
                          shadowOpacity: glowShadowOpacity as any,
                          shadowRadius: 18,
                        },
                        android: { elevation: 8 },
                      }),
                    },
                  ]}
                >
                  <Pressable
                    onPress={() => router.push('/login')}
                    style={({ pressed }) => [
                      styles.ctaButton,
                      {
                        opacity: pressed ? 0.88 : 1,
                        transform: pressed ? [{ scale: 0.98 }] : [],
                      },
                    ]}
                    accessibilityLabel={t('Get Started')}
                    accessibilityRole="button"
                    accessibilityHint={t('Proceed to login')}
                  >
                    <Text style={styles.ctaText}>{t('Get Started')}</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={PALETTE.gradientTop}
                    />
                  </Pressable>
                </Animated.View>
              )}
            </Animated.View>

            <Animated.View
              style={[
                styles.featuresCard,
                {
                  opacity: featuresOp,
                },
              ]}
            >
              {[
                {
                  icon: 'book-outline',
                  text: t('Personalised course recommendations'),
                  delay: 1260,
                },
                {
                  icon: 'ribbon-outline',
                  text: t('Scholarship & funding opportunities'),
                  delay: 1380,
                },
                {
                  icon: 'trending-up-outline',
                  text: t('Track your academic progress'),
                  delay: 1500,
                },
              ].map((feature) => (
                <FeatureItem
                  key={feature.text}
                  icon={feature.icon}
                  text={feature.text}
                  delay={feature.delay}
                  reduceMotion={reduceMotion}
                />
              ))}
            </Animated.View>
          </View>

          <Animated.View style={[styles.legalFooter, { opacity: bgOpacity }]}>
            <View style={styles.legalDivider} />

            <View style={styles.legalLinks}>
              <Pressable
                onPress={() => void openExternalLink(PRIVACY_POLICY_URL)}
                accessibilityRole="link"
                accessibilityLabel={t('Privacy Policy')}
                hitSlop={8}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={styles.legalLinkText}>
                  {t('Privacy Policy')}
                </Text>
              </Pressable>

              <View style={styles.legalDot} />

              <Pressable
                onPress={() => void openExternalLink(TERMS_OF_USE_URL)}
                accessibilityRole="link"
                accessibilityLabel={t('Terms of Use')}
                hitSlop={8}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={styles.legalLinkText}>{t('Terms of Use')}</Text>
              </Pressable>

              <View style={styles.legalDot} />

              <Pressable
                onPress={() => void openExternalLink(SUPPORT_URL)}
                accessibilityRole="link"
                accessibilityLabel={t('Help')}
                hitSlop={8}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={styles.legalLinkText}>{t('Help')}</Text>
              </Pressable>
            </View>

            <Text style={styles.creditText}>
              {t('Designed and developed by Bright Code Studios')}
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: PALETTE.gradientTop,
  },
  safeArea: {
    flex: 1,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignSelf: 'center',
    paddingTop: sp(2),
    paddingBottom: sp(4),
  },
  backgroundGlow: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: PALETTE.primarySoft,
    ...Platform.select({
      ios: {
        shadowColor: PALETTE.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 56,
      },
    }),
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(2),
    minHeight: 42,
  },
  brandIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: PALETTE.primarySoft,
    borderWidth: 1,
    borderColor: `${PALETTE.primary}66`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 15,
    fontWeight: '800',
    color: PALETTE.whiteHigh,
    letterSpacing: 0.3,
  },
  hero: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  illustration: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  bookShadow: {
    position: 'absolute',
    bottom: -4,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.28)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
    }),
  },
  capBadge: {
    position: 'absolute',
    alignSelf: 'center',
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: PALETTE.primarySoft,
    borderWidth: 2,
    borderColor: `${PALETTE.primary}66`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headlineGroup: {
    width: '100%',
    alignItems: 'center',
  },
  eyebrow: {
    maxWidth: 320,
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp(2),
    paddingHorizontal: sp(3),
    paddingVertical: sp(1.5),
    borderRadius: 20,
    backgroundColor: PALETTE.primarySoft,
    borderWidth: 1,
    borderColor: `${PALETTE.primary}44`,
    marginBottom: sp(3),
  },
  eyebrowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PALETTE.primary,
    flexShrink: 0,
  },
  eyebrowText: {
    maxWidth: 272,
    fontSize: 10.5,
    fontWeight: '700',
    color: PALETTE.primary,
    letterSpacing: 0.9,
    textAlign: 'center',
  },
  headline: {
    color: PALETTE.white,
    textAlign: 'center',
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    maxWidth: 330,
    paddingHorizontal: sp(2),
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
    color: PALETTE.whiteMed,
    textAlign: 'center',
  },
  ctaContainer: {
    width: '88%',
    maxWidth: 340,
  },
  ctaGlow: {
    borderRadius: 17,
    borderWidth: 1.5,
  },
  ctaButton: {
    height: 54,
    borderRadius: 16,
    backgroundColor: PALETTE.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: sp(2),
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.gradientTop,
    letterSpacing: 0.3,
  },
  featuresCard: {
    width: '88%',
    maxWidth: 340,
    gap: sp(3),
    paddingHorizontal: sp(4),
    paddingVertical: sp(4),
    borderRadius: 18,
    backgroundColor: 'rgba(10,17,26,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(234,242,248,0.10)',
  },
  legalFooter: {
    width: '100%',
    alignItems: 'center',
    paddingTop: sp(3),
    paddingBottom: sp(2),
  },
  legalDivider: {
    width: '100%',
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(234,242,248,0.16)',
    marginBottom: sp(4),
  },
  legalLinks: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp(2),
  },
  legalLinkText: {
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: '700',
    color: PALETTE.whiteMed,
  },
  legalDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: PALETTE.whiteLow,
  },
  creditText: {
    marginTop: sp(2),
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: '500',
    color: PALETTE.whiteLow,
    textAlign: 'center',
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Utility — darken a hex colour by `amount` (0–100)
// ─────────────────────────────────────────────────────────────────────────────
function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const clamp = (value: number) => Math.max(0, Math.min(255, value));
  const red = clamp(((num >> 16) & 0xff) + amount);
  const green = clamp(((num >> 8) & 0xff) + amount);
  const blue = clamp((num & 0xff) + amount);

  return `#${((red << 16) | (green << 8) | blue)
    .toString(16)
    .padStart(6, '0')}`;
}
