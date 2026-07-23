import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
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

type TermSection = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  accent: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Content - Thuto-Bridge
// ─────────────────────────────────────────────────────────────────────────────

const SECTIONS: TermSection[] = [
  {
    icon: 'checkmark-circle-outline',
    title: 'Acceptance of Use',
    body: 'By using Thuto-Bridge, you agree to use the platform responsibly and lawfully. Thuto-Bridge helps Botswana students discover programmes, submit applications, track results, and find bursaries – all in one place.',
    accent: '#3B82F6',
  },
  {
    icon: 'lock-closed-outline',
    title: 'Account Responsibility',
    body: 'You are responsible for keeping your login details secure and your profile accurate. Activity under your Thuto-Bridge account is your responsibility – report any unauthorised access to support@thutobridge.com immediately.',
    accent: '#14B8A6',
  },
  {
    icon: 'document-text-outline',
    title: 'Information Accuracy',
    body: 'Ensure your personal details, BGCSE/equivalent results, and uploaded documents are correct and up to date. Incorrect information may affect programme matches, application outcomes, or bursary eligibility.',
    accent: '#F59E0B',
  },
  {
    icon: 'cloud-outline',
    title: 'Platform Availability',
    body: 'We aim for 99%+ uptime during application season, but maintenance and feature updates may cause brief interruptions. We’ll always notify you in-app ahead of planned downtime.',
    accent: '#6366F1',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Appropriate Use',
    body: 'Do not misuse Thuto-Bridge, interfere with its performance, attempt unauthorised access, or submit false academic records, offensive content, or fraudulent applications. Violations may result in account suspension.',
    accent: '#EF4444',
  },
  {
    icon: 'refresh-circle-outline',
    title: 'Changes to Terms',
    body: 'These terms may be updated as Thuto-Bridge grows. We’ll notify you in-app and by email for material changes. Continued use after an update means you accept the revised terms.',
    accent: '#EC4899',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Elevation helper
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
}: TermSection & { index: number }) {
  const { t } = useLanguage();
  const colors = useTheme();
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
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(2),
                marginBottom: spacing(1.5),
              }}
            >
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
// Sidebar panel
// ─────────────────────────────────────────────────────────────────────────────
function SidebarPanel() {
  const { t } = useLanguage();
  const colors = useTheme();
  const elevation = useElevation('md');

  return (
    <View style={{ width: 320, flexShrink: 0, gap: spacing(5) }}>
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
        <View style={{ padding: spacing(5), gap: spacing(4) }}>
          <Text style={[typography.h2, { color: colors.textPrimary, fontSize: 15.5 }]}>
            Quick Index
          </Text>

          <View style={{ gap: spacing(2) }}>
            {SECTIONS.map((s, i) => (
              <View
                key={s.title}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing(2.5),
                  paddingVertical: spacing(1.25),
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
                <Text
                  style={[typography.caption, { color: colors.textSecondary, flex: 1, fontWeight: '600' }]}
                  numberOfLines={1}
                >
                  {s.title}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ height: 1, backgroundColor: colors.divider }} />

          <Pressable
            onPress={() => router.push('/student/settings')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing(2.5),
              padding: spacing(3.5),
              borderRadius: radii.xl,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
            <Text style={[typography.label, { color: colors.textSecondary, flex: 1, fontSize: 13 }]}>
              Back to Settings
            </Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </Pressable>

          <View
            style={{
              padding: spacing(3.5),
              backgroundColor: `${colors.primary}0F`,
              borderRadius: radii.lg,
              borderLeftWidth: 3,
              borderLeftColor: colors.primary,
            }}
          >
            <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18, fontSize: 12.5 }]}>
              Effective January 2026 · Applies to all Thuto-Bridge student users.
            </Text>
          </View>
        </View>
      </View>

      {/* Help card */}
      <View
        style={{
          padding: spacing(4.5),
          backgroundColor: colors.surface,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={[typography.label, { color: colors.textPrimary, marginBottom: spacing(1.5) }]}>
          Need help understanding these terms?
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: spacing(2.5) }]}>
          Our student support team is happy to explain anything in plain English or Setswana.
        </Text>
        <Pressable
          onPress={() => router.push('/student/contact-support')}
          accessibilityRole="button"
          accessibilityLabel={t('Contact Support')}
        >
          <Text style={[typography.label, { color: colors.primary, fontSize: 13 }]}>{t('Contact Support')} →</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────────────────────
