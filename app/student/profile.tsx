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

// ─────────────────────────────────────────────────────────────────────────────
// Import shared design tokens from DashboardLayout
// (no DashboardLayout wrapper as per requirement — tokens only)
// ─────────────────────────────────────────────────────────────────────────────
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
// Field
// ─────────────────────────────────────────────────────────────────────────────
function Field({
  label,
  icon,
  fullWidth,
  ...inputProps
}: React.ComponentProps<typeof TextInput> & {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
}) {
  const colors    = useTheme();
  const elevation = useElevation('sm');
  return (
    <View style={{ flex: fullWidth ? undefined : 1, minWidth: 0, width: fullWidth ? '100%' : undefined }}>
      <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(2) }]}>
        {label.toUpperCase()}
      </Text>
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 54,
            borderWidth: 1,
            borderRadius: radii.lg,
            borderColor: colors.border,
            backgroundColor: colors.surfaceAlt,
            paddingHorizontal: spacing(4),
            gap: spacing(3),
          },
          elevation,
        ]}
      >
        {icon && <Ionicons name={icon} size={17} color={colors.primary} />}
        <TextInput
          {...inputProps}
          placeholderTextColor={colors.textMuted}
          style={[typography.body, { flex: 1, color: colors.textPrimary, paddingVertical: spacing(3) }]}
        />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HeroStat
// ─────────────────────────────────────────────────────────────────────────────
function HeroStat({ icon, label, value, accent }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; accent?: string }) {
  const colors = useTheme();
  const c      = accent ?? colors.primary;
  return (
    <View style={{ flex: 1, minWidth: 90, flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(3), backgroundColor: `${c}0F`, borderRadius: radii.lg, borderWidth: 1, borderColor: `${c}22` }}>
      <View style={{ width: 32, height: 32, borderRadius: radii.md, backgroundColor: `${c}22`, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Ionicons name={icon} size={15} color={c} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]} numberOfLines={1}>{value}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 1 }]} numberOfLines={1}>{label}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatusBadge
// ─────────────────────────────────────────────────────────────────────────────
function StatusBadge({ label, icon, color }: { label: string; icon: keyof typeof Ionicons.glyphMap; color?: string }) {
  const colors = useTheme();
  const c      = color ?? colors.primary;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: `${c}1A`, borderWidth: 1, borderColor: `${c}44` }}>
      <Ionicons name={icon} size={12} color={c} />
      <Text style={[typography.caption, { color: c, fontWeight: '700', letterSpacing: 0.4 }]}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Avatar
