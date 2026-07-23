import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  Linking,
  useWindowDimensions,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  StudentMenuProvider,
  useStudentMenu,
} from '../../components/student/StudentMenu';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';
import StudentFooter from '../../components/student/StudentFooter';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

type PolicySection = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  accent: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Content - Thuto-Bridge
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS: PolicySection[] = [
  {
    icon: 'document-text-outline',
    title: 'Information We Collect',
    body: 'Thuto-Bridge collects your profile details, academic results, uploaded documents, application activity, programme preferences, and how you use the platform – so we can match you to the right universities and bursaries in Botswana and beyond.',
    accent: '#3B82F6',
  },
  {
    icon: 'analytics-outline',
    title: 'How We Use Your Information',
    body: 'Your information is used to personalise recommendations, process applications, send deadline reminders, improve the student experience, provide support, and generate anonymised insights for partner institutions.',
    accent: '#14B8A6',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Data Protection',
    body: 'We protect your data with encrypted storage, role-based access controls, secure Botswana-based infrastructure, and regular security reviews. Your academic records are never sold.',
    accent: '#22C55E',
  },
  {
    icon: 'people-outline',
    title: 'Sharing of Information',
    body: 'We only share your information with universities, bursary providers, and service partners you apply to through Thuto-Bridge, or where required by law in Botswana. You control which applications go out.',
    accent: '#6366F1',
  },
  {
    icon: 'settings-outline',
    title: 'Your Choices & Rights',
    body: 'You can view, update, or export your profile at any time in Settings. You may request correction or deletion of your data by emailing privacy@thutobridge.com. We respond within 30 days.',
    accent: '#F59E0B',
  },
  {
    icon: 'refresh-outline',
    title: 'Policy Updates',
    body: 'This policy is reviewed regularly as Thuto-Bridge grows. We will notify you in-app and by email for any material changes. Last updated: January 2026.',
    accent: '#EC4899',
  },
];

const DATA_RIGHTS = [
  { label: 'Access your data', icon: 'eye-outline' as const },
  { label: 'Correct mistakes', icon: 'create-outline' as const },
  { label: 'Export a copy', icon: 'download-outline' as const },
  { label: 'Request deletion', icon: 'trash-outline' as const },
];

// ─────────────────────────────────────────────────────────────────────────────
// Elevation
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = 0.08;
    const radius = intensity === 'sm' ? 8 : intensity === 'md' ? 16 : 28;
    const offsetY = intensity === 'sm' ? 2 : intensity === 'md' ? 6 : 12;
    return (
      Platform.select({
        ios: {
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: offsetY },
          shadowOpacity: opacity + 0.05,
          shadowRadius: radius,
        },
        android: { elevation: intensity === 'sm' ? 2 : intensity === 'md' ? 4 : 8 },
        web: { boxShadow: `0 ${offsetY}px ${radius}px rgba(15,23,42,${opacity})` } as any,
        default: {},
      }) ?? {}
    ) as ViewStyle;
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionCard
// ─────────────────────────────────────────────────────────────────────────────
function SectionCard({
  index,
  icon,
  title,
  body,
  accent,
}: PolicySection & { index: number }) {
  const colors = useTheme();
  const { t } = useLanguage();
  const elevation = useElevation('md');

  return (
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        elevation,
      ]}
    >
      <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 3, backgroundColor: accent }} />
      <View style={{ padding: spacing(5.5), paddingLeft: spacing(6) }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3.5) }}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              backgroundColor: `${accent}14`,
              borderWidth: 1,
              borderColor: `${accent}2A`,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <Ionicons name={icon} size={21} color={accent} />
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(1.5) }}>
              <View
                style={{
                  paddingHorizontal: spacing(2),
                  paddingVertical: 3,
                  borderRadius: radii.pill,
                  backgroundColor: `${accent}14`,
                }}
              >
                <Text style={[typography.caption, { color: accent, fontWeight: '700', fontSize: 10.5 }]}>
                  SECTION {index + 1}
                </Text>
              </View>
            </View>
            <Text style={[typography.h2, { color: colors.textPrimary, fontSize: 17, marginBottom: spacing(2) }]}>
              {t(title)}
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 23, fontSize: 14.5 }]}>
              {t(body)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function SidebarPanel() {
  const colors = useTheme();
  const { t } = useLanguage();
  const elevation = useElevation('md');

  return (
    <View style={{ width: 320, flexShrink: 0, gap: spacing(5) }}>
      {/* Quick Index */}
      <View
        style={[
          {
            backgroundColor: colors.surface,
            borderRadius: radii.xxl,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
          },
          elevation,
        ]}
      >
        <View style={{ height: 3, backgroundColor: colors.primary }} />
        <View style={{ padding: spacing(5) }}>
          <Text style={[typography.h2, { color: colors.textPrimary, fontSize: 15.5, marginBottom: spacing(3.5) }]}>
            Privacy Index
          </Text>
          <View style={{ gap: spacing(2) }}>
            {SECTIONS.map((s, i) => (
              <View
                key={s.title}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing(2.5),
                  paddingVertical: spacing(1.5),
                }}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: `${s.accent}18`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={[typography.caption, { color: s.accent, fontWeight: '700', fontSize: 10 }]}>
                    {i + 1}
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, fontWeight: '600' }]} numberOfLines={1}>
                  {s.title}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Data rights */}
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing(5),
        }}
      >
        <Text style={[typography.label, { color: colors.textPrimary, marginBottom: spacing(3) }]}>
          Your data rights
        </Text>
        <View style={{ gap: spacing(2.5) }}>
          {DATA_RIGHTS.map(r => (
            <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2.5) }}>
              <Ionicons name={r.icon} size={15} color={colors.textSecondary} />
              <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13.5 }]}>{t(r.label)}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Contact DPO */}
      <View
        style={{
          padding: spacing(4.5),
          backgroundColor: `${colors.primary}0F`,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: `${colors.primary}22`,
          borderLeftWidth: 3,
          borderLeftColor: colors.primary,
        }}
      >
        <Text style={[typography.label, { color: colors.textPrimary, marginBottom: spacing(1.5), fontSize: 13 }]}>
          Questions about privacy?
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: spacing(2.5) }]}>
          Contact our Data Protection Officer at Thuto-Bridge.
        </Text>
        <Pressable
          onPress={() => Linking.openURL('mailto:privacy@thutobridge.com')}
          accessibilityRole="link"
          accessibilityLabel="privacy@thutobridge.com"
        >
          <Text style={[typography.label, { color: colors.primary, fontSize: 13 }]}>privacy@thutobridge.com →</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Content
