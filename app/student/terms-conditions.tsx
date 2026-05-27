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

// ─────────────────────────────────────────────────────────────────────────────
// Project design tokens (no DashboardLayout wrapper — tokens only)
// ─────────────────────────────────────────────────────────────────────────────
import {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Breakpoint = 'mobile' | 'tablet' | 'desktop';

// ─────────────────────────────────────────────────────────────────────────────
// Content
// ─────────────────────────────────────────────────────────────────────────────
const SECTIONS = [
  {
    icon: 'checkmark-circle-outline' as const,
    title: 'Acceptance of Use',
    body: 'By using UniPathway, you agree to use the platform responsibly and lawfully. The platform is intended to support students with applications, results handling, recommendations, and related academic processes.',
    accent: '#60A5FA',
  },
  {
    icon: 'lock-closed-outline' as const,
    title: 'Account Responsibility',
    body: 'You are responsible for keeping your account information secure and accurate. Any activity carried out under your account is considered your responsibility unless reported otherwise.',
    accent: '#34D399',
  },
  {
    icon: 'document-text-outline' as const,
    title: 'Information Accuracy',
    body: 'Students should ensure that all personal details, academic results, and uploaded documents are accurate and up to date. Incorrect information may affect recommendations, applications, or other platform services.',
    accent: '#FBBF24',
  },
  {
    icon: 'cloud-outline' as const,
    title: 'Platform Availability',
    body: 'UniPathway aims to provide a reliable service, but temporary interruptions, maintenance periods, or feature updates may occur from time to time as the platform evolves.',
    accent: '#A78BFA',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Appropriate Use',
    body: 'Users must not misuse the platform, interfere with its performance, attempt unauthorized access, or upload content that is false, harmful, offensive, or unlawful.',
    accent: '#F87171',
  },
  {
    icon: 'refresh-circle-outline' as const,
    title: 'Changes to Terms',
    body: 'These terms may be updated as UniPathway grows. Continued use of the platform after updates means you accept the revised terms and conditions.',
    accent: '#F472B6',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Elevation helper
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = 0.28;
    const radius  = intensity === 'sm' ? 6 : intensity === 'md' ? 14 : 22;
    const offsetY = intensity === 'sm' ? 2 : intensity === 'md' ? 5  : 10;
    return (Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: radius },
      android: { elevation: intensity === 'sm' ? 3 : intensity === 'md' ? 6 : 12 },
      web:     { boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})` } as any,
      default: {},
    }) ?? {}) as ViewStyle;
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
}: {
  index: number;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  accent: string;
}) {
  const colors    = useTheme();
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
      {/* Left accent bar */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: 3,
          backgroundColor: accent,
        }}
      />

      <View style={{ padding: spacing(5), paddingLeft: spacing(6) }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: spacing(4),
          }}
        >
          {/* Icon bubble */}
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: radii.xl,
              backgroundColor: `${accent}1A`,
              borderWidth: 1,
              borderColor: `${accent}33`,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <Ionicons name={icon} size={22} color={accent} />
          </View>

          <View style={{ flex: 1 }}>
            {/* Section number + title */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(2),
                marginBottom: spacing(2),
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: `${accent}22`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  style={[
                    typography.caption,
                    { color: accent, fontWeight: '700', fontSize: 11 },
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <Text
                style={[
                  typography.h2,
                  { color: colors.textPrimary },
                ]}
              >
                {title}
              </Text>
            </View>

            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, lineHeight: 22 },
              ]}
            >
              {body}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar panel (desktop only)
// ─────────────────────────────────────────────────────────────────────────────
function SidebarPanel() {
  const colors    = useTheme();
  const elevation = useElevation('md');

  return (
    <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
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
        <View style={{ padding: spacing(6), gap: spacing(4) }}>
          <Text style={[typography.h2, { color: colors.textPrimary }]}>
            Quick Index
          </Text>

          <View style={{ gap: spacing(2) }}>
            {SECTIONS.map((s, i) => (
              <View
                key={s.title}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing(3),
                  paddingHorizontal: spacing(3),
                  paddingVertical: spacing(2),
                  borderRadius: radii.lg,
                  backgroundColor: `${s.accent}0F`,
                  borderWidth: 1,
                  borderColor: `${s.accent}22`,
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: `${s.accent}22`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      { color: s.accent, fontWeight: '700', fontSize: 10 },
                    ]}
                  >
                    {i + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    typography.caption,
                    { color: colors.textSecondary, flex: 1, fontWeight: '700' },
                  ]}
                  numberOfLines={1}
                >
                  {s.title}
                </Text>
              </View>
            ))}
          </View>

          <View style={{ height: 1, backgroundColor: colors.divider }} />

          {/* Settings link */}
          <Pressable
            onPress={() => router.push('/student/settings')}
            style={({ pressed }) => ({
              flexDirection: 'row' as const,
              alignItems: 'center' as const,
              gap: spacing(3),
              padding: spacing(4),
              borderRadius: radii.xl,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Ionicons name="settings-outline" size={18} color={colors.textSecondary} />
            <Text style={[typography.label, { color: colors.textSecondary, flex: 1 }]}>
              Back to Settings
            </Text>
            <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
          </Pressable>

          {/* Effective date */}
          <View
            style={{
              padding: spacing(4),
              backgroundColor: `${colors.primary}14`,
              borderRadius: radii.lg,
              borderLeftWidth: 3,
              borderLeftColor: colors.primary,
            }}
          >
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, lineHeight: 18 },
              ]}
            >
              📅 These terms are effective as of January 2026 and apply to all UniPathway users.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────────────────────
function TermsConditionsContent() {
  const { width }    = useWindowDimensions();
  const colors       = useTheme();
  const { openMenu } = useStudentMenu();
  const elevMd       = useElevation('md');
  const elevLg       = useElevation('lg');

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 768)  return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isMobile  = breakpoint === 'mobile';
  const padX      = isMobile ? spacing(4) : spacing(7);

  // ── Top nav bar ────────────────────────────────────────────────────────────
  const NavBar = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: padX,
          paddingVertical: spacing(4),
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          gap: spacing(3),
        },
        elevMd,
      ]}
    >
      {/* Back */}
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="arrow-back" size={20} color={colors.primary} />
      </Pressable>

      {/* Title */}
      <View style={{ flex: 1 }}>
        <Text style={[typography.h2, { color: colors.textPrimary }]}>
          Terms & Conditions
        </Text>
        {!isMobile && (
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, marginTop: 2 },
            ]}
            numberOfLines={1}
          >
            Platform usage terms and responsibilities
          </Text>
        )}
      </View>

      {/* Settings shortcut */}
      <Pressable
        onPress={() => router.push('/student/settings')}
        style={({ pressed }) => ({
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          gap: spacing(2),
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(2),
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="settings-outline" size={16} color={colors.textSecondary} />
        {!isMobile && (
          <Text style={[typography.label, { color: colors.textSecondary }]}>
            Settings
          </Text>
        )}
      </Pressable>

      {/* Menu */}
      <Pressable
        onPress={openMenu}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
        style={({ pressed }) => ({
          width: 44,
          height: 44,
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="menu" size={22} color={colors.textPrimary} />
      </Pressable>
    </View>
  );

  // ── Hero banner ────────────────────────────────────────────────────────────
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
          width: '100%',
        },
        elevLg,
      ]}
    >
      <View style={{ height: 3, backgroundColor: colors.primary }} />
      <View style={{ padding: isMobile ? spacing(5) : spacing(7) }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing(4),
          }}
        >
          <View style={{ flex: 1 }}>
            {/* Badge */}
            <View
              style={{
                alignSelf: 'flex-start',
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(2),
                paddingHorizontal: spacing(3),
                paddingVertical: spacing(2),
                borderRadius: radii.pill,
                backgroundColor: `${colors.primary}22`,
                borderWidth: 1,
                borderColor: `${colors.primary}44`,
                marginBottom: spacing(4),
              }}
            >
              <Ionicons name="document-text-outline" size={13} color={colors.primary} />
              <Text
                style={[
                  typography.caption,
                  { color: colors.primary, fontWeight: '700' },
                ]}
              >
                LEGAL
              </Text>
            </View>

            <Text
              style={[
                typography.hero,
                {
                  color: colors.textPrimary,
                  fontSize: isMobile ? 22 : 28,
                  lineHeight: isMobile ? 28 : 34,
                },
              ]}
            >
              Terms of Use
            </Text>
            <Text
              style={[
                typography.body,
                {
                  color: colors.textSecondary,
                  marginTop: spacing(2),
                  lineHeight: 22,
                  maxWidth: 520,
                },
              ]}
            >
              Please review the key conditions that guide the proper and
              responsible use of the UniPathway platform. These terms apply
              to all students and users of the service.
            </Text>
          </View>

          {/* Section count pill */}
          <View
            style={{
              flexShrink: 0,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing(2),
              paddingHorizontal: spacing(3),
              paddingVertical: spacing(2),
              borderRadius: radii.pill,
              backgroundColor: `${colors.primary}22`,
              borderWidth: 1,
              borderColor: `${colors.primary}44`,
            }}
          >
            <Ionicons name="list-outline" size={14} color={colors.primary} />
            <Text
              style={[
                typography.caption,
                { color: colors.primary, fontWeight: '700' },
              ]}
            >
              {SECTIONS.length} sections
            </Text>
          </View>
        </View>

        {/* Effective date strip */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(3),
            marginTop: spacing(5),
            padding: spacing(3),
            backgroundColor: `${colors.primary}0F`,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: `${colors.primary}22`,
          }}
        >
          <Ionicons name="calendar-outline" size={15} color={colors.primary} />
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, fontWeight: '700' },
            ]}
          >
            Effective January 2026 · Applies to all UniPathway users
          </Text>
        </View>
      </View>
    </View>
  );

  // ── Mobile quick index (collapsible substitute on small screens) ───────────
  const MobileIndex = isMobile && (
    <View
      style={{
        marginBottom: spacing(6),
        padding: spacing(4),
        backgroundColor: colors.surface,
        borderRadius: radii.xl,
        borderWidth: 1,
        borderColor: colors.border,
        gap: spacing(2),
      }}
    >
      <Text
        style={[
          typography.caption,
          { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(1) },
        ]}
      >
        SECTIONS
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
        {SECTIONS.map((s, i) => (
          <View
            key={s.title}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing(2),
              paddingHorizontal: spacing(3),
              paddingVertical: spacing(1),
              borderRadius: radii.pill,
              backgroundColor: `${s.accent}14`,
              borderWidth: 1,
              borderColor: `${s.accent}33`,
            }}
          >
            <Text
              style={[
                typography.caption,
                { color: s.accent, fontWeight: '700', fontSize: 10 },
              ]}
            >
              {i + 1}
            </Text>
            <Text
              style={[
                typography.caption,
                { color: colors.textSecondary, fontWeight: '700' },
              ]}
            >
              {s.title.split(' ')[0]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing(12) }}
        >
          {NavBar}

          <View
            style={{
              paddingHorizontal: padX,
              paddingTop: spacing(7),
              maxWidth: 1280,
              alignSelf: 'center',
              width: '100%',
            }}
          >
            {/* Breadcrumb */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(3),
                marginBottom: spacing(6),
              }}
            >
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => ({
                  flexDirection: 'row' as const,
                  alignItems: 'center' as const,
                  gap: spacing(2),
                  paddingHorizontal: spacing(4),
                  paddingVertical: spacing(2),
                  borderRadius: radii.lg,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="arrow-back" size={16} color={colors.primary} />
                <Text style={[typography.label, { color: colors.primary }]}>Back</Text>
              </Pressable>
              <Text
                style={[typography.caption, { color: colors.textMuted }]}
                numberOfLines={1}
              >
                Settings › Terms & Conditions
              </Text>
            </View>

            {/* Hero */}
            {HeroBanner}

            {/* Two-column on desktop, stacked otherwise */}
            <View
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                gap: spacing(8),
                alignItems: 'flex-start',
              }}
            >
              {/* Main column */}
              <View style={{ flex: 1, minWidth: 0, width: '100%' }}>
                {MobileIndex}

                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.textMuted,
                      letterSpacing: 0.5,
                      marginBottom: spacing(4),
                    },
                  ]}
                >
                  ALL SECTIONS · {SECTIONS.length} ITEMS
                </Text>

                <View style={{ gap: spacing(4) }}>
                  {SECTIONS.map((section, i) => (
                    <SectionCard
                      key={section.title}
                      index={i}
                      icon={section.icon}
                      title={section.title}
                      body={section.body}
                      accent={section.accent}
                    />
                  ))}
                </View>

                {/* Footer acknowledgment */}
                <View
                  style={{
                    marginTop: spacing(8),
                    padding: isMobile ? spacing(5) : spacing(6),
                    backgroundColor: colors.surface,
                    borderRadius: radii.xxl,
                    borderWidth: 1,
                    borderColor: colors.border,
                    gap: spacing(4),
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing(3),
                    }}
                  >
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: radii.lg,
                        backgroundColor: `${colors.success}22`,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons
                        name="checkmark-done-outline"
                        size={20}
                        color={colors.success}
                      />
                    </View>
                    <Text style={[typography.h2, { color: colors.textPrimary }]}>
                      Your Agreement
                    </Text>
                  </View>
                  <Text
                    style={[
                      typography.body,
                      { color: colors.textSecondary, lineHeight: 22 },
                    ]}
                  >
                    By continuing to use UniPathway, you confirm that you
                    have read, understood, and agreed to all of the above
                    terms and conditions. If you have any questions, please
                    reach out via the Contact Support page.
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      gap: spacing(3),
                      flexWrap: 'wrap',
                    }}
                  >
                    <Pressable
                      onPress={() => router.push('/student/contact-support')}
                      style={({ pressed }) => ({
                        flex: 1,
                        minWidth: 160,
                        flexDirection: 'row' as const,
                        alignItems: 'center' as const,
                        justifyContent: 'center' as const,
                        gap: spacing(2),
                        height: 52,
                        borderRadius: radii.lg,
                        backgroundColor: colors.primary,
                        opacity: pressed ? 0.88 : 1,
                        transform: pressed ? [{ scale: 0.98 }] : [],
                      })}
                    >
                      <Ionicons name="help-circle-outline" size={18} color="#fff" />
                      <Text style={[typography.label, { color: '#fff' }]}>
                        Contact Support
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.back()}
                      style={({ pressed }) => ({
                        flex: 1,
                        minWidth: 160,
                        flexDirection: 'row' as const,
                        alignItems: 'center' as const,
                        justifyContent: 'center' as const,
                        gap: spacing(2),
                        height: 52,
                        borderRadius: radii.lg,
                        backgroundColor: colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: colors.border,
                        opacity: pressed ? 0.85 : 1,
                      })}
                    >
                      <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
                      <Text style={[typography.label, { color: colors.textPrimary }]}>
                        Go Back
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* Sidebar — desktop only */}
              {isDesktop && <SidebarPanel />}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function TermsConditionsScreen() {
  return (
    <StudentMenuProvider>
      <TermsConditionsContent />
    </StudentMenuProvider>
  );
}