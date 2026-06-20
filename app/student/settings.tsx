// screens/student/StudentSettingsScreen.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  useWindowDimensions,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StudentMenuProvider, useStudentMenu } from '../../components/student/StudentMenu';

// ─────────────────────────────────────────────────────────────────────────────
// Shared Design System
// ─────────────────────────────────────────────────────────────────────────────
import {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';

// ─────────────────────────────────────────────────────────────────────────────
// Elevation helper
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md') {
  return useMemo(() => {
    const opacity = 0.28;
    const radius  = intensity === 'sm' ? 6  : intensity === 'md' ? 14 : 22;
    const offsetY = intensity === 'sm' ? 2  : intensity === 'md' ? 5  : 10;
    return Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: radius },
      android: { elevation: intensity === 'sm' ? 3 : intensity === 'md' ? 6 : 12 },
      web:     { boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})` },
      default: {},
    });
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type SettingRoute =
  | 'profile'
  | 'notifications'
  | 'password'
  | 'terms'
  | 'privacy'
  | 'support'
  | 'faq'
  | 'logout'
  | 'delete';

// ─────────────────────────────────────────────────────────────────────────────
// Route config — single source of truth used by both sidebar and mobile sections
// ─────────────────────────────────────────────────────────────────────────────
const NAV_LINKS: {
  key:   SettingRoute;
  label: string;
  icon:  keyof typeof Ionicons.glyphMap;
  accent?: string;
}[] = [
  { key: 'profile',       label: 'Edit Profile',      icon: 'person-outline'                },
  { key: 'notifications', label: 'Notifications',      icon: 'notifications-outline'         },
  { key: 'password',      label: 'Change Password',    icon: 'key-outline'                   },
  { key: 'terms',         label: 'Terms & Conditions', icon: 'document-text-outline'         },
  { key: 'privacy',       label: 'Privacy Policy',     icon: 'shield-checkmark-outline'      },
  { key: 'support',       label: 'Contact Support',    icon: 'help-circle-outline'           },
  { key: 'faq',           label: 'FAQ',                icon: 'chatbubble-ellipses-outline'   },
];

// ─────────────────────────────────────────────────────────────────────────────
// Provider wrapper
// ─────────────────────────────────────────────────────────────────────────────
export default function StudentSettingsScreen() {
  return (
    <StudentMenuProvider>
      <StudentSettingsContent />
    </StudentMenuProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen content
// ─────────────────────────────────────────────────────────────────────────────
function StudentSettingsContent() {
  const { width } = useWindowDimensions();
  const colors    = useTheme();
  const { openMenu } = useStudentMenu();
  const elevationMd = useElevation('md');

  const breakpoint = useMemo<'mobile' | 'tablet' | 'desktop'>(() => {
    if (width < 768)  return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isMobile  = breakpoint === 'mobile';

  const [emailNotifs,       setEmailNotifs]       = useState(true);
  const [pushNotifs,        setPushNotifs]         = useState(true);
  const [marketingNotifs,   setMarketingNotifs]    = useState(false);
  const [compactMode,       setCompactMode]        = useState(false);
  const [deadlineReminders, setDeadlineReminders]  = useState(true);

  const navigate = useCallback((route: SettingRoute) => {
    switch (route) {
      case 'profile':       router.push('/student/profile');           break;
      case 'notifications': router.push('/student/notifications');     break;
      case 'password':      router.push('/student/change-password');   break;
      case 'terms':         router.push('/student/terms-conditions');  break;
      case 'privacy':       router.push('/student/privacy-policy');    break;
      case 'support':       router.push('/student/contact-support');   break;
      case 'faq':           router.push('/student/faq');               break;
      case 'logout':        router.replace('/login');                  break;
      case 'delete':
        Alert.alert('Coming soon', 'Account deletion will be added later.');
        break;
    }
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            padding:      isMobile ? spacing(5) : spacing(7),
            maxWidth:     isDesktop ? 1280 : '100%',
            alignSelf:    'center',
            width:        '100%',
            paddingBottom: spacing(12),
          }}
        >
          {/* ── Header ── */}
          <View
            style={{
              flexDirection:  'row',
              justifyContent: 'space-between',
              alignItems:     'center',
              marginBottom:   spacing(7),
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.h1, { color: colors.textPrimary }]}>Settings</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing(1) }]}>
                Manage your account, privacy and preferences
              </Text>
            </View>

            <Pressable
              onPress={openMenu}
              style={({ pressed }) => ({
                width:           48,
                height:          48,
                borderRadius:    radii.lg,
                backgroundColor: colors.surfaceAlt,
                borderWidth:     1,
                borderColor:     colors.border,
                alignItems:      'center',
                justifyContent:  'center',
                marginLeft:      spacing(4),
                opacity:         pressed ? 0.85 : 1,
                transform:       pressed ? [{ scale: 0.96 }] : [],
              })}
            >
              <Ionicons name="menu" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing(8) }}>

            {/* ── Desktop sidebar ── */}
            {isDesktop && (
              <View style={{ width: 300, flexShrink: 0 }}>
                <View
                  style={[
                    {
                      backgroundColor: colors.surface,
                      borderRadius:    radii.xxl,
                      borderWidth:     1,
                      borderColor:     colors.border,
                      overflow:        'hidden',
                    },
                    elevationMd,
                  ]}
                >
                  {/* Accent top bar */}
                  <View style={{ height: 3, backgroundColor: colors.primary }} />

                  <View style={{ padding: spacing(6), paddingBottom: spacing(4) }}>
                    <Text style={[typography.h2, { color: colors.textPrimary }]}>Navigation</Text>
                  </View>

                  {NAV_LINKS.map(({ key, label, icon }) => (
                    <Pressable
                      key={key}
                      onPress={() => navigate(key)}
                      style={({ pressed }) => ({
                        paddingHorizontal: spacing(5),
                        paddingVertical:   spacing(4),
                        flexDirection:     'row',
                        alignItems:        'center',
                        gap:               spacing(3),
                        backgroundColor:   pressed ? colors.surfaceAlt : 'transparent',
                      })}
                    >
                      <View
                        style={{
                          width:           34,
                          height:          34,
                          borderRadius:    radii.md,
                          backgroundColor: `${colors.primary}18`,
                          alignItems:      'center',
                          justifyContent:  'center',
                        }}
                      >
                        <Ionicons name={icon} size={17} color={colors.primary} />
                      </View>
                      <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>
                        {label}
                      </Text>
                      <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
                    </Pressable>
                  ))}

                  <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing(2) }} />

                  <Pressable
                    onPress={() => navigate('logout')}
                    style={({ pressed }) => ({
                      paddingHorizontal: spacing(5),
                      paddingVertical:   spacing(4),
                      flexDirection:     'row',
                      alignItems:        'center',
                      gap:               spacing(3),
                      opacity:           pressed ? 0.85 : 1,
                    })}
                  >
                    <View
                      style={{
                        width:           34,
                        height:          34,
                        borderRadius:    radii.md,
                        backgroundColor: `${colors.danger}18`,
                        alignItems:      'center',
                        justifyContent:  'center',
                      }}
                    >
                      <Ionicons name="log-out-outline" size={17} color={colors.danger} />
                    </View>
                    <Text style={[typography.body, { color: colors.danger, flex: 1 }]}>Log Out</Text>
                  </Pressable>

                  <View style={{ height: spacing(4) }} />
                </View>
              </View>
            )}

            {/* ── Main content ── */}
            <View style={{ flex: 1, minWidth: 0 }}>

              {/* Hero card */}
              <View
                style={[
                  {
                    backgroundColor: colors.surface,
                    borderRadius:    radii.xxl,
                    borderWidth:     1,
                    borderColor:     colors.border,
                    overflow:        'hidden',
                    marginBottom:    spacing(7),
                  },
                  elevationMd,
                ]}
              >
                <View style={{ height: 3, backgroundColor: colors.primary }} />
                <View style={{ padding: spacing(6) }}>
                  <Text style={[typography.h2, { color: colors.textPrimary }]}>
                    Student Settings
                  </Text>
                  <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2) }]}>
                    Control your experience, privacy, notifications and account security.
                  </Text>
                </View>
              </View>

              {/* ── Account ── */}
              <Section title="Account" icon="person-circle-outline" colors={colors}>
                <NavRow
                  label="Edit Profile"
                  description="Update your name, bio and contact info"
                  icon="person-outline"
                  onPress={() => navigate('profile')}
                  colors={colors}
                />
                <NavRow
                  label="Change Password"
                  description="Update your account password"
                  icon="key-outline"
                  onPress={() => navigate('password')}
                  colors={colors}
                  last
                />
              </Section>

              {/* ── Notifications ── */}
              <Section title="Notifications" icon="notifications-outline" colors={colors}>
                <Toggle
                  label="Email notifications"
                  description="Receive updates via email"
                  value={emailNotifs}
                  setValue={setEmailNotifs}
                  colors={colors}
                />
                <Toggle
                  label="Push notifications"
                  description="Alerts on your device"
                  value={pushNotifs}
                  setValue={setPushNotifs}
                  colors={colors}
                />
                <Toggle
                  label="Deadline reminders"
                  description="Get reminded before application deadlines"
                  value={deadlineReminders}
                  setValue={setDeadlineReminders}
                  colors={colors}
                />
                <Toggle
                  label="Marketing updates"
                  description="News and feature announcements"
                  value={marketingNotifs}
                  setValue={setMarketingNotifs}
                  colors={colors}
                  last
                />
              </Section>

              {/* ── Preferences ── */}
              <Section title="Preferences" icon="options-outline" colors={colors}>
                <Toggle
                  label="Compact mode"
                  description="Reduce spacing for denser layouts"
                  value={compactMode}
                  setValue={setCompactMode}
                  colors={colors}
                  last
                />
              </Section>

              {/* ── Quick links (visible on mobile & tablet; desktop uses sidebar) ── */}
              {!isDesktop && (
                <Section title="Quick Links" icon="link-outline" colors={colors}>
                  {NAV_LINKS.map(({ key, label, icon }, i) => (
                    <NavRow
                      key={key}
                      label={label}
                      icon={icon}
                      onPress={() => navigate(key)}
                      colors={colors}
                      last={i === NAV_LINKS.length - 1}
                    />
                  ))}
                </Section>
              )}

              {/* ── Danger zone ── */}
              <Section title="Danger Zone" icon="warning-outline" colors={colors} danger>
                {/* Log out row — mobile/tablet only (desktop has sidebar) */}
                {!isDesktop && (
                  <NavRow
                    label="Log Out"
                    description="Sign out of your account"
                    icon="log-out-outline"
                    onPress={() => navigate('logout')}
                    colors={colors}
                    danger
                  />
                )}
                <NavRow
                  label="Delete Account"
                  description="Permanently remove your account and data"
                  icon="trash-outline"
                  onPress={() => navigate('delete')}
                  colors={colors}
                  danger
                  last
                />
              </Section>

            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Section({
  title,
  icon,
  children,
  colors,
  danger,
}: {
  title:    string;
  icon?:    keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  colors:   ReturnType<typeof useTheme>;
  danger?:  boolean;
}) {
  const elevation = useElevation('md');
  const accent    = danger ? colors.danger : colors.primary;

  return (
    <View style={{ marginBottom: spacing(7) }}>
      {/* Section label */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(3) }}>
        <View style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: accent }} />
        {icon && <Ionicons name={icon} size={14} color={accent} />}
        <Text style={[typography.caption, { color: accent, letterSpacing: 0.6, fontWeight: '700' }]}>
          {title.toUpperCase()}
        </Text>
      </View>

      <View
        style={[
          {
            backgroundColor: colors.surface,
            borderRadius:    radii.xxl,
            borderWidth:     1,
            borderColor:     danger ? `${colors.danger}33` : colors.border,
            overflow:        'hidden',
          },
          elevation,
        ]}
      >
        {/* Top accent */}
        <View style={{ height: 3, backgroundColor: accent }} />
        {children}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NavRow — tappable link row with icon, label, optional description
// ─────────────────────────────────────────────────────────────────────────────
function NavRow({
  label,
  description,
  icon,
  onPress,
  colors,
  danger,
  last,
}: {
  label:        string;
  description?: string;
  icon?:        keyof typeof Ionicons.glyphMap;
  onPress:      () => void;
  colors:       ReturnType<typeof useTheme>;
  danger?:      boolean;
  last?:        boolean;
}) {
  const accent = danger ? colors.danger : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection:   'row',
        alignItems:      'center',
        gap:             spacing(4),
        paddingHorizontal: spacing(5),
        paddingVertical: spacing(4),
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.divider,
        backgroundColor:  pressed
          ? danger ? `${colors.danger}10` : colors.surfaceAlt
          : 'transparent',
      })}
    >
      {/* Icon bubble */}
      {icon && (
        <View
          style={{
            width:           38,
            height:          38,
            borderRadius:    radii.md,
            backgroundColor: `${accent}18`,
            borderWidth:     1,
            borderColor:     `${accent}30`,
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
          }}
        >
          <Ionicons name={icon} size={18} color={accent} />
        </View>
      )}

      {/* Text */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typography.body, { color: danger ? colors.danger : colors.textPrimary, fontWeight: '600' }]}>
          {label}
        </Text>
        {description && (
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>
            {description}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={16} color={danger ? colors.danger : colors.textMuted} />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toggle row
// ─────────────────────────────────────────────────────────────────────────────
function Toggle({
  label,
  description,
  value,
  setValue,
  colors,
  last,
}: {
  label:        string;
  description?: string;
  value:        boolean;
  setValue:     (val: boolean) => void;
  colors:       ReturnType<typeof useTheme>;
  last?:        boolean;
}) {
  return (
    <View
      style={{
        flexDirection:     'row',
        alignItems:        'center',
        gap:               spacing(4),
        paddingHorizontal: spacing(5),
        paddingVertical:   spacing(4),
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.divider,
      }}
    >
      {/* Icon bubble */}
      <View
        style={{
          width:           38,
          height:          38,
          borderRadius:    radii.md,
          backgroundColor: value ? `${colors.primary}18` : `${colors.border}60`,
          borderWidth:     1,
          borderColor:     value ? `${colors.primary}30` : colors.border,
          alignItems:      'center',
          justifyContent:  'center',
          flexShrink:      0,
        }}
      >
        <Ionicons
          name={value ? 'checkmark-circle-outline' : 'ellipse-outline'}
          size={18}
          color={value ? colors.primary : colors.textMuted}
        />
      </View>

      {/* Text */}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
          {label}
        </Text>
        {description && (
          <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={2}>
            {description}
          </Text>
        )}
      </View>

      <Switch
        value={value}
        onValueChange={setValue}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}