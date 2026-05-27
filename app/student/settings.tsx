// screens/student/StudentSettingsScreen.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
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
// Local Elevation Helper (until moved to DashboardLayout)
// ─────────────────────────────────────────────────────────────────────────────
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
   Types
───────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   Provider Wrapper
───────────────────────────────────────────────────────────────────────────── */
export default function StudentSettingsScreen() {
  return (
    <StudentMenuProvider>
      <StudentSettingsContent />
    </StudentMenuProvider>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Screen Content
───────────────────────────────────────────────────────────────────────────── */
function StudentSettingsContent() {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { openMenu } = useStudentMenu();
  const elevationMd = useElevation('md');
  const elevationSm = useElevation('sm');

  const breakpoint = useMemo<'mobile' | 'tablet' | 'desktop'>(() => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isMobile = breakpoint === 'mobile';

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [marketingNotifs, setMarketingNotifs] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  const [deadlineReminders, setDeadlineReminders] = useState(true);

  const navigate = useCallback((route: SettingRoute) => {
    switch (route) {
      case 'profile':
        router.push('/student/profile');
        break;
      case 'notifications':
        router.push('/student/notifications');
        break;
      case 'password':
        router.push('/student/change-password');
        break;
      case 'terms':
        router.push('/student/terms-conditions');
        break;
      case 'privacy':
        router.push('/student/privacy-policy');
        break;
      case 'support':
        router.push('/student/contact-support');
        break;
      case 'faq':
        router.push('/student/faq');
        break;
      case 'logout':
        router.replace('/login');
        break;
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
                Settings
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, marginTop: spacing(1) },
                ]}
              >
                Manage your account, privacy and preferences
              </Text>
            </View>

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
                transform: pressed ? [{ scale: 0.96 }] : [],
              })}
            >
              <Ionicons name="menu" size={24} color={colors.textPrimary} />
            </Pressable>
          </View>

          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              gap: spacing(8),
            }}
          >
            {/* Desktop Sidebar Navigation */}
            {isDesktop && (
              <View style={{ width: 300, flexShrink: 0 }}>
                <View
                  style={[
                    {
                      backgroundColor: colors.surface,
                      borderRadius: radii.xxl,
                      borderWidth: 1,
                      borderColor: colors.border,
                      overflow: 'hidden',
                    },
                    elevationMd,
                  ]}
                >
                  <View style={{ padding: spacing(6) }}>
                    <Text style={[typography.h2, { color: colors.textPrimary }]}>
                      Navigation
                    </Text>
                  </View>

                  {[
                    ['profile', 'Profile', 'person-outline'],
                    ['notifications', 'Notifications', 'notifications-outline'],
                    ['password', 'Change Password', 'key-outline'],
                    ['terms', 'Terms & Conditions', 'document-text-outline'],
                    ['privacy', 'Privacy Policy', 'shield-checkmark-outline'],
                    ['support', 'Support', 'help-circle-outline'],
                    ['faq', 'FAQ', 'chatbubble-ellipses-outline'],
                  ].map(([key, label, icon]) => (
                    <Pressable
                      key={key}
                      onPress={() => navigate(key as SettingRoute)}
                      style={({ pressed }) => ({
                        padding: spacing(4),
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing(3),
                        backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
                      })}
                    >
                      <Ionicons
                        name={icon as any}
                        size={20}
                        color={colors.textPrimary}
                      />
                      <Text
                        style={[typography.body, { color: colors.textPrimary, flex: 1 }]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}

                  <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing(3) }} />

                  <Pressable
                    onPress={() => navigate('logout')}
                    style={({ pressed }) => ({
                      padding: spacing(4),
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing(3),
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                    <Text style={[typography.body, { color: colors.danger }]}>
                      Log Out
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* Main Content */}
            <View style={{ flex: 1 }}>
              {/* Hero Section */}
              <View
                style={[
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radii.xxl,
                    padding: spacing(7),
                    marginBottom: spacing(7),
                  },
                  elevationMd,
                ]}
              >
                <Text style={[typography.h2, { color: colors.textPrimary }]}>
                  Student Settings
                </Text>
                <Text
                  style={[
                    typography.body,
                    { color: colors.textSecondary, marginTop: spacing(2) },
                  ]}
                >
                  Control your experience, privacy, notifications and account security.
                </Text>
              </View>

              {/* Account Section */}
              <Section title="Account" colors={colors}>
                <Row label="Profile" onPress={() => navigate('profile')} />
                <Row label="Change Password" onPress={() => navigate('password')} />
              </Section>

              {/* Notifications Section */}
              <Section title="Notifications" colors={colors}>
                <Toggle
                  label="Email notifications"
                  value={emailNotifs}
                  setValue={setEmailNotifs}
                />
                <Toggle
                  label="Push notifications"
                  value={pushNotifs}
                  setValue={setPushNotifs}
                />
                <Toggle
                  label="Deadline reminders"
                  value={deadlineReminders}
                  setValue={setDeadlineReminders}
                />
                <Toggle
                  label="Marketing updates"
                  value={marketingNotifs}
                  setValue={setMarketingNotifs}
                />
              </Section>

              {/* Preferences Section */}
              <Section title="Preferences" colors={colors}>
                <Toggle
                  label="Compact mode"
                  value={compactMode}
                  setValue={setCompactMode}
                />
              </Section>

              {/* Danger Zone */}
              <Section title="Danger Zone" colors={colors}>
                <Pressable
                  onPress={() => navigate('delete')}
                  style={({ pressed }) => ({
                    padding: spacing(5),
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing(3),
                    backgroundColor: 'rgba(248, 113, 113, 0.12)', // dangerSoft equivalent
                    borderRadius: radii.xl,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  <Text style={[typography.label, { color: colors.danger }]}>
                    Delete Account
                  </Text>
                </Pressable>
              </Section>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Reusable Components
───────────────────────────────────────────────────────────────────────────── */
function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useTheme>;
}) {
  const elevation = useElevation('md');

  return (
    <View style={{ marginBottom: spacing(8) }}>
      <Text
        style={[
          typography.caption,
          { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) },
        ]}
      >
        {title.toUpperCase()}
      </Text>
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
        {children}
      </View>
    </View>
  );
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        padding: spacing(5),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
        backgroundColor: pressed ? colors.surfaceAlt : 'transparent',
      })}
    >
      <Text style={[typography.body, { color: colors.textPrimary }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function Toggle({
  label,
  value,
  setValue,
}: {
  label: string;
  value: boolean;
  setValue: (val: boolean) => void;
}) {
  const colors = useTheme();
  return (
    <View
      style={{
        padding: spacing(5),
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}
    >
      <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={setValue}
        trackColor={{ false: '#2A3A52', true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}