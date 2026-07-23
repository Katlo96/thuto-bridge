import React, {
  useMemo, useState, useCallback, useEffect, useRef, memo,
} from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  TextInput,
  type ViewStyle,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  StudentMenuProvider,
} from '../../components/student/StudentMenu';

import DashboardLayout, {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';
import StudentFooter from '../../components/student/StudentFooter';

import { db } from '../../constants/firebase';
import {
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  limit,
  startAfter,
  type Query,
  type QueryConstraint,
  type CollectionReference,
  type QuerySnapshot,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// Tunables — every magic number in this file lives here, named, so the next
// person who needs to adjust timing/batch sizes doesn't have to hunt for
// hardcoded literals scattered through the component.
// ─────────────────────────────────────────────────────────────────────────────
const CONFIG = {
  FIRESTORE_TIMEOUT_MS:            20_000,
  FIRESTORE_RETRY_DELAY_MS:        1_500,
  SLOW_CONNECTION_BANNER_DELAY_MS: 4_000,
  INFINITE_SCROLL_THROTTLE_MS:     600,
  LOAD_MORE_DELAY_MS:              180,
  SEARCH_DEBOUNCE_MS:              200,

  // INITIAL_COURSE_BATCH: how many course docs we fetch before first paint
  // on desktop/tablet. This is what actually determines how long the user
  // stares at a skeleton — NOT how many we display (see PAGE_SIZE in the
  // component). Kept small and flat across breakpoints because perceived
  // load time is a function of round-trip latency, not screen width.
  INITIAL_COURSE_BATCH: 20,

  // BACKGROUND_COURSE_BATCH: chunk size for the follow-up cursor fetches that
  // run silently after first paint on desktop/tablet, so search / filters /
  // "load more" eventually see every course without the user ever waiting
  // on the full collection.
  //
  // IMPORTANT: this full-catalogue background hydration is DESKTOP/TABLET
  // ONLY. On mobile it is exactly what was destabilizing the app — pulling
  // the entire courses collection into memory on a phone. The mobile flow
  // below (MobileCoursesView) never runs this; it only ever fetches courses
  // scoped to one institution (optionally one faculty) and paginates that
  // narrow slice with MOBILE_COURSES_PAGE_SIZE.
  BACKGROUND_COURSE_BATCH: 75,

  // ── Mobile drill-down flow ────────────────────────────────────────────
  // How many faculties we fetch per institution. Faculties are a small,
  // bounded list per institution, so one capped fetch (no follow-up
  // pagination) is safe and keeps the flow simple.
  MOBILE_FACULTIES_LIMIT: 60,
  // How many course cards are fetched per "page" once the user has drilled
  // down to a specific institution (+ optionally a faculty). This is a
  // server-side limit()/startAfter() query — never the whole collection.
  MOBILE_COURSES_PAGE_SIZE: 12,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Breakpoint      = 'mobile' | 'tablet' | 'desktop';
type InstitutionType = 'university' | 'college' | 'brigade';
type FetchStatus     = 'idle' | 'loading' | 'success' | 'error';
type IconName        = keyof typeof Ionicons.glyphMap;

type Institution = {
  id: string; name: string; type: InstitutionType; badge: string; location: string;
};
type Faculty = {
  id: string; name: string; institutionId: string;
};
type Course = {
  id: string; title: string; qualificationLevel: string; duration: string;
  requiredPoints: number; institutionId: string; institutionName: string;
  institutionType: InstitutionType; institutionBadge: string;
  facultyId: string; facultyName: string; location: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// safeDocs — 20s timeout, one retry after 1.5s.
//
// Why explicitly typed instead of `getDocs(ref as any)`:
//   Casting through `any` erases the document-shape generic, so every
//   `.docs` array downstream comes back as `QueryDocumentSnapshot<unknown>`
//   instead of `<DocumentData>` — that's a real type error the moment you
//   pass `.docs` into a strictly-typed helper. Typing the parameter as
//   `Query<DocumentData> | CollectionReference<DocumentData>` costs nothing
//   (every call site already produces exactly that) and keeps the whole
//   chain type-safe.
// ─────────────────────────────────────────────────────────────────────────────
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('firestore_timeout'));
    }, ms);

    p.then((value) => {
      clearTimeout(timer);
      resolve(value);
    }).catch((error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function safeDocs(
  ref: Query<DocumentData> | CollectionReference<DocumentData>,
): Promise<QuerySnapshot<DocumentData>> {
  try {
    return await withTimeout(getDocs(ref), CONFIG.FIRESTORE_TIMEOUT_MS);
  } catch {
    await new Promise((res) => setTimeout(res, CONFIG.FIRESTORE_RETRY_DELAY_MS));
    return await withTimeout(getDocs(ref), CONFIG.FIRESTORE_TIMEOUT_MS);
  }
}

/** Best-effort count query. Never throws — callers just get `null` back on
 *  failure (older Firestore SDKs, permission issues, etc.) and degrade the
 *  UI gracefully rather than losing the whole screen over a "nice to have"
 *  number. */
async function safeCount(q: Query<DocumentData>): Promise<number | null> {
  try {
    const snap = await withTimeout(getCountFromServer(q), CONFIG.FIRESTORE_TIMEOUT_MS);
    return snap.data().count;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getFriendlyErrorMessage — turns Firestore/network failures into copy a
// student can act on, instead of one generic catch-all string.
// ─────────────────────────────────────────────────────────────────────────────
type Translate = (key: string, replacements?: Record<string, string | number>) => string;

function getFriendlyErrorMessage(err: unknown, t: Translate): string {
  if (err instanceof Error && err.message === 'firestore_timeout') {
    return t('The connection is taking too long. Please check your network and try again.');
  }
  const code = (err as { code?: string } | null | undefined)?.code;
  if (code === 'permission-denied') {
    return t("You don't have permission to view courses right now. Please sign in again.");
  }
  if (code === 'unavailable') {
    return t('The course service is temporarily unavailable. Please try again shortly.');
  }
  return t('Could not load courses. Please check your connection and try again.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Doc → model mappers (pure, reusable across the first batch + every
// background batch, so the join-with-institution logic lives in one place).
//
// institutions are looked up via a Map (O(1)) rather than Array#find (O(n)),
// since this runs once per course across every batch fetched.
//
// No orderBy('title') is used anywhere in this file's Firestore queries.
// Some course docs evidently lack a `title` field (hence the `?? 'Untitled'`
// fallback below) — `orderBy('title')` would silently exclude any doc
// missing that field from every page, permanently hiding it. Plain
// limit()/startAfter() pagination has no such risk; we sort client-side
// instead, after the data is safely in hand.
// ─────────────────────────────────────────────────────────────────────────────
function mapInstitutionDocs(
  docs: QueryDocumentSnapshot<DocumentData>[],
): Institution[] {
  return docs.map((doc) => {
    const d = doc.data();
    return {
      id:       doc.id,
      name:     d.name     ?? 'Unknown',
      type:     ((d.category ?? d.type) as InstitutionType) ?? 'university',
      badge:    d.badge    ?? 'INST',
      location: d.location ?? 'Botswana',
    };
  });
}

function mapCourseDocs(
  docs: QueryDocumentSnapshot<DocumentData>[],
  instById: Map<string, Institution>,
): Course[] {
  return docs.map((doc) => {
    const c    = doc.data();
    const inst = instById.get(c.institutionId);
    return {
      id:                 doc.id,
      title:              c.title              ?? 'Untitled',
      qualificationLevel: c.qualificationLevel ?? 'Certificate',
      duration:           c.duration           ?? 'N/A',
      requiredPoints:     Number(c.requiredPoints ?? 0),
      institutionId:      c.institutionId       ?? '',
      institutionName:    inst?.name            ?? 'Unknown',
      institutionType:    inst?.type            ?? 'university',
      institutionBadge:   inst?.badge           ?? 'INST',
      facultyId:          c.facultyId           ?? '',
      facultyName:        c.facultyName         ?? 'General',
      location:           inst?.location        ?? 'Botswana',
    };
  });
}

/** Same shape as mapCourseDocs, but for the mobile drill-down flow where we
 *  already know the exact institution (and possibly faculty) the courses
 *  belong to — no join map needed, since there's only one institution in
 *  scope for the whole query. */
function mapScopedCourseDocs(
  docs: QueryDocumentSnapshot<DocumentData>[],
  institution: Institution,
  facultyNameOverride?: string,
): Course[] {
  return docs.map((doc) => {
    const c = doc.data();
    return {
      id:                 doc.id,
      title:              c.title              ?? 'Untitled',
      qualificationLevel: c.qualificationLevel ?? 'Certificate',
      duration:           c.duration           ?? 'N/A',
      requiredPoints:     Number(c.requiredPoints ?? 0),
      institutionId:      institution.id,
      institutionName:    institution.name,
      institutionType:    institution.type,
      institutionBadge:   institution.badge,
      facultyId:          c.facultyId           ?? '',
      facultyName:        facultyNameOverride ?? c.facultyName ?? 'General',
      location:           institution.location,
    };
  });
}

// Static filter config — module scope so it isn't reallocated every render,
// and typed up front so selecting a filter never needs an `as any` cast.
const TYPE_FILTERS: ReadonlyArray<{ key: 'All' | InstitutionType; labelKey: string }> = [
  { key: 'All',        labelKey: 'All Programs' },
  { key: 'university', labelKey: 'Universities' },
  { key: 'college',    labelKey: 'Colleges'     },
  { key: 'brigade',    labelKey: 'Brigades'     },
];

// Presentation metadata for the mobile "what are you looking for?" step —
// one place that owns the label, icon, accent color, and blurb per type, so
// the type-selection cards and the rest of the flow always agree visually.
const TYPE_META: Record<InstitutionType, {
  labelKey: string;
  singularKey: string;
  icon: IconName;
  color: string;
  blurbKey: string;
}> = {
  university: { labelKey: 'Universities', singularKey: 'university', icon: 'school-outline', color: '#60A5FA', blurbKey: 'Degree programs at accredited universities' },
  college: { labelKey: 'Colleges', singularKey: 'college', icon: 'ribbon-outline', color: '#34D399', blurbKey: 'Diplomas and certificates at colleges' },
  brigade: { labelKey: 'Brigades', singularKey: 'brigade', icon: 'construct-outline', color: '#FBBF24', blurbKey: 'Vocational and technical skills training' },
};

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
// SkeletonPulse — single animated shimmer block
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonPulse({ width, height, style }: { width: number | string; height: number; style?: ViewStyle }) {
  const colors  = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width:        width as any,
          height,
          borderRadius: radii.md,
          backgroundColor: colors.border,
          opacity,
        },
        style,
      ]}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonCard — placeholder while courses load
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonCard() {
  const colors    = useTheme();
  const elevation = useElevation('md');
  return (
    <View
      style={[
        {
          width:           '100%',
          backgroundColor: colors.surface,
          borderRadius:    radii.xxl,
          borderWidth:     1,
          borderColor:     colors.border,
          padding:         spacing(5),
          overflow:        'hidden',
        },
        elevation,
      ]}
    >
      {/* Top accent placeholder */}
      <SkeletonPulse width="100%" height={3} style={{ marginBottom: spacing(4) }} />
      {/* Badge row */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing(4) }}>
        <SkeletonPulse width={70} height={24} />
        <SkeletonPulse width={32}  height={32} />
      </View>
      {/* Title lines */}
      <SkeletonPulse width="90%" height={18} style={{ marginBottom: spacing(2) }} />
      <SkeletonPulse width="65%" height={14} style={{ marginBottom: spacing(4) }} />
      {/* Meta chips row */}
      <View style={{ flexDirection: 'row', gap: spacing(2) }}>
        <SkeletonPulse width={80}  height={22} />
        <SkeletonPulse width={60}  height={22} />
        <SkeletonPulse width={70}  height={22} />
      </View>
      {/* Footer */}
      <View style={{ height: 1, backgroundColor: colors.border, marginTop: spacing(4), marginBottom: spacing(3) }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <SkeletonPulse width={80} height={14} />
        <SkeletonPulse width={20} height={14} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonGrid — renders N placeholder cards in the same grid as real cards
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonGrid({ count, numCols, cardGap }: { count: number; numCols: number; cardGap: number }) {
  const cardWrapperWidth = numCols === 1 ? '100%' : '50%';
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginRight: numCols > 1 ? -cardGap : 0 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={{
            width:         cardWrapperWidth as any,
            paddingRight:  numCols > 1 ? cardGap : 0,
            paddingBottom: cardGap,
          }}
        >
          <SkeletonCard />
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SkeletonRow — placeholder for a single list row (used by the mobile
// institution/faculty lists, which are simpler than course cards)
// ─────────────────────────────────────────────────────────────────────────────
function SkeletonRow() {
  const colors    = useTheme();
  const elevation = useElevation('sm');
  return (
    <View
      style={[
        {
          flexDirection: 'row', alignItems: 'center', gap: spacing(3),
          backgroundColor: colors.surface, borderRadius: radii.xl,
          borderWidth: 1, borderColor: colors.border,
          padding: spacing(4), marginBottom: spacing(3),
        },
        elevation,
      ]}
    >
      <SkeletonPulse width={40} height={40} style={{ borderRadius: radii.lg }} />
      <View style={{ flex: 1, gap: spacing(2) }}>
        <SkeletonPulse width="70%" height={14} />
        <SkeletonPulse width="40%" height={11} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SlowConnectionBanner — appears after CONFIG.SLOW_CONNECTION_BANNER_DELAY_MS
// if still loading
// ─────────────────────────────────────────────────────────────────────────────
function SlowConnectionBanner() {
  const [visible, setVisible] = useState(false);
  const colors = useTheme();
  const { t } = useLanguage();

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), CONFIG.SLOW_CONNECTION_BANNER_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <View
      style={{
        flexDirection:     'row',
        alignItems:        'center',
        gap:               spacing(3),
        paddingHorizontal: spacing(4),
        paddingVertical:   spacing(3),
        backgroundColor:   `${colors.warning}14`,
        borderRadius:      radii.lg,
        borderWidth:       1,
        borderColor:       `${colors.warning}33`,
        marginBottom:      spacing(5),
      }}
    >
      <Ionicons name="wifi-outline" size={16} color={colors.warning} />
      <Text style={[typography.caption, { color: colors.warning, flex: 1, fontWeight: '600' }]}>
        {t('Slow connection detected — still loading…')}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// InfiniteScrollSentinel — fires loadNextPage when it paints into view
// ─────────────────────────────────────────────────────────────────────────────
function InfiniteScrollSentinel({
  onVisible, loading, hasMore, total, shown,
}: {
  onVisible: () => void; loading: boolean;
  hasMore: boolean; total: number; shown: number;
}) {
  const colors   = useTheme();
  const { t } = useLanguage();
  const calledAt = useRef(0);

  const handleLayout = useCallback(() => {
    if (!hasMore || loading) return;
    const now = Date.now();
    if (now - calledAt.current < CONFIG.INFINITE_SCROLL_THROTTLE_MS) return;
    calledAt.current = now;
    onVisible();
  }, [hasMore, loading, onVisible]);

  if (!hasMore && shown >= total) return null;

  return (
    <View onLayout={handleLayout} style={{ alignItems: 'center', paddingVertical: spacing(6), gap: spacing(3) }}>
      {loading && hasMore ? (
        <>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[typography.caption, { color: colors.textMuted }]}>{t('Loading more…')}</Text>
        </>
      ) : !hasMore ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), width: '100%' }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
          <Text style={[typography.caption, { color: colors.textMuted }]}>{t('All {{total}} loaded', { total })}</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
        </View>
      ) : null}
    </View>
  );
}

/** Simpler load-more footer for the mobile drill-down course list, where we
 *  may or may not know the total (count aggregation is best-effort). Shown
 *  under a scrollable list rather than relying on onLayout auto-trigger, so
 *  it works reliably inside the ScrollView-based mobile screen. */
function MobileLoadMoreFooter({
  onPress, loading, hasMore, total, shown,
}: {
  onPress: () => void; loading: boolean; hasMore: boolean; total: number | null; shown: number;
}) {
  const colors    = useTheme();
  const elevation = useElevation('sm');
  const { t } = useLanguage();

  if (!hasMore) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(6) }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {total != null ? t('All {{total}} courses loaded', { total }) : t('{{shown}} courses loaded', { shown })}
        </Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={({ pressed }) => ([
        {
          marginTop: spacing(2),
          marginBottom: spacing(6),
          paddingVertical: spacing(4),
          backgroundColor: colors.surfaceAlt,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          justifyContent: 'center' as const,
          gap: spacing(2),
          opacity: pressed ? 0.85 : 1,
        },
        elevation,
      ])}
    >
      {loading ? (
        <>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary }]}>{t('Loading more…')}</Text>
        </>
      ) : (
        <>
          <Ionicons name="chevron-down" size={16} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary }]}>
            {t('Load More')}{total != null ? ` (${t('{{count}} remaining', { count: Math.max(total - shown, 0) })})` : ''}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CourseCard — memoized. It receives a stable `onPress(id)` callback from the
// parent rather than a fresh inline arrow function per render, so React.memo
// can actually skip re-rendering cards whose underlying course object
// reference hasn't changed.
// ─────────────────────────────────────────────────────────────────────────────
const CourseCard = memo(function CourseCard({
  course, onPress,
}: { course: Course; onPress: (id: string) => void }) {
  const colors    = useTheme();
  const { t } = useLanguage();
  const elevation = useElevation('md');
  const scale     = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, damping: 14 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, damping: 14 }).start();

  const typeColor =
    course.institutionType === 'university' ? '#60A5FA'
    : course.institutionType === 'college'  ? '#34D399'
    :                                         '#FBBF24';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => onPress(course.id)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${t('View details')}: ${course.title}`}
        style={[{ width: '100%', backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: spacing(5), overflow: 'hidden' as const }, elevation]}
      >
        <View style={{ height: 3, backgroundColor: typeColor, borderRadius: 2, marginBottom: spacing(4) }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: `${typeColor}1A`, borderWidth: 1, borderColor: `${typeColor}33` }}>
            <Text style={[typography.label, { color: typeColor }]}>{course.institutionBadge}</Text>
          </View>
          <View style={{ width: 32, height: 32, borderRadius: radii.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="chevron-forward" size={15} color={colors.textMuted} />
          </View>
        </View>
        <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(4) }]} numberOfLines={2}>{course.title}</Text>
        <Text style={[typography.caption, { color: typeColor, marginTop: spacing(2), fontWeight: '600' }]}>{course.facultyName}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(3) }}>
          {[
            { icon: 'school-outline'   as const, text: course.qualificationLevel },
            { icon: 'time-outline'     as const, text: course.duration           },
            { icon: 'star-outline'     as const, text: `${course.requiredPoints} ${t('pts')}` },
            { icon: 'location-outline' as const, text: course.location           },
          ].map((m, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingHorizontal: spacing(2), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name={m.icon} size={11} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>{m.text}</Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: spacing(4), paddingTop: spacing(3), borderTopWidth: 1, borderTopColor: colors.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[typography.label, { color: colors.primary }]}>{t('View details')}</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.primary} />
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// FacultyChip
// ─────────────────────────────────────────────────────────────────────────────
function FacultyChip({ name, isActive, onPress }: { name: string; isActive: boolean; onPress: () => void }) {
  const colors = useTheme();
  const { t } = useLanguage();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      style={({ pressed }) => ({ paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: isActive ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: isActive ? colors.primary : colors.border, opacity: pressed ? 0.9 : 1 })}
    >
      <Text style={[typography.label, { color: isActive ? '#fff' : colors.textPrimary }]}>{name}</Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatPill
// ─────────────────────────────────────────────────────────────────────────────
function StatPill({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const colors    = useTheme();
  const elevation = useElevation('sm');
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingHorizontal: spacing(4), paddingVertical: spacing(3), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, marginTop: spacing(3) }, elevation]}>
      <View style={{ width: 36, height: 36, borderRadius: radii.md, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
  {label}
</Text>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: 2 }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: header row with a back control + breadcrumb, used across every
// step of the mobile flow so navigation always looks and behaves the same.
// ─────────────────────────────────────────────────────────────────────────────
function StepHeader({
  onBack, crumbs,
}: {
  onBack: () => void;
  crumbs: string[];
}) {
  const colors = useTheme();
  const { t } = useLanguage();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(6) }}>
      <Pressable
        onPress={onBack}
        accessibilityRole="button"
        accessibilityLabel={t('Go Back')}
        style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}
      >
        <Ionicons name="arrow-back" size={15} color={colors.primary} />
        <Text style={[typography.label, { color: colors.primary, fontSize: 12 }]}>{t('Back')}</Text>
      </Pressable>
      <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11, flex: 1 }]} numberOfLines={1}>
        {crumbs.join(' › ')}
      </Text>
    </View>
  );
}

/** Generic error card reused across every step of the mobile flow. */
function InlineErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const colors    = useTheme();
  const { t } = useLanguage();
  const elevation = useElevation('sm');
  return (
    <View style={[{ alignItems: 'center', padding: spacing(8), backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: `${colors.danger}33` }, elevation]}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: `${colors.danger}18`, borderWidth: 1, borderColor: `${colors.danger}33`, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(4) }}>
        <Ionicons name="cloud-offline-outline" size={24} color={colors.danger} />
      </View>
      <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center', fontSize: 16 }]}>{t('Something went wrong')}</Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), textAlign: 'center', fontSize: 13, lineHeight: 19 }]}>
        {message}
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        style={({ pressed }) => ({ marginTop: spacing(5), flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(5), paddingVertical: spacing(3), borderRadius: radii.lg, backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 })}
      >
        <Ionicons name="refresh-outline" size={15} color="#fff" />
        <Text style={[typography.label, { color: '#fff' }]}>{t('Try Again')}</Text>
      </Pressable>
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MOBILE FLOW — Type → Institutions → Faculties → Courses
//
// Design goal: never load the full courses collection on a phone. The
// institutions collection is fetched once, in full (it's small — a fixed
// list of Botswana institutions, not thousands of rows), which is enough to
// power the type-selection counts and the institution list entirely from
// memory with zero extra network calls. Courses, the genuinely large
// collection, are only ever queried scoped to one institution (optionally
// one faculty), paginated MOBILE_COURSES_PAGE_SIZE at a time.
// ═════════════════════════════════════════════════════════════════════════════
type MobileStep = 'type' | 'institutions' | 'faculties' | 'courses';

function MobileCoursesView() {
  const colors    = useTheme();
  const { t } = useLanguage();
  const elevation = useElevation('md');

  const [step, setStep] = useState<MobileStep>('type');

  // ── Institutions (fetched once, in full) ─────────────────────────────────
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [instStatus,   setInstStatus]   = useState<FetchStatus>('idle');
  const [instErrorMsg, setInstErrorMsg] = useState('');

  const loadInstitutions = useCallback(async () => {
    setInstStatus('loading');
    setInstErrorMsg('');
    try {
      const snap = await safeDocs(collection(db, 'institutions'));
      setInstitutions(mapInstitutionDocs(snap.docs));
      setInstStatus('success');
    } catch (err: unknown) {
      console.error('[MobileCourses] institutions fetch failed:', err);
      setInstErrorMsg(getFriendlyErrorMessage(err, t));
      setInstStatus('error');
    }
  }, [t]);

  useEffect(() => { loadInstitutions(); }, [loadInstitutions]);

  const typeCounts = useMemo(() => {
    const counts: Record<InstitutionType, number> = { university: 0, college: 0, brigade: 0 };
    institutions.forEach((inst) => { counts[inst.type] = (counts[inst.type] ?? 0) + 1; });
    return counts;
  }, [institutions]);

  // ── Step 2: institutions of the selected type ────────────────────────────
  const [selectedType, setSelectedType] = useState<InstitutionType | null>(null);
  const [instSearch,   setInstSearch]   = useState('');

  const institutionsForType = useMemo(() => {
    if (!selectedType) return [];
    let list = institutions.filter((i) => i.type === selectedType);
    const q = instSearch.trim().toLowerCase();
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q) || i.location.toLowerCase().includes(q));
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [institutions, selectedType, instSearch]);

  // ── Step 3: faculties of the selected institution ────────────────────────
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [faculties,   setFaculties]   = useState<Faculty[]>([]);
  const [facStatus,   setFacStatus]   = useState<FetchStatus>('idle');
  const [facErrorMsg, setFacErrorMsg] = useState('');

  const loadFaculties = useCallback(async (institution: Institution) => {
    setFacStatus('loading');
    setFacErrorMsg('');
    try {
      const q = query(
        collection(db, 'faculties'),
        where('institutionId', '==', institution.id),
        limit(CONFIG.MOBILE_FACULTIES_LIMIT),
      );
      const snap = await safeDocs(q);
      const list = snap.docs
        .map((doc) => {
          const d = doc.data();
          return { id: doc.id, name: d.name ?? 'Unknown Faculty', institutionId: institution.id };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      setFaculties(list);
      setFacStatus('success');
    } catch (err: unknown) {
      console.error('[MobileCourses] faculties fetch failed:', err);
      setFacErrorMsg(getFriendlyErrorMessage(err, t));
      setFacStatus('error');
    }
  }, []);

  // ── Step 4: courses scoped to institution (+ optional faculty), paginated
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | 'ALL' | null>(null);
  const [courses,          setCourses]          = useState<Course[]>([]);
  const [courseCursor,     setCourseCursor]     = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [courseHasMore,    setCourseHasMore]    = useState(true);
  const [courseStatus,     setCourseStatus]     = useState<FetchStatus>('idle');
  const [courseErrorMsg,   setCourseErrorMsg]   = useState('');
  const [courseLoadingMore, setCourseLoadingMore] = useState(false);
  const [courseTotal,      setCourseTotal]      = useState<number | null>(null);
  const [courseSearch,     setCourseSearch]     = useState('');

  const buildCourseConstraints = useCallback((institution: Institution, faculty: Faculty | 'ALL' | null): QueryConstraint[] => {
    const constraints: QueryConstraint[] = [where('institutionId', '==', institution.id)];
    if (faculty && faculty !== 'ALL') constraints.push(where('facultyId', '==', faculty.id));
    return constraints;
  }, []);

  const loadFirstCoursePage = useCallback(async (institution: Institution, faculty: Faculty | 'ALL' | null) => {
    setCourseStatus('loading');
    setCourseErrorMsg('');
    setCourses([]);
    setCourseCursor(null);
    setCourseHasMore(true);
    setCourseTotal(null);

    const baseConstraints = buildCourseConstraints(institution, faculty);
    const facultyName = faculty && faculty !== 'ALL' ? faculty.name : undefined;

    try {
      const snap = await safeDocs(
        query(collection(db, 'courses'), ...baseConstraints, limit(CONFIG.MOBILE_COURSES_PAGE_SIZE)),
      );
      const mapped = mapScopedCourseDocs(snap.docs, institution, facultyName);
      setCourses(mapped);
      setCourseCursor(snap.docs[snap.docs.length - 1] ?? null);
      setCourseHasMore(snap.docs.length === CONFIG.MOBILE_COURSES_PAGE_SIZE);
      setCourseStatus('success');

      // Best-effort total count for a nicer "X of Y" readout — never blocks
      // or fails the actual course list if it doesn't work.
      const total = await safeCount(query(collection(db, 'courses'), ...baseConstraints));
      setCourseTotal(total);
    } catch (err: unknown) {
      console.error('[MobileCourses] course page fetch failed:', err);
      setCourseErrorMsg(getFriendlyErrorMessage(err, t));
      setCourseStatus('error');
    }
  }, [buildCourseConstraints, t]);

  const loadMoreCourses = useCallback(async () => {
    if (!selectedInstitution || !courseHasMore || courseLoadingMore || !courseCursor) return;
    setCourseLoadingMore(true);
    const baseConstraints = buildCourseConstraints(selectedInstitution, selectedFaculty);
    const facultyName = selectedFaculty && selectedFaculty !== 'ALL' ? selectedFaculty.name : undefined;

    try {
      const snap = await safeDocs(
        query(collection(db, 'courses'), ...baseConstraints, startAfter(courseCursor), limit(CONFIG.MOBILE_COURSES_PAGE_SIZE)),
      );
      const mapped = mapScopedCourseDocs(snap.docs, selectedInstitution, facultyName);
      setCourses((prev) => [...prev, ...mapped]);
      setCourseCursor(snap.docs[snap.docs.length - 1] ?? courseCursor);
      setCourseHasMore(snap.docs.length === CONFIG.MOBILE_COURSES_PAGE_SIZE);
    } catch (err: unknown) {
      console.error('[MobileCourses] load more courses failed:', err);
      // Non-fatal: the list the user already has keeps working. Surface a
      // one-line notice without wiping existing results.
      setCourseErrorMsg(t('Could not load more courses. Please try again.'));
    } finally {
      setCourseLoadingMore(false);
    }
  }, [selectedInstitution, selectedFaculty, courseCursor, courseHasMore, courseLoadingMore, buildCourseConstraints, t]);

  const visibleCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => c.title.toLowerCase().includes(q) || c.facultyName.toLowerCase().includes(q));
  }, [courses, courseSearch]);

  // ── Navigation between steps ──────────────────────────────────────────────
  const handleSelectType = useCallback((type: InstitutionType) => {
    setSelectedType(type);
    setInstSearch('');
    setStep('institutions');
  }, []);

  const handleSelectInstitution = useCallback((institution: Institution) => {
    setSelectedInstitution(institution);
    setSelectedFaculty(null);
    setStep('faculties');
    loadFaculties(institution);
  }, [loadFaculties]);

  const handleSelectFaculty = useCallback((faculty: Faculty | 'ALL') => {
    if (!selectedInstitution) return;
    setSelectedFaculty(faculty);
    setStep('courses');
    loadFirstCoursePage(selectedInstitution, faculty);
  }, [selectedInstitution, loadFirstCoursePage]);

  const goBackAStep = useCallback(() => {
    if (step === 'courses') {
      setStep('faculties');
      setSelectedFaculty(null);
      setCourseSearch('');
    } else if (step === 'faculties') {
      setStep('institutions');
      setSelectedInstitution(null);
      setFaculties([]);
    } else if (step === 'institutions') {
      setStep('type');
      setSelectedType(null);
      setInstSearch('');
    } else {
      router.back();
    }
  }, [step]);

  const handleOpenCourse = useCallback((id: string) => {
    router.push({ pathname: '/student/course-details', params: { id } });
  }, []);

  const subtitle =
    step === 'type'         ? t('Choose where you’d like to look') :
    step === 'institutions' ? `${t('Browsing')} ${selectedType ? t(TYPE_META[selectedType].labelKey).toLowerCase() : ''}` :
    step === 'faculties'    ? selectedInstitution?.name ?? t('Choose a faculty') :
    selectedFaculty === 'ALL' ? `${t('All courses at')} ${selectedInstitution?.name ?? ''}` :
    selectedFaculty ? `${selectedFaculty.name} ${t('at')} ${selectedInstitution?.name ?? ''}` : t('Courses');

  return (
    <DashboardLayout title={t('Courses')} subtitle={subtitle} showPointsCard={false}>

      {/* ══ STEP 1 — What are you looking for? ══ */}
      {step === 'type' && (
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(6) }}>
            <Pressable
              onPress={() => router.back()}
              accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}
            >
              <Ionicons name="arrow-back" size={15} color={colors.primary} />
              <Text style={[typography.label, { color: colors.primary, fontSize: 12 }]}>{t('Back')}</Text>
            </Pressable>
            <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>{t('Dashboard › Courses')}</Text>
          </View>

          {/* Hero */}
          <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: spacing(5), marginBottom: spacing(6), overflow: 'hidden' }, elevation]}>
            <View style={{ height: 3, backgroundColor: colors.primary, borderRadius: 2, marginBottom: spacing(4) }} />
            <Text style={[typography.hero, { color: colors.textPrimary, fontSize: 22 }]}>{t('Find Your Program')}</Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), fontSize: 13.5, lineHeight: 20 }]}>
              {t("Let's narrow things down. Start by choosing the type of institution you're interested in.")}
            </Text>
          </View>

          {instStatus === 'error' ? (
            <InlineErrorState message={instErrorMsg} onRetry={loadInstitutions} />
          ) : (
            <View style={{ gap: spacing(4) }}>
              {(Object.keys(TYPE_META) as InstitutionType[]).map((type) => {
                const meta  = TYPE_META[type];
                const count = typeCounts[type];
                return (
                  <Pressable
                    key={type}
                    onPress={() => handleSelectType(type)}
                    disabled={instStatus === 'loading'}
                    accessibilityRole="button"
                    accessibilityLabel={`${t('Browse')} ${t(meta.labelKey)}`}
                    style={({ pressed }) => ([
                      {
                        flexDirection: 'row' as const,
                        alignItems: 'center' as const,
                        gap: spacing(4),
                        backgroundColor: colors.surface,
                        borderRadius: radii.xxl,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: spacing(5),
                        opacity: pressed ? 0.9 : 1,
                      },
                      elevation,
                    ])}
                  >
                    <View style={{ width: 52, height: 52, borderRadius: radii.xl, backgroundColor: `${meta.color}1E`, borderWidth: 1, borderColor: `${meta.color}44`, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name={meta.icon} size={24} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.h2, { color: colors.textPrimary, fontSize: 16 }]}>{t(meta.labelKey)}</Text>
                      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2, fontSize: 12, lineHeight: 16 }]} numberOfLines={2}>
                        {t(meta.blurbKey)}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1), marginTop: spacing(2) }}>
                        {instStatus === 'loading' ? (
                          <SkeletonPulse width={70} height={18} />
                        ) : (
                          <View style={{ paddingHorizontal: spacing(2), paddingVertical: 2, borderRadius: radii.pill, backgroundColor: `${meta.color}18`, borderWidth: 1, borderColor: `${meta.color}33` }}>
                            <Text style={[typography.caption, { color: meta.color, fontWeight: '700', fontSize: 10.5 }]}>
                              {count} {count === 1 ? t(meta.singularKey) : t(meta.labelKey).toLowerCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* ══ STEP 2 — Institutions of the selected type ══ */}
      {step === 'institutions' && selectedType && (
        <View>
          <StepHeader onBack={goBackAStep} crumbs={[t('Courses'), t(TYPE_META[selectedType].labelKey)]} />

          <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing(4), minHeight: 48, marginBottom: spacing(5) }, elevation]}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              value={instSearch}
              onChangeText={setInstSearch}
              placeholder={`${t('Search')} ${t(TYPE_META[selectedType].labelKey).toLowerCase()}…`}
              placeholderTextColor={colors.textMuted}
              style={[typography.body, { flex: 1, marginLeft: spacing(3), paddingVertical: spacing(3), color: colors.textPrimary, fontSize: 14 }]}
              returnKeyType="search"
            />
            {instSearch.length > 0 && (
              <Pressable onPress={() => setInstSearch('')} accessibilityRole="button" accessibilityLabel={t('Clear Search')} style={{ padding: spacing(2) }}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(4), fontSize: 10.5 }]}>
            {institutionsForType.length} {institutionsForType.length === 1 ? t('RESULT') : t('RESULTS')}
          </Text>

          {institutionsForType.length === 0 ? (
            <View style={[{ alignItems: 'center', padding: spacing(8), backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border }, elevation]}>
              <Ionicons name="business-outline" size={26} color={colors.textMuted} />
              <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(3), fontSize: 15, textAlign: 'center' }]}>{t('No matches')}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing(1), textAlign: 'center' }]}>
                Try a different search term.
              </Text>
            </View>
          ) : (
            institutionsForType.map((inst) => (
              <Pressable
                key={inst.id}
                onPress={() => handleSelectInstitution(inst)}
                accessibilityRole="button"
                accessibilityLabel={`${t('View faculties at')} ${inst.name}`}
                style={({ pressed }) => ([
                  {
                    flexDirection: 'row' as const,
                    alignItems: 'center' as const,
                    gap: spacing(3),
                    backgroundColor: colors.surface,
                    borderRadius: radii.xl,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: spacing(4),
                    marginBottom: spacing(3),
                    opacity: pressed ? 0.9 : 1,
                  },
                  elevation,
                ])}
              >
                <View style={{ width: 44, height: 44, borderRadius: radii.lg, backgroundColor: `${colors.primary}18`, borderWidth: 1, borderColor: `${colors.primary}33`, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={[typography.label, { color: colors.primary, fontSize: 10.5 }]} numberOfLines={1}>{inst.badge}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 14 }]} numberOfLines={1}>{inst.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1), marginTop: 2 }}>
                    <Ionicons name="location-outline" size={11} color={colors.textMuted} />
                    <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]} numberOfLines={1}>{inst.location}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
              </Pressable>
            ))
          )}
        </View>
      )}

      {/* ══ STEP 3 — Faculties of the selected institution ══ */}
      {step === 'faculties' && selectedType && selectedInstitution && (
        <View>
          <StepHeader onBack={goBackAStep} crumbs={[t('Courses'), t(TYPE_META[selectedType].labelKey), selectedInstitution.name]} />

          <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: spacing(5), marginBottom: spacing(6), flexDirection: 'row', alignItems: 'center', gap: spacing(4) }, elevation]}>
            <View style={{ width: 48, height: 48, borderRadius: radii.lg, backgroundColor: `${colors.primary}18`, borderWidth: 1, borderColor: `${colors.primary}33`, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[typography.label, { color: colors.primary, fontSize: 11 }]} numberOfLines={1}>{selectedInstitution.badge}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[typography.h2, { color: colors.textPrimary, fontSize: 16 }]} numberOfLines={2}>{selectedInstitution.name}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2, fontSize: 11.5 }]}>{selectedInstitution.location}</Text>
            </View>
          </View>

          <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(4), fontSize: 10.5 }]}>
            CHOOSE A FACULTY
          </Text>

          {facStatus === 'loading' && (
            <View>
              <SkeletonRow /><SkeletonRow /><SkeletonRow />
            </View>
          )}

          {facStatus === 'error' && (
            <InlineErrorState message={facErrorMsg} onRetry={() => loadFaculties(selectedInstitution)} />
          )}

          {facStatus === 'success' && (
            <View>
              {/* Pinned "All Faculties" option — always available so the
                  user is never blocked from browsing every course at this
                  institution, even if faculties haven't been catalogued. */}
              <Pressable
                onPress={() => handleSelectFaculty('ALL')}
                accessibilityRole="button"
                style={({ pressed }) => ([
                  { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(3), backgroundColor: `${colors.primary}0F`, borderRadius: radii.xl, borderWidth: 1, borderColor: `${colors.primary}44`, padding: spacing(4), marginBottom: spacing(3), opacity: pressed ? 0.9 : 1 },
                  elevation,
                ])}
              >
                <View style={{ width: 40, height: 40, borderRadius: radii.lg, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="apps-outline" size={19} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[typography.bodyStrong, { color: colors.primary, fontSize: 14 }]}>{t('All Faculties')}</Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11, marginTop: 1 }]}>{t('Browse every course at this institution')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={17} color={colors.primary} />
              </Pressable>

              {faculties.length === 0 ? (
                <View style={[{ alignItems: 'center', padding: spacing(6), backgroundColor: colors.surfaceAlt, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, marginTop: spacing(2) }]}>
                  <Ionicons name="library-outline" size={22} color={colors.textMuted} />
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing(2), textAlign: 'center', fontSize: 12 }]}>
                    {t('No individual faculties listed yet for this institution — tap "All Faculties" above to see its courses.')}
                  </Text>
                </View>
              ) : (
                faculties.map((fac) => (
                  <Pressable
                    key={fac.id}
                    onPress={() => handleSelectFaculty(fac)}
                    accessibilityRole="button"
                    style={({ pressed }) => ([
                      { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(3), backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, padding: spacing(4), marginBottom: spacing(3), opacity: pressed ? 0.9 : 1 },
                      elevation,
                    ])}
                  >
                    <View style={{ width: 40, height: 40, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="library-outline" size={18} color={colors.textSecondary} />
                    </View>
                    <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 14, flex: 1 }]} numberOfLines={2}>{fac.name}</Text>
                    <Ionicons name="chevron-forward" size={17} color={colors.textMuted} />
                  </Pressable>
                ))
              )}
            </View>
          )}
        </View>
      )}

      {/* ══ STEP 4 — Courses, paginated ══ */}
      {step === 'courses' && selectedType && selectedInstitution && (
        <View>
          <StepHeader
            onBack={goBackAStep}
            crumbs={[
              t(TYPE_META[selectedType].labelKey),
              selectedInstitution.name,
              selectedFaculty === 'ALL' ? t('All Faculties') : selectedFaculty?.name ?? '',
            ]}
          />

          {/* Search within this scope */}
          <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing(4), minHeight: 48, marginBottom: spacing(5) }, elevation]}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              value={courseSearch}
              onChangeText={setCourseSearch}
              placeholder={t('Search loaded courses…')}
              placeholderTextColor={colors.textMuted}
              style={[typography.body, { flex: 1, marginLeft: spacing(3), paddingVertical: spacing(3), color: colors.textPrimary, fontSize: 14 }]}
              returnKeyType="search"
            />
            {courseSearch.length > 0 && (
              <Pressable onPress={() => setCourseSearch('')} accessibilityRole="button" accessibilityLabel={t('Clear Search')} style={{ padding: spacing(2) }}>
                <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {courseStatus === 'loading' && (
            <View>
              <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(4), fontSize: 10.5 }]}>{t('LOADING COURSES…')}</Text>
              <SkeletonGrid count={4} numCols={1} cardGap={spacing(4)} />
            </View>
          )}

          {courseStatus === 'error' && (
            <InlineErrorState
              message={courseErrorMsg}
              onRetry={() => loadFirstCoursePage(selectedInstitution, selectedFaculty)}
            />
          )}

          {courseStatus === 'success' && (
            <View>
              <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(4), fontSize: 10.5 }]}>
                {courseTotal != null
                  ? `SHOWING ${visibleCourses.length} OF ${courseTotal} COURSE${courseTotal === 1 ? '' : 'S'}`
                  : `${visibleCourses.length} COURSE${visibleCourses.length === 1 ? '' : 'S'} LOADED`}
              </Text>

              {visibleCourses.length === 0 ? (
                <View style={[{ alignItems: 'center', padding: spacing(8), backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border }, elevation]}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(4) }}>
                    <Ionicons name="book-outline" size={24} color={colors.primary} />
                  </View>
                  <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center', fontSize: 15 }]}>
                    {courseSearch ? 'No matches in loaded courses' : 'No courses found'}
                  </Text>
                  <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing(2), textAlign: 'center' }]}>
                    {courseSearch
                      ? 'Try clearing your search, or load more courses below.'
                      : 'This faculty doesn\u2019t have any courses listed yet.'}
                  </Text>
                </View>
              ) : (
                <View style={{ gap: spacing(4) }}>
                  {visibleCourses.map((course) => (
                    <CourseCard key={course.id} course={course} onPress={handleOpenCourse} />
                  ))}
                </View>
              )}

              {/* Pagination — only relevant when not actively text-searching
                  the already-loaded set, since search filters client-side. */}
              {!courseSearch && (
                <MobileLoadMoreFooter
                  onPress={loadMoreCourses}
                  loading={courseLoadingMore}
                  hasMore={courseHasMore}
                  total={courseTotal}
                  shown={courses.length}
                />
              )}
            </View>
          )}
        </View>
      )}

      {/* Shared responsive student footer */}
      <StudentFooter
        topSpacing={spacing(8)}
        maxWidth={1280}
      />
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DesktopCoursesView — tablet + desktop. Unchanged from the original
// single-page filter/search experience: fetch a fast first page of courses,
// hydrate the rest of the catalogue in the background, filter/search/paginate
// entirely client-side. This is intentionally left as-is; only the mobile
// experience (< 768px) was replaced with the guided drill-down above.
// ─────────────────────────────────────────────────────────────────────────────
function DesktopCoursesView() {
  const { width } = useWindowDimensions();
  const { t } = useLanguage();
  const colors    = useTheme();
  const elevation = useElevation('md');

  const breakpoint = useMemo<Breakpoint>(
    () => (width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop'),
    [width],
  );
  const isDesktop = breakpoint === 'desktop';
  const isMobile  = breakpoint === 'mobile'; // retained for parity; this view only mounts for >= 768

  const PAGE_SIZE = isMobile ? 20 : 12;
  const SKELETON_COUNT = isMobile ? 6 : 8;

  const [search,            setSearch]           = useState('');
  const [debouncedSearch,   setDebouncedSearch]   = useState('');
  const [typeFilter,        setTypeFilter]        = useState<'All' | InstitutionType>('All');
  const [selectedInstId,    setSelectedInstId]    = useState<string | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [page,              setPage]              = useState(1);
  const [loadingMore,       setLoadingMore]       = useState(false);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [faculties,    setFaculties]    = useState<Faculty[]>([]);
  const [allCourses,   setAllCourses]   = useState<Course[]>([]);
  const [status,       setStatus]       = useState<FetchStatus>('idle');
  const [errorMsg,     setErrorMsg]     = useState('');

  const [hydrating,           setHydrating]           = useState(false);
  const [hydrationIncomplete, setHydrationIncomplete] = useState(false);

  const mountedRef = useRef(true);
  const bgTokenRef  = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), CONFIG.SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const hydrateRemainingCourses = useCallback(async (
    token: number,
    initialCursor: QueryDocumentSnapshot<DocumentData>,
    instById: Map<string, Institution>,
  ) => {
    if (!mountedRef.current || bgTokenRef.current !== token) return;
    setHydrating(true);
    let cursor = initialCursor;

    try {
      while (mountedRef.current && bgTokenRef.current === token) {
        const snap = await safeDocs(
          query(collection(db, 'courses'), startAfter(cursor), limit(CONFIG.BACKGROUND_COURSE_BATCH)),
        );
        if (!mountedRef.current || bgTokenRef.current !== token) return;
        if (snap.docs.length === 0) break;

        const nextBatch = mapCourseDocs(snap.docs, instById);
        setAllCourses((prev) => {
          const merged = [...prev, ...nextBatch];
          merged.sort((a, b) => a.title.localeCompare(b.title));
          return merged;
        });

        cursor = snap.docs[snap.docs.length - 1];
        if (snap.docs.length < CONFIG.BACKGROUND_COURSE_BATCH) break;
      }
    } catch (err: unknown) {
      console.error('[Courses] background hydration failed:', err);
      if (mountedRef.current && bgTokenRef.current === token) setHydrationIncomplete(true);
    } finally {
      if (mountedRef.current && bgTokenRef.current === token) setHydrating(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!mountedRef.current) return;
    setStatus('loading');
    setErrorMsg('');
    setHydrating(false);
    setHydrationIncomplete(false);
    const myToken = ++bgTokenRef.current;

    try {
      const [instSnap, firstCourseSnap] = await Promise.all([
        safeDocs(collection(db, 'institutions')),
        safeDocs(query(collection(db, 'courses'), limit(CONFIG.INITIAL_COURSE_BATCH))),
      ]);

      if (!mountedRef.current) return;

      const instList = mapInstitutionDocs(instSnap.docs);
      const instById = new Map(instList.map((i) => [i.id, i] as const));
      const firstCourses = mapCourseDocs(firstCourseSnap.docs, instById)
        .sort((a, b) => a.title.localeCompare(b.title));

      setInstitutions(instList);
      setAllCourses(firstCourses);
      setPage(1);
      setStatus('success');

      const mayHaveMore = firstCourseSnap.docs.length === CONFIG.INITIAL_COURSE_BATCH;
      if (mayHaveMore) {
        hydrateRemainingCourses(
          myToken,
          firstCourseSnap.docs[firstCourseSnap.docs.length - 1],
          instById,
        );
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      console.error('[Courses] loadData failed:', err);
      setErrorMsg(getFriendlyErrorMessage(err, t));
      setStatus('error');
    }
  }, [hydrateRemainingCourses]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    if (!selectedInstId) { setFaculties([]); setSelectedFacultyId(null); return; }
    let active = true;
    (async () => {
      try {
        const q    = query(collection(db, 'faculties'), where('institutionId', '==', selectedInstId));
        const snap = await safeDocs(q);
        if (!active) return;
        setFaculties(
          snap.docs
            .map((doc) => { const d = doc.data(); return { id: doc.id, name: d.name ?? 'Unknown Faculty', institutionId: selectedInstId }; })
            .sort((a, b) => a.name.localeCompare(b.name)),
        );
      } catch (err: unknown) { console.error('[Courses] faculties fetch failed:', err); }
    })();
    return () => { active = false; };
  }, [selectedInstId]);

  const filteredInstitutions = useMemo(() => {
    if (typeFilter === 'All') return institutions;
    return institutions.filter((i) => i.type === typeFilter);
  }, [institutions, typeFilter]);

  const filteredCourses = useMemo(() => {
    let list = allCourses;
    if (typeFilter !== 'All')  list = list.filter((c) => c.institutionType === typeFilter);
    if (selectedInstId)        list = list.filter((c) => c.institutionId   === selectedInstId);
    if (selectedFacultyId)     list = list.filter((c) => c.facultyId       === selectedFacultyId);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.institutionName.toLowerCase().includes(q) ||
        c.facultyName.toLowerCase().includes(q),
      );
    }
    return list;
  }, [allCourses, typeFilter, selectedInstId, selectedFacultyId, debouncedSearch]);

  const paginatedCourses = useMemo(
    () => filteredCourses.slice(0, page * PAGE_SIZE),
    [filteredCourses, page, PAGE_SIZE],
  );

  const hasMore = paginatedCourses.length < filteredCourses.length;
  const isSearchPending = search !== debouncedSearch;

  useEffect(() => { setPage(1); }, [typeFilter, selectedInstId, selectedFacultyId, debouncedSearch]);

  const loadNextPage = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setTimeout(() => { setPage((p) => p + 1); setLoadingMore(false); }, CONFIG.LOAD_MORE_DELAY_MS);
  }, [hasMore, loadingMore]);

  const clearFilters = useCallback(() => {
    setSearch(''); setTypeFilter('All'); setSelectedInstId(null); setSelectedFacultyId(null); setPage(1);
  }, []);

  const handleOpenCourse = useCallback((id: string) => {
    router.push({ pathname: '/student/course-details', params: { id } });
  }, []);

  const numCols          = isMobile ? 1 : 2;
  const cardWrapperWidth = numCols === 1 ? '100%' : '50%';
  const cardGap          = spacing(4);

  return (
    <DashboardLayout title={t('Courses')} subtitle={t('Explore programs across Botswana')} showPointsCard={false}>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(6) }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}
        >
          <Ionicons name="arrow-back" size={17} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary }]}>{t('Back')}</Text>
        </Pressable>
        <Text style={[typography.caption, { color: colors.textMuted }]}>{t('Dashboard › Courses')}</Text>
      </View>

      {(status === 'idle' || status === 'loading') && (
        <View>
          <SlowConnectionBanner />

          <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: isMobile ? spacing(5) : spacing(7), marginBottom: spacing(6), overflow: 'hidden', gap: spacing(3) }, elevation]}>
            <SkeletonPulse width="100%" height={3} />
            <SkeletonPulse width="55%" height={28} />
            <SkeletonPulse width="85%" height={16} />
            <View style={{ flexDirection: 'row', gap: spacing(3) }}>
              <SkeletonPulse width={90}  height={22} />
              <SkeletonPulse width={110} height={22} />
              <SkeletonPulse width={90}  height={22} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing(2), marginBottom: spacing(5) }}>
            {[80, 100, 80, 80].map((w, i) => <SkeletonPulse key={i} width={w} height={34} />)}
          </View>

          <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(4) }]}>
            LOADING COURSES…
          </Text>
          <SkeletonGrid count={SKELETON_COUNT} numCols={numCols} cardGap={cardGap} />
        </View>
      )}

      {status === 'error' && (
        <View style={[{ alignItems: 'center', padding: spacing(10), backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: `${colors.danger}33`, marginTop: spacing(4) }, elevation]}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: `${colors.danger}18`, borderWidth: 1, borderColor: `${colors.danger}33`, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(5) }}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
          </View>
          <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>{t('Connection problem')}</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), textAlign: 'center', maxWidth: 320, lineHeight: 22 }]}>
            {errorMsg}
          </Text>
          <Pressable
            onPress={loadData}
            accessibilityRole="button"
            style={({ pressed }) => ({ marginTop: spacing(6), flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(6), paddingVertical: spacing(4), borderRadius: radii.lg, backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 })}
          >
            <Ionicons name="refresh-outline" size={17} color="#fff" />
            <Text style={[typography.label, { color: '#fff', letterSpacing: 0.4 }]}>{t('TRY AGAIN')}</Text>
          </Pressable>
        </View>
      )}

      {status === 'success' && (
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing(8), alignItems: 'flex-start' }}>

          <View style={{ flex: 1, minWidth: 0, width: '100%' }}>

            <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: isMobile ? spacing(5) : spacing(7), marginBottom: spacing(6), overflow: 'hidden' }, elevation]}>
              <View style={{ height: 3, backgroundColor: colors.primary, borderRadius: 2, marginBottom: spacing(4) }} />
              <Text style={[typography.hero, { color: colors.textPrimary }]}>{t('Find Your Program')}</Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2) }]}>
                {t('Filter by type, institution, and faculty to find the right course.')}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing(3), marginTop: spacing(4), flexWrap: 'wrap' }}>
                {[
                  { label: `${allCourses.length} ${t('total')}`,         color: colors.primary },
                  { label: `${institutions.length} ${t('institutions')}`, color: colors.success },
                  { label: `${filteredCourses.length} ${t('matching')}`,  color: colors.warning },
                ].map((chip) => (
                  <View key={chip.label} style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: `${chip.color}18`, borderWidth: 1, borderColor: `${chip.color}33` }}>
                    <Text style={[typography.caption, { color: chip.color, fontWeight: '700' }]}>{chip.label}</Text>
                  </View>
                ))}
                {hydrating && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: `${colors.textMuted}18`, borderWidth: 1, borderColor: `${colors.textMuted}33` }}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700' }]}>{t('Syncing full catalogue…')}</Text>
                  </View>
                )}
                {!hydrating && hydrationIncomplete && (
                  <Pressable
                    onPress={loadData}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: `${colors.danger}18`, borderWidth: 1, borderColor: `${colors.danger}33`, opacity: pressed ? 0.85 : 1 })}
                  >
                    <Ionicons name="alert-circle-outline" size={13} color={colors.danger} />
                    <Text style={[typography.caption, { color: colors.danger, fontWeight: '700' }]}>{t('Some courses may be missing — tap to retry')}</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {isMobile && filteredCourses.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing(1), marginBottom: spacing(4) }}>
                <Text style={[typography.caption, { color: colors.textMuted, marginRight: spacing(3) }]}>
                  {paginatedCourses.length} / {filteredCourses.length}
                </Text>
                <View style={{ flex: 1, height: 3, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' }}>
                  <View style={{ height: '100%', width: `${Math.round((paginatedCourses.length / filteredCourses.length) * 100)}%` as any, backgroundColor: colors.primary, borderRadius: 2 }} />
                </View>
                <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginLeft: spacing(3) }]}>
                  {Math.round((paginatedCourses.length / filteredCourses.length) * 100)}%
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginBottom: spacing(5) }}>
              {TYPE_FILTERS.map(({ key, labelKey }) => {
                const active = typeFilter === key;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => { setTypeFilter(key); setSelectedInstId(null); setSelectedFacultyId(null); }}
                    style={({ pressed }) => ({ paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: active ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: active ? colors.primary : colors.border, opacity: pressed ? 0.9 : 1 })}
                  >
                    <Text style={[typography.label, { color: active ? '#fff' : colors.textPrimary }]}>{t(labelKey)}</Text>
                  </Pressable>
                );
              })}
            </View>

            {typeFilter !== 'All' && filteredInstitutions.length > 0 && (
              <View style={{ marginBottom: spacing(6) }}>
                <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) }]}>{t('SELECT INSTITUTION')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: spacing(2) }}>
                    {filteredInstitutions.map((inst) => (
                      <Pressable
                        key={inst.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: selectedInstId === inst.id }}
                        onPress={() => { setSelectedInstId(inst.id); setSelectedFacultyId(null); }}
                        style={({ pressed }) => ({ paddingHorizontal: spacing(4), paddingVertical: spacing(3), borderRadius: radii.lg, backgroundColor: selectedInstId === inst.id ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: selectedInstId === inst.id ? colors.primary : colors.border, opacity: pressed ? 0.9 : 1, minWidth: 130 })}
                      >
                        <Text style={[typography.label, { color: selectedInstId === inst.id ? '#fff' : colors.textPrimary }]} numberOfLines={1}>{inst.badge} · {inst.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}

            {selectedInstId && faculties.length > 0 && (
              <View style={{ marginBottom: spacing(6) }}>
                <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) }]}>{t('BROWSE BY FACULTY')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: spacing(2) }}>
                    <FacultyChip name={t('All Faculties')} isActive={selectedFacultyId === null} onPress={() => setSelectedFacultyId(null)} />
                    {faculties.map((fac) => <FacultyChip key={fac.id} name={fac.name} isActive={selectedFacultyId === fac.id} onPress={() => setSelectedFacultyId(fac.id)} />)}
                  </View>
                </ScrollView>
              </View>
            )}

            <View style={{ marginBottom: spacing(6) }}>
              <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(2) }]}>{t('SEARCH')}</Text>
              <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing(4), minHeight: 52 }, elevation]}>
                <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t('Search course title or faculty…')}
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel={t('Search courses by title, institution, or faculty')}
                  style={[typography.body, { flex: 1, marginLeft: spacing(3), paddingVertical: spacing(3), color: colors.textPrimary }]}
                  returnKeyType="search"
                />
                {isSearchPending && <ActivityIndicator size="small" color={colors.textMuted} />}
                {!isSearchPending && search.length > 0 && (
                  <Pressable onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel={t('Clear Search')} style={{ padding: spacing(2) }}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
              {hydrating && debouncedSearch.trim().length > 0 && (
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing(2) }]}>
                  {t('Still syncing the full catalogue — results may grow as more courses come in.')}
                </Text>
              )}
            </View>

            {filteredCourses.length === 0 ? (
              <View style={[{ alignItems: 'center', padding: spacing(10), backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border }, elevation]}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(5) }}>
                  <Ionicons name="book-outline" size={28} color={colors.primary} />
                </View>
                <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>{t('No courses found')}</Text>
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), textAlign: 'center' }]}>{t('Try adjusting your filters or search terms.')}</Text>
                <Pressable onPress={clearFilters} accessibilityRole="button" style={({ pressed }) => ({ marginTop: spacing(6), flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(6), paddingVertical: spacing(4), borderRadius: radii.lg, backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 })}>
                  <Ionicons name="refresh-outline" size={16} color="#fff" />
                  <Text style={[typography.label, { color: '#fff' }]}>{t('CLEAR ALL FILTERS')}</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(4) }]}>
                  {t('SHOWING {{shown}} OF {{total}} COURSES', { shown: paginatedCourses.length, total: filteredCourses.length })}
                </Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginRight: numCols > 1 ? -cardGap : 0 }}>
                  {paginatedCourses.map((course) => (
                    <View key={course.id} style={{ width: cardWrapperWidth as any, paddingRight: numCols > 1 ? cardGap : 0, paddingBottom: cardGap }}>
                      <CourseCard course={course} onPress={handleOpenCourse} />
                    </View>
                  ))}
                </View>

                {isMobile ? (
                  <InfiniteScrollSentinel
                    onVisible={loadNextPage}
                    loading={loadingMore}
                    hasMore={hasMore}
                    total={filteredCourses.length}
                    shown={paginatedCourses.length}
                  />
                ) : hasMore && (
                  <Pressable
                    onPress={() => setPage((p) => p + 1)}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ marginTop: spacing(8), paddingVertical: spacing(4), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, flexDirection: 'row' as const, justifyContent: 'center' as const, gap: spacing(2), opacity: pressed ? 0.85 : 1 })}
                  >
                    <Ionicons name="chevron-down" size={16} color={colors.primary} />
                    <Text style={[typography.label, { color: colors.primary }]}>
                      {t('LOAD MORE ({{count}} remaining)', { count: filteredCourses.length - paginatedCourses.length })}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {isDesktop && (
            <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
              <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: spacing(6), overflow: 'hidden' }, elevation]}>
                <View style={{ height: 3, backgroundColor: colors.primary, marginBottom: spacing(5) }} />
                <Text style={[typography.h2, { color: colors.textPrimary }]}>{t('Overview')}</Text>
                <StatPill icon="book-outline"   label={t('Total Programs')} value={`${allCourses.length}`}       />
                <StatPill icon="search-outline" label={t('Filtered')}       value={`${filteredCourses.length}`}  />
                <StatPill icon="eye-outline"    label={t('Showing')}        value={`${paginatedCourses.length}`} />
                <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing(5) }} />
                <Pressable onPress={clearFilters} accessibilityRole="button" style={({ pressed }) => ({ padding: spacing(4), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, opacity: pressed ? 0.85 : 1 })}>
                  <Text style={[typography.label, { color: colors.primary }]}>{t('Clear All Filters')}</Text>
                </Pressable>
                <Pressable onPress={loadData} accessibilityRole="button" style={({ pressed }) => ({ marginTop: spacing(3), padding: spacing(4), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, flexDirection: 'row' as const, justifyContent: 'center' as const, gap: spacing(2), opacity: pressed ? 0.85 : 1 })}>
                  <Ionicons name="refresh-outline" size={15} color={colors.textSecondary} />
                  <Text style={[typography.label, { color: colors.textPrimary }]}>{t('Reload Data')}</Text>
                </Pressable>
                <View style={{ marginTop: spacing(5), padding: spacing(4), backgroundColor: `${colors.primary}14`, borderRadius: radii.lg, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
                  <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
                    💡 Select an institution then browse by faculty to narrow your search quickly.
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Shared responsive student footer */}
      <StudentFooter
        topSpacing={spacing(10)}
        maxWidth={1280}
      />
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CoursesContent — picks the mobile drill-down flow or the desktop/tablet
// filter experience based on viewport width. Each branch is a separate
// component so their very different hook/state shapes never collide.
// ─────────────────────────────────────────────────────────────────────────────
function CoursesContent() {
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  return isMobile ? <MobileCoursesView /> : <DesktopCoursesView />;
}

export default function CoursesScreen() {
  return (
    <StudentMenuProvider>
      <CoursesContent />
    </StudentMenuProvider>
  );
}