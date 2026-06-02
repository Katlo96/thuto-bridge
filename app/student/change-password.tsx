import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  ActivityIndicator,
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
// Password strength
// ─────────────────────────────────────────────────────────────────────────────
type StrengthLevel = 'none' | 'weak' | 'fair' | 'strong' | 'excellent';

function getPasswordStrength(password: string): StrengthLevel {
  if (!password) return 'none';
  let score = 0;
  if (password.length >= 8)            score++;
  if (password.length >= 12)           score++;
  if (/[A-Z]/.test(password))          score++;
  if (/[0-9]/.test(password))          score++;
  if (/[^A-Za-z0-9]/.test(password))  score++;
  if (score <= 1) return 'weak';
  if (score === 2) return 'fair';
  if (score === 3) return 'strong';
  return 'excellent';
}

function strengthMeta(level: StrengthLevel): { label: string; color: string; segments: number } {
  switch (level) {
    case 'weak':      return { label: 'Weak',      color: '#F87171', segments: 1 };
    case 'fair':      return { label: 'Fair',       color: '#FBBF24', segments: 2 };
    case 'strong':    return { label: 'Strong',     color: '#34D399', segments: 3 };
    case 'excellent': return { label: 'Excellent',  color: '#60A5FA', segments: 4 };
    default:          return { label: '',           color: 'transparent', segments: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PasswordStrengthBar
// ─────────────────────────────────────────────────────────────────────────────
function PasswordStrengthBar({ password }: { password: string }) {
  const colors = useTheme();
  const level  = getPasswordStrength(password);
  const meta   = strengthMeta(level);
  if (level === 'none') return null;
  return (
    <View style={{ marginTop: spacing(2), gap: spacing(2) }}>
      <View style={{ flexDirection: 'row', gap: spacing(1) }}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= meta.segments ? meta.color : colors.border }} />
        ))}
      </View>
      <Text style={[typography.caption, { color: meta.color, fontWeight: '700' }]}>{meta.label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InputBlock
// ─────────────────────────────────────────────────────────────────────────────
function InputBlock({
  label,
  value,
  onChangeText,
  secureTextEntry,
  showToggle,
  onToggle,
  placeholder,
  showStrength = false,
  matchValue,
  compact,
}: {
  label:           string;
  value:           string;
  onChangeText:    (t: string) => void;
  secureTextEntry: boolean;
  showToggle:      boolean;
  onToggle:        () => void;
  placeholder?:    string;
  showStrength?:   boolean;
  matchValue?:     string;
  compact?:        boolean;
}) {
  const colors    = useTheme();
  const elevation = useElevation('sm');

  const matchState: 'idle' | 'match' | 'mismatch' =
    matchValue === undefined ? 'idle'
    : !value    ? 'idle'
    : value === matchValue ? 'match'
    : 'mismatch';

  const borderColor =
    matchState === 'match'    ? colors.success :
    matchState === 'mismatch' ? colors.danger  : colors.border;

  return (
    <View style={{ marginBottom: compact ? spacing(4) : spacing(5) }}>
      <Text style={[typography.label, { color: colors.textPrimary, marginBottom: spacing(2), fontSize: compact ? 12 : undefined }]}>
        {label}
      </Text>

      <View style={[{
        flexDirection:    'row',
        alignItems:       'center',
        minHeight:        compact ? 48 : 54,
        borderWidth:      1,
        borderRadius:     radii.lg,
        borderColor,
        backgroundColor:  colors.surfaceAlt,
        paddingLeft:      spacing(compact ? 3 : 4),
        paddingRight:     spacing(2),
      }, elevation]}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          placeholder={placeholder ?? label}
          placeholderTextColor={colors.textMuted}
          style={{
            flex:        1,
            minHeight:   compact ? 46 : 52,
            fontSize:    compact ? 13 : 15,
            fontWeight:  '500',
            color:       colors.textPrimary,
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {matchState !== 'idle' && (
          <Ionicons
            name={matchState === 'match' ? 'checkmark-circle' : 'close-circle'}
            size={18}
            color={matchState === 'match' ? colors.success : colors.danger}
            style={{ marginRight: spacing(1) }}
          />
        )}

        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={secureTextEntry ? 'Show password' : 'Hide password'}
          style={({ pressed }) => ({
            width:           38,
            height:          38,
            borderRadius:    radii.md,
            alignItems:      'center' as const,
            justifyContent:  'center' as const,
            opacity:         pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name={showToggle ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
        </Pressable>
      </View>

      {showStrength && <PasswordStrengthBar password={value} />}

      {matchState === 'mismatch' && (
        <Text style={[typography.caption, { color: colors.danger, marginTop: spacing(2) }]}>
          Passwords do not match
        </Text>
      )}
      {matchState === 'match' && (
        <Text style={[typography.caption, { color: colors.success, marginTop: spacing(2) }]}>
          Passwords match ✓
        </Text>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SecurityTip
// ─────────────────────────────────────────────────────────────────────────────
function SecurityTip({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3) }}>
      <Ionicons name={icon} size={15} color={colors.primary} style={{ marginTop: 2 }} />
      <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, lineHeight: 18 }]}>{text}</Text>
    </View>
  );
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
// Sidebar panel (desktop only)
// ─────────────────────────────────────────────────────────────────────────────
function SidebarPanel() {
  const colors = useTheme();

  return (
    <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
      {/* Security tips */}
      <SectionCard title="Security Tips" icon="shield-checkmark-outline" accentColor={colors.primary}>
        <View style={{ gap: spacing(4) }}>
          <SecurityTip icon="checkmark-circle-outline" text="Use at least 8 characters for a stronger password." />
          <SecurityTip icon="checkmark-circle-outline" text="Mix uppercase letters, numbers, and special symbols." />
          <SecurityTip icon="checkmark-circle-outline" text="Avoid using personal information like your name or birthday." />
          <SecurityTip icon="checkmark-circle-outline" text="Never reuse passwords across different accounts." />
        </View>
      </SectionCard>

      {/* Strength legend */}
      <SectionCard title="Strength Guide" icon="bar-chart-outline" accentColor="#FBBF24">
        <View style={{ gap: spacing(4) }}>
          {([
            { level: 'Weak',      color: '#F87171', desc: '< 8 chars, no variety' },
            { level: 'Fair',      color: '#FBBF24', desc: '8+ chars, some variety' },
            { level: 'Strong',    color: '#34D399', desc: '8+ chars, letters + numbers' },
            { level: 'Excellent', color: '#60A5FA', desc: '12+ chars, symbols included' },
          ] as const).map(({ level, color, desc }) => (
            <View key={level} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: color }} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.label, { color: colors.textPrimary, fontSize: 13 }]}>{level}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </SectionCard>

      {/* Settings shortcut */}
      <Pressable
        onPress={() => router.push('/student/settings')}
        style={({ pressed }) => ({
          flexDirection:    'row' as const,
          alignItems:       'center' as const,
          gap:              spacing(3),
          padding:          spacing(4),
          backgroundColor:  colors.surfaceAlt,
          borderRadius:     radii.xl,
          borderWidth:      1,
          borderColor:      colors.border,
          opacity:          pressed ? 0.85 : 1,
        })}
      >
        <Ionicons name="settings-outline" size={17} color={colors.textSecondary} />
        <Text style={[typography.label, { color: colors.textSecondary }]}>Back to Settings</Text>
        <View style={{ flex: 1 }} />
        <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen content
// ─────────────────────────────────────────────────────────────────────────────
function ChangePasswordContent() {
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

  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword,    setNextPassword]    = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent,     setShowCurrent]     = useState(false);
  const [showNext,        setShowNext]        = useState(false);
  const [showConfirm,     setShowConfirm]     = useState(false);
  const [saving,          setSaving]          = useState(false);

  const handleSave = useCallback(() => {
    if (saving) return;
    if (!currentPassword.trim() || !nextPassword.trim() || !confirmPassword.trim()) {
      Alert.alert('Incomplete form', 'Please fill in all password fields.');
      return;
    }
    if (nextPassword.length < 8) {
      Alert.alert('Weak password', 'Your new password must be at least 8 characters.');
      return;
    }
    if (nextPassword !== confirmPassword) {
      Alert.alert('Passwords do not match', 'New password fields must match.');
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Password Updated', 'Your password has been changed successfully.');
    }, 1200);
  }, [currentPassword, nextPassword, confirmPassword, saving]);

  // ── Top nav bar ────────────────────────────────────────────────────────────
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
          Change Password
        </Text>
        {!compact && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            Update your account password securely
          </Text>
        )}
      </View>

      {/* Settings shortcut — tablet/desktop only */}
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
              <Ionicons name="lock-closed-outline" size={12} color={colors.primary} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', fontSize: compact ? 10 : undefined }]}>
                SECURITY
              </Text>
            </View>

            <Text style={[typography.hero, { color: colors.textPrimary, fontSize: compact ? 20 : undefined, lineHeight: compact ? 26 : undefined }]}>
              Password Settings
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), maxWidth: 480, lineHeight: compact ? 20 : 24, fontSize: compact ? 13 : undefined }]}>
              Enter your current password and choose a strong new one. The strength indicator will help guide your choice.
            </Text>
          </View>

          {/* Icon cluster — tablet/desktop */}
          {!compact && (
            <View style={{
              width:           68,
              height:          68,
              borderRadius:    radii.xxl,
              backgroundColor: `${colors.primary}22`,
              borderWidth:     1,
              borderColor:     `${colors.primary}44`,
              alignItems:      'center',
              justifyContent:  'center',
              flexShrink:      0,
            }}>
              <Ionicons name="lock-closed" size={32} color={colors.primary} />
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // ── Form card ──────────────────────────────────────────────────────────────
  const FormCard = (
    <SectionCard
      title="Update Password"
      icon="lock-closed-outline"
      accentColor={colors.primary}
      compact={compact}
    >
      {/* Current password */}
      <InputBlock
        label="Current Password"
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry={!showCurrent}
        showToggle={showCurrent}
        onToggle={() => setShowCurrent((p) => !p)}
        placeholder="Enter your current password"
        compact={compact}
      />

      <View style={{ height: 1, backgroundColor: colors.divider, marginBottom: compact ? spacing(4) : spacing(5) }} />

      {/* New password */}
      <InputBlock
        label="New Password"
        value={nextPassword}
        onChangeText={setNextPassword}
        secureTextEntry={!showNext}
        showToggle={showNext}
        onToggle={() => setShowNext((p) => !p)}
        placeholder="Choose a strong new password"
        showStrength
        compact={compact}
      />

      {/* Confirm new password */}
      <InputBlock
        label="Confirm New Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry={!showConfirm}
        showToggle={showConfirm}
        onToggle={() => setShowConfirm((p) => !p)}
        placeholder="Re-enter your new password"
        matchValue={nextPassword}
        compact={compact}
      />

      {/* Inline tip */}
      <View style={{
        flexDirection:    'row',
        alignItems:       'flex-start',
        gap:              spacing(3),
        padding:          compact ? spacing(3) : spacing(4),
        backgroundColor:  `${colors.primary}14`,
        borderRadius:     radii.lg,
        borderLeftWidth:  3,
        borderLeftColor:  colors.primary,
        marginBottom:     compact ? spacing(4) : spacing(6),
      }}>
        <Ionicons name="shield-checkmark-outline" size={compact ? 15 : 18} color={colors.primary} style={{ marginTop: 1 }} />
        <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, lineHeight: 18, fontSize: compact ? 11 : undefined }]}>
          Use at least 8 characters with a mix of letters, numbers, and symbols for a stronger password.
        </Text>
      </View>

      {/* Save button */}
      <Pressable
        onPress={handleSave}
        disabled={saving}
        accessibilityRole="button"
        accessibilityLabel="Save new password"
        style={({ pressed }) => ({
          flexDirection:   'row' as const,
          alignItems:      'center' as const,
          justifyContent:  'center' as const,
          gap:             spacing(2),
          minHeight:       compact ? 48 : 54,
          borderRadius:    radii.lg,
          backgroundColor: saving ? colors.surfaceAlt : colors.primary,
          borderWidth:     1,
          borderColor:     saving ? colors.border : colors.primary,
          opacity:         saving ? 0.7 : pressed ? 0.88 : 1,
          transform:       pressed && !saving ? [{ scale: 0.98 }] : [],
          ...Platform.select({
            ios:     { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12 },
            android: { elevation: 4 },
            web:     { boxShadow: saving ? 'none' : `0 4px 16px ${colors.primary}55` } as any,
            default: {},
          }),
        })}
      >
        {saving ? (
          <>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={[typography.label, { color: colors.primary, letterSpacing: 0.5, fontSize: compact ? 12 : undefined }]}>SAVING…</Text>
          </>
        ) : (
          <>
            <Ionicons name="save-outline" size={compact ? 16 : 19} color="#fff" />
            <Text style={[typography.label, { color: '#fff', letterSpacing: 0.5, fontWeight: '900', fontSize: compact ? 12 : undefined }]}>SAVE PASSWORD</Text>
          </>
        )}
      </Pressable>
    </SectionCard>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render — no DashboardLayout; owns its own SafeAreaView + ScrollView
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {NavBar}

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
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
                  Settings › Change Password
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
                <View style={{
                  flex:      1,
                  maxWidth:  isDesktop ? undefined : 640,
                  alignSelf: isDesktop ? undefined : 'center',
                  width:     isDesktop ? undefined : '100%',
                  minWidth:  0,
                }}>
                  {FormCard}
                </View>

                {isDesktop && <SidebarPanel />}
              </View>

            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function ChangePasswordScreen() {
  return (
    <StudentMenuProvider>
      <ChangePasswordContent />
    </StudentMenuProvider>
  );
}