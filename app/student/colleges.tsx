
import React, { useMemo, useState, useCallback } from 'react';
import { useEffect, useRef } from 'react';
import { db } from '../../constants/firebase';
import { collection, getDocs, terminate, enableNetwork } from 'firebase/firestore';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  TextInput,
  type ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  StudentMenuProvider,
  useStudentMenu,
} from '../../components/student/StudentMenu';

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

type College = {
  id:       string;
  name:     string;
  location: string;
  tagline:  string;
  badge:    string;
};

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// Elevation helper
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = 0.28;
    const radius  = intensity === 'sm' ? 6  : intensity === 'md' ? 14 : 22;
    const offsetY = intensity === 'sm' ? 2  : intensity === 'md' ? 5  : 10;
    return (
      Platform.select({
        ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: radius },
        android: { elevation: intensity === 'sm' ? 3 : intensity === 'md' ? 6 : 12 },
        web:     { boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})` },
        default: {},
      }) ?? {}
    ) as ViewStyle;
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore fetch with retry + exponential back-off
// Transport errors (WebChannelConnection) are transient — a single retry
// after a short delay resolves them in almost all cases.
// ─────────────────────────────────────────────────────────────────────────────
const RETRY_DELAYS = [1500, 3000, 6000]; // ms — 3 attempts total

async function fetchCollegesWithRetry(
  attempt = 0,
): Promise<College[]> {
  try {
    const snapshot = await getDocs(collection(db, 'institutions'));
    return snapshot.docs
      .filter((doc) => doc.data().category?.toLowerCase() === 'college')
      .map((doc) => {
        const data = doc.data();
        return {
          id:       doc.id,
          name:     data.name     ?? 'Unnamed College',
          location: data.location ?? 'Botswana',
          tagline:  data.about ?? data.tagline ?? 'No description available.',
          badge:    data.badge    ?? 'COL',
        };
      });
  } catch (err: any) {
    // WebChannelConnection / transport errors have no useful .code —
    // detect them by message or just treat any error as retryable.
    const isTransport =
      err?.message?.toLowerCase().includes('transport') ||
      err?.message?.toLowerCase().includes('webchannel') ||
      err?.name === 'FirebaseError';

    if (isTransport && attempt < RETRY_DELAYS.length) {
      await new Promise((res) => setTimeout(res, RETRY_DELAYS[attempt]));
      // Re-enable network in case Firestore put itself offline
      try { await enableNetwork(db); } catch (_) {}
      return fetchCollegesWithRetry(attempt + 1);
    }

    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// StatPill
// ─────────────────────────────────────────────────────────────────────────────
function StatPill({
  icon,
  label,
  value,
}: {
  icon:  keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const colors    = useTheme();
  const elevation = useElevation('sm');
  return (
    <View
      style={[
        {
          flexDirection:     'row',
          alignItems:        'center',
          gap:               spacing(3),
          paddingHorizontal: spacing(4),
          paddingVertical:   spacing(3),
          backgroundColor:   colors.surfaceAlt,
          borderRadius:      radii.lg,
          borderWidth:       1,
          borderColor:       colors.border,
        },
        elevation,
      ]}
    >
      <View
        style={{
          width:           36,
          height:          36,
          borderRadius:    radii.md,
          backgroundColor: `${colors.primary}22`,
          alignItems:      'center',
          justifyContent:  'center',
        }}
      >
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: 2 }]}>{value}</Text>
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
  variant = 'ghost',
}: {
  icon:     keyof typeof Ionicons.glyphMap;
  label:    string;
  onPress:  () => void;
  variant?: 'ghost' | 'primary';
}) {
  const colors    = useTheme();
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection:     'row' as const,
        alignItems:        'center' as const,
        gap:               spacing(3),
        paddingHorizontal: spacing(4),
        paddingVertical:   spacing(3),
        borderRadius:      radii.lg,
        borderWidth:       1,
        borderColor:       isPrimary ? colors.primary : colors.border,
        backgroundColor:   isPrimary ? colors.primary : colors.surfaceAlt,
        opacity:           pressed ? 0.85 : 1,
        transform:         pressed ? [{ scale: 0.98 }] : [],
      })}
    >
      <Ionicons name={icon} size={17} color={isPrimary ? '#fff' : colors.textPrimary} />
      <Text style={[typography.label, { color: isPrimary ? '#fff' : colors.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CollegeCard — width controlled by wrapper, never by the card itself
// ─────────────────────────────────────────────────────────────────────────────
function CollegeCard({
  college,
  onPress,
}: {
  college: College;
  onPress: () => void;
}) {
  const colors    = useTheme();
  const elevation = useElevation('md');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${college.name}`}
      style={({ pressed }) => [
        {
          width:           '100%',
          backgroundColor: colors.surface,
          borderRadius:    radii.xxl,
          borderWidth:     1,
          borderColor:     colors.border,
          padding:         spacing(5),
          overflow:        'hidden' as const,
          opacity:         pressed ? 0.9 : 1,
          transform:       pressed ? [{ scale: 0.98 }] : [],
        },
        elevation,
      ]}
    >
      {/* Top accent bar */}
      <View style={{ height: 3, backgroundColor: colors.primary, borderRadius: 2, marginBottom: spacing(4) }} />

      {/* Badge + chevron */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          style={{
            paddingHorizontal: spacing(3),
            paddingVertical:   spacing(2),
            borderRadius:      radii.pill,
            backgroundColor:   `${colors.primary}22`,
            borderWidth:       1,
            borderColor:       `${colors.primary}44`,
          }}
        >
          <Text style={[typography.label, { color: colors.primary, letterSpacing: 0.4 }]}>
            {college.badge}
          </Text>
        </View>
        <View
          style={{
            width:           34,
            height:          34,
            borderRadius:    radii.md,
            backgroundColor: colors.surfaceAlt,
            borderWidth:     1,
            borderColor:     colors.border,
            alignItems:      'center',
            justifyContent:  'center',
          }}
        >
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </View>

      {/* Name */}
      <Text
        style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(4) }]}
        numberOfLines={2}
      >
        {college.name}
      </Text>

      {/* Location */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(2) }}>
        <Ionicons name="location-outline" size={13} color={colors.primary} />
        <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
          {college.location}
        </Text>
      </View>

      {/* Tagline */}
      <Text
        style={[typography.body, { color: colors.textSecondary, marginTop: spacing(3), lineHeight: 20 }]}
        numberOfLines={3}
      >
        {college.tagline}
      </Text>

      {/* Footer */}
      <View
        style={{
          marginTop:      spacing(4),
          paddingTop:     spacing(3),
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          flexDirection:  'row',
          alignItems:     'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={[typography.label, { color: colors.primary }]}>View details</Text>
        <Ionicons name="arrow-forward" size={15} color={colors.primary} />
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
    <View
      style={[
        {
          alignItems:      'center',
          padding:         spacing(10),
          backgroundColor: colors.surface,
          borderRadius:    radii.xxl,
          borderWidth:     1,
          borderColor:     colors.border,
        },
        elevation,
      ]}
    >
      <View
        style={{
          width:           68,
          height:          68,
          borderRadius:    radii.xl,
          backgroundColor: `${colors.primary}22`,
          borderWidth:     1,
          borderColor:     colors.border,
          alignItems:      'center',
          justifyContent:  'center',
          marginBottom:    spacing(5),
        }}
      >
        <Ionicons name="search-outline" size={28} color={colors.primary} />
      </View>
      <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>
        No colleges found
      </Text>
      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, marginTop: spacing(2), textAlign: 'center', maxWidth: 300 },
        ]}
      >
        Try a different college name, location, or keyword.
      </Text>
      <Pressable
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel="Reset search"
        style={({ pressed }) => ({
          marginTop:         spacing(6),
          flexDirection:     'row' as const,
          alignItems:        'center' as const,
          gap:               spacing(2),
          paddingHorizontal: spacing(6),
          paddingVertical:   spacing(4),
          borderRadius:      radii.lg,
          backgroundColor:   colors.primary,
          opacity:           pressed ? 0.88 : 1,
          transform:         pressed ? [{ scale: 0.98 }] : [],
        })}
      >
        <Ionicons name="refresh-outline" size={17} color="#fff" />
        <Text style={[typography.label, { color: '#fff', letterSpacing: 0.4 }]}>RESET SEARCH</Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ErrorState — shown when all retries are exhausted
