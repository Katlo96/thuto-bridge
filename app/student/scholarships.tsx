import React, { useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  StudentMenuProvider,
} from '../../components/student/StudentMenu';
import { useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../constants/firebase';

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
type Category   = 'ALL' | 'Local' | 'International';

type Scholarship = {
  id: string;
  title: string;
  provider: string;
  category: 'Local' | 'International';
  deadline: string;
  daysLeft: number;
  amount: string;
  status: 'You May Qualify' | 'Deadline Soon' | 'Open' | 'Competitive';
  variant: 'good' | 'warning' | 'neutral' | 'info';
  description: string;
  requirements: string[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────


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
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function variantColors(variant: Scholarship['variant'], colors: ReturnType<typeof useTheme>) {
  switch (variant) {
    case 'good':    return { bg: `${colors.success}18`, border: `${colors.success}44`, text: colors.success };
    case 'warning': return { bg: `${colors.warning}18`, border: `${colors.warning}44`, text: colors.warning };
    case 'info':    return { bg: `${colors.primary}18`, border: `${colors.primary}44`, text: colors.primary };
    default:        return { bg: colors.surfaceAlt,     border: colors.border,          text: colors.textSecondary };
  }
}

const STATUS_ICONS: Record<Scholarship['status'], keyof typeof Ionicons.glyphMap> = {
  'You May Qualify': 'checkmark-circle-outline',
  'Deadline Soon':   'time-outline',
  'Open':            'ribbon-outline',
  'Competitive':     'trophy-outline',
};

// ─────────────────────────────────────────────────────────────────────────────
// StatPill
// ─────────────────────────────────────────────────────────────────────────────
function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color?: string;
}) {
  const colors    = useTheme();
  const elevation = useElevation('sm');
  const c         = color ?? colors.primary;
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingHorizontal: spacing(4), paddingVertical: spacing(3), backgroundColor: `${c}0F`, borderRadius: radii.lg, borderWidth: 1, borderColor: `${c}22`, flex: 1, minWidth: 110 }, elevation]}>
      <Ionicons name={icon} size={18} color={c} />
      <View>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.bodyStrong, { color: c }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ScholarshipCard — uses 48% width for reliable 2-column layout on web + native
