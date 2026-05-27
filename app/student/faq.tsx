// screens/student/FaqScreen.tsx
import React, { useMemo, useState } from 'react';
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
const faqItems = [
  {
    question: 'How does UniPathway help students?',
    answer: 'UniPathway helps students explore courses, universities, scholarships, application pathways, and academic guidance in one platform.',
  },
  {
    question: 'Can I change my profile information later?',
    answer: 'Yes. Your profile screen is designed to allow future updates to personal information and academic-related details.',
  },
  {
    question: 'Do I need to upload results to use recommendations?',
    answer: 'Some advanced recommendation features may work best when academic results are entered or uploaded correctly.',
  },
  {
    question: 'Will my data stay private?',
    answer: 'The platform is designed with privacy and secure handling of student information in mind, with more backend protections added as development continues.',
  },
  {
    question: 'How do I contact support?',
    answer: 'Use the Contact Support section inside Settings to view phone numbers, email addresses, and social support channels.',
  },
  {
    question: 'Can I apply to multiple opportunities?',
    answer: 'Yes. The system is structured to support multiple applications depending on the workflow and future backend rules.',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Provider Wrapper
───────────────────────────────────────────────────────────────────────────── */
export default function FaqScreen() {
  return (
    <StudentMenuProvider>
      <FaqContent />
    </StudentMenuProvider>
  );
}

function FaqContent() {
  const { width } = useWindowDimensions();
  const { openMenu } = useStudentMenu();
  const elevationMd = useElevation('md');

  const [openIndex, setOpenIndex] = useState<number | null>(0);

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
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing(7),
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
              FAQ
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

          {/* Hero */}
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
                backgroundColor: `${colors.primary}22`,
                paddingHorizontal: spacing(3),
                paddingVertical: spacing(1.5),
                borderRadius: radii.pill,
                alignSelf: 'flex-start',
                borderWidth: 1,
                borderColor: `${colors.primary}44`,
              }}
            >
              <Text style={[typography.label, { color: colors.primary }]}>
                HELP CENTER
              </Text>
            </View>

            <Text style={[typography.hero, { color: colors.textPrimary, marginTop: spacing(4) }]}>
              Frequently Asked Questions
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: spacing(2) },
              ]}
            >
              Browse the most common student questions about the UniPathway platform.
            </Text>
          </View>

          {/* FAQ Items */}
          <View style={{ gap: spacing(4) }}>
            {faqItems.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <Pressable
                  key={index}
                  onPress={() => setOpenIndex(isOpen ? null : index)}
                  style={[
                    {
                      backgroundColor: colors.surface,
                      borderRadius: radii.xxl,
                      padding: spacing(6),
                      borderWidth: 1,
                      borderColor: isOpen ? colors.primary : colors.border,
                    },
                    elevationMd,
                  ]}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing(4),
                    }}
                  >
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: radii.xl,
                        backgroundColor: `${colors.primary}22`,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: 1,
                        borderColor: `${colors.primary}44`,
                      }}
                    >
                      <Ionicons name="help-circle-outline" size={24} color={colors.primary} />
                    </View>

                    <Text
                      style={[
                        typography.bodyStrong,
                        { color: colors.textPrimary, flex: 1 },
                      ]}
                    >
                      {item.question}
                    </Text>

                    <Ionicons
                      name={isOpen ? 'chevron-up-outline' : 'chevron-down-outline'}
                      size={20}
                      color={colors.textMuted}
                    />
                  </View>

                  {isOpen && (
                    <Text
                      style={[
                        typography.body,
                        { color: colors.textSecondary, marginTop: spacing(5), lineHeight: 24 },
                      ]}
                    >
                      {item.answer}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}