// ─────────────────────────────────────────────────────────────────────────────
function ErrorState({
  onRetry,
  attempt,
}: {
  onRetry:  () => void;
  attempt:  number;
}) {
  const colors    = useTheme();
  const elevation = useElevation('sm');

  return (
    <View
      style={[
        {
          alignItems:      'center',
          padding:         spacing(10),
          backgroundColor: colors.surface,
          borderRadius:    radii.xxl,
          borderWidth:     1,
          borderColor:     `${colors.danger}33`,
        },
        elevation,
      ]}
    >
      <View
        style={{
          width:           68,
          height:          68,
          borderRadius:    radii.xl,
          backgroundColor: `${colors.danger}18`,
          borderWidth:     1,
          borderColor:     `${colors.danger}33`,
          alignItems:      'center',
          justifyContent:  'center',
          marginBottom:    spacing(5),
        }}
      >
        <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
      </View>

      <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>
        Connection problem
      </Text>
      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, marginTop: spacing(2), textAlign: 'center', maxWidth: 320, lineHeight: 22 },
        ]}
      >
        Could not reach the server. This is usually a temporary network hiccup — please check your connection and try again.
      </Text>

      {attempt > 0 && (
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing(3) }]}>
          Retried {attempt} time{attempt !== 1 ? 's' : ''} automatically
        </Text>
      )}

      <Pressable
        onPress={onRetry}
        style={({ pressed }) => ({
          marginTop:         spacing(6),
          flexDirection:     'row' as const,
          alignItems:        'center' as const,
          gap:               spacing(2),
          paddingHorizontal: spacing(6),
          paddingVertical:   spacing(4),
          borderRadius:      radii.lg,
          backgroundColor:   colors.primary,
          opacity:           pressed ? 0.88 : 1,
          transform:         pressed ? [{ scale: 0.98 }] : [],
        })}
      >
        <Ionicons name="refresh-outline" size={17} color="#fff" />
        <Text style={[typography.label, { color: '#fff', letterSpacing: 0.4 }]}>TRY AGAIN</Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CollegesContent
