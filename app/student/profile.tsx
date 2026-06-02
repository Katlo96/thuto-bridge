import React, { useCallback, useMemo, useState } from 'react';
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
    const opacity = 0.24;
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
      {/* Section header */}
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
// Field
// ─────────────────────────────────────────────────────────────────────────────
function Field({
  label,
  icon,
  compact,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & {
  label:    string;
  icon?:    keyof typeof Ionicons.glyphMap;
  compact?: boolean;
}) {
  const colors    = useTheme();
  const elevation = useElevation('sm');
  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      <Text style={[typography.caption, {
        color:         colors.textMuted,
        letterSpacing: 0.5,
        marginBottom:  spacing(2),
        fontSize:      compact ? 9 : 10,
      }]}>
        {label.toUpperCase()}
      </Text>
      <View style={[{
        flexDirection:     'row',
        alignItems:        'center',
        minHeight:         compact ? 46 : 54,
        borderWidth:       1,
        borderRadius:      radii.lg,
        borderColor:       colors.border,
        backgroundColor:   colors.surfaceAlt,
        paddingHorizontal: spacing(compact ? 3 : 4),
        gap:               spacing(2),
      }, elevation]}>
        {icon && <Ionicons name={icon} size={compact ? 14 : 17} color={colors.primary} />}
        <TextInput
          {...inputProps}
          placeholderTextColor={colors.textMuted}
          style={[typography.body, {
            flex:          1,
            color:         colors.textPrimary,
            paddingVertical: spacing(compact ? 2 : 3),
            fontSize:      compact ? 13 : undefined,
          }]}
        />
      </View>
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
  icon:     keyof typeof Ionicons.glyphMap;
  label:    string;
  value:    string;
  accent?:  string;
  compact?: boolean;
}) {
  const colors = useTheme();
  const c      = accent ?? colors.primary;
  return (
    <View style={{
      flex:             1,
      minWidth:         compact ? 80 : 100,
      flexDirection:    'row',
      alignItems:       'center',
      gap:              spacing(compact ? 2 : 3),
      paddingHorizontal: spacing(compact ? 2 : 3),
      paddingVertical:  spacing(compact ? 2 : 3),
      backgroundColor:  `${c}0F`,
      borderRadius:     radii.lg,
      borderWidth:      1,
      borderColor:      `${c}22`,
    }}>
      <View style={{
        width:           compact ? 28 : 34,
        height:          compact ? 28 : 34,
        borderRadius:    radii.md,
        backgroundColor: `${c}22`,
        alignItems:      'center',
        justifyContent:  'center',
        flexShrink:      0,
      }}>
        <Ionicons name={icon} size={compact ? 13 : 16} color={c} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: compact ? 12 : 14 }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1, fontSize: compact ? 9 : 10 }]} numberOfLines={1}>
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
  label:    string;
  icon:     keyof typeof Ionicons.glyphMap;
  color?:   string;
  compact?: boolean;
}) {
  const colors = useTheme();
  const c      = color ?? colors.primary;
  return (
    <View style={{
      flexDirection:    'row',
      alignItems:       'center',
      gap:              spacing(1),
      paddingHorizontal: spacing(compact ? 2 : 3),
      paddingVertical:  spacing(1),
      borderRadius:     radii.pill,
      backgroundColor:  `${c}1A`,
      borderWidth:      1,
      borderColor:      `${c}44`,
    }}>
      <Ionicons name={icon} size={compact ? 10 : 12} color={c} />
      <Text style={[typography.caption, { color: c, fontWeight: '700', letterSpacing: 0.4, fontSize: compact ? 9 : 11 }]}>
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
  onPress:  () => void;
  size?:    number;
}) {
  const colors    = useTheme();
  const elevation = useElevation('md');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
      style={({ pressed }) => ({
        width:           size,
        height:          size,
        borderRadius:    size / 2,
        alignItems:      'center' as const,
        justifyContent:  'center' as const,
        backgroundColor: `${colors.primary}22`,
        borderWidth:     2,
        borderColor:     `${colors.primary}55`,
        opacity:         pressed ? 0.85 : 1,
        transform:       pressed ? [{ scale: 0.96 }] : [],
        ...Platform.select({
          ios:     { shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12 },
          android: { elevation: 6 },
          web:     { boxShadow: `0 4px 18px ${colors.primary}44` } as any,
          default: {},
        }),
      })}
    >
      <View style={[{
        width:           size - 8,
        height:          size - 8,
        borderRadius:    (size - 8) / 2,
        backgroundColor: colors.surface,
        borderWidth:     1,
        borderColor:     colors.border,
        alignItems:      'center',
        justifyContent:  'center',
      }, elevation]}>
        <Text style={{ fontSize: size * 0.28, fontWeight: '900', color: colors.primary, letterSpacing: 1 }}>
          {initials}
        </Text>
      </View>
      {/* Camera badge */}
      <View style={{
        position:        'absolute',
        right:           2,
        bottom:          2,
        width:           size * 0.3,
        height:          size * 0.3,
        borderRadius:    size * 0.15,
        backgroundColor: colors.primary,
        alignItems:      'center',
        justifyContent:  'center',
        borderWidth:     2,
        borderColor:     colors.surface,
      }}>
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
  const color  = pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.danger;
  return (
    <View style={{ gap: spacing(2) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[typography.caption, { color: colors.textSecondary, fontSize: compact ? 10 : undefined }]}>
          Profile completeness
        </Text>
        <Text style={[typography.caption, { color, fontWeight: '700', fontSize: compact ? 10 : undefined }]}>
          {pct}%
        </Text>
      </View>
      <View style={{ height: compact ? 5 : 7, backgroundColor: colors.border, borderRadius: radii.pill, overflow: 'hidden' }}>
        <View style={{
          height:          '100%',
          width:           `${pct}%` as any,
          backgroundColor: color,
          borderRadius:    radii.pill,
        }} />
      </View>
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
  icon:     keyof typeof Ionicons.glyphMap;
  label:    string;
  onPress?: () => void;
  accent?:  string;
}) {
  const colors = useTheme();
  const c      = accent ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection:    'row' as const,
        alignItems:       'center' as const,
        gap:              spacing(3),
        paddingHorizontal: spacing(4),
        paddingVertical:  spacing(3),
        borderRadius:     radii.lg,
        borderWidth:      1,
        borderColor:      colors.border,
        backgroundColor:  colors.surfaceAlt,
        opacity:          pressed ? 0.82 : 1,
        transform:        pressed ? [{ scale: 0.98 }] : [],
      })}
    >
      <View style={{
        width:           36,
        height:          36,
        borderRadius:    radii.md,
        backgroundColor: `${c}18`,
        borderWidth:     1,
        borderColor:     `${c}33`,
        alignItems:      'center',
        justifyContent:  'center',
      }}>
        <Ionicons name={icon} size={17} color={c} />
      </View>
      <Text style={[typography.body, { color: colors.textPrimary, flex: 1, fontSize: 14 }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen
// ─────────────────────────────────────────────────────────────────────────────
function StudentProfileContent() {
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

  const [name,     setName]     = useState('Katlo Monang');
  const [email]                 = useState('katlo@example.com');
  const [phone,    setPhone]    = useState('+267 71 234 567');
  const [school,   setSchool]   = useState('Botswana Accountancy College');
  const [yearForm, setYearForm] = useState('Form 5');
  const [bio,      setBio]      = useState('Driven student passionate about technology, innovation, leadership, and academic excellence.');
  const [saving,   setSaving]   = useState(false);

  const initials = useMemo(() => {
    const p = name.trim().split(/\s+/).filter(Boolean);
    return `${p[0]?.[0] ?? 'S'}${p.length > 1 ? p[p.length - 1]?.[0] ?? '' : ''}`.toUpperCase();
  }, [name]);

  const completeness = useMemo(() => {
    let s = 0;
    if (name.trim())     s += 25;
    if (phone.trim())    s += 15;
    if (school.trim())   s += 20;
    if (yearForm.trim()) s += 15;
    if (bio.trim())      s += 25;
    return s;
  }, [name, phone, school, yearForm, bio]);

  const handleSave = useCallback(() => {
    if (saving) return;
    if (!name.trim()) { Alert.alert('Missing Name', 'Please enter your full name.'); return; }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert('Profile Updated', 'Your profile has been saved successfully.');
    }, 1200);
  }, [name, saving]);

  const handleChangePhoto = useCallback(() => {
    Alert.alert('Coming Soon', 'Profile photo upload will be available soon.');
  }, []);

  const schoolAbbr = useMemo(() =>
    school.split(' ').map(w => w[0]).join('').slice(0, 5) || 'BAC',
    [school]
  );

  // ── Top nav bar ────────────────────────────────────────────────────────────
  const NavBar = (
    <View style={[{
      flexDirection:    'row',
      alignItems:       'center',
      paddingHorizontal: padX,
      paddingVertical:  spacing(compact ? 3 : 4),
      backgroundColor:  colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap:              spacing(3),
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
          Student Profile
        </Text>
        {!compact && (
          <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            Manage your account and academic identity
          </Text>
        )}
      </View>

      {/* Quick save */}
      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => ({
          flexDirection:    'row' as const,
          alignItems:       'center' as const,
          gap:              spacing(2),
          paddingHorizontal: spacing(compact ? 3 : 4),
          paddingVertical:  spacing(compact ? 2 : 2),
          borderRadius:     radii.lg,
          backgroundColor:  saving ? colors.surfaceAlt : colors.primary,
          borderWidth:      1,
          borderColor:      saving ? colors.border : colors.primary,
          opacity:          saving ? 0.6 : pressed ? 0.88 : 1,
          ...Platform.select({
            ios:     { shadowColor: colors.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 8 },
            android: { elevation: 3 },
            web:     { boxShadow: saving ? 'none' : `0 3px 12px ${colors.primary}44` } as any,
            default: {},
          }),
        })}
      >
        {saving
          ? <ActivityIndicator color={colors.primary} size="small" />
          : <Ionicons name="checkmark-circle-outline" size={compact ? 15 : 17} color="#fff" />}
        {!compact && (
          <Text style={[typography.label, { color: saving ? colors.primary : '#fff', fontSize: 12 }]}>
            {saving ? 'SAVING…' : 'SAVE'}
          </Text>
        )}
      </Pressable>

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

  // ── Profile hero card ──────────────────────────────────────────────────────
  const ProfileHero = (
    <View style={[{
      backgroundColor: colors.surface,
      borderRadius:    radii.xxl,
      borderWidth:     1,
      borderColor:     colors.border,
      overflow:        'hidden',
      marginBottom:    spacing(compact ? 5 : 7),
      width:           '100%',
    }, elevLg]}>
      {/* Accent bar */}
      <View style={{ height: 4, backgroundColor: colors.primary }} />

      <View style={{ padding: compact ? spacing(4) : spacing(7) }}>
        {/* Avatar + identity */}
        <View style={{
          flexDirection: compact ? 'row' : 'row',
          alignItems:    compact ? 'center' : 'flex-start',
          gap:           spacing(compact ? 4 : 6),
        }}>
          <Avatar
            initials={initials}
            onPress={handleChangePhoto}
            size={compact ? 72 : 96}
          />

          <View style={{ flex: 1, minWidth: 0 }}>
            {/* Badges */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginBottom: spacing(compact ? 2 : 3) }}>
              <StatusBadge label="STUDENT"  icon="school-outline"           color={colors.primary} compact={compact} />
              <StatusBadge label="ACTIVE"   icon="checkmark-circle-outline" color={colors.success} compact={compact} />
              <StatusBadge label="VERIFIED" icon="shield-checkmark-outline" color={colors.warning} compact={compact} />
            </View>

            <Text style={{
              fontSize:   compact ? 18 : 26,
              lineHeight: compact ? 23 : 32,
              fontWeight: '900',
              color:      colors.textPrimary,
            }} numberOfLines={1}>
              {name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(1) }}>
              <Ionicons name="mail-outline" size={compact ? 11 : 13} color={colors.textMuted} />
              <Text style={[typography.body, { color: colors.textSecondary, fontSize: compact ? 12 : undefined }]} numberOfLines={1}>
                {email}
              </Text>
            </View>

            {/* Completion bar inline on mobile */}
            <View style={{ marginTop: spacing(compact ? 3 : 4), width: '100%' }}>
              <ProfileCompletionBar pct={completeness} compact={compact} />
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: compact ? spacing(4) : spacing(5) }} />

        {/* Stat tiles */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: compact ? spacing(2) : spacing(3) }}>
          <HeroStat icon="school-outline"           label="Institution" value={schoolAbbr}          accent={colors.primary} compact={compact} />
          <HeroStat icon="sparkles-outline"         label="Profile"     value={`${completeness}%`}  accent={colors.success} compact={compact} />
          <HeroStat icon="shield-checkmark-outline" label="Status"      value="Verified"            accent={colors.warning} compact={compact} />
          <HeroStat icon="calendar-outline"         label="Year"        value={yearForm || 'Form 5'} accent={colors.primary} compact={compact} />
        </View>
      </View>
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
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: compact ? spacing(4) : spacing(5), lineHeight: 21, fontSize: compact ? 13 : undefined }]}>
        Ensure your information is accurate and professionally presented for university recommendations and scholarships.
      </Text>

      {/* Two-column on tablet+, stacked on mobile */}
      <View style={{
        flexDirection: compact ? 'column' : 'row',
        flexWrap:      compact ? undefined : 'wrap',
        gap:           compact ? spacing(3) : spacing(4),
        marginBottom:  compact ? spacing(4) : spacing(5),
      }}>
        <Field label="Full Name"     icon="person-outline"   placeholder="Enter your full name"      value={name}     onChangeText={setName}     autoCapitalize="words"  compact={compact} />
        <Field label="Phone Number"  icon="call-outline"     placeholder="+267 71 XXX XXX"           value={phone}    onChangeText={setPhone}    keyboardType="phone-pad" compact={compact} />
        <Field label="Institution"   icon="school-outline"   placeholder="Your school or university" value={school}   onChangeText={setSchool}   autoCapitalize="words"  compact={compact} />
        <Field label="Year / Form"   icon="calendar-outline" placeholder="e.g. Form 5"               value={yearForm} onChangeText={setYearForm}                         compact={compact} />
      </View>

      {/* Bio */}
      <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(2), fontSize: compact ? 9 : 10 }]}>
        BIO / ABOUT
      </Text>
      <View style={{
        borderWidth:     1,
        borderRadius:    radii.lg,
        borderColor:     colors.border,
        backgroundColor: colors.surfaceAlt,
        paddingHorizontal: compact ? spacing(3) : spacing(4),
        paddingVertical: compact ? spacing(2) : spacing(3),
        marginBottom:    compact ? spacing(5) : spacing(6),
        ...Platform.select({
          ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
          android: { elevation: 2 },
          web:     { boxShadow: '0 2px 8px rgba(0,0,0,0.12)' } as any,
          default: {},
        }),
      }}>
        <TextInput
          multiline
          value={bio}
          onChangeText={setBio}
          placeholder="Tell us about yourself, your goals, and achievements..."
          placeholderTextColor={colors.textMuted}
          style={[typography.body, {
            color:             colors.textPrimary,
            minHeight:         compact ? 90 : 120,
            textAlignVertical: 'top',
            lineHeight:        compact ? 20 : 24,
            fontSize:          compact ? 13 : undefined,
          }]}
        />
      </View>

      {/* Save button */}
      <Pressable
        onPress={handleSave}
        disabled={saving}
        style={({ pressed }) => ({
          height:          compact ? 50 : 56,
          borderRadius:    radii.xl,
          backgroundColor: saving ? colors.surfaceAlt : colors.primary,
          borderWidth:     1,
          borderColor:     saving ? colors.border : colors.primary,
          flexDirection:   'row' as const,
          alignItems:      'center' as const,
          justifyContent:  'center' as const,
          gap:             spacing(2),
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
            <Ionicons name="checkmark-circle-outline" size={compact ? 17 : 20} color="#fff" />
            <Text style={[typography.label, { color: '#fff', letterSpacing: 0.5, fontSize: compact ? 12 : undefined }]}>SAVE PROFILE CHANGES</Text>
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
          <SidebarAction icon="person-outline"      label="Update Profile"   accent={colors.primary} onPress={handleSave} />
          <SidebarAction icon="lock-closed-outline" label="Change Password"  accent="#FBBF24"        onPress={() => router.push('/student/change-password')} />
          <SidebarAction icon="school-outline"      label="Academic Records" accent="#34D399"     onPress={() => router.push('/student/academic-records')}    />
          <SidebarAction icon="settings-outline"    label="Account Settings" accent={colors.primary} onPress={() => router.push('/student/settings')} />
          <SidebarAction icon="help-circle-outline" label="Contact Support"  accent="#F472B6"        onPress={() => router.push('/student/contact-support')} />
        </View>

        <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing(4) }} />

        <ProfileCompletionBar pct={completeness} />

        <View style={{
          marginTop:       spacing(4),
          padding:         spacing(4),
          backgroundColor: `${colors.primary}14`,
          borderRadius:    radii.lg,
          borderLeftWidth: 3,
          borderLeftColor: colors.primary,
        }}>
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
            💡 Complete profiles receive stronger course and scholarship recommendations across the platform.
          </Text>
        </View>
      </SectionCard>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: spacing(12) }}
          >
            {NavBar}

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
                  Dashboard › Student Profile
                </Text>
              </View>

              {/* Hero */}
              {ProfileHero}

              {/* Two-column on desktop, stacked otherwise */}
              <View style={{
                flexDirection: isDesktop ? 'row' : 'column',
                gap:           compact ? spacing(5) : spacing(8),
                alignItems:    'flex-start',
              }}>
                <View style={{ flex: 1, minWidth: 0, width: '100%' }}>
                  {FormCard}
                </View>
                {Sidebar}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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