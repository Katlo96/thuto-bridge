import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  TextInput,
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

type FaqCategory = 'All' | 'Getting Started' | 'Applications' | 'Results' | 'Account' | 'Support';

type FaqItem = {
  question: string;
  answer: string;
  category: Exclude<FaqCategory, 'All'>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Content - Thuto-Bridge
// ─────────────────────────────────────────────────────────────────────────────

const FAQ_ITEMS: FaqItem[] = [
  {
    category: 'Getting Started',
    question: 'What is Thuto-Bridge and how does it help me?',
    answer: 'Thuto-Bridge connects Botswana students to university programmes, bursaries, and application tracking – all in one place. Enter your BGCSE results, get matched to eligible programmes, apply directly, and track your offers in real time.',
  },
  {
    category: 'Getting Started',
    question: 'Is Thuto-Bridge free for students?',
    answer: 'Yes. Creating an account, browsing programmes, getting recommendations, and tracking applications on Thuto-Bridge is completely free for students.',
  },
  {
    category: 'Applications',
    question: 'Can I apply to multiple universities at once?',
    answer: 'Yes. You can apply to as many programmes as you qualify for. Thuto-Bridge keeps all your applications organised in one dashboard with status updates and deadline reminders.',
  },
  {
    category: 'Applications',
    question: 'What documents do I need to apply?',
    answer: 'Typically: a certified copy of your Omang/ID, BGCSE or equivalent results slip, and any programme-specific documents. Thuto-Bridge shows you exactly what each programme requires before you submit.',
  },
  {
    category: 'Results',
    question: 'Do I need to upload my BGCSE results to get matches?',
    answer: 'Yes – entering your BGCSE / IGCSE results unlocks accurate programme matching. The recommendation engine checks your points against entry requirements in real time, so you only see programmes you qualify for.',
  },
  {
    category: 'Results',
    question: 'Can I update my results later?',
    answer: 'Absolutely. Go to Profile → Academic Results and edit your subjects at any time. Your programme matches will update automatically.',
  },
  {
    category: 'Account',
    question: 'Can I change my profile information later?',
    answer: 'Yes. Go to Settings → Edit Profile. You can update your contact details, school history, results, and programme preferences whenever you need to.',
  },
  {
    category: 'Account',
    question: 'Is my data safe on Thuto-Bridge?',
    answer: 'Yes. Thuto-Bridge uses encrypted storage, secure Botswana-based infrastructure, and strict access controls. Your academic records are never sold. See our Privacy Policy for full details.',
  },
  {
    category: 'Support',
    question: 'How do I contact Thuto-Bridge support?',
    answer: 'Call +267 71 234 567 (Mon–Fri 8am–5pm), WhatsApp +267 75 000 111, or email support@thutobridge.com. You can find all channels on the Contact Support page in Settings.',
  },
  {
    category: 'Support',
    question: 'I need help with a bursary application – can you help?',
    answer: 'Yes. Email support@thutobridge.com with “Bursary Help” in the subject and your Thuto-Bridge Student ID. Our team can review your documents and walk you through DTEF and other sponsor requirements.',
  },
];

const CATEGORIES: FaqCategory[] = ['All', 'Getting Started', 'Applications', 'Results', 'Account', 'Support'];

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
// FAQ Accordion Item
// ─────────────────────────────────────────────────────────────────────────────
function FaqAccordion({
  item,
  isOpen,
  onToggle,
  index,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const { t } = useLanguage();
  const colors = useTheme();
  const elevation = useElevation('md');

  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="button"
      accessibilityLabel={`${t(item.question)}. ${isOpen ? t('Collapse answer') : t('Expand answer')}`}
      accessibilityState={{ expanded: isOpen }}
      style={({ pressed }) => [
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          borderWidth: 1.5,
          borderColor: isOpen ? colors.primary : colors.border,
          overflow: 'hidden',
          opacity: pressed ? 0.96 : 1,
        },
        elevation,
      ]}
    >
      {isOpen && <View style={{ height: 3, backgroundColor: colors.primary }} />}
      <View style={{ padding: spacing(5) }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3.5) }}>
          {/* Q icon */}
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: isOpen ? `${colors.primary}16` : colors.surfaceAlt,
              borderWidth: 1,
              borderColor: isOpen ? `${colors.primary}30` : colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '800',
                color: isOpen ? colors.primary : colors.textSecondary,
              }}
            >
              Q{index + 1}
            </Text>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View
              style={{
                alignSelf: 'flex-start',
                paddingHorizontal: spacing(2),
                paddingVertical: 3,
                borderRadius: radii.pill,
                backgroundColor: colors.surfaceAlt,
                marginBottom: spacing(1.5),
              }}
            >
              <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10, fontWeight: '700' }]}>
                {t(item.category).toUpperCase()}
              </Text>
            </View>
            <Text
              style={[
                typography.bodyStrong,
                { color: colors.textPrimary, fontSize: 15.5, lineHeight: 22 },
              ]}
            >
              {t(item.question)}
            </Text>

            {isOpen && (
              <View
                style={{
                  marginTop: spacing(3.5),
                  paddingTop: spacing(3.5),
                  borderTopWidth: 1,
                  borderTopColor: colors.divider,
                }}
              >
                <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 23, fontSize: 14.5 }]}>
                  {t(item.answer)}
                </Text>
              </View>
            )}
          </View>

          <View
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              backgroundColor: isOpen ? `${colors.primary}14` : colors.surfaceAlt,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <Ionicons
              name={isOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={isOpen ? colors.primary : colors.textMuted}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function SidebarPanel() {
  const { t } = useLanguage();
  const colors = useTheme();

  return (
    <View style={{ width: 320, flexShrink: 0, gap: spacing(5) }}>
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing(5.5),
        }}
      >
        <Ionicons name="chatbubbles-outline" size={26} color={colors.primary} style={{ marginBottom: spacing(2) }} />
        <Text style={[typography.h2, { color: colors.textPrimary, fontSize: 16, marginBottom: spacing(2) }]}>
          Still need help?
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 20, fontSize: 13.5, marginBottom: spacing(4) }]}>
          Our Botswana-based student support team replies fast. Pick what works best for you.
        </Text>

        <View style={{ gap: spacing(2.5) }}>
          {[
            { label: 'WhatsApp us', sub: '+267 75 000 111', icon: 'logo-whatsapp' as const, url: 'https://wa.me/26775000111', color: '#22C55E' },
            { label: 'Email support', sub: 'support@thutobridge.com', icon: 'mail-outline' as const, url: 'mailto:support@thutobridge.com', color: '#14B8A6' },
            { label: 'Call us', sub: '+267 71 234 567', icon: 'call-outline' as const, url: 'tel:+26771234567', color: '#3B82F6' },
          ].map((c) => (
            <Pressable
              key={c.label}
              onPress={() => Linking.openURL(c.url)}
              accessibilityRole="link"
              accessibilityLabel={`${t(c.label)}: ${c.sub}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(3),
                padding: spacing(3),
                borderRadius: radii.lg,
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Ionicons name={c.icon} size={18} color={c.color} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.label, { color: colors.textPrimary, fontSize: 13 }]}>{t(c.label)}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{c.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </View>

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
          Student tip
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13, lineHeight: 19 }]}>
          Can’t find your question? Email support@thutobridge.com – we usually reply within 24 hours, faster on WhatsApp.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/student/contact-support')}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing(2),
          paddingVertical: spacing(3.5),
          borderRadius: radii.xl,
          backgroundColor: colors.primary,
          opacity: pressed ? 0.88 : 1,
        })}
      >
        <Ionicons name="help-circle-outline" size={18} color="#fff" />
        <Text style={[typography.label, { color: '#fff' }]}>{t('Contact Support')}</Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Content
// ─────────────────────────────────────────────────────────────────────────────
function FaqContent() {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { openMenu } = useStudentMenu();
  const elevMd = useElevation('md');
  const elevLg = useElevation('lg');

  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [activeCategory, setActiveCategory] = useState<FaqCategory>('All');
  const [query, setQuery] = useState('');

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 720) return 'mobile';
    if (width < 1100) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isMobile = breakpoint === 'mobile';
  const isTablet = breakpoint === 'tablet';
  const padX = isMobile ? spacing(4) : isTablet ? spacing(5) : spacing(8);

  const filteredFaqs = useMemo(() => {
    let list = FAQ_ITEMS;
    if (activeCategory !== 'All') {
      list = list.filter((f) => f.category === activeCategory);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
      );
    }
    return list;
  }, [activeCategory, query]);

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
          FAQ
        </Text>
        {!isMobile && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            Thuto-Bridge · Help Centre
          </Text>
        )}
      </View>

      {!isMobile && (
        <Pressable
          onPress={() => router.push('/student/settings')}
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
          marginBottom: spacing(6),
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
          <View style={{ flex: 1, maxWidth: 560 }}>
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
              <Ionicons name="help-buoy-outline" size={13} color={colors.primary} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', letterSpacing: 0.3 }]}>
                HELP CENTRE
              </Text>
            </View>

            <Text
              style={[
                typography.hero,
                { color: colors.textPrimary, fontSize: isMobile ? 26 : 32, lineHeight: isMobile ? 32 : 38 },
              ]}
            >
              Frequently asked questions
            </Text>
            <Text
              style={[
                typography.body,
                { color: colors.textSecondary, marginTop: spacing(2.5), lineHeight: 23, fontSize: 15, maxWidth: 500 },
              ]}
            >
              Quick answers to the most common Thuto-Bridge questions from Botswana students.
            </Text>
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
              <Ionicons name="chatbubbles-outline" size={42} color={colors.primary} />
            </View>
          )}
        </View>

        {/* Search */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(2.5),
            marginTop: spacing(5),
            paddingHorizontal: spacing(4),
            height: 50,
            backgroundColor: colors.surfaceAlt,
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('Search FAQs… e.g. results, bursary, applications')}
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              color: colors.textPrimary,
              fontSize: 14.5,
              outlineStyle: 'none' as any,
            }}
          />
          {!!query && (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel={t('Clear Search')}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  const CategoryChips = (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginBottom: spacing(5) }}>
      {CATEGORIES.map((cat) => {
        const active = cat === activeCategory;
        return (
          <Pressable
            key={cat}
            onPress={() => {
              setActiveCategory(cat);
              setOpenIndex(0);
            }}
            accessibilityRole="button"
            accessibilityLabel={t(cat)}
            accessibilityState={{ selected: active }}
            style={({ pressed }) => ({
              paddingHorizontal: spacing(3.5),
              paddingVertical: spacing(2),
              borderRadius: radii.pill,
              backgroundColor: active ? colors.primary : colors.surface,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text
              style={[
                typography.label,
                { color: active ? '#fff' : colors.textSecondary, fontSize: 12.5 },
              ]}
            >
              {t(cat)}
            </Text>
          </Pressable>
        );
      })}
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
              <Text style={[typography.caption, { color: colors.textMuted }]}>{t('Settings › FAQ')}</Text>
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
                {CategoryChips}

                <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '600', letterSpacing: 0.4, marginBottom: spacing(3.5) }]}>
                  {t(activeCategory).toUpperCase()} · {filteredFaqs.length} {filteredFaqs.length === 1 ? t('QUESTION') : t('QUESTIONS')}
                </Text>

                <View style={{ gap: spacing(3.5) }}>
                  {filteredFaqs.map((item, i) => (
                    <FaqAccordion
                      key={t(item.question)}
                      item={item}
                      index={i}
                      isOpen={openIndex === i}
                      onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                    />
                  ))}
                  {filteredFaqs.length === 0 && (
                    <View
                      style={{
                        padding: spacing(6),
                        backgroundColor: colors.surface,
                        borderRadius: radii.xxl,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={[typography.body, { color: colors.textSecondary }]}>
                        No FAQs found for "{query}". Try a different search or contact support.
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {isDesktop && <SidebarPanel />}
            </View>

            {/* Mobile help block */}
            {!isDesktop && (
              <View
                style={{
                  marginTop: spacing(7),
                  padding: spacing(5),
                  backgroundColor: colors.surface,
                  borderRadius: radii.xxl,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: spacing(3),
                }}
              >
                <Text style={[typography.h2, { color: colors.textPrimary, fontSize: 16 }]}>{t('Still need help?')}</Text>
                <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13.5 }]}>
                  Chat to our Botswana student support team on WhatsApp or email.
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing(2.5), flexWrap: 'wrap' }}>
                  <Pressable
                    onPress={() => Linking.openURL('https://wa.me/26775000111')}
                    style={{ paddingHorizontal: spacing(3.5), paddingVertical: spacing(2.5), borderRadius: radii.lg, backgroundColor: '#22C55E' }}
                  >
                    <Text style={[typography.label, { color: '#fff', fontSize: 13 }]}>WhatsApp</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => Linking.openURL('mailto:support@thutobridge.com')}
                    style={{ paddingHorizontal: spacing(3.5), paddingVertical: spacing(2.5), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}
                  >
                    <Text style={[typography.label, { color: colors.textPrimary, fontSize: 13 }]}>{t('Email us')}</Text>
                  </Pressable>
                </View>
              </View>
            )}

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

export default function FaqScreen() {
  return (
    <StudentMenuProvider>
      <FaqContent />
    </StudentMenuProvider>
  );
}