// ─────────────────────────────────────────────────────────────────────────────
function ScholarshipCard({
  scholarship,
  onPress,
  compact = false,
}: {
  scholarship: Scholarship;
  onPress: () => void;
  compact?: boolean;
}) {
  const colors    = useTheme();
  const elevation = useElevation('md');
  const vc        = variantColors(scholarship.variant, colors);
  const isUrgent  = scholarship.daysLeft <= 7;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${scholarship.title}`}
      style={({ pressed }): ViewStyle => ({
        // 48% width + flexWrap on container = reliable 2-col on web & native
        width: '48%' as any,
        ...elevation,
        backgroundColor: colors.card,
        borderRadius: radii.xxl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        opacity: pressed ? 0.9 : 1,
        transform: pressed ? [{ scale: 0.985 }] : [],
      })}
    >
      {/* Top accent */}
      <View style={{ height: 3, backgroundColor: vc.text }} />

      <View style={{ padding: compact ? spacing(3) : spacing(5), gap: compact ? spacing(2) : spacing(4) }}>
        {/* Header row */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(2) }}>
          {/* Icon bubble — hidden on compact to save space */}
          {!compact && (
            <View style={{ width: 44, height: 44, borderRadius: radii.xl, backgroundColor: vc.bg, borderWidth: 1, borderColor: vc.border, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ionicons name={STATUS_ICONS[scholarship.status]} size={20} color={vc.text} />
            </View>
          )}

          <View style={{ flex: 1 }}>
            <Text
              style={[typography.bodyStrong, { color: colors.textPrimary, lineHeight: compact ? 17 : 22, fontSize: compact ? 12 : undefined }]}
              numberOfLines={2}
            >
              {scholarship.title}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing(1), fontSize: compact ? 10 : undefined }]}>
              {scholarship.provider}
            </Text>
          </View>
        </View>

        {/* Status badge */}
        <View style={{ alignSelf: 'flex-start', paddingHorizontal: spacing(2), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: vc.bg, borderWidth: 1, borderColor: vc.border }}>
          <Text style={[typography.caption, { color: vc.text, fontWeight: '700', fontSize: compact ? 9 : 11 }]}>
            {scholarship.status}
          </Text>
        </View>

        {/* Description — hidden on compact */}
        {!compact && (
          <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 20 }]} numberOfLines={2}>
            {scholarship.description}
          </Text>
        )}

        {/* Meta pills */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingHorizontal: compact ? spacing(2) : spacing(3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: `${colors.primary}14`, borderWidth: 1, borderColor: `${colors.primary}33` }}>
            <Ionicons name={scholarship.category === 'Local' ? 'location-outline' : 'globe-outline'} size={compact ? 10 : 13} color={colors.primary} />
            <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', fontSize: compact ? 9 : undefined }]}>{scholarship.category}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingHorizontal: compact ? spacing(2) : spacing(3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: isUrgent ? `${colors.danger}14` : colors.surfaceAlt, borderWidth: 1, borderColor: isUrgent ? `${colors.danger}33` : colors.border }}>
            <Ionicons name="time-outline" size={compact ? 10 : 13} color={isUrgent ? colors.danger : colors.textSecondary} />
            <Text style={[typography.caption, { color: isUrgent ? colors.danger : colors.textSecondary, fontWeight: '700', fontSize: compact ? 9 : undefined }]}>
              {scholarship.daysLeft <= 0 ? 'Closed' : `${scholarship.daysLeft}d`}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingHorizontal: compact ? spacing(2) : spacing(3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: `${colors.success}14`, borderWidth: 1, borderColor: `${colors.success}33` }}>
            <Ionicons name="cash-outline" size={compact ? 10 : 13} color={colors.success} />
            <Text style={[typography.caption, { color: colors.success, fontWeight: '700', fontSize: compact ? 9 : undefined }]} numberOfLines={1}>
              {scholarship.amount}
            </Text>
          </View>
        </View>

        {/* Requirements preview — show only 1 on compact */}
        <View style={{ gap: spacing(1) }}>
          {scholarship.requirements.slice(0, compact ? 1 : 2).map((req, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(2) }}>
              <View style={{ width: compact ? 5 : 6, height: compact ? 5 : 6, borderRadius: 3, backgroundColor: vc.text, marginTop: compact ? 6 : 7, flexShrink: 0 }} />
              <Text style={[typography.caption, { color: colors.textSecondary, flex: 1, lineHeight: compact ? 15 : 17, fontSize: compact ? 10 : undefined }]} numberOfLines={2}>
                {req}
              </Text>
            </View>
          ))}
          {scholarship.requirements.length > (compact ? 1 : 2) && (
            <Text style={[typography.caption, { color: colors.textMuted, fontSize: compact ? 9 : undefined }]}>
              +{scholarship.requirements.length - (compact ? 1 : 2)} more
            </Text>
          )}
        </View>

        {/* Footer */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing(2), borderTopWidth: 1, borderTopColor: colors.divider }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
            <Ionicons name="calendar-outline" size={compact ? 11 : 14} color={colors.textMuted} />
            <Text style={[typography.caption, { color: colors.textMuted, fontSize: compact ? 9 : undefined }]} numberOfLines={1}>
              {compact ? scholarship.deadline.split(',')[0] : `Due ${scholarship.deadline}`}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
            <Text style={[typography.label, { color: colors.primary, fontSize: compact ? 10 : undefined }]}>Details</Text>
            <Ionicons name="arrow-forward" size={compact ? 11 : 14} color={colors.primary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ onReset }: { onReset: () => void }) {
  const colors    = useTheme();
  const elevation = useElevation('sm');
  return (
    <View style={[{ alignItems: 'center', padding: spacing(10), backgroundColor: colors.card, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border }, elevation]}>
      <View style={{ width: 68, height: 68, borderRadius: radii.xl, backgroundColor: `${colors.primary}22`, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(5) }}>
        <Ionicons name="ribbon-outline" size={32} color={colors.primary} />
      </View>
      <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>No Scholarships Found</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), textAlign: 'center', maxWidth: 300 }]}>
        No scholarships match this filter. Try a different category.
      </Text>
      <Pressable onPress={onReset} style={({ pressed }) => ({ marginTop: spacing(6), flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(6), paddingVertical: spacing(4), borderRadius: radii.lg, backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 })}>
        <Ionicons name="refresh-outline" size={17} color="#fff" />
        <Text style={[typography.label, { color: '#fff' }]}>Show All</Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar panel (desktop)
// ─────────────────────────────────────────────────────────────────────────────
function SidebarPanel({
  scholarships,
  filtered,
  category,
  onCategory,
}: {
  scholarships: Scholarship[];
  filtered: Scholarship[];
  category: Category;
  onCategory: (c: Category) => void;
}) {
  const colors    = useTheme();
  const elevation = useElevation('md');

  const localCount   = scholarships.filter((s) => s.category === 'Local').length;
  const intlCount    = scholarships.filter((s) => s.category === 'International').length;
  const urgentCount  = scholarships.filter((s) => s.daysLeft <= 7).length;
  const qualifyCount = scholarships.filter((s) => s.status === 'You May Qualify').length;

  return (
    <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
      {/* Overview */}
      <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevation]}>
        <View style={{ height: 3, backgroundColor: colors.primary }} />
        <View style={{ padding: spacing(6), gap: spacing(4) }}>
          <Text style={[typography.h2, { color: colors.textPrimary }]}>Overview</Text>

          <View style={{ gap: spacing(3) }}>
            {[
              { icon: 'ribbon-outline' as const,           label: 'Total',           value: `${scholarships.length}`, color: colors.primary },
              { icon: 'checkmark-circle-outline' as const, label: 'You May Qualify', value: `${qualifyCount}`,        color: colors.success },
              { icon: 'time-outline' as const,             label: 'Urgent',          value: `${urgentCount}`,         color: colors.danger  },
            ].map(({ icon, label, value, color }) => (
              <View key={label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing(3), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                  <Ionicons name={icon} size={16} color={color} />
                  <Text style={[typography.body, { color: colors.textSecondary }]}>{label}</Text>
                </View>
                <Text style={[typography.bodyStrong, { color }]}>{value}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 1, backgroundColor: colors.divider }} />

          {/* Category filters */}
          <Text style={[typography.h2, { color: colors.textPrimary }]}>Filter by Type</Text>
          <View style={{ gap: spacing(2) }}>
            {([
              { key: 'ALL',           label: 'All Scholarships', count: scholarships.length, icon: 'apps-outline' as const },
              { key: 'Local',         label: 'Local',            count: localCount,           icon: 'location-outline' as const },
              { key: 'International', label: 'International',    count: intlCount,            icon: 'globe-outline' as const },
            ] as { key: Category; label: string; count: number; icon: keyof typeof Ionicons.glyphMap }[]).map(({ key, label, count, icon }) => {
              const active = category === key;
              return (
                <Pressable key={key} onPress={() => onCategory(key)} style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(3), paddingHorizontal: spacing(4), paddingVertical: spacing(3), borderRadius: radii.lg, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}14` : colors.surfaceAlt, opacity: pressed ? 0.85 : 1 })}>
                  <Ionicons name={icon} size={17} color={active ? colors.primary : colors.textPrimary} />
                  <Text style={[typography.label, { color: active ? colors.primary : colors.textPrimary, flex: 1 }]}>{label}</Text>
                  <View style={{ paddingHorizontal: spacing(2), paddingVertical: 2, borderRadius: radii.pill, backgroundColor: active ? `${colors.primary}22` : colors.surfaceAlt, borderWidth: 1, borderColor: active ? `${colors.primary}44` : colors.border }}>
                    <Text style={[typography.caption, { color: active ? colors.primary : colors.textMuted, fontWeight: '700' }]}>{count}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          {/* Tip */}
          <View style={{ padding: spacing(4), backgroundColor: `${colors.primary}14`, borderRadius: radii.lg, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
            <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
              💡 Tap any scholarship card to view full details, eligibility criteria, and application links.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────────────────────
function ScholarshipsContent() {
  const { width } = useWindowDimensions();
  const colors    = useTheme();
  const elevation = useElevation('md');

  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
const [loading, setLoading] = useState(true);

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 768)  return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  useEffect(() => {
  async function fetchScholarships() {
    try {
      setLoading(true);

      const q = query(
        collection(db, 'scholarships'),
        where('isActive', '==', true),
        orderBy('deadline', 'asc')
      );

      const snapshot = await getDocs(q);

     const data = snapshot.docs.map((doc) => {
  const raw = doc.data();
  const deadlineDate = new Date(raw.deadline);
  const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return {
    id: doc.id,
    ...raw,
    daysLeft,
  };
}) as Scholarship[];

      setScholarships(data);
    } catch (error) {
      console.error('Failed to fetch scholarships:', error);
    } finally {
      setLoading(false);
    }
  }

  fetchScholarships();
}, []);

  const isDesktop = breakpoint === 'desktop';
  const isMobile  = breakpoint === 'mobile';

  const [category, setCategory] = useState<Category>('ALL');

 const filtered = useMemo(() => {
  if (category === 'ALL') return scholarships;
  return scholarships.filter((s) => s.category === category);
}, [category, scholarships]);

  // Navigate to the details screen, passing the scholarship id so that
  // screen can fetch and display the specific scholarship that was clicked.
  const handleViewScholarship = useCallback((id: string) => {
    router.push({
      pathname: '/student/scholarship-details',
      params: { id },
    });
  }, []);

  const urgentCount  = scholarships.filter((s) => s.daysLeft <= 7).length;
  const qualifyCount = scholarships.filter((s) => s.status === 'You May Qualify').length;
  const localCount   = scholarships.filter((s) => s.category === 'Local').length;
  const intlCount    = scholarships.filter((s) => s.category === 'International').length;

  // ── Hero banner ────────────────────────────────────────────────────────────
  const HeroBanner = (
    <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: spacing(6) }, elevation]}>
      <View style={{ height: 3, backgroundColor: colors.primary }} />
      <View style={{ padding: isMobile ? spacing(4) : spacing(7) }}>
        <View style={{ flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: spacing(4) }}>
          <View style={{ flex: 1 }}>
            {/* Badge */}
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: `${colors.primary}22`, borderWidth: 1, borderColor: `${colors.primary}44`, marginBottom: spacing(3) }}>
              <Ionicons name="ribbon-outline" size={13} color={colors.primary} />
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>SCHOLARSHIPS</Text>
            </View>
            <Text style={[typography.hero, { color: colors.textPrimary, fontSize: isMobile ? 20 : undefined, lineHeight: isMobile ? 26 : undefined }]}>
              Funding Opportunities
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), maxWidth: 480, lineHeight: 22, fontSize: isMobile ? 13 : undefined }]}>
              Discover scholarships and bursaries suited to your profile. Stay on top of deadlines and explore every opportunity available to you.
            </Text>
          </View>
          {/* Result pill */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: `${colors.primary}22`, borderWidth: 1, borderColor: `${colors.primary}44`, alignSelf: isMobile ? 'flex-start' : 'center' }}>
            <Ionicons name="ribbon-outline" size={15} color={colors.primary} />
            <Text style={[typography.label, { color: colors.primary }]}>
              {filtered.length} result{filtered.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Stats strip */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3), marginTop: spacing(5) }}>
          <StatPill icon="apps-outline"              label="Total"       value={`${scholarships.length}`} color={colors.primary} />
          <StatPill icon="checkmark-circle-outline"  label="You Qualify" value={`${qualifyCount}`}        color={colors.success} />
          <StatPill icon="time-outline"              label="Urgent"      value={`${urgentCount}`}          color={colors.danger}  />
          <StatPill icon="location-outline"          label="Local"       value={`${localCount}`}           color={colors.warning} />
        </View>
      </View>
    </View>
  );

  // ── Category filter strip (mobile/tablet) ──────────────────────────────────
  const FilterStrip = !isDesktop && (
    <View style={{ flexDirection: 'row', gap: spacing(2), marginBottom: spacing(5), flexWrap: 'wrap' }}>
      {([
        { key: 'ALL',           label: 'All',           icon: 'apps-outline' as const },
        { key: 'Local',         label: 'Local',         icon: 'location-outline' as const },
        { key: 'International', label: 'International', icon: 'globe-outline' as const },
      ] as { key: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[]).map(({ key, label, icon }) => {
        const active = category === key;
        return (
          <Pressable key={key} onPress={() => setCategory(key)} style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : colors.surfaceAlt, opacity: pressed ? 0.85 : 1 })}>
            <Ionicons name={icon} size={13} color={active ? '#fff' : colors.textSecondary} />
            <Text style={[typography.caption, { color: active ? '#fff' : colors.textSecondary, fontWeight: '700', fontSize: isMobile ? 11 : undefined }]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (loading) {
  return (
    <DashboardLayout
      title="Scholarships"
      subtitle="Discover opportunities and stay on top of deadlines"
      showPointsCard={false}
    >
      <Text style={[typography.body, { color: colors.textSecondary }]}>
        Loading scholarships...
      </Text>
    </DashboardLayout>
  );
}

  // ── Card grid — 2 columns on ALL screen sizes via 48% width ───────────────
  const CardGrid = filtered.length === 0
    ? <EmptyState onReset={() => setCategory('ALL')} />
    : (
      <View>
        <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3), fontSize: isMobile ? 10 : undefined }]}>
          {category === 'ALL' ? 'ALL SCHOLARSHIPS' : category.toUpperCase()}
          {' '}· {filtered.length} FOUND
        </Text>
        {/* flexWrap + 48% width = 2-col grid on web & native without measuring */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3) }}>
          {filtered.map((sch) => (
            <ScholarshipCard
              key={sch.id}
              scholarship={sch}
              onPress={() => handleViewScholarship(sch.id)}
              compact={isMobile}
            />
          ))}
        </View>
      </View>
    );

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      title="Scholarships"
      subtitle="Discover opportunities and stay on top of deadlines"
      showPointsCard={false}
    >
      {/* Back navigation + breadcrumb */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(5) }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(isMobile ? 3 : 4), paddingVertical: spacing(2), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}
        >
          <Ionicons name="arrow-back" size={isMobile ? 15 : 17} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary, fontSize: isMobile ? 12 : undefined }]}>Back</Text>
        </Pressable>
        <Text style={[typography.caption, { color: colors.textMuted, fontSize: isMobile ? 11 : undefined }]} numberOfLines={1}>
          Dashboard › Scholarships
        </Text>
      </View>

      {/* Desktop two-column; mobile/tablet stacked */}
      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing(8), alignItems: 'flex-start' }}>
        {/* Main column */}
        <View style={{ flex: 1, minWidth: 0 }}>
          {HeroBanner}
          {FilterStrip}
          {CardGrid}
        </View>

        {/* Sidebar — desktop only */}
        {isDesktop && (
          <SidebarPanel
            scholarships={scholarships}
            filtered={filtered}
            category={category}
            onCategory={setCategory}
          />
        )}
      </View>
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function Scholarships() {
  return (
    <StudentMenuProvider>
      <ScholarshipsContent />
    </StudentMenuProvider>
  );
}