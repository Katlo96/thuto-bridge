
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Platform,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
  type ViewStyle,
  type StyleProp,
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

// ─────────────────────────────────────────────────────────────────────────────
// Firebase
// ─────────────────────────────────────────────────────────────────────────────
import { db, auth } from '../../constants/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Breakpoint = 'mobile' | 'tablet' | 'desktop';

type UserProfile = {
  name: string;
  phone: string;
  school: string;
  yearForm: string;
  bio: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Firestore helpers
// ─────────────────────────────────────────────────────────────────────────────
const USERS_COLLECTION = 'users';

async function fetchProfile(uid: string): Promise<Partial<UserProfile>> {
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
    if (snap.exists()) return snap.data() as Partial<UserProfile>;
  } catch (err) {
    console.error('[Profile] fetchProfile error:', err);
  }
  return {};
}

async function saveProfile(uid: string, data: UserProfile): Promise<void> {
  await setDoc(doc(db, USERS_COLLECTION, uid), data, { merge: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Elevation helper
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = 0.24;
    const radius = intensity === 'sm' ? 6 : intensity === 'md' ? 14 : 22;
    const offsetY = intensity === 'sm' ? 2 : intensity === 'md' ? 5 : 10;

    return (Platform.select({
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
      } as any,
      default: {},
    }) ?? {}) as ViewStyle;
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast notification
// ─────────────────────────────────────────────────────────────────────────────
function useToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [msg, setMsg] = useState('');
  const [type, setType] = useState<'success' | 'error'>('success');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(
    (message: string, variant: 'success' | 'error' = 'success') => {
      if (timerRef.current) clearTimeout(timerRef.current);

      setMsg(message);
      setType(variant);

      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.delay(2400),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 340,
          useNativeDriver: true,
        }),
      ]).start();

      timerRef.current = setTimeout(() => setMsg(''), 3000);
    },
    [opacity]
  );

  const Toast = msg ? (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: spacing(10),
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(3),
        paddingHorizontal: spacing(5),
        paddingVertical: spacing(3),
        borderRadius: radii.pill,
        backgroundColor: type === 'success' ? '#0F2A1E' : '#2A0F0F',
        borderWidth: 1,
        borderColor: type === 'success' ? '#34D39966' : '#F8717166',
        opacity,
        zIndex: 999,
        ...(Platform.OS === 'web'
          ? ({ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' } as any)
          : {}),
      }}
    >
      <Ionicons
        name={type === 'success' ? 'checkmark-circle' : 'alert-circle'}
        size={16}
        color={type === 'success' ? '#34D399' : '#F87171'}
      />
      <Text
        style={{
          color: type === 'success' ? '#34D399' : '#F87171',
          fontWeight: '600',
          fontSize: 14,
        }}
      >
        {msg}
      </Text>
    </Animated.View>
  ) : null;

  return { show, Toast };
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
          paddingHorizontal: compact ? spacing(4) : spacing(6),
          paddingTop: compact ? spacing(4) : spacing(5),
          paddingBottom: compact ? spacing(3) : spacing(4),
          borderBottomWidth: 1,
          borderBottomColor: colors.divider,
        }}
      >
        <View
          style={{
            width: compact ? 30 : 36,
            height: compact ? 30 : 36,
            borderRadius: radii.md,
            backgroundColor: `${color}22`,
            borderWidth: 1,
            borderColor: `${color}44`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={compact ? 14 : 16} color={color} />
        </View>

        <Text
          style={[
            typography.h2,
            {
              color: colors.textPrimary,
              fontSize: compact ? 14 : 16,
            },
          ]}
        >
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
// Field
// ─────────────────────────────────────────────────────────────────────────────
function Field({
  label,
  icon,
  compact,
  locked,
  helper,
  containerStyle,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
  locked?: boolean;
  helper?: string;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const colors = useTheme();
  const elevation = useElevation('sm');

  return (
    <View style={[{ minWidth: 0, width: '100%' }, containerStyle]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(2),
          marginBottom: spacing(2),
          minHeight: 18,
        }}
      >
        <Text
          numberOfLines={1}
          style={[
            typography.caption,
            {
              color: colors.textMuted,
              letterSpacing: 0.8,
              fontSize: compact ? 10 : 11,
              fontWeight: '700',
              flexShrink: 1,
            },
          ]}
        >
          {label.toUpperCase()}
        </Text>

        {locked && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing(1),
              paddingHorizontal: spacing(2),
              paddingVertical: 2,
              borderRadius: radii.pill,
              backgroundColor: `${colors.warning}1A`,
              borderWidth: 1,
              borderColor: `${colors.warning}40`,
              flexShrink: 0,
            }}
          >
            <Ionicons name="lock-closed" size={9} color={colors.warning} />
            <Text
              style={{
                fontSize: 9,
                color: colors.warning,
                fontWeight: '800',
                letterSpacing: 0.5,
              }}
            >
              LOCKED
            </Text>
          </View>
        )}
      </View>

      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: compact ? 46 : 52,
            borderWidth: 1,
            borderRadius: radii.lg,
            borderColor: locked ? `${colors.warning}33` : colors.border,
            backgroundColor: locked ? `${colors.warning}08` : colors.surfaceAlt,
            paddingHorizontal: spacing(compact ? 3 : 4),
            gap: spacing(2),
            overflow: 'hidden',
          },
          elevation,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={compact ? 15 : 17}
            color={locked ? colors.warning : colors.primary}
            style={{ flexShrink: 0 }}
          />
        )}

        <TextInput
          {...inputProps}
          editable={!locked && inputProps.editable !== false}
          placeholderTextColor={colors.textMuted}
          numberOfLines={1}
          style={[
            typography.body,
            {
              flex: 1,
              minWidth: 0,
              color: locked ? colors.textMuted : colors.textPrimary,
              paddingVertical: spacing(compact ? 2 : 3),
              fontSize: compact ? 13 : 14,
            },
          ]}
        />
      </View>

      {helper && (
        <Text
          style={[
            typography.caption,
            {
              color: colors.textMuted,
              fontSize: compact ? 10 : 11,
              marginTop: spacing(1),
            },
          ]}
        >
          {helper}
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FormGrid
// ─────────────────────────────────────────────────────────────────────────────
function FormGrid({
  columns,
  gap,
  children,
}: {
  columns: 1 | 2;
  gap: number;
  children: React.ReactNode;
}) {
  const items = React.Children.toArray(children);

  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap,
        width: '100%',
      }}
    >
      {items.map((child, i) => (
        <View
          key={i}
          style={{
            flexBasis: columns === 1 ? '100%' : '48.5%',
            flexGrow: columns === 1 ? 1 : 0,
            flexShrink: 1,
            minWidth: columns === 1 ? '100%' : 260,
            maxWidth: '100%',
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HeroStat tile
// ─────────────────────────────────────────────────────────────────────────────
function HeroStat({
  icon,
  label,
  value,
  accent,
  compact,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  accent?: string;
  compact?: boolean;
}) {
  const colors = useTheme();
  const c = accent ?? colors.primary;

  return (
    <View
      style={{
        flex: 1,
        minWidth: compact ? 80 : 100,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(compact ? 2 : 3),
        paddingHorizontal: spacing(compact ? 2 : 3),
        paddingVertical: spacing(compact ? 2 : 3),
        backgroundColor: `${c}0F`,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: `${c}22`,
      }}
    >
      <View
        style={{
          width: compact ? 28 : 34,
          height: compact ? 28 : 34,
          borderRadius: radii.md,
          backgroundColor: `${c}22`,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Ionicons name={icon} size={compact ? 13 : 16} color={c} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          style={[
            typography.bodyStrong,
            {
              color: colors.textPrimary,
              fontSize: compact ? 12 : 14,
            },
          ]}
          numberOfLines={1}
        >
          {value}
        </Text>

        <Text
          style={[
            typography.caption,
            {
              color: colors.textSecondary,
              marginTop: 1,
              fontSize: compact ? 9 : 10,
            },
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({
  label,
  icon,
  color,
  compact,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  compact?: boolean;
}) {
  const colors = useTheme();
  const c = color ?? colors.primary;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(1),
        paddingHorizontal: spacing(compact ? 2 : 3),
        paddingVertical: spacing(1),
        borderRadius: radii.pill,
        backgroundColor: `${c}1A`,
        borderWidth: 1,
        borderColor: `${c}44`,
      }}
    >
      <Ionicons name={icon} size={compact ? 10 : 12} color={c} />
      <Text
        style={[
          typography.caption,
          {
            color: c,
            fontWeight: '700',
            letterSpacing: 0.4,
            fontSize: compact ? 9 : 11,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({
  initials,
  onPress,
  size = 88,
}: {
  initials: string;
  onPress: () => void;
  size?: number;
}) {
  const colors = useTheme();
  const elevation = useElevation('md');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
        backgroundColor: `${colors.primary}22`,
        borderWidth: 2,
        borderColor: `${colors.primary}55`,
        opacity: pressed ? 0.85 : 1,
        transform: pressed ? [{ scale: 0.96 }] : [],
        ...Platform.select({
          ios: {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
          },
          android: { elevation: 6 },
          web: { boxShadow: `0 4px 18px ${colors.primary}44` } as any,
          default: {},
        }),
      })}
    >
      <View
        style={[
          {
            width: size - 8,
            height: size - 8,
            borderRadius: (size - 8) / 2,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          },
          elevation,
        ]}
      >
        <Text
          style={{
            fontSize: size * 0.28,
            fontWeight: '900',
            color: colors.primary,
            letterSpacing: 1,
          }}
        >
          {initials}
        </Text>
      </View>

      <View
        style={{
          position: 'absolute',
          right: 2,
          bottom: 2,
          width: size * 0.3,
          height: size * 0.3,
          borderRadius: size * 0.15,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.surface,
        }}
      >
        <Ionicons name="camera-outline" size={size * 0.14} color="#fff" />
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfileCompletionBar
// ─────────────────────────────────────────────────────────────────────────────
function ProfileCompletionBar({ pct, compact }: { pct: number; compact?: boolean }) {
  const colors = useTheme();
  const color = pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.danger;

  return (
    <View style={{ gap: spacing(2) }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          style={[
            typography.caption,
            {
              color: colors.textSecondary,
              fontSize: compact ? 10 : undefined,
            },
          ]}
        >
          Profile completeness
        </Text>

        <Text
          style={[
            typography.caption,
            {
              color,
              fontWeight: '700',
              fontSize: compact ? 10 : undefined,
            },
          ]}
        >
          {pct}%
        </Text>
      </View>

      <View
        style={{
          height: compact ? 5 : 7,
          backgroundColor: colors.border,
          borderRadius: radii.pill,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${pct}%` as any,
            backgroundColor: color,
            borderRadius: radii.pill,
          }}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UnsavedBanner
// ─────────────────────────────────────────────────────────────────────────────
function UnsavedBanner({
  onSave,
  saving,
  compact,
}: {
  onSave: () => void;
  saving: boolean;
  compact: boolean;
}) {
  const colors = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(3),
        paddingHorizontal: spacing(4),
        paddingVertical: spacing(3),
        backgroundColor: `${colors.warning}18`,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: `${colors.warning}44`,
        marginBottom: spacing(compact ? 4 : 5),
      }}
    >
      <Ionicons name="alert-circle-outline" size={16} color={colors.warning} />

      <Text
        style={[
          typography.caption,
          {
            color: colors.warning,
            flex: 1,
            fontWeight: '600',
          },
        ]}
      >
        You have unsaved changes
      </Text>

      <Pressable
        onPress={onSave}
        disabled={saving}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(1),
          paddingHorizontal: spacing(3),
          paddingVertical: spacing(2),
          borderRadius: radii.lg,
          backgroundColor: colors.warning,
          opacity: pressed || saving ? 0.8 : 1,
        })}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#000" />
        ) : (
          <Ionicons name="checkmark" size={13} color="#000" />
        )}

        <Text style={{ fontSize: 11, fontWeight: '800', color: '#000' }}>
          {saving ? 'SAVING' : 'SAVE NOW'}
        </Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarAction
// ─────────────────────────────────────────────────────────────────────────────
function SidebarAction({
  icon,
  label,
  onPress,
  accent,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  accent?: string;
}) {
  const colors = useTheme();
  const c = accent ?? colors.primary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: spacing(3),
        paddingHorizontal: spacing(4),
        paddingVertical: spacing(3),
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceAlt,
        opacity: pressed ? 0.82 : 1,
        transform: pressed ? [{ scale: 0.98 }] : [],
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radii.md,
          backgroundColor: `${c}18`,
          borderWidth: 1,
          borderColor: `${c}33`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={17} color={c} />
      </View>

      <Text
        style={[
          typography.body,
          {
            color: colors.textPrimary,
            flex: 1,
            fontSize: 14,
          },
        ]}
      >
        {label}
      </Text>

      <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
function StudentProfileContent() {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { openMenu } = useStudentMenu();
  const elevMd = useElevation('md');
  const elevLg = useElevation('lg');
  const { show: showToast, Toast } = useToast();

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isMobile = breakpoint === 'mobile';
  const compact = isMobile;
  const padX = compact ? spacing(4) : spacing(7);
  const formColumns: 1 | 2 = isMobile ? 1 : 2;

  // ── Auth & data state ──────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // ── Form state ─────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [yearForm, setYearForm] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const emptyProfile: UserProfile = useMemo(
    () => ({
      name: '',
      phone: '',
      school: '',
      yearForm: '',
      bio: '',
    }),
    []
  );

  const savedRef = useRef<UserProfile>({
    name: '',
    phone: '',
    school: '',
    yearForm: '',
    bio: '',
  });

  const isDirty = useMemo(
    () =>
      name !== savedRef.current.name ||
      phone !== savedRef.current.phone ||
      school !== savedRef.current.school ||
      yearForm !== savedRef.current.yearForm ||
      bio !== savedRef.current.bio,
    [name, phone, school, yearForm, bio]
  );

  // ── Load profile from Firestore once auth resolves ─────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);

      if (!user) return;

      setLoadingProfile(true);

      try {
        const data = await fetchProfile(user.uid);

        const loaded: UserProfile = {
          name: data.name ?? user.displayName ?? '',
          phone: data.phone ?? '',
          school: data.school ?? '',
          yearForm: data.yearForm ?? '',
          bio: data.bio ?? '',
        };

        setName(loaded.name);
        setPhone(loaded.phone);
        setSchool(loaded.school);
        setYearForm(loaded.yearForm);
        setBio(loaded.bio);

        savedRef.current = { ...loaded };
      } catch (err) {
        console.error('[Profile] load error:', err);
        showToast('Could not load profile data', 'error');
      } finally {
        setLoadingProfile(false);
      }
    });

    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Save to Firestore, then clear editable fields ──────────────────────────
  const handleSave = useCallback(async () => {
    if (saving || !currentUser) return;

    if (!name.trim()) {
      showToast('Full name is required', 'error');
      return;
    }

    setSaving(true);

    const payload: UserProfile = {
      name: name.trim(),
      phone: phone.trim(),
      school: school.trim(),
      yearForm: yearForm.trim(),
      bio: bio.trim(),
    };

    try {
      await saveProfile(currentUser.uid, payload);

      /**
       * IMPORTANT:
       * User requested that entries disappear after saving.
       * We save the actual payload to Firestore first, then clear the editable fields.
       * savedRef is also reset to empty values so the cleared form does not show
       * as "unsaved changes" immediately after a successful save.
       */
      savedRef.current = { ...emptyProfile };

      setName('');
      setPhone('');
      setSchool('');
      setYearForm('');
      setBio('');

      showToast('Profile saved successfully. Fields cleared.', 'success');
    } catch (err) {
      console.error('[Profile] save error:', err);
      showToast('Failed to save — check your connection', 'error');
    } finally {
      setSaving(false);
    }
  }, [
    saving,
    currentUser,
    name,
    phone,
    school,
    yearForm,
    bio,
    emptyProfile,
    showToast,
  ]);

  const handleChangePhoto = useCallback(() => {
    Alert.alert('Coming Soon', 'Profile photo upload will be available soon.');
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const email = currentUser?.email ?? '';

  const initials = useMemo(() => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    return `${parts[0]?.[0] ?? 'S'}${
      parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : ''
    }`.toUpperCase();
  }, [name]);

  const completeness = useMemo(() => {
    let s = 0;
    if (name.trim()) s += 25;
    if (phone.trim()) s += 15;
    if (school.trim()) s += 20;
    if (yearForm.trim()) s += 15;
    if (bio.trim()) s += 25;
    return s;
  }, [name, phone, school, yearForm, bio]);

  const schoolAbbr = useMemo(
    () =>
      school
        .trim()
        .split(' ')
        .filter(Boolean)
        .map((w) => w[0])
        .join('')
        .slice(0, 5) || '—',
    [school]
  );

  // ── Loading screens ────────────────────────────────────────────────────────
  if (loadingAuth) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing(4),
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[typography.body, { color: colors.textMuted }]}>
          Checking authentication…
        </Text>
      </View>
    );
  }

  if (!currentUser) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing(5),
          padding: spacing(8),
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: `${colors.danger}20`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="lock-closed-outline" size={28} color={colors.danger} />
        </View>

        <Text
          style={[
            typography.h2,
            {
              color: colors.textPrimary,
              textAlign: 'center',
            },
          ]}
        >
          Not signed in
        </Text>

        <Text
          style={[
            typography.body,
            {
              color: colors.textMuted,
              textAlign: 'center',
            },
          ]}
        >
          Please log in to view and edit your profile.
        </Text>

        <Pressable
          onPress={() => router.replace('/auth/login')}
          style={{
            paddingHorizontal: spacing(6),
            paddingVertical: spacing(3),
            backgroundColor: colors.primary,
            borderRadius: radii.lg,
          }}
        >
          <Text style={[typography.label, { color: '#fff' }]}>Go to Login</Text>
        </Pressable>
      </View>
    );
  }

  // ── Top nav bar ────────────────────────────────────────────────────────────
  const NavBar = (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: padX,
          paddingVertical: spacing(compact ? 3 : 4),
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
        style={({ pressed }) => ({
          width: compact ? 38 : 44,
          height: compact ? 38 : 44,
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons
          name="arrow-back"
          size={compact ? 18 : 20}
          color={colors.primary}
        />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text
          style={[
            typography.h2,
            {
              color: colors.textPrimary,
              fontSize: compact ? 15 : undefined,
            },
          ]}
        >
          Student Profile
        </Text>

        {!compact && (
          <Text
            style={[
              typography.caption,
              {
                color: colors.textSecondary,
                marginTop: 2,
              },
            ]}
            numberOfLines={1}
          >
            {isDirty ? '● Unsaved changes' : 'All changes saved'}
          </Text>
        )}
      </View>

      <Pressable
        onPress={handleSave}
        disabled={saving || !isDirty}
        style={({ pressed }) => ({
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          gap: spacing(2),
          paddingHorizontal: spacing(compact ? 3 : 4),
          paddingVertical: spacing(compact ? 2 : 2),
          borderRadius: radii.lg,
          backgroundColor: !isDirty
            ? colors.surfaceAlt
            : saving
              ? colors.surfaceAlt
              : colors.primary,
          borderWidth: 1,
          borderColor: !isDirty
            ? colors.border
            : saving
              ? colors.border
              : colors.primary,
          opacity: saving || !isDirty ? 0.5 : pressed ? 0.88 : 1,
          ...Platform.select({
            ios: {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: isDirty ? 0.3 : 0,
              shadowRadius: 8,
            },
            android: { elevation: isDirty ? 3 : 0 },
            web: {
              boxShadow:
                isDirty && !saving ? `0 3px 12px ${colors.primary}44` : 'none',
            } as any,
            default: {},
          }),
        })}
      >
        {saving ? (
          <ActivityIndicator color={colors.primary} size="small" />
        ) : (
          <Ionicons
            name="checkmark-circle-outline"
            size={compact ? 15 : 17}
            color={isDirty ? '#fff' : colors.textMuted}
          />
        )}

        {!compact && (
          <Text
            style={[
              typography.label,
              {
                color: saving ? colors.primary : isDirty ? '#fff' : colors.textMuted,
                fontSize: 12,
              },
            ]}
          >
            {saving ? 'SAVING…' : 'SAVE'}
          </Text>
        )}
      </Pressable>

      <Pressable
        onPress={openMenu}
        style={({ pressed }) => ({
          width: compact ? 38 : 44,
          height: compact ? 38 : 44,
          borderRadius: radii.lg,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <Ionicons
          name="menu"
          size={compact ? 20 : 22}
          color={colors.textPrimary}
        />
      </Pressable>
    </View>
  );

  // ── Profile hero card ──────────────────────────────────────────────────────
  const ProfileHero = (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
          marginBottom: spacing(compact ? 5 : 7),
          width: '100%',
        },
        elevLg,
      ]}
    >
      <View style={{ height: 4, backgroundColor: colors.primary }} />

      {loadingProfile ? (
        <View
          style={{
            padding: spacing(8),
            alignItems: 'center',
            gap: spacing(3),
          }}
        >
          <ActivityIndicator color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Loading your profile…
          </Text>
        </View>
      ) : (
        <View style={{ padding: compact ? spacing(4) : spacing(7) }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: compact ? 'center' : 'flex-start',
              gap: spacing(compact ? 4 : 6),
            }}
          >
            <Avatar
              initials={initials || '?'}
              onPress={handleChangePhoto}
              size={compact ? 72 : 96}
            />

            <View style={{ flex: 1, minWidth: 0 }}>
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: spacing(2),
                  marginBottom: spacing(compact ? 2 : 3),
                }}
              >
                <StatusBadge
                  label="STUDENT"
                  icon="school-outline"
                  color={colors.primary}
                  compact={compact}
                />
                <StatusBadge
                  label="ACTIVE"
                  icon="checkmark-circle-outline"
                  color={colors.success}
                  compact={compact}
                />
                {currentUser.emailVerified && (
                  <StatusBadge
                    label="VERIFIED"
                    icon="shield-checkmark-outline"
                    color={colors.warning}
                    compact={compact}
                  />
                )}
              </View>

              <Text
                style={{
                  fontSize: compact ? 18 : 26,
                  lineHeight: compact ? 23 : 32,
                  fontWeight: '900',
                  color: name.trim() ? colors.textPrimary : colors.textMuted,
                }}
                numberOfLines={1}
              >
                {name.trim() || 'Your Name'}
              </Text>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing(2),
                  marginTop: spacing(1),
                }}
              >
                <Ionicons
                  name="mail-outline"
                  size={compact ? 11 : 13}
                  color={colors.textMuted}
                />
                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.textSecondary,
                      fontSize: compact ? 12 : undefined,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {email}
                </Text>
              </View>

              <View style={{ marginTop: spacing(compact ? 3 : 4), width: '100%' }}>
                <ProfileCompletionBar pct={completeness} compact={compact} />
              </View>
            </View>
          </View>

          <View
            style={{
              height: 1,
              backgroundColor: colors.divider,
              marginVertical: compact ? spacing(4) : spacing(5),
            }}
          />

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: compact ? spacing(2) : spacing(3),
            }}
          >
            <HeroStat
              icon="school-outline"
              label="Institution"
              value={schoolAbbr}
              accent={colors.primary}
              compact={compact}
            />
            <HeroStat
              icon="sparkles-outline"
              label="Profile"
              value={`${completeness}%`}
              accent={colors.success}
              compact={compact}
            />
            <HeroStat
              icon="shield-checkmark-outline"
              label="Status"
              value={currentUser.emailVerified ? 'Verified' : 'Unverified'}
              accent={colors.warning}
              compact={compact}
            />
            <HeroStat
              icon="calendar-outline"
              label="Year"
              value={yearForm || '—'}
              accent={colors.primary}
              compact={compact}
            />
          </View>
        </View>
      )}
    </View>
  );

  // ── Form card ──────────────────────────────────────────────────────────────
  const FormCard = (
    <SectionCard
      title="Personal Information"
      icon="person-outline"
      accentColor={colors.primary}
      compact={compact}
    >
      {isDirty && !saving && (
        <UnsavedBanner onSave={handleSave} saving={saving} compact={compact} />
      )}

      <Text
        style={[
          typography.body,
          {
            color: colors.textSecondary,
            marginBottom: compact ? spacing(5) : spacing(6),
            lineHeight: compact ? 20 : 22,
            fontSize: compact ? 13 : 14,
          },
        ]}
      >
        This information is saved to your account and synced across all your devices.
        Add details to strengthen your scholarship and course recommendations.
      </Text>

      <Text
        style={[
          typography.caption,
          {
            color: colors.textMuted,
            fontWeight: '800',
            letterSpacing: 1,
            fontSize: 11,
            marginBottom: spacing(3),
          },
        ]}
      >
        IDENTITY
      </Text>

      <FormGrid columns={formColumns} gap={spacing(4)}>
        <Field
          label="Full Name"
          icon="person-outline"
          placeholder="Enter your full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          compact={compact}
        />

        <Field
          label="Email Address"
          icon="mail-outline"
          placeholder="your@email.com"
          value={email}
          locked
          helper="Email cannot be changed here"
          compact={compact}
        />
      </FormGrid>

      <View
        style={{
          height: 1,
          backgroundColor: colors.divider,
          marginVertical: compact ? spacing(5) : spacing(6),
        }}
      />

      <Text
        style={[
          typography.caption,
          {
            color: colors.textMuted,
            fontWeight: '800',
            letterSpacing: 1,
            fontSize: 11,
            marginBottom: spacing(3),
          },
        ]}
      >
        CONTACT & EDUCATION
      </Text>

      <FormGrid columns={formColumns} gap={spacing(4)}>
        <Field
          label="Phone Number"
          icon="call-outline"
          placeholder="+267 71 XXX XXX"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          compact={compact}
        />

        <Field
          label="Institution"
          icon="school-outline"
          placeholder="Your school or university"
          value={school}
          onChangeText={setSchool}
          autoCapitalize="words"
          compact={compact}
        />

        <Field
          label="Year / Form"
          icon="calendar-outline"
          placeholder="e.g. Form 5 or Year 2"
          value={yearForm}
          onChangeText={setYearForm}
          compact={compact}
        />

        {formColumns === 2 && <View />}
      </FormGrid>

      <View
        style={{
          height: 1,
          backgroundColor: colors.divider,
          marginVertical: compact ? spacing(5) : spacing(6),
        }}
      />

      <Text
        style={[
          typography.caption,
          {
            color: colors.textMuted,
            fontWeight: '800',
            letterSpacing: 1,
            fontSize: 11,
            marginBottom: spacing(3),
          },
        ]}
      >
        ABOUT YOU
      </Text>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing(2),
        }}
      >
        <Text
          style={[
            typography.caption,
            {
              color: colors.textMuted,
              letterSpacing: 0.8,
              fontSize: compact ? 10 : 11,
              fontWeight: '700',
            },
          ]}
        >
          BIO
        </Text>

        <Text
          style={[
            typography.caption,
            {
              color: colors.textMuted,
              fontSize: 10,
            },
          ]}
        >
          {bio.length} / 500
        </Text>
      </View>

      <View
        style={{
          borderWidth: 1,
          borderRadius: radii.lg,
          borderColor: colors.border,
          backgroundColor: colors.surfaceAlt,
          paddingHorizontal: compact ? spacing(3) : spacing(4),
          paddingVertical: compact ? spacing(2) : spacing(3),
          marginBottom: compact ? spacing(5) : spacing(6),
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.12,
              shadowRadius: 6,
            },
            android: { elevation: 2 },
            web: { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' } as any,
            default: {},
          }),
        }}
      >
        <TextInput
          multiline
          value={bio}
          onChangeText={(v) => setBio(v.slice(0, 500))}
          placeholder="Tell us about yourself, your goals, and achievements…"
          placeholderTextColor={colors.textMuted}
          style={[
            typography.body,
            {
              color: colors.textPrimary,
              minHeight: compact ? 100 : 130,
              textAlignVertical: 'top',
              lineHeight: compact ? 20 : 22,
              fontSize: compact ? 13 : 14,
            },
          ]}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(3),
          padding: spacing(3),
          marginBottom: compact ? spacing(4) : spacing(5),
          backgroundColor: `${colors.primary}0A`,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: `${colors.primary}1A`,
        }}
      >
        <Ionicons
          name="finger-print-outline"
          size={14}
          color={colors.textMuted}
        />

        <Text
          style={[
            typography.caption,
            {
              color: colors.textMuted,
              flex: 1,
              fontSize: 11,
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          Account ID: {currentUser.uid}
        </Text>
      </View>

      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => ({
          height: compact ? 50 : 56,
          borderRadius: radii.xl,
          backgroundColor: saving ? colors.surfaceAlt : colors.primary,
          borderWidth: 1,
          borderColor: saving ? colors.border : colors.primary,
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          gap: spacing(2),
          opacity: saving ? 0.7 : pressed ? 0.88 : 1,
          transform: pressed && !saving ? [{ scale: 0.98 }] : [],
          ...Platform.select({
            ios: {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.35,
              shadowRadius: 12,
            },
            android: { elevation: 4 },
            web: {
              boxShadow: saving ? 'none' : `0 4px 16px ${colors.primary}55`,
            } as any,
            default: {},
          }),
        })}
      >
        {saving ? (
          <>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text
              style={[
                typography.label,
                {
                  color: colors.primary,
                  letterSpacing: 0.5,
                  fontSize: compact ? 12 : undefined,
                },
              ]}
            >
              SAVING…
            </Text>
          </>
        ) : (
          <>
            <Ionicons
              name="cloud-upload-outline"
              size={compact ? 17 : 20}
              color="#fff"
            />
            <Text
              style={[
                typography.label,
                {
                  color: '#fff',
                  letterSpacing: 0.5,
                  fontSize: compact ? 12 : undefined,
                },
              ]}
            >
              SAVE PROFILE
            </Text>
          </>
        )}
      </Pressable>
    </SectionCard>
  );

  // ── Desktop sidebar ────────────────────────────────────────────────────────
  const Sidebar = isDesktop && (
    <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
      <SectionCard title="Account" icon="settings-outline" accentColor={colors.primary}>
        <View style={{ gap: spacing(3) }}>
          <SidebarAction
            icon="person-outline"
            label="Update Profile"
            accent={colors.primary}
            onPress={handleSave}
          />
          <SidebarAction
            icon="lock-closed-outline"
            label="Change Password"
            accent="#FBBF24"
            onPress={() => router.push('/student/change-password')}
          />
          <SidebarAction
            icon="school-outline"
            label="Academic Records"
            accent="#34D399"
            onPress={() => router.push('/student/academic-records')}
          />
          <SidebarAction
            icon="settings-outline"
            label="Account Settings"
            accent={colors.primary}
            onPress={() => router.push('/student/settings')}
          />
          <SidebarAction
            icon="help-circle-outline"
            label="Contact Support"
            accent="#F472B6"
            onPress={() => router.push('/student/contact-support')}
          />
        </View>

        <View
          style={{
            height: 1,
            backgroundColor: colors.divider,
            marginVertical: spacing(4),
          }}
        />

        <ProfileCompletionBar pct={completeness} />

        <View
          style={{
            marginTop: spacing(4),
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
              {
                color: colors.textSecondary,
                lineHeight: 18,
              },
            ]}
          >
            💡 Complete profiles receive stronger course and scholarship
            recommendations across the platform.
          </Text>
        </View>

        <View
          style={{
            marginTop: spacing(3),
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(2),
            padding: spacing(3),
            backgroundColor: `${colors.success}12`,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: `${colors.success}22`,
          }}
        >
          <Ionicons name="cloud-done-outline" size={14} color={colors.success} />
          <Text
            style={[
              typography.caption,
              {
                color: colors.success,
                fontWeight: '600',
              },
            ]}
          >
            Synced across all devices
          </Text>
        </View>
      </SectionCard>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing(12) }}
          >
            {NavBar}

            <View
              style={{
                paddingHorizontal: padX,
                paddingTop: spacing(compact ? 5 : 7),
                maxWidth: 1280,
                alignSelf: 'center',
                width: '100%',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing(3),
                  marginBottom: spacing(compact ? 4 : 6),
                }}
              >
                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => ({
                    flexDirection: 'row' as const,
                    alignItems: 'center' as const,
                    gap: spacing(2),
                    paddingHorizontal: spacing(compact ? 3 : 4),
                    paddingVertical: spacing(2),
                    borderRadius: radii.lg,
                    backgroundColor: colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: colors.border,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <Ionicons
                    name="arrow-back"
                    size={compact ? 14 : 16}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      typography.label,
                      {
                        color: colors.primary,
                        fontSize: compact ? 12 : undefined,
                      },
                    ]}
                  >
                    Back
                  </Text>
                </Pressable>

                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.textMuted,
                      flex: 1,
                      fontSize: compact ? 10 : undefined,
                    },
                  ]}
                  numberOfLines={1}
                >
                  Dashboard › Student Profile
                </Text>

                {isDirty && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing(1),
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: colors.warning,
                      }}
                    />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors.warning,
                          fontSize: compact ? 10 : undefined,
                        },
                      ]}
                    >
                      Unsaved
                    </Text>
                  </View>
                )}
              </View>

              {ProfileHero}

              <View
                style={{
                  flexDirection: isDesktop ? 'row' : 'column',
                  gap: compact ? spacing(5) : spacing(8),
                  alignItems: 'flex-start',
                }}
              >
                <View style={{ flex: 1, minWidth: 0, width: '100%' }}>
                  {FormCard}
                </View>

                {Sidebar}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {Toast}
    </View>
  );
}

export default function StudentProfileScreen() {
  return (
    <StudentMenuProvider>
      <StudentProfileContent />
    </StudentMenuProvider>
  );
}