// ─────────────────────────────────────────────────────────────────────────────
function Avatar({ initials, onPress, size = 88 }: { initials: string; onPress: () => void; size?: number }) {
  const colors    = useTheme();
  const elevation = useElevation('md');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Change profile photo"
      style={({ pressed }) => ({
        width: size, height: size, borderRadius: size / 2,
        alignItems: 'center' as const, justifyContent: 'center' as const,
        backgroundColor: `${colors.primary}22`, borderWidth: 2, borderColor: `${colors.primary}44`,
        opacity: pressed ? 0.85 : 1, transform: pressed ? [{ scale: 0.96 }] : [],
      })}
    >
      <View style={[{ width: size - 10, height: size - 10, borderRadius: (size - 10) / 2, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, elevation]}>
        <Text style={{ fontSize: size * 0.27, fontWeight: '900', color: colors.primary, letterSpacing: 1 }}>{initials}</Text>
      </View>
      <View style={{ position: 'absolute', right: 2, bottom: 2, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface }}>
        <Ionicons name="camera-outline" size={13} color="#fff" />
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProfileCompletionBar
// ─────────────────────────────────────────────────────────────────────────────
function ProfileCompletionBar({ pct }: { pct: number }) {
  const colors = useTheme();
  const color  = pct >= 80 ? colors.success : pct >= 50 ? colors.warning : colors.danger;
  return (
    <View style={{ gap: spacing(2) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Profile completeness</Text>
        <Text style={[typography.caption, { color, fontWeight: '700' }]}>{pct}%</Text>
      </View>
      <View style={{ height: 6, backgroundColor: colors.border, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: 6, width: `${pct}%` as any, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarAction
// ─────────────────────────────────────────────────────────────────────────────
function SidebarAction({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void }) {
  const colors = useTheme();
  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(3), paddingHorizontal: spacing(4), paddingVertical: spacing(3), borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceAlt, opacity: pressed ? 0.85 : 1, transform: pressed ? [{ scale: 0.98 }] : [] })}>
      <View style={{ width: 38, height: 38, borderRadius: radii.md, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[typography.body, { color: colors.textPrimary, flex: 1 }]}>{label}</Text>
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
  const elevSm       = useElevation('sm');

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 768)  return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isMobile  = breakpoint === 'mobile';
  const padX      = isMobile ? spacing(4) : spacing(7);

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

  // ── Top nav bar ────────────────────────────────────────────────────────────
  const NavBar = (
    <View style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: padX, paddingVertical: spacing(4), backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing(3) }, elevMd]}>
      <Pressable onPress={() => router.back()} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const, opacity: pressed ? 0.8 : 1 })}>
        <Ionicons name="arrow-back" size={20} color={colors.primary} />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text style={[typography.h2, { color: colors.textPrimary }]}>Student Profile</Text>
        {!isMobile && <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>Manage your account and academic identity</Text>}
      </View>

      {/* Quick save */}
      <Pressable onPress={handleSave} disabled={saving}
        style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.lg, backgroundColor: saving ? colors.surfaceAlt : colors.primary, borderWidth: 1, borderColor: saving ? colors.border : colors.primary, opacity: saving ? 0.6 : pressed ? 0.88 : 1 })}>
        {saving
          ? <ActivityIndicator color={colors.primary} size="small" />
          : <Ionicons name="checkmark-circle-outline" size={17} color="#fff" />}
        {!isMobile && <Text style={[typography.label, { color: saving ? colors.primary : '#fff' }]}>{saving ? 'SAVING…' : 'SAVE'}</Text>}
      </Pressable>

      {/* Menu */}
      <Pressable onPress={openMenu} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const, opacity: pressed ? 0.8 : 1 })}>
        <Ionicons name="menu" size={22} color={colors.textPrimary} />
      </Pressable>
    </View>
  );

  // ── Profile hero ───────────────────────────────────────────────────────────
  const ProfileHero = (
    <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing(6), width: '100%' }, elevLg]}>
      <View style={{ height: 3, backgroundColor: colors.primary }} />
      <View style={{ padding: isMobile ? spacing(5) : spacing(7) }}>
        {/* Avatar + info */}
        <View style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'center' : 'flex-start', gap: spacing(5) }}>
          <Avatar initials={initials} onPress={handleChangePhoto} size={isMobile ? 80 : 96} />

          <View style={{ flex: isMobile ? undefined : 1, alignItems: isMobile ? 'center' : 'flex-start' }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginBottom: spacing(3), justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <StatusBadge label="STUDENT"  icon="school-outline"           color={colors.primary}  />
              <StatusBadge label="ACTIVE"   icon="checkmark-circle-outline" color={colors.success}  />
              <StatusBadge label="VERIFIED" icon="shield-checkmark-outline" color={colors.warning}  />
            </View>

            <Text style={{ fontSize: isMobile ? 22 : 26, lineHeight: isMobile ? 28 : 32, fontWeight: '900', color: colors.textPrimary, textAlign: isMobile ? 'center' : 'left' }} numberOfLines={1}>
              {name}
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(1), textAlign: isMobile ? 'center' : 'left' }]} numberOfLines={1}>{email}</Text>

            <View style={{ marginTop: spacing(4), width: isMobile ? '100%' : 320 }}>
              <ProfileCompletionBar pct={completeness} />
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3), marginTop: spacing(6) }}>
          <HeroStat icon="school-outline"           label="Institution" value={school.split(' ').map(w => w[0]).join('').slice(0, 5) || 'BAC'} accent={colors.primary}  />
          <HeroStat icon="sparkles-outline"         label="Profile"     value={`${completeness}%`}                                               accent={colors.success}  />
          <HeroStat icon="shield-checkmark-outline" label="Status"      value="Verified"                                                         accent={colors.warning}  />
          <HeroStat icon="calendar-outline"         label="Year"        value={yearForm || 'Form 5'}                                              accent={colors.primary}  />
        </View>
      </View>
    </View>
  );

  // ── Form card ──────────────────────────────────────────────────────────────
  const FormCard = (
    <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevMd]}>
      <View style={{ height: 3, backgroundColor: colors.primary }} />
      <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
        <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) }]}>PERSONAL INFORMATION</Text>
        <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: spacing(2) }]}>Your Details</Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing(6), lineHeight: 22 }]}>
          Ensure your information is accurate and professionally presented for university recommendations and scholarships.
        </Text>

        {/* Two-column on tablet+, stacked on mobile */}
        {isMobile ? (
          <View style={{ gap: spacing(4), marginBottom: spacing(5) }}>
            <Field label="Full Name"     icon="person-outline"   placeholder="Enter your full name"     value={name}     onChangeText={setName}     autoCapitalize="words" fullWidth />
            <Field label="Phone Number"  icon="call-outline"     placeholder="+267 71 XXX XXX"          value={phone}    onChangeText={setPhone}    keyboardType="phone-pad" fullWidth />
            <Field label="Institution"   icon="school-outline"   placeholder="Your school or university" value={school}  onChangeText={setSchool}   autoCapitalize="words" fullWidth />
            <Field label="Year / Form"   icon="calendar-outline" placeholder="e.g. Form 5"              value={yearForm} onChangeText={setYearForm} fullWidth />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(4), marginBottom: spacing(5) }}>
            <Field label="Full Name"    icon="person-outline"   placeholder="Enter your full name"      value={name}     onChangeText={setName}     autoCapitalize="words" />
            <Field label="Phone Number" icon="call-outline"     placeholder="+267 71 XXX XXX"           value={phone}    onChangeText={setPhone}    keyboardType="phone-pad" />
            <Field label="Institution"  icon="school-outline"   placeholder="Your school or university" value={school}   onChangeText={setSchool}   autoCapitalize="words" />
            <Field label="Year / Form"  icon="calendar-outline" placeholder="e.g. Form 5"               value={yearForm} onChangeText={setYearForm} />
          </View>
        )}

        {/* Bio */}
        <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(2) }]}>BIO / ABOUT</Text>
        <View style={[{ borderWidth: 1, borderRadius: radii.lg, borderColor: colors.border, backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing(4), paddingVertical: spacing(3), marginBottom: spacing(6) }, elevSm]}>
          <TextInput
            multiline
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself, your goals, and achievements..."
            placeholderTextColor={colors.textMuted}
            style={[typography.body, { color: colors.textPrimary, minHeight: 120, textAlignVertical: 'top', lineHeight: 22 }]}
          />
        </View>

        {/* Save button */}
        <Pressable onPress={handleSave} disabled={saving}
          style={({ pressed }) => ({ height: 56, borderRadius: radii.xl, backgroundColor: saving ? colors.surfaceAlt : colors.primary, borderWidth: 1, borderColor: saving ? colors.border : colors.primary, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing(2), opacity: saving ? 0.7 : pressed ? 0.88 : 1, transform: pressed && !saving ? [{ scale: 0.98 }] : [] })}>
          {saving
            ? <><ActivityIndicator color={colors.primary} size="small" /><Text style={[typography.label, { color: colors.primary, letterSpacing: 0.5 }]}>SAVING…</Text></>
            : <><Ionicons name="checkmark-circle-outline" size={20} color="#fff" /><Text style={[typography.label, { color: '#fff', letterSpacing: 0.5 }]}>SAVE PROFILE CHANGES</Text></>}
        </Pressable>
      </View>
    </View>
  );

  // ── Desktop sidebar ────────────────────────────────────────────────────────
  const Sidebar = isDesktop && (
    <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
      <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevMd]}>
        <View style={{ height: 3, backgroundColor: colors.primary }} />
        <View style={{ padding: spacing(6), gap: spacing(4) }}>
          <Text style={[typography.h2, { color: colors.textPrimary }]}>Account</Text>
          <View style={{ gap: spacing(3) }}>
            <SidebarAction icon="person-outline"      label="Update Profile"    onPress={handleSave} />
            <SidebarAction icon="lock-closed-outline" label="Change Password"   onPress={() => router.push('/student/change-password')} />
            <SidebarAction icon="school-outline"      label="Academic Records"  />
            <SidebarAction icon="settings-outline"    label="Account Settings"  onPress={() => router.push('/student/settings')} />
            <SidebarAction icon="help-circle-outline" label="Contact Support"   onPress={() => router.push('/student/contact-support')} />
          </View>
          <View style={{ height: 1, backgroundColor: colors.divider }} />
          <ProfileCompletionBar pct={completeness} />
          <View style={{ padding: spacing(4), backgroundColor: `${colors.primary}14`, borderRadius: radii.lg, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
            <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
              💡 Complete profiles receive stronger course and scholarship recommendations across the platform.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing(12) }}>

            {NavBar}

            <View style={{ paddingHorizontal: padX, paddingTop: spacing(7), maxWidth: 1280, alignSelf: 'center', width: '100%' }}>
              {/* Breadcrumb */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(6) }}>
                <Pressable onPress={() => router.back()}
                  style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}>
                  <Ionicons name="arrow-back" size={16} color={colors.primary} />
                  <Text style={[typography.label, { color: colors.primary }]}>Back</Text>
                </Pressable>
                <Text style={[typography.caption, { color: colors.textMuted }]}>Dashboard › Student Profile</Text>
              </View>

              {/* Hero */}
              {ProfileHero}

              {/* Two-column on desktop, stacked otherwise */}
              <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing(8), alignItems: 'flex-start' }}>
                <View style={{ flex: 1, minWidth: 0, width: '100%' }}>{FormCard}</View>
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