// ─────────────────────────────────────────────────────────────────────────────
function PrivacyPolicyContent() {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { t } = useLanguage();
  const { openMenu } = useStudentMenu();
  const elevMd = useElevation('md');
  const elevLg = useElevation('lg');

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 720) return 'mobile';
    if (width < 1100) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const padX = isMobile ? spacing(4) : isTablet ? spacing(5) : spacing(8);

  const NavBar = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: padX,
          paddingVertical: spacing(3.5),
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: spacing(3),
        },
        elevMd,
      ]}
    >
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel={t('Go Back')}
        style={({ pressed }) => ({
          width: 42,
          height: 42,
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.78 : 1,
        })}
      >
        <Ionicons name="arrow-back" size={19} color={colors.primary} />
      </Pressable>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typography.h2, { color: colors.textPrimary, fontSize: 16.5 }]} numberOfLines={1}>
          Privacy Policy
        </Text>
        {!isMobile && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            Thuto-Bridge · How we protect student data
          </Text>
        )}
      </View>

      {!isMobile && (
        <Pressable
          onPress={() => router.push('/student/settings')}
          accessibilityRole="button"
          accessibilityLabel={t('Settings')}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(2),
            paddingHorizontal: spacing(3.5),
            paddingVertical: spacing(2),
            borderRadius: radii.lg,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="settings-outline" size={14} color={colors.textSecondary} />
          <Text style={[typography.label, { color: colors.textSecondary, fontSize: 12.5 }]}>Settings</Text>
        </Pressable>
      )}

      <Pressable
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel={t('Open student menu')}
        style={({ pressed }) => ({
          width: 42,
          height: 42,
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="menu" size={21} color={colors.textPrimary} />
      </Pressable>
    </View>
  );

  const HeroBanner = (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          marginBottom: spacing(7),
        },
        elevLg,
      ]}
    >
      <View style={{ height: 4, backgroundColor: colors.primary }} />
      <View style={{ padding: isMobile ? spacing(5) : spacing(7) }}>
        <View
          style={{
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: spacing(4),
          }}
        >
          <View style={{ flex: 1, maxWidth: 580 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(2),
                paddingHorizontal: spacing(3),
                paddingVertical: spacing(1.5),
                borderRadius: radii.pill,
                backgroundColor: `${colors.primary}14`,
                borderWidth: 1,
                borderColor: `${colors.primary}2A`,
                marginBottom: spacing(3.5),
              }}
            >
              <Ionicons name="shield-checkmark-outline" size={13} color={colors.primary} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', letterSpacing: 0.3 }]}>
                PRIVACY & SECURITY
              </Text>
            </View>

            <Text
              style={[
                typography.hero,
                { color: colors.textPrimary, fontSize: isMobile ? 26 : 32, lineHeight: isMobile ? 32 : 38 },
              ]}
            >
              Your information, handled responsibly
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: spacing(2.5), lineHeight: 23, fontSize: 15, maxWidth: 520 },
              ]}
            >
              Thuto-Bridge is built for Botswana students first. We collect only what we need to get you into university, protect it carefully, and never sell your data.
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(2),
                marginTop: spacing(4),
                flexWrap: 'wrap',
              }}
            >
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: spacing(2.5), paddingVertical: spacing(1.5),
                borderRadius: radii.pill, backgroundColor: `${colors.success}14`,
                borderWidth: 1, borderColor: `${colors.success}28`,
              }}>
                <Ionicons name="lock-closed" size={12} color={colors.success} />
                <Text style={[typography.caption, { color: colors.success, fontWeight: '700' }]}>{t('Encrypted')}</Text>
              </View>
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: 6,
                paddingHorizontal: spacing(2.5), paddingVertical: spacing(1.5),
                borderRadius: radii.pill, backgroundColor: colors.surfaceAlt,
                borderWidth: 1, borderColor: colors.border,
              }}>
                <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                  Effective Jan 2026
                </Text>
              </View>
            </View>
          </View>

          {!isMobile && (
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 28,
                backgroundColor: `${colors.primary}10`,
                borderWidth: 1,
                borderColor: `${colors.primary}22`,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Ionicons name="lock-closed-outline" size={44} color={colors.primary} />
            </View>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {NavBar}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(10) }}>
          <View
            style={{
              paddingHorizontal: padX,
              paddingTop: spacing(isMobile ? 5 : 7),
              maxWidth: 1200,
              alignSelf: 'center',
              width: '100%',
            }}
          >
            {/* Breadcrumb */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2.5), marginBottom: spacing(4), flexWrap: 'wrap' }}>
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel={t('Go Back')}
                style={({ pressed }) => ({
                  flexDirection: 'row', alignItems: 'center', gap: spacing(1.5),
                  paddingHorizontal: spacing(3), paddingVertical: spacing(1.5),
                  borderRadius: radii.lg, backgroundColor: colors.surfaceAlt,
                  borderWidth: 1, borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="arrow-back" size={14} color={colors.primary} />
                <Text style={[typography.label, { color: colors.primary, fontSize: 12.5 }]}>{t('Go Back')}</Text>
              </Pressable>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t('Settings › Privacy Policy')}</Text>
            </View>

            {HeroBanner}

            <View
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                gap: spacing(isDesktop ? 8 : 5),
                alignItems: 'flex-start',
              }}
            >
              <View style={{ flex: 1, minWidth: 0, width: '100%', gap: spacing(4) }}>
                <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '600', letterSpacing: 0.4 }]}>
                  PRIVACY SECTIONS · {SECTIONS.length} ITEMS
                </Text>
                {SECTIONS.map((s, i) => (
                  <SectionCard key={s.title} index={i} {...s} />
                ))}

                {/* Student-friendly notice */}
                <View
                  style={{
                    marginTop: spacing(3),
                    padding: spacing(5),
                    backgroundColor: colors.surface,
                    borderRadius: radii.xxl,
                    borderWidth: 1,
                    borderColor: colors.border,
                    flexDirection: 'row',
                    gap: spacing(3.5),
                    alignItems: 'flex-start',
                  }}
                >
                  <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[typography.label, { color: colors.textPrimary, marginBottom: spacing(1) }]}>
                      Plain-language promise
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 21, fontSize: 13.5 }]}>
                      This policy is written for students, not lawyers. If anything is unclear, email privacy@thutobridge.com and we’ll explain it in Setswana or English – your choice.
                    </Text>
                  </View>
                </View>
              </View>

              {isDesktop && <SidebarPanel />}
            </View>

            <StudentFooter
              topSpacing={isMobile ? spacing(8) : spacing(10)}
              maxWidth={1200}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <StudentMenuProvider>
      <PrivacyPolicyContent />
    </StudentMenuProvider>
  );
}