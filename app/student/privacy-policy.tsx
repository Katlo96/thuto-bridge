// screens/student/PrivacyPolicyScreen.tsx
import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  StudentMenuProvider,
  useStudentMenu,
} from '../../components/student/StudentMenu';

/* ─────────────────────────────────────────────────────────────────────────────
   Local Design Tokens (Aligned with App Design System)
───────────────────────────────────────────────────────────────────────────── */
const BASE_SPACING = 4;
const spacing = (n: number) => n * BASE_SPACING;

const radii = {
  sm: spacing(2),
  md: spacing(3),
  lg: spacing(4),
  xl: spacing(6),
  xxl: spacing(8),
  pill: 9999,
};

const typography = {
  hero: { fontSize: 32, lineHeight: 40, fontWeight: '900' as const },
  h1: { fontSize: 28, lineHeight: 36, fontWeight: '800' as const },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
};

/* ─────────────────────────────────────────────────────────────────────────────
   Elevation Helper
───────────────────────────────────────────────────────────────────────────── */
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md') {
  return useMemo(() => {
    const opacity = 0.28;
    const radius = intensity === 'sm' ? 6 : intensity === 'md' ? 14 : 22;
    const offsetY = intensity === 'sm' ? 2 : intensity === 'md' ? 5 : 10;

    return Platform.select({
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
      },
      default: {},
    });
  }, [intensity]);
}

/* ─────────────────────────────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────────────────────────────── */
const sections = [
  {
    icon: 'document-text-outline',
    title: 'Information We Collect',
    body: 'UniPathway may collect information such as your profile details, academic results, uploaded documents, application activity, preferences, and engagement within the platform experience.',
  },
  {
    icon: 'analytics-outline',
    title: 'How Information Is Used',
    body: 'Information is used to improve recommendations, application workflows, platform personalization, notifications, support services, and the overall student experience.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Data Protection',
    body: 'We aim to maintain responsible security practices through access control, secure infrastructure principles, and controlled handling of student information.',
  },
  {
    icon: 'people-outline',
    title: 'Sharing of Information',
    body: 'Information may only be shared where necessary for institutional processes, operational support, platform services, or applicable compliance requirements.',
  },
  {
    icon: 'settings-outline',
    title: 'Your Choices',
    body: 'Students may update selected profile details, preferences, and account information through platform settings as additional features continue to evolve.',
  },
  {
    icon: 'refresh-outline',
    title: 'Policy Updates',
    body: 'This policy may be refined and expanded over time as UniPathway grows and introduces additional services and functionality.',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Provider Wrapper
───────────────────────────────────────────────────────────────────────────── */
export default function PrivacyPolicyScreen() {
  return (
    <StudentMenuProvider>
      <PrivacyPolicyContent />
    </StudentMenuProvider>
  );
}

function PrivacyPolicyContent() {
  const { width } = useWindowDimensions();
  const { openMenu } = useStudentMenu();
  const elevationMd = useElevation('md');

  const breakpoint = useMemo<'mobile' | 'tablet' | 'desktop'>(() => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isMobile = breakpoint === 'mobile';

  const colors = {
    background: '#0A1428',
    surface: '#1A2339',
    surfaceAlt: '#25314A',
    card: '#1A2339',
    divider: 'rgba(255,255,255,0.08)',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    primary: '#60A5FA',
    success: '#34D399',
    border: 'rgba(255,255,255,0.10)',
  };

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
          {/* Top Navigation Bar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing(6),
              paddingHorizontal: spacing(2),
            }}
          >
            <View style={{ flexDirection: 'row', gap: spacing(3) }}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: radii.lg,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name="arrow-back" size={22} color={colors.primary} />
              </Pressable>

              <Pressable
                onPress={openMenu}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: radii.lg,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name="menu" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>

            <Text style={[typography.h1, { color: colors.textPrimary }]}>
              Privacy Policy
            </Text>

            <Pressable
              onPress={() => router.push('/student/settings')}
              style={({ pressed }) => ({
                width: 48,
                height: 48,
                borderRadius: radii.lg,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>

          {/* Hero Section */}
          <View
            style={[
              {
                backgroundColor: colors.surface,
                borderRadius: radii.xxl,
                padding: spacing(7),
                marginBottom: spacing(8),
                borderWidth: 1,
                borderColor: colors.border,
              },
              elevationMd,
            ]}
          >
            <View
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                gap: spacing(6),
                alignItems: 'flex-start',
              }}
            >
              <View style={{ flex: 1 }}>
                <View
                  style={{
                    backgroundColor: `${colors.primary}22`,
                    paddingHorizontal: spacing(3),
                    paddingVertical: spacing(1),
                    borderRadius: radii.pill,
                    alignSelf: 'flex-start',
                    borderWidth: 1,
                    borderColor: `${colors.primary}44`,
                  }}
                >
                  <Text style={[typography.label, { color: colors.primary }]}>
                    PRIVACY & SECURITY
                  </Text>
                </View>

                <Text style={[typography.hero, { color: colors.textPrimary, marginTop: spacing(4) }]}>
                  Your Information,{'\n'}Handled Responsibly
                </Text>

                <Text
                  style={[
                    typography.body,
                    { color: colors.textSecondary, marginTop: spacing(3), maxWidth: 680 },
                  ]}
                >
                  UniPathway is designed to support students through a secure, transparent, and user-focused platform experience.
                </Text>
              </View>

              <View
                style={{
                  width: isDesktop ? 280 : '100%',
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radii.xxl,
                  padding: spacing(6),
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Ionicons name="lock-closed-outline" size={52} color={colors.primary} />
                <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(4), textAlign: 'center' }]}>
                  Data Privacy First
                </Text>
              </View>
            </View>
          </View>

          {/* Sections */}
          <View style={{ gap: spacing(5) }}>
            {sections.map((section, index) => (
              <View
                key={index}
                style={[
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radii.xxl,
                    padding: spacing(6),
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
                  elevationMd,
                ]}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(4) }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: radii.xl,
                      backgroundColor: `${colors.primary}22`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: `${colors.primary}44`,
                    }}
                  >
                    <Ionicons name={section.icon as any} size={24} color={colors.primary} />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={[typography.h2, { color: colors.textPrimary }]}>
                      {section.title}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      Section {index + 1}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    typography.body,
                    { color: colors.textSecondary, marginTop: spacing(5), lineHeight: 24 },
                  ]}
                >
                  {section.body}
                </Text>
              </View>
            ))}
          </View>

          {/* Footer Notice */}
          <View
            style={[
              {
                marginTop: spacing(8),
                backgroundColor: colors.surfaceAlt,
                borderRadius: radii.xxl,
                padding: spacing(6),
                borderWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                gap: spacing(4),
              },
              elevationMd,
            ]}
          >
            <Ionicons name="information-circle-outline" size={26} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.h2, { color: colors.textPrimary }]}>
                Platform Notice
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2) }]}>
                This privacy policy is currently part of the frontend phase and may evolve as backend infrastructure, authentication systems, and institutional integrations are implemented.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}