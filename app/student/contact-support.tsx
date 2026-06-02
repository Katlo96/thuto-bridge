import React, { useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  ScrollView,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StudentMenuProvider, useStudentMenu } from '../../components/student/StudentMenu';

import {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';

type Breakpoint = 'mobile' | 'tablet' | 'desktop';

type SupportItem = {
  icon:     keyof typeof Ionicons.glyphMap;
  title:    string;
  value:    string;
  subtitle: string;
  color:    string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────
const SUPPORT_ITEMS: SupportItem[] = [
  { icon: 'call-outline',     title: 'Support Phone',    value: '+267 71 234 567',         subtitle: 'Available Monday – Friday, 8 AM – 5 PM',        color: '#60A5FA' },
  { icon: 'mail-outline',     title: 'Support Email',    value: 'support@thutobridge.com', subtitle: 'Best for detailed issues and document help',     color: '#34D399' },
  { icon: 'logo-whatsapp',    title: 'WhatsApp Support', value: '+267 75 000 111',         subtitle: 'Quick help for simple student questions',        color: '#4ADE80' },
  { icon: 'logo-instagram',   title: 'Instagram',        value: '@thutobridge',            subtitle: 'Announcements, updates, and community posts',    color: '#F472B6' },
  { icon: 'logo-facebook',    title: 'Facebook',         value: 'Thuto Bridge',            subtitle: 'Community engagement and public updates',        color: '#818CF8' },
  { icon: 'globe-outline',    title: 'Website',          value: 'www.thutobridge.com',     subtitle: 'Official platform information and updates',      color: '#FBBF24' },
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
  title,
  icon,
  accentColor,
  children,
  compact,
}: {
  title:        string;
  icon:         keyof typeof Ionicons.glyphMap;
  accentColor?: string;
  children:     React.ReactNode;
  compact?:     boolean;
}) {
  const colors    = useTheme();
  const elevation = useElevation('md');
  const color     = accentColor ?? colors.primary;
  return (
    <View style={[{
      backgroundColor: colors.surface,
      borderRadius:    radii.xxl,
      borderWidth:     1,
      borderColor:     colors.border,
      overflow:        'hidden',
    }, elevation]}>
      <View style={{ height: 3, backgroundColor: color }} />
      <View style={{
        flexDirection:     'row',
        alignItems:        'center',
        gap:               spacing(3),
        paddingHorizontal: compact ? spacing(4) : spacing(6),
        paddingTop:        compact ? spacing(4) : spacing(5),
        paddingBottom:     compact ? spacing(3) : spacing(4),
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}>
        <View style={{
          width:           compact ? 30 : 36,
          height:          compact ? 30 : 36,
          borderRadius:    radii.md,
          backgroundColor: `${color}22`,
          borderWidth:     1,
          borderColor:     `${color}44`,
          alignItems:      'center',
          justifyContent:  'center',
        }}>
          <Ionicons name={icon} size={compact ? 14 : 16} color={color} />
        </View>
        <Text style={[typography.h2, { color: colors.textPrimary, fontSize: compact ? 14 : 16 }]}>
          {title}
        </Text>
      </View>
      <View style={{ padding: compact ? spacing(4) : spacing(6) }}>
        {children}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SupportCard
// ─────────────────────────────────────────────────────────────────────────────
function SupportCard({ item, compact }: { item: SupportItem; compact?: boolean }) {
  const colors    = useTheme();
  const elevation = useElevation('md');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title}: ${item.value}`}
      style={({ pressed }) => ([
        {
          width:           '48%' as any,
          backgroundColor: colors.card,
          borderRadius:    radii.xxl,
          borderWidth:     1,
          borderColor:     colors.border,
          overflow:        'hidden' as const,
          opacity:         pressed ? 0.88 : 1,
          transform:       pressed ? [{ scale: 0.98 }] : [],
        },
        elevation,
      ])}
    >
      {/* Accent bar */}
      <View style={{ height: 3, backgroundColor: item.color }} />

      <View style={{ padding: compact ? spacing(3) : spacing(5), gap: compact ? spacing(2) : spacing(3) }}>
        {/* Icon + arrow row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{
            width:           compact ? 36 : 46,
            height:          compact ? 36 : 46,
            borderRadius:    radii.xl,
            backgroundColor: `${item.color}1A`,
            borderWidth:     1,
            borderColor:     `${item.color}33`,
            alignItems:      'center',
            justifyContent:  'center',
          }}>
            <Ionicons name={item.icon} size={compact ? 17 : 22} color={item.color} />
          </View>
          <View style={{
            width:           compact ? 26 : 30,
            height:          compact ? 26 : 30,
            borderRadius:    radii.md,
            backgroundColor: colors.surfaceAlt,
            borderWidth:     1,
            borderColor:     colors.border,
            alignItems:      'center',
            justifyContent:  'center',
          }}>
            <Ionicons name="arrow-forward" size={compact ? 12 : 14} color={item.color} />
          </View>
        </View>

        {/* Title */}
        <Text style={[typography.caption, { color: colors.textSecondary, letterSpacing: 0.4, fontSize: compact ? 9 : 10 }]}>
          {item.title.toUpperCase()}
        </Text>

        {/* Value */}
        <Text
          style={[typography.bodyStrong, { color: item.color, fontSize: compact ? 11 : 14, lineHeight: compact ? 15 : 20 }]}
          numberOfLines={1}
        >
          {item.value}
        </Text>

        {/* Subtitle — hidden on compact */}
        {!compact && (
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 17 }]}>
            {item.subtitle}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar panel (desktop only)
// ─────────────────────────────────────────────────────────────────────────────
function SidebarPanel() {
  const colors = useTheme();

  return (
    <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
      {/* Support hours */}
      <SectionCard title="Support Hours" icon="time-outline" accentColor={colors.primary}>
        <View style={{ gap: spacing(1) }}>
          {[
            { day: 'Monday – Friday', hours: '8:00 AM – 5:00 PM' },
            { day: 'Saturday',        hours: '9:00 AM – 1:00 PM' },
            { day: 'Sunday & Public Holidays', hours: 'Closed' },
          ].map(({ day, hours }) => (
            <View key={day} style={{
              flexDirection:     'row',
              justifyContent:    'space-between',
              alignItems:        'center',
              paddingVertical:   spacing(3),
              borderBottomWidth: 1,
              borderBottomColor: colors.divider,
            }}>
              <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13 }]}>{day}</Text>
              <Text style={[typography.label, { color: colors.textPrimary, fontSize: 12 }]}>{hours}</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Response times */}
      <SectionCard title="Response Times" icon="flash-outline" accentColor={colors.success}>
        <View style={{ gap: spacing(3) }}>
          {[
            { channel: 'Phone',     time: 'Immediate', color: '#60A5FA' },
            { channel: 'WhatsApp',  time: '< 1 hour',  color: '#4ADE80' },
            { channel: 'Email',     time: '< 24 hours', color: '#34D399' },
            { channel: 'Social',    time: '1–2 days',   color: '#F472B6' },
          ].map(({ channel, time, color }) => (
            <View key={channel} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13 }]}>{channel}</Text>
              <View style={{
                paddingHorizontal: spacing(3),
                paddingVertical:   spacing(1),
                borderRadius:      radii.pill,
                backgroundColor:   `${color}1A`,
                borderWidth:       1,
                borderColor:       `${color}33`,
              }}>
                <Text style={[typography.caption, { color, fontWeight: '700' }]}>{time}</Text>
              </View>
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Tip */}
      <View style={{
        padding:         spacing(4),
        backgroundColor: `${colors.primary}14`,
        borderRadius:    radii.xl,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
      }}>
        <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
          💡 For urgent matters, WhatsApp or phone is fastest. For document reviews and application queries, email is recommended.
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────────────────────
function ContactSupportContent() {
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
  const compact   = isMobile;
  const padX      = compact ? spacing(4) : spacing(7);

  // ── NavBar ────────────────────────────────────────────────────────────────
  const NavBar = (
    <View style={[{
      flexDirection:     'row',
      alignItems:        'center',
      paddingHorizontal: padX,
      paddingVertical:   spacing(compact ? 3 : 4),
      backgroundColor:   colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap:               spacing(3),
    }, elevMd]}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => ({
          width:           compact ? 38 : 44,
          height:          compact ? 38 : 44,
          borderRadius:    radii.lg,
          backgroundColor: colors.surfaceAlt,
          borderWidth:     1,
          borderColor:     colors.border,
          alignItems:      'center' as const,
          justifyContent:  'center' as const,
          opacity:         pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="arrow-back" size={compact ? 18 : 20} color={colors.primary} />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text style={[typography.h2, { color: colors.textPrimary, fontSize: compact ? 15 : undefined }]}>
          Contact Support
        </Text>
        {!compact && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            Reach Thuto Bridge through official channels
          </Text>
        )}
      </View>

      {/* Settings shortcut — tablet/desktop */}
      {!compact && (
        <Pressable
          onPress={() => router.push('/student/settings')}
          style={({ pressed }) => ({
            flexDirection:    'row' as const,
            alignItems:       'center' as const,
            gap:              spacing(2),
            paddingHorizontal: spacing(3),
            paddingVertical:  spacing(2),
            borderRadius:     radii.lg,
            backgroundColor:  colors.surfaceAlt,
            borderWidth:      1,
            borderColor:      colors.border,
            opacity:          pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="settings-outline" size={15} color={colors.textSecondary} />
          <Text style={[typography.label, { color: colors.textSecondary, fontSize: 12 }]}>Settings</Text>
        </Pressable>
      )}

      {/* Menu */}
      <Pressable
        onPress={openMenu}
        style={({ pressed }) => ({
          width:           compact ? 38 : 44,
          height:          compact ? 38 : 44,
          borderRadius:    radii.lg,
          backgroundColor: colors.surfaceAlt,
          borderWidth:     1,
          borderColor:     colors.border,
          alignItems:      'center' as const,
          justifyContent:  'center' as const,
          opacity:         pressed ? 0.8 : 1,
        })}
      >
        <Ionicons name="menu" size={compact ? 20 : 22} color={colors.textPrimary} />
      </Pressable>
    </View>
  );

  // ── Hero banner ────────────────────────────────────────────────────────────
  const HeroBanner = (
    <View style={[{
      backgroundColor: colors.surface,
      borderRadius:    radii.xxl,
      borderWidth:     1,
      borderColor:     colors.border,
      overflow:        'hidden',
      marginBottom:    spacing(compact ? 5 : 7),
    }, elevLg]}>
      <View style={{ height: 4, backgroundColor: colors.primary }} />
      <View style={{ padding: compact ? spacing(4) : spacing(7) }}>
        <View style={{
          flexDirection:  'row',
          alignItems:     compact ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap:            spacing(4),
        }}>
          <View style={{ flex: 1 }}>
            {/* Badge */}
            <View style={{
              alignSelf:        'flex-start',
              flexDirection:    'row',
              alignItems:       'center',
              gap:              spacing(2),
              paddingHorizontal: spacing(3),
              paddingVertical:  spacing(2),
              borderRadius:     radii.pill,
              backgroundColor:  `${colors.primary}22`,
              borderWidth:      1,
              borderColor:      `${colors.primary}44`,
              marginBottom:     spacing(compact ? 3 : 4),
            }}>
              <Ionicons name="help-buoy-outline" size={compact ? 12 : 14} color={colors.primary} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', fontSize: compact ? 10 : undefined }]}>
                SUPPORT
              </Text>
            </View>

            <Text style={[typography.hero, { color: colors.textPrimary, fontSize: compact ? 20 : undefined, lineHeight: compact ? 26 : undefined }]}>
              We're Here to Help
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), maxWidth: 480, lineHeight: compact ? 20 : 24, fontSize: compact ? 13 : undefined }]}>
              Choose the support channel that works best for you. Our team is ready to assist with applications, results, and any questions about Thuto Bridge.
            </Text>
          </View>

          {/* Icon cluster — tablet/desktop */}
          {!compact && (
            <View style={{ gap: spacing(3), flexShrink: 0 }}>
              {([
                { icon: 'call-outline'  as const, color: '#60A5FA' },
                { icon: 'mail-outline'  as const, color: '#34D399' },
                { icon: 'logo-whatsapp' as const, color: '#4ADE80' },
              ]).map(({ icon, color }) => (
                <View key={icon} style={{
                  width:           46,
                  height:          46,
                  borderRadius:    radii.xl,
                  backgroundColor: `${color}1A`,
                  borderWidth:     1,
                  borderColor:     `${color}33`,
                  alignItems:      'center',
                  justifyContent:  'center',
                }}>
                  <Ionicons name={icon} size={20} color={color} />
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // ── Response strip (mobile/tablet) ────────────────────────────────────────
  const ResponseStrip = !isDesktop && (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(compact ? 2 : 3), marginBottom: spacing(compact ? 4 : 6) }}>
      {[
        { label: 'Phone',    time: 'Immediate', color: '#60A5FA' },
        { label: 'WhatsApp', time: '< 1 hr',    color: '#4ADE80' },
        { label: 'Email',    time: '< 24 hrs',  color: '#34D399' },
      ].map(({ label, time, color }) => (
        <View key={label} style={{
          flex:            1,
          minWidth:        80,
          backgroundColor: colors.surface,
          borderRadius:    radii.lg,
          borderWidth:     1,
          borderColor:     colors.border,
          padding:         compact ? spacing(2) : spacing(3),
          alignItems:      'center',
          gap:             spacing(1),
        }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: color, marginBottom: spacing(1) }} />
          <Text style={[typography.label, { color: colors.textPrimary, fontSize: compact ? 11 : undefined }]}>{label}</Text>
          <Text style={[typography.caption, { color, fontWeight: '700', fontSize: compact ? 9 : undefined }]}>{time}</Text>
        </View>
      ))}
    </View>
  );

  // ── Cards grid — 2-col via 48% width ──────────────────────────────────────
  const CardsGrid = (
    <View>
      <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3), fontSize: compact ? 10 : undefined }]}>
        SUPPORT CHANNELS · {SUPPORT_ITEMS.length} AVAILABLE
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(compact ? 2 : 3) }}>
        {SUPPORT_ITEMS.map((item) => (
          <SupportCard key={item.title} item={item} compact={compact} />
        ))}
      </View>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render — no DashboardLayout; owns SafeAreaView + ScrollView
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {NavBar}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing(12) }}
        >
          <View style={{
            paddingHorizontal: padX,
            paddingTop:        spacing(compact ? 5 : 7),
            maxWidth:          1280,
            alignSelf:         'center',
            width:             '100%',
          }}>

            {/* Breadcrumb */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(compact ? 4 : 6) }}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => ({
                  flexDirection:    'row' as const,
                  alignItems:       'center' as const,
                  gap:              spacing(2),
                  paddingHorizontal: spacing(compact ? 3 : 4),
                  paddingVertical:  spacing(2),
                  borderRadius:     radii.lg,
                  backgroundColor:  colors.surfaceAlt,
                  borderWidth:      1,
                  borderColor:      colors.border,
                  opacity:          pressed ? 0.8 : 1,
                })}
              >
                <Ionicons name="arrow-back" size={compact ? 14 : 16} color={colors.primary} />
                <Text style={[typography.label, { color: colors.primary, fontSize: compact ? 12 : undefined }]}>Back</Text>
              </Pressable>
              <Text style={[typography.caption, { color: colors.textMuted, flex: 1, fontSize: compact ? 10 : undefined }]} numberOfLines={1}>
                Settings › Contact Support
              </Text>
            </View>

            {/* Hero */}
            {HeroBanner}

            {/* Two-column on desktop, stacked otherwise */}
            <View style={{
              flexDirection: isDesktop ? 'row' : 'column',
              gap:           compact ? spacing(5) : spacing(8),
              alignItems:    'flex-start',
            }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                {ResponseStrip}
                {CardsGrid}
              </View>

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
export default function ContactSupportScreen() {
  return (
    <StudentMenuProvider>
      <ContactSupportContent />
    </StudentMenuProvider>
  );
}