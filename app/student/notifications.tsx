// screens/student/StudentNotificationsScreen.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  StudentMenuProvider,
  useStudentMenu,
} from '../../components/student/StudentMenu';

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
// Local Elevation Helper
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
type NotifType = 'info' | 'warning' | 'success';
type NotifFilter = 'all' | 'important' | 'deadlines';

type Notif = {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  tag?: NotifFilter;
};

/* ─────────────────────────────────────────────────────────────────────────────
   Data
───────────────────────────────────────────────────────────────────────────── */
const INITIAL_DATA: Notif[] = [
  {
    id: '1',
    type: 'success',
    title: 'New course match available',
    body: 'Biology at University of Botswana aligns with your profile.',
    time: '2h ago',
    read: false,
    tag: 'important',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Application deadline approaching',
    body: 'B.A Psychology closes in 3 days. Prepare your documents.',
    time: 'Yesterday',
    read: false,
    tag: 'deadlines',
  },
  {
    id: '3',
    type: 'info',
    title: 'Scholarship update',
    body: 'New international scholarship opportunities added.',
    time: '2 days ago',
    read: true,
    tag: 'important',
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Provider Wrapper
───────────────────────────────────────────────────────────────────────────── */
export default function StudentNotificationsScreen() {
  return (
    <StudentMenuProvider>
      <StudentNotificationsContent />
    </StudentMenuProvider>
  );
}

function StudentNotificationsContent() {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { openMenu } = useStudentMenu();
  const elevationMd = useElevation('md');

  const breakpoint = useMemo<'mobile' | 'tablet' | 'desktop'>(() => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isMobile = breakpoint === 'mobile';

  const [filter, setFilter] = useState<NotifFilter>('all');
  const [items, setItems] = useState<Notif[]>(INITIAL_DATA);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    if (filter === 'important') return items.filter((n) => n.tag === 'important');
    return items.filter((n) => n.tag === 'deadlines');
  }, [items, filter]);

  const markAllRead = useCallback(() => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearRead = useCallback(() => {
    setItems((prev) => prev.filter((n) => !n.read));
  }, []);

  const toggleRead = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: !n.read } : n))
    );
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
                Notifications
              </Text>
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, marginTop: spacing(1) },
                ]}
              >
                Updates, deadlines & important alerts
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

          {/* Filters & Actions */}
          <View
            style={{
              flexDirection: isDesktop ? 'row' : 'column',
              gap: spacing(4),
              marginBottom: spacing(6),
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
              {(['all', 'important', 'deadlines'] as NotifFilter[]).map((f) => (
                <FilterChip
                  key={f}
                  label={f}
                  active={filter === f}
                  onPress={() => setFilter(f)}
                />
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing(3), flexWrap: 'wrap' }}>
              <ActionBtn
                label="Mark all read"
                icon="checkmark-done-outline"
                onPress={markAllRead}
              />
              <ActionBtn
                label="Clear read"
                icon="trash-outline"
                onPress={clearRead}
              />
            </View>
          </View>

          {/* Notifications List */}
          <View style={{ gap: spacing(4) }}>
            {filtered.length === 0 ? (
              <View
                style={[
                  {
                    padding: spacing(10),
                    backgroundColor: colors.surface,
                    borderRadius: radii.xxl,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                  },
                  elevationMd,
                ]}
              >
                <Ionicons name="notifications-off-outline" size={48} color={colors.textMuted} />
                <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(4) }]}>
                  No notifications
                </Text>
              </View>
            ) : (
              filtered.map((n) => (
                <NotificationCard
                  key={n.id}
                  item={n}
                  onPress={() => toggleRead(n.id)}
                />
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Reusable Components
───────────────────────────────────────────────────────────────────────────── */
function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: spacing(5),
        paddingVertical: spacing(2.5),
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: active ? colors.primary : colors.border,
        backgroundColor: active ? `${colors.primary}22` : colors.surfaceAlt, // primarySoft equivalent
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Text
        style={[
          typography.label,
          { color: active ? colors.primary : colors.textSecondary },
        ]}
      >
        {label.toUpperCase()}
      </Text>
    </Pressable>
  );
}

function ActionBtn({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(2),
        paddingHorizontal: spacing(5),
        paddingVertical: spacing(3),
        borderRadius: radii.lg,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.85 : 1,
        transform: pressed ? [{ scale: 0.98 }] : [],
      })}
    >
      <Ionicons name={icon} size={18} color={colors.textPrimary} />
      <Text style={[typography.label, { color: colors.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

function NotificationCard({
  item,
  onPress,
}: {
  item: Notif;
  onPress: () => void;
}) {
  const colors = useTheme();
  const elevation = useElevation('md');

  const icon =
    item.type === 'success'
      ? 'checkmark-circle-outline'
      : item.type === 'warning'
      ? 'warning-outline'
      : 'information-circle-outline';

  const accentColor =
    item.type === 'success'
      ? colors.success
      : item.type === 'warning'
      ? colors.warning
      : colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ([
        {
          flexDirection: 'row',
          gap: spacing(4),
          padding: spacing(5),
          backgroundColor: item.read ? colors.surface : colors.surfaceAlt,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: item.read ? colors.border : colors.primary,
        },
        elevation,
        pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
      ])}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: radii.xl,
          backgroundColor: `${accentColor}22`,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: `${accentColor}44`,
        }}
      >
        <Ionicons name={icon} size={22} color={accentColor} />
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={[
            typography.bodyStrong,
            { color: colors.textPrimary, marginBottom: spacing(1) },
          ]}
        >
          {item.title}
        </Text>
        <Text
          style={[typography.body, { color: colors.textSecondary, lineHeight: 20 }]}
          numberOfLines={2}
        >
          {item.body}
        </Text>

        <View
          style={{
            marginTop: spacing(3),
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {item.time}
          </Text>
          {!item.read && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                backgroundColor: colors.primary,
              }}
            />
          )}
        </View>
      </View>
    </Pressable>
  );
}