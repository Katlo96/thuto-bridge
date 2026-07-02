import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../constants/firebase';
import { StudentMenuProvider } from '../../components/student/StudentMenu';

// ─────────────────────────────────────────────────────────────────────────────
// DashboardLayout & design tokens
// ─────────────────────────────────────────────────────────────────────────────
import DashboardLayout, {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Breakpoint = 'mobile' | 'tablet' | 'desktop';
type IconName   = keyof typeof Ionicons.glyphMap;

type ScholarshipDetails = {
  id: string;
  title: string;
  providerName: string;
  amount: string;
  deadline: string;
  daysLeft: number;
  category: 'Local' | 'International';
  status: string;
  statusVariant: 'good' | 'warning' | 'info' | 'neutral';
  description: string;
  eligibility: string[];
  howToApply: string[];
  documents: string[];
};

// Fallback steps/documents used only when Firestore doesn't provide them
// for a given scholarship document. Add `howToApply` / `documents` arrays
// to your Firestore scholarship docs to override these with real data.
const DEFAULT_HOW_TO_APPLY = [
  'Review the eligibility requirements carefully before applying.',
  'Prepare all required documents listed below.',
  'Complete the application form provided by the scholarship provider.',
  'Submit your application before the stated deadline.',
];

const DEFAULT_DOCUMENTS = [
  'National ID or passport copy',
  'Academic transcript',
  'Proof of admission / enrolment',
  'Personal statement or motivation letter',
];

// ─────────────────────────────────────────────────────────────────────────────
// Elevation helper
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = 0.28;
    const radius  = intensity === 'sm' ? 6  : intensity === 'md' ? 14 : 22;
    const offsetY = intensity === 'sm' ? 2  : intensity === 'md' ? 5  : 10;
    return (Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: radius },
      android: { elevation: intensity === 'sm' ? 3 : intensity === 'md' ? 6 : 12 },
      web:     { boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})` } as any,
      default: {},
    }) ?? {}) as ViewStyle;
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Variant colour helper
// ─────────────────────────────────────────────────────────────────────────────
function useVariantColors(variant: ScholarshipDetails['statusVariant']) {
  const colors = useTheme();
  switch (variant) {
    case 'good':    return { bg: `${colors.success}18`, border: `${colors.success}44`, text: colors.success };
    case 'warning': return { bg: `${colors.warning}18`, border: `${colors.warning}44`, text: colors.warning };
    case 'info':    return { bg: `${colors.primary}18`, border: `${colors.primary}44`, text: colors.primary };
    default:        return { bg: colors.surfaceAlt,     border: colors.border,          text: colors.textSecondary };
  }
}

// Maps the same 'good' | 'warning' | 'neutral' | 'info' variant used on the
// list screen into the statusVariant used here (they're actually identical,
// this just keeps the mapping explicit/obvious at the call site).
function toStatusVariant(variant: string | undefined): ScholarshipDetails['statusVariant'] {
  if (variant === 'good' || variant === 'warning' || variant === 'info') return variant;
  return 'neutral';
}

// ─────────────────────────────────────────────────────────────────────────────
// Card wrapper
// ─────────────────────────────────────────────────────────────────────────────
function Card({
  children,
  style,
  intensity = 'md',
  accentColor,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: 'sm' | 'md' | 'lg';
  accentColor?: string;
}) {
  const elevation = useElevation(intensity);
  const colors    = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevation, style]}>
      {accentColor && <View style={{ height: 3, backgroundColor: accentColor }} />}
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ title, icon, label }: { title: string; icon?: IconName; label?: string }) {
  const colors = useTheme();
  return (
    <View style={{ marginBottom: spacing(5) }}>
      {label && (
        <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(2) }]}>
          {label.toUpperCase()}
        </Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
        {icon && (
          <View style={{ width: 36, height: 36, borderRadius: radii.lg, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={icon} size={18} color={colors.primary} />
          </View>
        )}
        <Text style={[typography.h2, { color: colors.textPrimary }]}>{title}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BulletList
// ─────────────────────────────────────────────────────────────────────────────
function BulletList({ items, color }: { items: string[]; color?: string }) {
  const colors = useTheme();
  const c      = color ?? colors.primary;
  return (
    <View style={{ gap: spacing(3) }}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3) }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c, marginTop: 8, flexShrink: 0 }} />
          <Text style={[typography.body, { color: colors.textSecondary, flex: 1, lineHeight: 22 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NumberedList
// ─────────────────────────────────────────────────────────────────────────────
function NumberedList({ items }: { items: string[] }) {
  const colors = useTheme();
  return (
    <View style={{ gap: spacing(4) }}>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(4) }}>
          <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: `${colors.primary}22`, borderWidth: 1, borderColor: `${colors.primary}44`, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{i + 1}</Text>
          </View>
          <Text style={[typography.body, { color: colors.textSecondary, flex: 1, lineHeight: 22 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DocumentChecklist
// ─────────────────────────────────────────────────────────────────────────────
function DocumentChecklist({ items }: { items: string[] }) {
  const colors = useTheme();
  const [checked, setChecked] = useState<boolean[]>(Array(items.length).fill(false));

  // Keep checklist state in sync if the underlying items list changes
  // (e.g. navigating from one scholarship's details straight to another's).
  useEffect(() => {
    setChecked(Array(items.length).fill(false));
  }, [items.length]);

  const toggle = (i: number) => {
    setChecked((prev) => { const c = [...prev]; c[i] = !c[i]; return c; });
  };

  return (
    <View style={{ gap: spacing(3) }}>
      {items.map((item, i) => (
        <Pressable key={i} onPress={() => toggle(i)} style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(3), padding: spacing(3), borderRadius: radii.lg, backgroundColor: checked[i] ? `${colors.success}14` : colors.surfaceAlt, borderWidth: 1, borderColor: checked[i] ? `${colors.success}33` : colors.border, opacity: pressed ? 0.85 : 1 })}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: checked[i] ? colors.success : colors.surface, borderWidth: 2, borderColor: checked[i] ? colors.success : colors.border, alignItems: 'center', justifyContent: 'center' }}>
            {checked[i] && <Ionicons name="checkmark" size={13} color="#fff" />}
          </View>
          <Text style={[typography.body, { color: checked[i] ? colors.textPrimary : colors.textSecondary, flex: 1, textDecorationLine: checked[i] ? 'line-through' : 'none' }]}>
            {item}
          </Text>
        </Pressable>
      ))}
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing(1) }]}>
        {checked.filter(Boolean).length}/{items.length} documents checked off
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Apply Modal
// ─────────────────────────────────────────────────────────────────────────────
function ApplyModal({
  visible,
  scholarshipTitle,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  scholarshipTitle: string;
  onConfirm: (note: string) => void;
  onClose: () => void;
}) {
  const colors    = useTheme();
  const elevation = useElevation('lg');
  const { width } = useWindowDimensions();
  const isMobile  = width < 768;
  const [note, setNote] = useState('');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing(5) }} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxWidth: 520 }}>
          <Pressable
            style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevation]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ height: 3, backgroundColor: colors.primary }} />
            <View style={{ padding: isMobile ? spacing(5) : spacing(6), gap: spacing(5) }}>
              {/* Header */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.h2, { color: colors.textPrimary }]}>Apply Now</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={2}>
                    {scholarshipTitle}
                  </Text>
                </View>
                <Pressable onPress={onClose} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const, opacity: pressed ? 0.7 : 1 })}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              {/* Info */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3), padding: spacing(4), backgroundColor: `${colors.primary}14`, borderRadius: radii.lg, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} style={{ marginTop: 1 }} />
                <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, lineHeight: 18 }]}>
                  You will be redirected to the official application portal. Ensure all your documents are ready before proceeding.
                </Text>
              </View>

              {/* Optional note */}
              <View style={{ gap: spacing(2) }}>
                <Text style={[typography.label, { color: colors.textPrimary }]}>Notes (optional)</Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. Remind me to attach my reference letters..."
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={{ minHeight: 100, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing(4), backgroundColor: colors.surfaceAlt, color: colors.textPrimary, textAlignVertical: 'top', fontSize: 15 }}
                />
              </View>

              {/* Actions */}
              <View style={{ flexDirection: 'row', gap: spacing(3) }}>
                <Pressable onPress={onClose} style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const, opacity: pressed ? 0.85 : 1 })}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={() => { onConfirm(note); setNote(''); }} style={({ pressed }) => ({ flex: 2, height: 52, borderRadius: radii.lg, backgroundColor: colors.primary, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing(2), opacity: pressed ? 0.88 : 1 })}>
                  <Ionicons name="rocket-outline" size={18} color="#fff" />
                  <Text style={[typography.label, { color: '#fff' }]}>Go to Application Portal</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Desktop Sidebar
// ─────────────────────────────────────────────────────────────────────────────
function DesktopSidebar({
  data,
  saved,
  onApply,
  onToggleSave,
}: {
  data: ScholarshipDetails;
  saved: boolean;
  onApply: () => void;
  onToggleSave: () => void;
}) {
  const colors    = useTheme();
  const elevation = useElevation('md');
  const vc        = useVariantColors(data.statusVariant);

  return (
    <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
      {/* CTA card */}
      <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevation]}>
        <View style={{ height: 3, backgroundColor: vc.text }} />
        <View style={{ padding: spacing(6), gap: spacing(3) }}>
          <Text style={[typography.h2, { color: colors.textPrimary }]}>Take Action</Text>

          <Pressable onPress={onApply} style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing(2), paddingVertical: spacing(4), borderRadius: radii.lg, backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1, transform: pressed ? [{ scale: 0.98 }] : [] })}>
            <Ionicons name="rocket-outline" size={18} color="#fff" />
            <Text style={[typography.label, { color: '#fff' }]}>Apply Now</Text>
          </Pressable>

          <Pressable onPress={onToggleSave} style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing(2), paddingVertical: spacing(3), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.88 : 1 })}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={17} color={colors.primary} />
            <Text style={[typography.label, { color: colors.primary }]}>{saved ? 'Saved' : 'Save for Later'}</Text>
          </Pressable>
        </View>
      </View>

      {/* Quick facts */}
      <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: spacing(6), gap: spacing(4) }, elevation]}>
        <Text style={[typography.h2, { color: colors.textPrimary }]}>Quick Facts</Text>

        {[
          { icon: 'cash-outline' as const,     label: 'Award Amount',  value: data.amount },
          { icon: 'calendar-outline' as const, label: 'Deadline',      value: data.deadline },
          { icon: 'time-outline' as const,     label: 'Days Remaining', value: data.daysLeft <= 0 ? 'Closed' : `${data.daysLeft} days` },
          { icon: data.category === 'Local' ? 'location-outline' as const : 'globe-outline' as const, label: 'Category', value: data.category },
        ].map(({ icon, label, value }) => {
          const isUrgent = label === 'Days Remaining' && data.daysLeft <= 7 && data.daysLeft > 0;
          return (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(2), borderBottomWidth: 1, borderBottomColor: colors.divider }}>
              <View style={{ width: 36, height: 36, borderRadius: radii.md, backgroundColor: isUrgent ? `${colors.danger}14` : `${colors.primary}14`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={16} color={isUrgent ? colors.danger : colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[typography.bodyStrong, { color: isUrgent ? colors.danger : colors.textPrimary, marginTop: 2 }]}>{value}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Status badge */}
      <View style={{ padding: spacing(4), backgroundColor: vc.bg, borderRadius: radii.xl, borderWidth: 1, borderColor: vc.border, flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
        <Ionicons name="ribbon-outline" size={20} color={vc.text} />
        <View style={{ flex: 1 }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Your Status</Text>
          <Text style={[typography.bodyStrong, { color: vc.text }]}>{data.status}</Text>
        </View>
      </View>

      {/* Tip */}
      <View style={{ padding: spacing(4), backgroundColor: `${colors.primary}14`, borderRadius: radii.xl, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
        <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
          💡 Prepare all documents early and check eligibility carefully before submitting your application.
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────────────────────
function ScholarshipDetailsContent() {
  const { width }  = useWindowDimensions();
  const colors     = useTheme();
  const params     = useLocalSearchParams<{ id?: string }>();
  const scholarshipId = typeof params.id === 'string' ? params.id : undefined;

  const [data, setData]       = useState<ScholarshipDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Fetch the exact scholarship the user clicked on, by its Firestore doc id.
  useEffect(() => {
    let cancelled = false;

    async function fetchScholarship() {
      if (!scholarshipId) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setNotFound(false);

        const ref = doc(db, 'scholarships', scholarshipId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          if (!cancelled) {
            setNotFound(true);
            setData(null);
          }
          return;
        }

        const raw = snap.data() as any;
        const deadlineDate = new Date(raw.deadline);
        const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        const mapped: ScholarshipDetails = {
          id: snap.id,
          title: raw.title ?? 'Untitled Scholarship',
          providerName: raw.provider ?? raw.providerName ?? 'Unknown Provider',
          amount: raw.amount ?? '—',
          deadline: raw.deadline ?? '—',
          daysLeft: Number.isFinite(daysLeft) ? daysLeft : 0,
          category: raw.category === 'International' ? 'International' : 'Local',
          status: raw.status ?? 'Open',
          statusVariant: toStatusVariant(raw.variant ?? raw.statusVariant),
          description: raw.description ?? '',
          eligibility: Array.isArray(raw.eligibility)
            ? raw.eligibility
            : Array.isArray(raw.requirements)
              ? raw.requirements
              : [],
          howToApply: Array.isArray(raw.howToApply) ? raw.howToApply : DEFAULT_HOW_TO_APPLY,
          documents: Array.isArray(raw.documents) ? raw.documents : DEFAULT_DOCUMENTS,
        };

        if (!cancelled) setData(mapped);
      } catch (error) {
        console.error('Failed to fetch scholarship details:', error);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchScholarship();
    return () => { cancelled = true; };
  }, [scholarshipId]);

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 768)  return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isMobile  = breakpoint === 'mobile';
  const isDesktop = breakpoint === 'desktop';

  const [saved,     setSaved]     = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const vc = useVariantColors(data?.statusVariant ?? 'neutral');

  const handleApply = useCallback(() => setApplyOpen(true), []);

  const handleConfirmApply = useCallback((_note: string) => {
    setApplyOpen(false);
    Alert.alert('Application Started', 'You are being redirected to the application portal.');
  }, []);

  const handleToggleSave = useCallback(() => {
    setSaved((p) => !p);
    Alert.alert(saved ? 'Removed from saved' : 'Saved!', saved ? 'Scholarship removed from your saved list.' : 'Scholarship added to your saved list.');
  }, [saved]);

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout title="Scholarship Details" subtitle="Loading..." showPointsCard={false}>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Loading scholarship details...
        </Text>
      </DashboardLayout>
    );
  }

  // ── Not found state ─────────────────────────────────────────────────────
  if (notFound || !data) {
    return (
      <DashboardLayout title="Scholarship Details" subtitle="Not found" showPointsCard={false}>
        <View style={{ alignItems: 'center', padding: spacing(10), backgroundColor: colors.card, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border }}>
          <Ionicons name="alert-circle-outline" size={32} color={colors.textMuted} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(4), textAlign: 'center' }]}>
            Scholarship Not Found
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), textAlign: 'center', maxWidth: 320 }]}>
            We couldn't find details for this scholarship. It may have been removed or the link is invalid.
          </Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => ({ marginTop: spacing(6), flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(6), paddingVertical: spacing(4), borderRadius: radii.lg, backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 })}>
            <Ionicons name="arrow-back" size={17} color="#fff" />
            <Text style={[typography.label, { color: '#fff' }]}>Back to Scholarships</Text>
          </Pressable>
        </View>
      </DashboardLayout>
    );
  }

  const isUrgent = data.daysLeft <= 7 && data.daysLeft > 0;

  // ── Hero card ──────────────────────────────────────────────────────────────
  const HeroCard = (
    <Card intensity="lg" accentColor={vc.text} style={{ marginBottom: spacing(7) }}>
      <View style={{ padding: isMobile ? spacing(5) : spacing(7), gap: spacing(6) }}>
        {/* Icon + title */}
        <View style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: spacing(5) }}>
          <View style={{ width: isMobile ? 64 : 76, height: isMobile ? 64 : 76, borderRadius: radii.xl, backgroundColor: vc.bg, borderWidth: 1, borderColor: vc.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Ionicons name="ribbon-outline" size={isMobile ? 28 : 34} color={vc.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.hero, { color: colors.textPrimary, fontSize: isMobile ? 24 : 32, lineHeight: isMobile ? 30 : 38 }]}>
              {data.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(2) }}>
              <Ionicons name="business-outline" size={14} color={colors.primary} />
              <Text style={[typography.subtitle, { color: colors.textSecondary }]}>{data.providerName}</Text>
            </View>
          </View>
        </View>

        {/* Status badges row */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: vc.bg, borderWidth: 1, borderColor: vc.border }}>
            <Ionicons name="ribbon-outline" size={13} color={vc.text} />
            <Text style={[typography.caption, { color: vc.text, fontWeight: '700' }]}>{data.status}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: `${colors.primary}14`, borderWidth: 1, borderColor: `${colors.primary}33` }}>
            <Ionicons name={data.category === 'Local' ? 'location-outline' : 'globe-outline'} size={13} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{data.category}</Text>
          </View>
          {isUrgent && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: `${colors.danger}14`, borderWidth: 1, borderColor: `${colors.danger}33` }}>
              <Ionicons name="time-outline" size={13} color={colors.danger} />
              <Text style={[typography.caption, { color: colors.danger, fontWeight: '700' }]}>Deadline in {data.daysLeft} day{data.daysLeft !== 1 ? 's' : ''}!</Text>
            </View>
          )}
        </View>

        {/* Meta facts grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(4), paddingTop: spacing(4), borderTopWidth: 1, borderTopColor: colors.divider }}>
          {[
            { icon: 'cash-outline' as const,     label: 'Award Amount',   value: data.amount },
            { icon: 'calendar-outline' as const, label: 'Deadline',       value: data.deadline },
            { icon: 'time-outline' as const,     label: 'Days Remaining', value: data.daysLeft <= 0 ? 'Closed' : `${data.daysLeft} days` },
          ].map(({ icon, label, value }) => (
            <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), flex: 1, minWidth: 160 }}>
              <View style={{ width: 38, height: 38, borderRadius: radii.lg, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={icon} size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: 2 }]}>{value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Description */}
        <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 24 }]}>{data.description}</Text>

        {/* Tablet inline CTAs */}
        {!isMobile && !isDesktop && (
          <View style={{ flexDirection: 'row', gap: spacing(3), paddingTop: spacing(4), borderTopWidth: 1, borderTopColor: colors.divider }}>
            <Pressable onPress={handleApply} style={({ pressed }) => ({ flex: 2, height: 52, borderRadius: radii.lg, backgroundColor: colors.primary, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing(2), opacity: pressed ? 0.88 : 1 })}>
              <Ionicons name="rocket-outline" size={18} color="#fff" />
              <Text style={[typography.label, { color: '#fff' }]}>Apply Now</Text>
            </Pressable>
            <Pressable onPress={handleToggleSave} style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing(2), opacity: pressed ? 0.88 : 1 })}>
              <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={17} color={colors.primary} />
              <Text style={[typography.label, { color: colors.primary }]}>{saved ? 'Saved' : 'Save'}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Card>
  );

  // ── Eligibility card ───────────────────────────────────────────────────────
  const EligibilityCard = data.eligibility.length > 0 && (
    <Card style={{ marginBottom: spacing(6) }}>
      <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
        <SectionHeader title="Eligibility Requirements" icon="checkmark-circle-outline" label="Requirements" />
        <BulletList items={data.eligibility} color={colors.success} />
      </View>
    </Card>
  );

  // ── How to apply card ──────────────────────────────────────────────────────
  const HowToApplyCard = (
    <Card style={{ marginBottom: spacing(6) }}>
      <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
        <SectionHeader title="How to Apply" icon="list-outline" label="Application Steps" />
        <NumberedList items={data.howToApply} />
      </View>
    </Card>
  );

  // ── Document checklist card ────────────────────────────────────────────────
  const DocumentsCard = (
    <Card style={{ marginBottom: spacing(6) }}>
      <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
        <SectionHeader title="Documents Checklist" icon="document-text-outline" label="Prepare" />
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing(5), lineHeight: 22 }]}>
          Tap each document below to check it off as you prepare your application.
        </Text>
        <DocumentChecklist items={data.documents} />
      </View>
    </Card>
  );

  // ── Next steps card ────────────────────────────────────────────────────────
  const NextStepsCard = (
    <Card>
      <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
        <SectionHeader title="Next Steps" icon="arrow-forward-circle-outline" label="What to do now" />
        <View style={{ gap: spacing(3) }}>
          {[
            { icon: 'checkmark-done-outline' as const, text: 'Verify you meet all eligibility criteria above.' },
            { icon: 'document-outline' as const,        text: 'Gather all required documents before the deadline.' },
            { icon: 'rocket-outline' as const,          text: 'Click "Apply Now" to proceed to the official portal.' },
            { icon: 'notifications-outline' as const,   text: 'Set a reminder closer to the deadline date.' },
          ].map(({ icon, text }) => (
            <View key={text} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(3), padding: spacing(3), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name={icon} size={18} color={colors.primary} style={{ marginTop: 2 }} />
              <Text style={[typography.body, { color: colors.textSecondary, flex: 1, lineHeight: 22 }]}>{text}</Text>
            </View>
          ))}
        </View>
      </View>
    </Card>
  );

  // ── Mobile sticky bar ──────────────────────────────────────────────────────
  const MobileStickyBar = isMobile && (
    <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', padding: spacing(5), paddingBottom: spacing(8), backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing(3) }}>
      <Pressable onPress={handleToggleSave} style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing(2), opacity: pressed ? 0.85 : 1 })}>
        <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={colors.primary} />
        <Text style={[typography.label, { color: colors.primary }]}>{saved ? 'Saved' : 'Save'}</Text>
      </Pressable>
      <Pressable onPress={handleApply} style={({ pressed }) => ({ flex: 2, height: 52, borderRadius: radii.lg, backgroundColor: colors.primary, flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing(2), opacity: pressed ? 0.9 : 1 })}>
        <Ionicons name="rocket-outline" size={18} color="#fff" />
        <Text style={[typography.label, { color: '#fff' }]}>Apply Now</Text>
      </Pressable>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <DashboardLayout
        title="Scholarship Details"
        subtitle={data.title}
        showPointsCard={false}
      >
        {/* Back + breadcrumb */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(6) }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Go back" style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}>
            <Ionicons name="arrow-back" size={17} color={colors.primary} />
            <Text style={[typography.label, { color: colors.primary }]}>Back</Text>
          </Pressable>
          <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]} numberOfLines={1}>
            Scholarships › {data.providerName}
          </Text>
        </View>

        {/* Two-column on desktop, stacked otherwise */}
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing(8), alignItems: 'flex-start' }}>
          {/* Main column */}
          <View style={{ flex: 1 }}>
            {HeroCard}
            {EligibilityCard}
            {HowToApplyCard}
            {DocumentsCard}
            {NextStepsCard}
            {isMobile && <View style={{ height: spacing(24) }} />}
          </View>

          {/* Desktop sidebar */}
          {isDesktop && (
            <DesktopSidebar
              data={data}
              saved={saved}
              onApply={handleApply}
              onToggleSave={handleToggleSave}
            />
          )}
        </View>
      </DashboardLayout>

      {/* Overlays outside layout scroll */}
      {MobileStickyBar}

      <ApplyModal
        visible={applyOpen}
        scholarshipTitle={data.title}
        onConfirm={handleConfirmApply}
        onClose={() => setApplyOpen(false)}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function ScholarshipDetailsScreen() {
  return (
    <StudentMenuProvider>
      <ScholarshipDetailsContent />
    </StudentMenuProvider>
  );
}