// ─────────────────────────────────────────────────────────────────────────────
function CollegesContent() {
  const { width } = useWindowDimensions();
  const colors    = useTheme();
  const { openMenu } = useStudentMenu();
  const elevation = useElevation('md');

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 768)  return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isMobile  = breakpoint === 'mobile';

  const [search,        setSearch]       = useState('');
  const [colleges,      setColleges]     = useState<College[]>([]);
  const [status,        setStatus]       = useState<FetchStatus>('idle');
  const [retryCount,    setRetryCount]   = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const loadColleges = useCallback(async () => {
    if (!mountedRef.current) return;
    setStatus('loading');

    try {
      const data = await fetchCollegesWithRetry(0);
      if (!mountedRef.current) return;
      setColleges(data);
      setStatus('success');
    } catch (err) {
      console.error('[Colleges] fetch failed after retries:', err);
      if (!mountedRef.current) return;
      setStatus('error');
      setRetryCount((c) => c + 1);
    }
  }, []);

  // Initial load
  useEffect(() => { loadColleges(); }, [loadColleges]);

  const filtered = useMemo(() => {
    if (!search.trim()) return colleges;
    const q = search.toLowerCase();
    return colleges.filter(
      (c) =>
        c.name.toLowerCase().includes(q)     ||
        c.location.toLowerCase().includes(q) ||
        c.tagline.toLowerCase().includes(q),
    );
  }, [search, colleges]);

  const handleViewCollege = useCallback((id: string) => {
    router.push({ pathname: '/student/college-details', params: { id } });
  }, []);

  // ── Column count ─────────────────────────────────────────────────────────
  const numCols          = isMobile ? 1 : 2;
  const cardWrapperWidth = numCols === 1 ? '100%' : '50%';
  const cardGap          = spacing(4);

  // ── Sidebar ──────────────────────────────────────────────────────────────
  const Sidebar = isDesktop && (
    <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
      <View
        style={[
          {
            backgroundColor: colors.surface,
            borderRadius:    radii.xxl,
            borderWidth:     1,
            borderColor:     colors.border,
            padding:         spacing(6),
            gap:             spacing(4),
          },
          elevation,
        ]}
      >
        <Text style={[typography.h2, { color: colors.textPrimary }]}>Overview</Text>
        <View style={{ gap: spacing(3) }}>
          <StatPill icon="business-outline" label="Total Colleges"  value={status === 'success' ? `${colleges.length}` : '—'} />
          <StatPill icon="search-outline"   label="Search Results"  value={status === 'success' ? `${filtered.length}` : '—'} />
          <StatPill icon="location-outline" label="Coverage"        value="Botswana" />
        </View>

        <View style={{ height: 1, backgroundColor: colors.divider }} />

        <Text style={[typography.h2, { color: colors.textPrimary }]}>Quick Actions</Text>
        <View style={{ gap: spacing(3) }}>
          <SidebarAction icon="menu-outline"    label="Open Menu"        onPress={openMenu}                                   variant="primary" />
          <SidebarAction icon="refresh-outline" label="Reload"           onPress={loadColleges}                               />
          <SidebarAction icon="search-outline"  label="Clear Search"     onPress={() => setSearch('')}                        />
          <SidebarAction icon="school-outline"  label="All Institutions" onPress={() => router.push('/student/institutions')} />
        </View>

        <View
          style={{
            padding:         spacing(4),
            backgroundColor: `${colors.primary}14`,
            borderRadius:    radii.lg,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
          }}
        >
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
            💡 Tip: Search by college name, city, or specialty to narrow results faster.
          </Text>
        </View>
      </View>
    </View>
  );

  // ── Hero banner ──────────────────────────────────────────────────────────
  const HeroBanner = (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius:    radii.xxl,
          borderWidth:     1,
          borderColor:     colors.border,
          padding:         isMobile ? spacing(5) : spacing(7),
          marginBottom:    spacing(6),
          overflow:        'hidden',
        },
        elevation,
      ]}
    >
      <View style={{ height: 3, backgroundColor: colors.primary, borderRadius: 2, marginBottom: spacing(4) }} />

      <View
        style={{
          flexDirection:  isMobile ? 'column' : 'row',
          alignItems:     isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap:            spacing(4),
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[typography.hero, { color: colors.textPrimary }]}>
            Find the right college
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2) }]}>
            Explore colleges across Botswana, compare options, and open detailed
            pages for a deeper look at courses and admission requirements.
          </Text>
        </View>

        <View
          style={{
            flexDirection:     'row',
            alignItems:        'center',
            gap:               spacing(2),
            paddingHorizontal: spacing(4),
            paddingVertical:   spacing(2),
            borderRadius:      radii.pill,
            backgroundColor:   `${colors.primary}22`,
            borderWidth:       1,
            borderColor:       `${colors.primary}44`,
            alignSelf:         isMobile ? 'flex-start' : 'center',
            flexShrink:        0,
          }}
        >
          <Ionicons name="business-outline" size={15} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary }]}>
            {status === 'success' ? `${filtered.length} result${filtered.length === 1 ? '' : 's'}` : '…'}
          </Text>
        </View>
      </View>
    </View>
  );

  // ── Mobile stats strip ───────────────────────────────────────────────────
  const MobileStatsStrip = isMobile && (
    <View style={{ flexDirection: 'row', marginBottom: spacing(6) }}>
      {[
        { icon: 'business-outline' as const, label: 'Total',    value: status === 'success' ? `${colleges.length}` : '—' },
        { icon: 'search-outline'   as const, label: 'Results',  value: status === 'success' ? `${filtered.length}` : '—' },
        { icon: 'location-outline' as const, label: 'Coverage', value: 'BW' },
      ].map((s, i) => (
        <View key={s.label} style={{ width: '33.33%', paddingRight: i < 2 ? spacing(2) : 0 }}>
          <View
            style={{
              flexDirection:   'row',
              alignItems:      'center',
              gap:             spacing(2),
              backgroundColor: colors.surface,
              borderRadius:    radii.lg,
              borderWidth:     1,
              borderColor:     colors.border,
              padding:         spacing(3),
            }}
          >
            <Ionicons name={s.icon} size={14} color={colors.primary} />
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>{s.label}</Text>
              <Text style={[typography.label, { color: colors.textPrimary }]} numberOfLines={1}>{s.value}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  // ── Search bar ───────────────────────────────────────────────────────────
  const SearchBar = (
    <View style={{ marginBottom: spacing(6) }}>
      <Text
        style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(2) }]}
      >
        SEARCH
      </Text>
      <View
        style={[
          {
            flexDirection:     'row',
            alignItems:        'center',
            backgroundColor:   colors.surface,
            borderRadius:      radii.xl,
            borderWidth:       1,
            borderColor:       colors.border,
            paddingHorizontal: spacing(4),
            minHeight:         52,
          },
          elevation,
        ]}
      >
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, location, or specialty…"
          placeholderTextColor={colors.textMuted}
          style={[
            typography.body,
            { flex: 1, marginLeft: spacing(3), paddingVertical: spacing(3), color: colors.textPrimary },
          ]}
          accessibilityLabel="Search colleges"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => setSearch('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={({ pressed }) => ({ padding: spacing(2), opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );

  // ── Card grid ────────────────────────────────────────────────────────────
  const Grid =
    filtered.length === 0 ? (
      <EmptyState onReset={() => setSearch('')} />
    ) : (
      <View>
        <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) }]}>
          COLLEGES ({filtered.length})
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginRight: numCols > 1 ? -cardGap : 0 }}>
          {filtered.map((college) => (
            <View
              key={college.id}
              style={{
                width:         cardWrapperWidth as any,
                paddingRight:  numCols > 1 ? cardGap : 0,
                paddingBottom: cardGap,
              }}
            >
              <CollegeCard college={college} onPress={() => handleViewCollege(college.id)} />
            </View>
          ))}
        </View>
      </View>
    );

  // ── Loading state ────────────────────────────────────────────────────────
  if (status === 'loading' || status === 'idle') {
    return (
      <DashboardLayout title="Colleges" subtitle="Explore colleges across Botswana" showPointsCard={false}>
        <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: spacing(16), gap: spacing(5) }}>
          <View
            style={{
              width:           72,
              height:          72,
              borderRadius:    36,
              backgroundColor: `${colors.primary}18`,
              borderWidth:     1,
              borderColor:     `${colors.primary}33`,
              alignItems:      'center',
              justifyContent:  'center',
            }}
          >
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <View style={{ alignItems: 'center', gap: spacing(2) }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>Loading colleges</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Connecting to server…
            </Text>
          </View>
        </View>
      </DashboardLayout>
    );
  }

  // ── Error state (all retries exhausted) ──────────────────────────────────
  if (status === 'error') {
    return (
      <DashboardLayout title="Colleges" subtitle="Explore colleges across Botswana" showPointsCard={false}>
        <View style={{ marginTop: spacing(8), paddingHorizontal: spacing(2) }}>
          <ErrorState onRetry={loadColleges} attempt={retryCount * RETRY_DELAYS.length} />
        </View>
      </DashboardLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Colleges" subtitle="Explore colleges across Botswana" showPointsCard={false}>
      {/* Back navigation */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(6) }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={({ pressed }) => ({
            flexDirection:     'row' as const,
            alignItems:        'center' as const,
            gap:               spacing(2),
            paddingHorizontal: spacing(4),
            paddingVertical:   spacing(2),
            borderRadius:      radii.lg,
            backgroundColor:   colors.surfaceAlt,
            borderWidth:       1,
            borderColor:       colors.border,
            opacity:           pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="arrow-back" size={17} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary }]}>Back</Text>
        </Pressable>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Institutions › Colleges
        </Text>
      </View>

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing(8), alignItems: 'flex-start' }}>
        <View style={{ flex: 1, minWidth: 0, width: '100%' }}>
          {HeroBanner}
          {MobileStatsStrip}
          {SearchBar}
          {Grid}
        </View>
        {Sidebar}
      </View>
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported screen
// ─────────────────────────────────────────────────────────────────────────────
export default function CollegesScreen() {
  return (
    <StudentMenuProvider>
      <CollegesContent />
    </StudentMenuProvider>
  );
}
