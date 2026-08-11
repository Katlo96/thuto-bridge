// screens/student/StudentNotificationsScreen.tsx
import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform,
  Animated,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  StudentMenuProvider,
  useStudentMenu,
} from '../../components/student/StudentMenu';
import { useLanguage } from '../../contexts/LanguageContext';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Design System
// ─────────────────────────────────────────────────────────────────────────────
import {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';
import StudentFooter from '../../components/student/StudentFooter';

// ─────────────────────────────────────────────────────────────────────────────
// Local Elevation Helper
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = 0.28;
    const radius = intensity === 'sm' ? 6 : intensity === 'md' ? 14 : 22;
    const offsetY = intensity === 'sm' ? 2 : intensity === 'md' ? 5 : 10;

    return (Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: offsetY },
        shadowOpacity: opacity,
        shadowRadius: radius,
      },
      android: {
        elevation: intensity === 'sm' ? 3 : intensity === 'md' ? 6 : 12,
      },
      web: {
        boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})`,
      } as any,
      default: {},
    }) ?? {}) as ViewStyle;
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedCard — fade+slide in on mount, staggered by `delay`
// ─────────────────────────────────────────────────────────────────────────────
function AnimatedCard({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, delay, useNativeDriver: true, damping: 18, stiffness: 120 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PulsingBadge — a slow, subtle breathing ring behind the hero icon.
// Purely decorative, native-driver only, so it costs nothing on JS thread.
// ─────────────────────────────────────────────────────────────────────────────
function PulsingRing({ color, size }: { color: string; size: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.35, duration: 1800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 1800, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.35, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Feature preview data — what students will see once this ships.
   Purely informational; nothing here is interactive since the feature
   itself doesn't exist yet. Icons chosen to be immediately legible at a
   glance rather than merely decorative.
───────────────────────────────────────────────────────────────────────────── */
type PreviewFeature = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: 'primary' | 'success' | 'warning';
};

const PREVIEW_FEATURES: PreviewFeature[] = [
  {
    key: 'scholarships-new',
    icon: 'ribbon-outline',
    title: 'New scholarships uploaded',
    description: 'Be first to know the moment a new scholarship matching your profile is added.',
    color: 'success',
  },
  {
    key: 'scholarships-expiring',
    icon: 'hourglass-outline',
    title: 'Scholarships closing soon',
    description: 'Timely reminders before application windows close, so nothing is missed.',
    color: 'warning',
  },
  {
    key: 'courses-new',
    icon: 'book-outline',
    title: 'New courses added',
    description: 'Alerts when new courses are published across our partner institutions.',
    color: 'primary',
  },
  {
    key: 'institutions-new',
    icon: 'business-outline',
    title: 'New universities & colleges',
    description: 'Updates whenever a new university or college joins the platform.',
    color: 'primary',
  },
  {
    key: 'brigades-new',
    icon: 'construct-outline',
    title: 'New brigades & their courses',
    description: 'Notifications covering brigades and the vocational courses they offer.',
    color: 'success',
  },
  {
    key: 'general-updates',
    icon: 'megaphone-outline',
    title: 'Project announcements',
    description: 'General updates and important announcements about Thuto Bridge.',
    color: 'warning',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Provider Wrapper
───────────────────────────────────────────────────────────────────────────── */
export default function StudentNotificationsScreen() {
  return (
    <StudentMenuProvider>
      <StudentNotificationsContent />
    </StudentMenuProvider>
  );
}

function StudentNotificationsContent() {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { t } = useLanguage();
  const { openMenu } = useStudentMenu();
  const heroElevation = useElevation('lg');
  const cardElevation = useElevation('sm');

  const breakpoint = useMemo<'mobile' | 'tablet' | 'desktop'>(() => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isTablet = breakpoint === 'tablet';
  const isMobile = breakpoint === 'mobile';

  // Feature-card width: 1 column on mobile, 2 on tablet, 3 on desktop.
  // Percentages (rather than fixed pixels) so every card keeps scaling
  // cleanly across phones, tablets, foldables, and desktop breakpoints.
  const cardWidth = isDesktop ? '31.5%' : isTablet ? '48%' : '100%';

  const heroIconColor = colors.primary;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding: isMobile ? spacing(5) : spacing(7),
            maxWidth: isDesktop ? 1280 : '100%',
            alignSelf: 'center',
            width: '100%',
            paddingBottom: spacing(12),
          }}
        >
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: spacing(7),
            }}
          >
            <View>
              <Text style={[typography.h1, { color: colors.textPrimary }]}>
                {t('Notifications')}
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, marginTop: spacing(1) },
                ]}
              >
                {t('Updates, deadlines & important alerts')}
              </Text>
            </View>

            <Pressable
              onPress={openMenu}
              accessibilityRole="button"
              accessibilityLabel={t('Open student menu')}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: radii.lg,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
                transform: pressed ? [{ scale: 0.96 }] : [],
              })}
            >
              <Ionicons name="menu" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Hero: in-development status */}
          <AnimatedCard delay={0}>
            <View
              style={[
                {
                  backgroundColor: colors.surface,
                  borderRadius: radii.xxl,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                },
                heroElevation,
              ]}
            >
              <View style={{ height: 4, backgroundColor: heroIconColor }} />

              <View
                style={{
                  padding: isMobile ? spacing(7) : spacing(10),
                  alignItems: 'center',
                  gap: spacing(5),
                }}
              >
                {/* Icon with pulsing ring */}
                <View
                  style={{
                    width: 88,
                    height: 88,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PulsingRing color={heroIconColor} size={88} />
                  <View
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      backgroundColor: `${heroIconColor}18`,
                      borderWidth: 1.5,
                      borderColor: `${heroIconColor}44`,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="notifications-outline" size={32} color={heroIconColor} />
                  </View>
                </View>

                {/* Status pill */}
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing(2),
                    paddingHorizontal: spacing(4),
                    paddingVertical: spacing(2),
                    borderRadius: radii.pill,
                    backgroundColor: `${colors.warning}18`,
                    borderWidth: 1,
                    borderColor: `${colors.warning}44`,
                  }}
                >
                  <Ionicons name="construct-outline" size={13} color={colors.warning} />
                  <Text
                    style={[
                      typography.caption,
                      { color: colors.warning, fontWeight: '700', letterSpacing: 0.5, fontSize: 11 },
                    ]}
                  >
                    {t('CURRENTLY IN TESTING')}
                  </Text>
                </View>

                {/* Headline */}
                <Text
                  style={[
                    typography.h2,
                    { color: colors.textPrimary, textAlign: 'center', maxWidth: 480 },
                  ]}
                >
                  {t('Notifications are still being built')}
                </Text>

                {/* Body copy */}
                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.textSecondary,
                      textAlign: 'center',
                      lineHeight: 24,
                      maxWidth: 520,
                    },
                  ]}
                >
                  {t(
                    'This part of Thuto Bridge is undergoing testing ahead of full release. Once the platform is complete, this is where you\u2019ll receive timely updates tailored to your studies.'
                  )}
                </Text>
              </View>
            </View>
          </AnimatedCard>

          {/* What's coming */}
          <View style={{ marginTop: spacing(9) }}>
            <AnimatedCard delay={60}>
              <View style={{ marginBottom: spacing(5) }}>
                <Text style={[typography.h2, { color: colors.textPrimary }]}>
                  {t('What you\u2019ll be notified about')}
                </Text>
                <Text
                  style={[
                    typography.body,
                    { color: colors.textMuted, marginTop: spacing(1), lineHeight: 22 },
                  ]}
                >
                  {t('A preview of what goes live here once the full platform launches.')}
                </Text>
              </View>
            </AnimatedCard>

            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing(4),
              }}
            >
              {PREVIEW_FEATURES.map((feature, i) => {
                const accent =
                  feature.color === 'success'
                    ? colors.success
                    : feature.color === 'warning'
                    ? colors.warning
                    : colors.primary;

                return (
                  <AnimatedCard
                    key={feature.key}
                    delay={100 + i * 50}
                    style={{ width: cardWidth as any }}
                  >
                    <View
                      style={[
                        {
                          backgroundColor: colors.surface,
                          borderRadius: radii.xl,
                          borderWidth: 1,
                          borderColor: colors.border,
                          padding: spacing(5),
                          gap: spacing(3),
                          height: '100%',
                        },
                        cardElevation,
                      ]}
                    >
                      <View
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: radii.lg,
                          backgroundColor: `${accent}18`,
                          borderWidth: 1,
                          borderColor: `${accent}3A`,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Ionicons name={feature.icon} size={20} color={accent} />
                      </View>

                      <Text
                        style={[
                          typography.bodyStrong,
                          { color: colors.textPrimary, fontSize: 15 },
                        ]}
                      >
                        {t(feature.title)}
                      </Text>

                      <Text
                        style={[
                          typography.caption,
                          { color: colors.textMuted, lineHeight: 18 },
                        ]}
                      >
                        {t(feature.description)}
                      </Text>
                    </View>
                  </AnimatedCard>
                );
              })}
            </View>
          </View>

          {/* Closing reassurance */}
          <AnimatedCard delay={100 + PREVIEW_FEATURES.length * 50 + 60}>
            <View
              style={{
                marginTop: spacing(8),
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: spacing(3),
                padding: spacing(4),
                borderRadius: radii.lg,
                backgroundColor: `${colors.primary}0D`,
                borderWidth: 1,
                borderColor: `${colors.primary}26`,
              }}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={colors.primary}
                style={{ marginTop: 1 }}
              />
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, flex: 1, lineHeight: 18 },
                ]}
              >
                {t(
                  'No action is needed from you right now \u2014 this screen will update automatically once notifications are live.'
                )}
              </Text>
            </View>
          </AnimatedCard>

          <StudentFooter
            topSpacing={isMobile ? spacing(8) : spacing(10)}
            maxWidth={1280}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}