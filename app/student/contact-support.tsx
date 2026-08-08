import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  ScrollView,
  Linking,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StudentMenuProvider, useStudentMenu } from '../../components/student/StudentMenu';
import StudentFooter from '../../components/student/StudentFooter';
import { useLanguage } from '../../contexts/LanguageContext';

import {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

type SupportItem = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  subtitle: string;
  actionLabel: string;
  actionUrl: string;
  color: string;
  badge?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Data - Thuto-Bridge
// ─────────────────────────────────────────────────────────────────────────────

const SUPPORT_ITEMS: SupportItem[] = [
  {
    icon: 'call-outline',
    title: 'Support Phone',
    value: '+267 71659728',
    subtitle:
      'Call us for assistance with admissions, applications, scholarships, technical issues and general enquiries.',
    actionLabel: 'Call Now',
    actionUrl: 'tel:+26771659728',
    color: '#3B82F6',
    badge: 'Available',
  },
  {
    icon: 'logo-whatsapp',
    title: 'WhatsApp Support',
    value: '+267 71659728',
    subtitle:
      'Chat with us directly on WhatsApp for quick assistance and support.',
    actionLabel: 'Chat on WhatsApp',
    actionUrl: 'https://wa.me/26771659728',
    color: '#22C55E',
    badge: 'Fast Reply',
  },
  {
    icon: 'mail-outline',
    title: 'General Support',
    value: 'bigbrainsreggie@gmail.com',
    subtitle:
      'For admissions, account assistance, scholarships and general enquiries.',
    actionLabel: 'Send Email',
    actionUrl: 'mailto:bigbrainsreggie@gmail.com',
    color: '#14B8A6',
  },
  {
    icon: 'construct-outline',
    title: 'Technical Support',
    value: 'katlomonang@gmail.com',
    subtitle:
      'Report bugs, login problems, technical issues or suggest improvements.',
    actionLabel: 'Contact Developer',
    actionUrl: 'mailto:katlomonang@gmail.com',
    color: '#8B5CF6',
    badge: 'Developer',
  },
  {
    icon: 'globe-outline',
    title: 'Official Website',
    value: 'thuto-bridge-web.web.app',
    subtitle:
      'Visit the Thuto-Bridge website for the latest updates and information.',
    actionLabel: 'Visit Website',
    actionUrl: 'https://thuto-bridge-web.web.app',
    color: '#F59E0B',
    badge: 'Official',
  },
];

const SUPPORT_HOURS = [
  { day: 'Monday – Friday', hours: '8:00 AM – 5:00 PM' },
  { day: 'Saturday', hours: '9:00 AM – 1:00 PM' },
  { day: 'Sunday & Public Holidays', hours: 'Closed' },
];

const RESPONSE_TIMES = [
  { channel: 'Phone', time: 'Immediate', color: '#3B82F6' },
  { channel: 'WhatsApp', time: '< 1 hour', color: '#22C55E' },
  { channel: 'Email', time: '< 24 hours', color: '#14B8A6' },
  { channel: 'Social', time: '1–2 days', color: '#EC4899' },
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
  title,
  icon,
  accentColor,
  children,
  compact,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const colors = useTheme();
  const elevation = useElevation('md');
  const color = accentColor ?? colors.primary;

  return (
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
      <View style={{ height: 3, backgroundColor: color }} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(3),
          paddingHorizontal: compact ? spacing(4) : spacing(5),
          paddingTop: compact ? spacing(4) : spacing(5),
          paddingBottom: compact ? spacing(3) : spacing(4),
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}
      >
        <View
          style={{
            width: compact ? 34 : 38,
            height: compact ? 34 : 38,
            borderRadius: radii.md,
            backgroundColor: `${color}18`,
            borderWidth: 1,
            borderColor: `${color}30`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={compact ? 16 : 17} color={color} />
        </View>
        <Text style={[typography.h2, { color: colors.textPrimary, fontSize: compact ? 15 : 16 }]}>
          {title}
        </Text>
      </View>
      <View style={{ padding: compact ? spacing(4) : spacing(5) }}>{children}</View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SupportCard
// ─────────────────────────────────────────────────────────────────────────────

function SupportCard({
  item,
  cardWidth,
  compact,
}: {
  item: SupportItem;
  cardWidth: string | number;
  compact?: boolean;
}) {
  const colors = useTheme();
  const elevation = useElevation('md');
  const { t } = useLanguage();

  const handlePress = () => {
    if (item.actionUrl) {
      Linking.openURL(item.actionUrl).catch(() => {});
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(item.title)}: ${item.value}`}
      onPress={handlePress}
      style={({ pressed }) => [
        {
          width: cardWidth as any,
          flexGrow: 1,
          backgroundColor: colors.card,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          opacity: pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.988 : 1 }],
        },
        elevation,
      ]}
    >
      {/* Accent bar */}
      <View style={{ height: 3.5, backgroundColor: item.color }} />

      <View style={{ padding: compact ? spacing(4) : spacing(5.5), gap: spacing(3) }}>
        {/* Icon + Badge */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: `${item.color}14`,
              borderWidth: 1,
              borderColor: `${item.color}2A`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={item.icon} size={22} color={item.color} />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
            {item.badge && (
              <View
                style={{
                  paddingHorizontal: spacing(2.5),
                  paddingVertical: spacing(1),
                  borderRadius: radii.pill,
                  backgroundColor: `${item.color}12`,
                  borderWidth: 1,
                  borderColor: `${item.color}28`,
                }}
              >
                <Text style={[typography.caption, { color: item.color, fontWeight: '700', fontSize: 10 }]}>
                  {t(item.badge).toUpperCase()}
                </Text>
              </View>
            )}
            <View
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
            </View>
          </View>
        </View>

        {/* Title */}
        <View>
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, letterSpacing: 0.35, fontSize: 10.5, marginBottom: 4 },
            ]}
          >
            {t(item.title).toUpperCase()}
          </Text>
          <Text style={[typography.h2, { color: colors.textPrimary, fontSize: 15.5 }]} numberOfLines={1}>
            {item.value}
          </Text>
        </View>

        {/* Subtitle */}
        <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 20, fontSize: 13.5 }]}>
          {t(item.subtitle)}
        </Text>

        {/* Action */}
        <View
          style={{
            marginTop: spacing(1),
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(1.5),
          }}
        >
          <Text style={[typography.label, { color: item.color, fontSize: 13 }]}>
            {t(item.actionLabel)}
          </Text>
          <Ionicons name="chevron-forward" size={13} color={item.color} />
        </View>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar panel (desktop)
// ─────────────────────────────────────────────────────────────────────────────

function SidebarPanel({ compact }: { compact?: boolean }) {
  const colors = useTheme();
  const { t } = useLanguage();

  return (
    <View style={{ width: 320, flexShrink: 0, gap: spacing(5) }}>
      {/* Support hours */}
      <SectionCard title={t('Support Hours')} icon="time-outline" accentColor={colors.primary} compact={compact}>
        <View style={{ gap: spacing(1) }}>
          {SUPPORT_HOURS.map(({ day, hours }, i) => (
            <View
              key={day}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: spacing(2.5),
                borderBottomWidth: i < SUPPORT_HOURS.length - 1 ? 1 : 0,
                borderBottomColor: colors.divider,
                gap: spacing(3),
              }}
            >
              <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13, flexShrink: 1 }]}>
                {t(day)}
              </Text>
              <Text style={[typography.label, { color: colors.textPrimary, fontSize: 12.5 }]}>
                {hours}
              </Text>
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Response times */}
      <SectionCard title={t('Avg. Response Times')} icon="flash-outline" accentColor={colors.success}>
        <View style={{ gap: spacing(3.5) }}>
          {RESPONSE_TIMES.map(({ channel, time, color }) => (
            <View
              key={channel}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13.5 }]}>
                {t(channel)}
              </Text>
              <View
                style={{
                  paddingHorizontal: spacing(3),
                  paddingVertical: spacing(1.5),
                  borderRadius: radii.pill,
                  backgroundColor: `${color}14`,
                  borderWidth: 1,
                  borderColor: `${color}30`,
                }}
              >
                <Text style={[typography.caption, { color, fontWeight: '700' }]}>{time}</Text>
              </View>
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Tip */}
      <View
        style={{
          padding: spacing(4),
          backgroundColor: `${colors.primary}0F`,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: `${colors.primary}22`,
          borderLeftWidth: 3,
          borderLeftColor: colors.primary,
        }}
      >
        <Text style={[typography.label, { color: colors.textPrimary, marginBottom: 4, fontSize: 13 }]}>
          {t('Student tip')}
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 20, fontSize: 13 }]}>
          {t('For urgent issues, call or WhatsApp us. For document reviews, bursary queries, and application appeals, email with your Thuto-Bridge Student ID.')}
        </Text>
      </View>

      {/* Emergency card */}
      <View
        style={{
          padding: spacing(4),
          borderRadius: radii.xl,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
        }}
      >
        <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing(1.5) }]}>
          {t('NEED HELP FAST?')}
        </Text>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 14, marginBottom: 6 }]}>
          {t('WhatsApp is usually quickest outside call hours')}
        </Text>
        <Pressable
          onPress={() => Linking.openURL('https://wa.me/26775618725')}
          accessibilityRole="button"
          accessibilityLabel={`${t('WhatsApp Support')}: +267 75 618 725`}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
        >
          <Text style={[typography.label, { color: '#22C55E' }]}>+267 75 000 111</Text>
          <Ionicons name="open-outline" size={13} color="#22C55E" />
        </Pressable>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────────────────────

function ContactSupportContent() {
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
  const compact = isMobile;

  const padX = isMobile ? spacing(4) : isTablet ? spacing(5) : spacing(8);

  // Card column sizing – fully responsive
  const cardWidth = isMobile ? '100%' : '48%';

  // ── NavBar ────────────────────────────────────────────────────────────
  const NavBar = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: padX,
          paddingVertical: spacing(compact ? 3 : 3.5),
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
        <Text
          style={[typography.h2, { color: colors.textPrimary, fontSize: compact ? 16 : 17 }]}
          numberOfLines={1}
        >
          {t('Contact Support')}
        </Text>
        {!compact && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            {t('Thuto-Bridge Student Help Centre')}
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
          <Text style={[typography.label, { color: colors.textSecondary, fontSize: 12.5 }]}>
            {t('Settings')}
          </Text>
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

  // ── Hero banner ───────────────────────────────────────────────────────
  const HeroBanner = (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          marginBottom: spacing(compact ? 5 : 7),
        },
        elevLg,
      ]}
    >
      <View style={{ height: 4, backgroundColor: colors.primary }} />
      <View style={{ padding: compact ? spacing(5) : spacing(7) }}>
        <View
          style={{
            flexDirection: isMobile ? 'column' : 'row',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            gap: spacing(4),
          }}
        >
          <View style={{ flex: 1, maxWidth: 560 }}>
            {/* Badge */}
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
              <Ionicons name="sparkles" size={13} color={colors.primary} />
              <Text
                style={[
                  typography.caption,
                  { color: colors.primary, fontWeight: '700', letterSpacing: 0.3 },
                ]}
              >
                {t('THUTO-BRIDGE SUPPORT')}
              </Text>
            </View>

            <Text
              style={[
                typography.hero,
                {
                  color: colors.textPrimary,
                  fontSize: isMobile ? 26 : 32,
                  lineHeight: isMobile ? 32 : 38,
                },
              ]}
            >
              {t("We're here to help you succeed")}
            </Text>
            <Text
              style={[
                typography.body,
                {
                  color: colors.textSecondary,
                  marginTop: spacing(2.5),
                  lineHeight: 23,
                  fontSize: 15,
                },
              ]}
            >
              {t('Questions about applications, results, bursaries, or your account? Pick the channel that works best for you – our Botswana-based student team replies fast.')}
            </Text>

            {/* Quick chips */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(3.5) }}>
              {['Applications', 'Results', 'Bursaries', 'Account help'].map((topic) => (
                <View
                  key={topic}
                  style={{
                    paddingHorizontal: spacing(3),
                    paddingVertical: spacing(1.5),
                    borderRadius: radii.pill,
                    backgroundColor: colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                    {t(topic)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Icon cluster — tablet/desktop */}
          {!isMobile && (
            <View style={{ gap: spacing(2.5), flexShrink: 0, paddingLeft: spacing(2) }}>
              {[
                { icon: 'call-outline' as const, color: '#3B82F6' },
                { icon: 'mail-outline' as const, color: '#14B8A6' },
                { icon: 'logo-whatsapp' as const, color: '#22C55E' },
              ].map(({ icon, color }) => (
                <View
                  key={icon}
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    backgroundColor: `${color}12`,
                    borderWidth: 1,
                    borderColor: `${color}28`,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={icon} size={22} color={color} />
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // ── Response strip (mobile/tablet) ────────────────────────────────────
  const ResponseStrip = !isDesktop && (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing(2.5),
        marginBottom: spacing(5),
      }}
    >
      {RESPONSE_TIMES.slice(0, 3).map(({ channel, time, color }) => (
        <View
          key={channel}
          style={{
            flex: 1,
            minWidth: isMobile ? 100 : 120,
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing(3),
            alignItems: 'center',
            gap: spacing(1),
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
          <Text style={[typography.label, { color: colors.textPrimary, fontSize: 12.5 }]}>
            {channel}
          </Text>
          <Text style={[typography.caption, { color, fontWeight: '700' }]}>{time}</Text>
        </View>
      ))}
    </View>
  );

  // ── Cards grid ───────────────────────────────────────────────────────
  const CardsGrid = (
    <View>
      <Text
        style={[
          typography.caption,
          {
            color: colors.textMuted,
            letterSpacing: 0.4,
            marginBottom: spacing(3.5),
            fontWeight: '600',
          },
        ]}
      >
        {t('SUPPORT CHANNELS')} · {SUPPORT_ITEMS.length} {t('WAYS TO REACH US')}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing(3.5),
          justifyContent: 'flex-start',
        }}
      >
        {SUPPORT_ITEMS.map((item) => (
          <SupportCard key={item.title} item={item} cardWidth={cardWidth} compact={compact} />
        ))}
      </View>
    </View>
  );

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {NavBar}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing(10) }}
        >
          <View
            style={{
              paddingHorizontal: padX,
              paddingTop: spacing(compact ? 5 : 7),
              maxWidth: 1200,
              alignSelf: 'center',
              width: '100%',
            }}
          >
            {/* Breadcrumb */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(2.5),
                marginBottom: spacing(4),
                flexWrap: 'wrap',
              }}
            >
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
                accessibilityLabel={t('Go Back')}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing(1.5),
                  paddingHorizontal: spacing(3),
                  paddingVertical: spacing(1.5),
                  borderRadius: radii.lg,
                  backgroundColor: colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="arrow-back" size={14} color={colors.primary} />
                <Text style={[typography.label, { color: colors.primary, fontSize: 12.5 }]}>{t('Go Back')}</Text>
              </Pressable>
              <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
                {t('Settings › Contact Support')}
              </Text>
            </View>

            {HeroBanner}

            {/* Two-column on desktop */}
            <View
              style={{
                flexDirection: isDesktop ? 'row' : 'column',
                gap: spacing(isDesktop ? 8 : 5),
                alignItems: 'flex-start',
              }}
            >
              <View style={{ flex: 1, minWidth: 0, width: '100%' }}>
                {ResponseStrip}
                {CardsGrid}

                {/* Mobile help block */}
                {!isDesktop && (
                  <View
                    style={{
                      marginTop: spacing(6),
                      padding: spacing(4),
                      backgroundColor: `${colors.primary}0E`,
                      borderRadius: radii.xl,
                      borderWidth: 1,
                      borderColor: `${colors.primary}22`,
                    }}
                  >
                    <Text style={[typography.label, { color: colors.textPrimary, marginBottom: 4 }]}>
                      {t('Student tip')}
                    </Text>
                    <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 20, fontSize: 13.5 }]}>
                      {t('For urgent matters, call or WhatsApp us. For document reviews and bursary queries, email with your Thuto-Bridge Student ID for faster help.')}
                    </Text>
                  </View>
                )}
              </View>

              {isDesktop && <SidebarPanel />}
            </View>

            <StudentFooter />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function ContactSupportScreen() {
  return (
    <StudentMenuProvider>
      <ContactSupportContent />
    </StudentMenuProvider>
  );
}