function TermsConditionsContent() {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const colors = useTheme();
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
          Terms & Conditions
        </Text>
        {!isMobile && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            Thuto-Bridge · Platform usage terms
          </Text>
        )}
      </View>

      <Pressable
        onPress={() => router.push('/student/settings')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(2),
          paddingHorizontal: isMobile ? spacing(2.5) : spacing(3.5),
          paddingVertical: spacing(2),
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="settings-outline" size={14} color={colors.textSecondary} />
        {!isMobile && (
          <Text style={[typography.label, { color: colors.textSecondary, fontSize: 12.5 }]}>{t('Settings')}</Text>
        )}
      </Pressable>

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
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing(4),
            flexWrap: 'wrap',
          }}
        >
          <View style={{ flex: 1, minWidth: 240 }}>
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
              <Ionicons name="document-text-outline" size={13} color={colors.primary} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', letterSpacing: 0.3 }]}>
                {t('LEGAL')}
              </Text>
            </View>

            <Text
              style={[
                typography.hero,
                { color: colors.textPrimary, fontSize: isMobile ? 26 : 32, lineHeight: isMobile ? 32 : 38 },
              ]}
            >
              Terms of Use
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: spacing(2.5), lineHeight: 23, fontSize: 15, maxWidth: 520 },
              ]}
            >
              Please review the conditions that guide responsible use of Thuto-Bridge. These plain-language terms apply to all students on the platform.
            </Text>
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing(2),
              paddingHorizontal: spacing(3),
              paddingVertical: spacing(2),
              borderRadius: radii.pill,
              backgroundColor: `${colors.primary}14`,
              borderWidth: 1,
              borderColor: `${colors.primary}2A`,
              alignSelf: 'flex-start',
            }}
          >
            <Ionicons name="list-outline" size={14} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
              {SECTIONS.length} {t('sections')}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(2.5),
            marginTop: spacing(5),
            padding: spacing(3),
            backgroundColor: `${colors.primary}0E`,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: `${colors.primary}1E`,
          }}
        >
          <Ionicons name="calendar-outline" size={15} color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
            Effective January 2026 · Thuto-Bridge student users
          </Text>
        </View>
      </View>
    </View>
  );

  const MobileIndex = isMobile && (
    <View
      style={{
        marginBottom: spacing(5),
        padding: spacing(4),
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing(2),
      }}
    >
      <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.4, fontWeight: '600' }]}>
        SECTIONS
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
        {SECTIONS.map((s, i) => (
          <View
            key={s.title}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing(1.5),
              paddingHorizontal: spacing(2.5),
              paddingVertical: spacing(1.25),
              borderRadius: radii.pill,
              backgroundColor: `${s.accent}12`,
              borderWidth: 1,
              borderColor: `${s.accent}28`,
            }}
          >
            <Text style={[typography.caption, { color: s.accent, fontWeight: '700', fontSize: 10 }]}>{i + 1}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600', fontSize: 11 }]}>
              {t(s.title).split(' ')[0]}
            </Text>
          </View>
        ))}
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
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t('Settings › Terms & Conditions')}</Text>
            </View>

            {HeroBanner}

            <View
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                gap: spacing(isDesktop ? 8 : 5),
                alignItems: 'flex-start',
              }}
            >
              <View style={{ flex: 1, minWidth: 0, width: '100%' }}>
                {MobileIndex}

                <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '600', letterSpacing: 0.4, marginBottom: spacing(3.5) }]}>
                  ALL SECTIONS · {SECTIONS.length} ITEMS
                </Text>

                <View style={{ gap: spacing(4) }}>
                  {SECTIONS.map((section, i) => (
                    <SectionCard key={section.title} index={i} {...section} />
                  ))}
                </View>

                {/* Agreement footer */}
                <View
                  style={{
                    marginTop: spacing(7),
                    padding: isMobile ? spacing(5) : spacing(6),
                    backgroundColor: colors.surface,
                    borderRadius: radii.xxl,
                    borderWidth: 1,
                    borderColor: colors.border,
                    gap: spacing(3.5),
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        backgroundColor: `${colors.success}18`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="checkmark-done-outline" size={20} color={colors.success} />
                    </View>
                    <Text style={[typography.h2, { color: colors.textPrimary, fontSize: 17 }]}>{t('Your Agreement')}</Text>
                  </View>

                  <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22, fontSize: 14.5 }]}>
                    By continuing to use Thuto-Bridge, you confirm that you have read, understood, and agreed to all of the above terms. Questions? Reach out via Contact Support – we’re happy to help.
                  </Text>

                  <View style={{ flexDirection: 'row', gap: spacing(3), flexWrap: 'wrap' }}>
                    <Pressable
                      onPress={() => router.push('/student/contact-support')}
                      style={({ pressed }) => ({
                        flexGrow: 1,
                        minWidth: 160,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: spacing(2),
                        height: 50,
                        borderRadius: radii.lg,
                        backgroundColor: colors.primary,
                        opacity: pressed ? 0.88 : 1,
                      })}
                    >
                      <Ionicons name="help-circle-outline" size={18} color="#fff" />
                      <Text style={[typography.label, { color: '#fff' }]}>{t('Contact Support')}</Text>
                    </Pressable>

                    <Pressable
                      onPress={() => router.back()}
                      style={({ pressed }) => ({
                        flexGrow: 1,
                        minWidth: 140,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: spacing(2),
                        height: 50,
                        borderRadius: radii.lg,
                        backgroundColor: colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: colors.border,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Ionicons name="arrow-back" size={17} color={colors.textPrimary} />
                      <Text style={[typography.label, { color: colors.textPrimary }]}>{t('Go Back')}</Text>
                    </Pressable>
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

export default function TermsConditionsScreen() {
  return (
    <StudentMenuProvider>
      <TermsConditionsContent />
    </StudentMenuProvider>
  );
}