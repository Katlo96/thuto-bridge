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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import StudentFooter from '../components/student/StudentFooter';

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
    if (width <= 479)  return 'mobile';
    if (width <= 1023) return 'tablet';
    return 'desktop';
  }, [width]);

  const isMobile = uiMode === 'mobile';

  // Redirect desktop/tablet → login immediately
  useEffect(() => {
    if (!isMobile) {
      router.replace('/login');
    }
  }, [isMobile]);

  // Respect system reduced-motion preference
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  // ── Orchestrated entrance animations ──────────────────────────────────────
  // Background fade
  const bgOpacity   = useRef(new Animated.Value(0)).current;
  // Headline
  const headlineY   = useRef(new Animated.Value(reduceMotion ? 0 : 28)).current;
  const headlineOp  = useRef(new Animated.Value(reduceMotion ? 1 :  0)).current;
  // Subtitle
  const subtitleOp  = useRef(new Animated.Value(reduceMotion ? 1 :  0)).current;
  // CTA
  const ctaScale    = useRef(new Animated.Value(reduceMotion ? 1 : 0.82)).current;
  const ctaOp       = useRef(new Animated.Value(reduceMotion ? 1 :  0  )).current;
  // Features
  const featuresOp  = useRef(new Animated.Value(reduceMotion ? 1 :  0  )).current;

  const glowAnim = useGlowPulse(1800);

  useEffect(() => {
    if (reduceMotion) {
      bgOpacity.setValue(1);
      return;
    }

    Animated.sequence([
      // Background fades in first
      Animated.timing(bgOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      // Books animate via their own internal timers (150, 350, 550ms after mount)
      // Headline at t≈900ms
      Animated.delay(400),
      Animated.parallel([
        Animated.spring(headlineY, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 130 }),
        Animated.timing(headlineOp, { toValue: 1, duration: 360, useNativeDriver: true }),
      ]),
      // Subtitle
      Animated.timing(subtitleOp, { toValue: 1, duration: 340, useNativeDriver: true }),
      // CTA
      Animated.parallel([
        Animated.spring(ctaScale, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }),
        Animated.timing(ctaOp,   { toValue: 1, duration: 280,          useNativeDriver: true }),
      ]),
      // Features
      Animated.timing(featuresOp, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [reduceMotion]);

  if (!isMobile) return null;

  const BOOK_W  = width * 0.20;
  const BOOK_H  = BOOK_W * 1.42;  // classic book proportions

  // Particles — seeded deterministically so no layout jitter
  const PARTICLES = useMemo(() => [
    { x: width * 0.08, startY: 80,  size: 4, duration: 2800, delay: 900  },
    { x: width * 0.22, startY: 130, size: 3, duration: 3400, delay: 1200 },
    { x: width * 0.72, startY: 95,  size: 5, duration: 2600, delay: 1050 },
    { x: width * 0.88, startY: 140, size: 3, duration: 3200, delay: 1400 },
    { x: width * 0.50, startY: 60,  size: 2, duration: 3000, delay: 1600 },
    { x: width * 0.35, startY: 190, size: 4, duration: 2900, delay: 1700 },
    { x: width * 0.62, startY: 170, size: 3, duration: 3100, delay: 1300 },
  ], [width]);

  const glowBorderColor = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [`${PALETTE.primary}44`, `${PALETTE.primary}CC`],
  });
  const glowShadowOpacity = glowAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0.15, 0.55],
  });

  return (
    <View style={{ flex: 1 }}>
      {/* ── Background gradient ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}>
        <LinearGradient
          colors={[PALETTE.gradientTop, PALETTE.gradientMid, PALETTE.gradientBottom]}
          locations={[0, 0.5, 1]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* ── Radial light blob behind books ── */}
      <View
        style={{
          position:        'absolute',
          top:             height * 0.12,
          alignSelf:       'center',
          width:           width * 0.75,
          height:          width * 0.75,
          borderRadius:    width * 0.375,
          backgroundColor: PALETTE.primarySoft,
          // blur via shadow on iOS, transform scale trick elsewhere
          ...Platform.select({
            ios: { shadowColor: PALETTE.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 60 },
          }),
        }}
      />

      {/* ── Floating particles ── */}
      {PARTICLES.map((p, i) => (
        <FloatingParticle key={i} {...p} reduceMotion={reduceMotion} />
      ))}

      <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', width: '100%' }} edges={['top', 'bottom']}>
        {/* ── Top logo / brand mark ── */}
        <Animated.View
          style={{
            paddingTop:      sp(4),
            paddingHorizontal: sp(6),
            flexDirection:   'row',
            alignItems:      'center',
            gap:             sp(2),
            opacity:         bgOpacity,
          }}
        >
          <View
            style={{
              width:           32,
              height:          32,
              borderRadius:    10,
              backgroundColor: PALETTE.primarySoft,
              borderWidth:     1,
              borderColor:     `${PALETTE.primary}66`,
              alignItems:      'center',
              justifyContent:  'center',
            }}
          >
            <Ionicons name="school" size={17} color={PALETTE.primary} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '800', color: PALETTE.whiteHigh, letterSpacing: 0.3 }}>
            Thuto-Bridge
          </Text>
        </Animated.View>

        {/* ── Centre content ── */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: sp(5) }}>

          {/* ── Stacked books animation ── */}
          {/* Books animate independently: book1 at 150ms, book2 at 350ms, book3 at 550ms */}
          <View
            style={{
              height:         BOOK_H + sp(8),
              width:          width * 0.72,
              alignItems:     'center',
              justifyContent: 'flex-end',
              marginBottom:   sp(8),
              position:       'relative',
            }}
          >
            {/* Shadow under the stack */}
            <View
              style={{
                position:        'absolute',
                bottom:          -4,
                width:           BOOK_W * 2.6,
                height:          16,
                borderRadius:    8,
                backgroundColor: 'rgba(0,0,0,0.28)',
                ...Platform.select({
                  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
                }),
              }}
            />

            {/* Book 3 — back/bottom of stack, tilted left */}
            <View style={{ position: 'absolute', bottom: 0, left: width * 0.04 }}>
              <AnimatedBook
                color={PALETTE.book3}
                width={BOOK_W}
                height={BOOK_H}
                rotation={-12}
                delay={reduceMotion ? 0 : 550}
                reduceMotion={reduceMotion}
              />
            </View>

            {/* Book 2 — middle, tilted slightly right */}
            <View style={{ position: 'absolute', bottom: 0, right: width * 0.04 }}>
              <AnimatedBook
                color={PALETTE.book2}
                width={BOOK_W}
                height={BOOK_H}
                rotation={10}
                delay={reduceMotion ? 0 : 350}
                reduceMotion={reduceMotion}
              />
            </View>

            {/* Book 1 — front/top, upright, gold */}
            <View style={{ position: 'absolute', bottom: 0, alignSelf: 'center' }}>
              <AnimatedBook
                color={PALETTE.book1}
                width={BOOK_W * 1.08}
                height={BOOK_H * 1.08}
                rotation={0}
                delay={reduceMotion ? 0 : 150}
                reduceMotion={reduceMotion}
              />
            </View>

            {/* Graduation cap above books */}
            <Animated.View
              style={{
                position:  'absolute',
                top:       0,
                alignSelf: 'center',
                opacity:   headlineOp,
                transform: [{ translateY: headlineY }],
              }}
            >
              <View
                style={{
                  width:           56,
                  height:          56,
                  borderRadius:    28,
                  backgroundColor: PALETTE.primarySoft,
                  borderWidth:     2,
                  borderColor:     `${PALETTE.primary}66`,
                  alignItems:      'center',
                  justifyContent:  'center',
                }}
              >
                <Ionicons name="school" size={26} color={PALETTE.primary} />
              </View>
            </Animated.View>
          </View>

          {/* ── Headline ── */}
          <Animated.View
            style={{
              opacity:   headlineOp,
              transform: [{ translateY: headlineY }],
              alignItems: 'center',
              marginBottom: sp(4),
            }}
          >
            {/* Eyebrow */}
            <View
              style={{
                flexDirection:     'row',
                alignItems:        'center',
                gap:               sp(2),
                paddingHorizontal: sp(4),
                paddingVertical:   sp(1),
                borderRadius:      20,
                backgroundColor:   PALETTE.primarySoft,
                borderWidth:       1,
                borderColor:       `${PALETTE.primary}44`,
                marginBottom:      sp(3),
              }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: PALETTE.primary }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: PALETTE.primary, letterSpacing: 1.2 }}>
                {t('YOUR ACADEMIC JOURNEY STARTS HERE')}
              </Text>
            </View>

            <Text
              style={{
                fontSize:    36,
                lineHeight:  43,
                fontWeight:  '900',
                color:       PALETTE.white,
                textAlign:   'center',
                letterSpacing: -0.5,
              }}
              accessible
              accessibilityRole="header"
            >
              {t('Learn.')}{'\n'}{t('Discover.')}{'\n'}
              <Text style={{ color: PALETTE.primary }}>{t('Achieve.')}</Text>
            </Text>
          </Animated.View>

          {/* ── Subtitle ── */}
          <Animated.Text
            style={{
              fontSize:   14,
              lineHeight: 22,
              fontWeight: '500',
              color:      PALETTE.whiteMed,
              textAlign:  'center',
              maxWidth:   300,
              opacity:    subtitleOp,
              marginBottom: sp(8),
            }}
          >
            {t('Your all-in-one platform for university guidance, course discovery, and scholarship insights across Botswana.')}
          </Animated.Text>

          {/* ── CTA button ── */}
          <Animated.View
            style={{
              opacity:       ctaOp,
              transform:     [{ scale: ctaScale }],
              width:         '85%',
              maxWidth:      320,
              marginBottom:  sp(8),
            }}
          >
            {Platform.OS === 'web' ? (
              <Pressable
                onPress={() => router.push('/login')}
                style={({ pressed }) => ({
                  height:          56,
                  borderRadius:    16,
                  backgroundColor: PALETTE.primary,
                  alignItems:      'center',
                  justifyContent:  'center',
                  flexDirection:   'row',
                  gap:             sp(2),
                  opacity:         pressed ? 0.88 : 1,
                  transform:       pressed ? [{ scale: 0.97 }] : [],
                  boxShadow:       `0 6px 28px ${PALETTE.primary}55`,
                } as any)}
                accessibilityLabel={t('Get Started')}
                accessibilityRole="button"
                accessibilityHint={t('Proceed to login')}
              >
                <Text style={{ fontSize: 16, fontWeight: '800', color: PALETTE.gradientTop, letterSpacing: 0.3 }}>
                  Get Started
                </Text>
                <Ionicons name="arrow-forward" size={18} color={PALETTE.gradientTop} />
              </Pressable>
            ) : (
              // On native we can use Animated.View for the glow border
              <Animated.View
                style={{
                  borderRadius:  16,
                  borderWidth:   1.5,
                  borderColor:   glowBorderColor,
                  ...Platform.select({
                    ios: {
                      shadowColor:    PALETTE.primary,
                      shadowOffset:   { width: 0, height: 6 },
                      shadowOpacity:  glowShadowOpacity as any,
                      shadowRadius:   18,
                    },
                    android: { elevation: 8 },
                  }),
                }}
              >
                <Pressable
                  onPress={() => router.push('/login')}
                  style={({ pressed }) => ({
                    height:          56,
                    borderRadius:    15,
                    backgroundColor: PALETTE.primary,
                    alignItems:      'center',
                    justifyContent:  'center',
                    flexDirection:   'row',
                    gap:             sp(2),
                    opacity:         pressed ? 0.88 : 1,
                    transform:       pressed ? [{ scale: 0.97 }] : [],
                  })}
                  accessibilityLabel={t('Get Started')}
                  accessibilityRole="button"
                  accessibilityHint={t('Proceed to login')}
                >
                  <Text style={{ fontSize: 16, fontWeight: '800', color: PALETTE.gradientTop, letterSpacing: 0.3 }}>
                    {t('Get Started')}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={PALETTE.gradientTop} />
                </Pressable>
              </Animated.View>
            )}
          </Animated.View>

          {/* ── Feature list ── */}
          <Animated.View
            style={{
              opacity:  featuresOp,
              gap:      sp(3),
              width:    '85%',
              maxWidth: 320,
            }}
          >
            {[
              { icon: 'book-outline',       text: t('Personalised course recommendations'),  delay: 1350 },
              { icon: 'ribbon-outline',     text: t('Scholarship & funding opportunities'),  delay: 1480 },
              { icon: 'trending-up-outline',text: t('Track your academic progress'),         delay: 1610 },
            ].map((f, i) => (
              <FeatureItem key={i} icon={f.icon} text={f.text} delay={f.delay} reduceMotion={reduceMotion} />
            ))}
          </Animated.View>
        </View>

        <Animated.View
          style={{
            opacity: bgOpacity,
            paddingHorizontal: sp(4),
            paddingBottom: sp(3),
            width: '100%',
          }}
        >
          <StudentFooter
            topSpacing={sp(4)}
            maxWidth={1240}
          />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility — darken a hex colour by `amount` (0–100)
// ─────────────────────────────────────────────────────────────────────────────
function shadeColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const r = clamp(((num >> 16) & 0xff) + amount);
  const g = clamp(((num >>  8) & 0xff) + amount);
  const b = clamp(( num        & 0xff) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}