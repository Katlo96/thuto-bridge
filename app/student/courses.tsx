
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
import {
  StudentMenuProvider,
} from '../../components/student/StudentMenu';

import DashboardLayout, {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';

import { db } from '../../constants/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  limit,
  startAfter,
  type Query,
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
  FIRESTORE_TIMEOUT_MS:            8_000,
  FIRESTORE_RETRY_DELAY_MS:        1_500,
  SLOW_CONNECTION_BANNER_DELAY_MS: 4_000,
  INFINITE_SCROLL_THROTTLE_MS:     600,
  LOAD_MORE_DELAY_MS:              180,
  SEARCH_DEBOUNCE_MS:              200,

  // INITIAL_COURSE_BATCH: how many course docs we fetch before first paint.
  // This is what actually determines how long the user stares at a skeleton
  // — NOT how many we display (see PAGE_SIZE in the component). Kept small
  // and flat across breakpoints because perceived load time is a function of
  // round-trip latency, not screen width.
  INITIAL_COURSE_BATCH: 20,

  // BACKGROUND_COURSE_BATCH: chunk size for the follow-up cursor fetches that
  // run silently after first paint, so search / filters / "load more"
  // eventually see every course without the user ever waiting on the full
  // collection.
  BACKGROUND_COURSE_BATCH: 75,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Breakpoint      = 'mobile' | 'tablet' | 'desktop';
type InstitutionType = 'university' | 'college' | 'brigade';
type FetchStatus     = 'idle' | 'loading' | 'success' | 'error';

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
// safeDocs — 8s timeout, one retry after 1.5s.
//
// Why 8s, not 15s:
//   On mobile, a Firestore WebChannel that hasn't responded in 8s won't
//   respond in 15s. Failing fast and retrying on a fresh connection is
//   almost always faster than waiting for the stale one.
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
  let timer: ReturnType<typeof setTimeout>;
  const race = Promise.race([
    p,
    new Promise<T>((_, rej) => {
      timer = setTimeout(() => rej(new Error('firestore_timeout')), ms);
    }),
  ]);
  // Always clear the timer so it doesn't keep Node/RN alive
  race.finally(() => clearTimeout(timer));
  return race;
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

// ─────────────────────────────────────────────────────────────────────────────
// getFriendlyErrorMessage — turns Firestore/network failures into copy a
// student can act on, instead of one generic catch-all string.
// ─────────────────────────────────────────────────────────────────────────────
function getFriendlyErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message === 'firestore_timeout') {
    return 'The connection is taking too long. Please check your network and try again.';
  }
  const code = (err as { code?: string } | null | undefined)?.code;
  if (code === 'permission-denied') {
    return "You don't have permission to view courses right now. Please sign in again.";
  }
  if (code === 'unavailable') {
    return 'The course service is temporarily unavailable. Please try again shortly.';
  }
  return 'Could not load courses. Please check your connection and try again.';
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

// Static filter config — module scope so it isn't reallocated every render,
// and typed up front so selecting a filter never needs an `as any` cast.
const TYPE_FILTERS: ReadonlyArray<{ key: 'All' | InstitutionType; label: string }> = [
  { key: 'All',        label: 'All Programs' },
  { key: 'university', label: 'Universities' },
  { key: 'college',    label: 'Colleges'     },
  { key: 'brigade',    label: 'Brigades'     },
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
// SlowConnectionBanner — appears after CONFIG.SLOW_CONNECTION_BANNER_DELAY_MS
// if still loading
// ─────────────────────────────────────────────────────────────────────────────
function SlowConnectionBanner() {
  const [visible, setVisible] = useState(false);
  const colors = useTheme();

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
        Slow connection detected — still loading…
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
          <Text style={[typography.caption, { color: colors.textMuted }]}>Loading more…</Text>
        </>
      ) : !hasMore ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), width: '100%' }}>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
          <Text style={[typography.caption, { color: colors.textMuted }]}>All {total} loaded</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.divider }} />
        </View>
      ) : null}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CourseCard — memoized. It receives a stable `onPress(id)` callback from the
// parent (see CoursesContent's handleOpenCourse) rather than a fresh inline
// arrow function per render, so React.memo can actually skip re-rendering
// cards whose underlying course object reference hasn't changed — which
// matters here because background hydration periodically updates the course
// list as more data streams in.
// ─────────────────────────────────────────────────────────────────────────────
const CourseCard = memo(function CourseCard({
  course, onPress,
}: { course: Course; onPress: (id: string) => void }) {
  const colors    = useTheme();
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
        accessibilityLabel={`View details for ${course.title}`}
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
            { icon: 'star-outline'     as const, text: `${course.requiredPoints} pts` },
            { icon: 'location-outline' as const, text: course.location           },
          ].map((m, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1), paddingHorizontal: spacing(2), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
              <Ionicons name={m.icon} size={11} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>{m.text}</Text>
            </View>
          ))}
        </View>
        <View style={{ marginTop: spacing(4), paddingTop: spacing(3), borderTopWidth: 1, borderTopColor: colors.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={[typography.label, { color: colors.primary }]}>View details</Text>
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
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: 2 }]}>{value}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CoursesContent
// ─────────────────────────────────────────────────────────────────────────────
function CoursesContent() {
  const { width } = useWindowDimensions();
  const colors    = useTheme();
  const elevation = useElevation('md');

  const breakpoint = useMemo<Breakpoint>(
    () => (width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop'),
    [width],
  );
  const isDesktop = breakpoint === 'desktop';
  const isMobile  = breakpoint === 'mobile';

  // PAGE_SIZE: how many cards are visible at once / revealed per "load more".
  // Independent from CONFIG.INITIAL_COURSE_BATCH — display pagination and
  // network pagination are two different concerns.
  const PAGE_SIZE = isMobile ? 20 : 12;

  // SKELETON_COUNT: deliberately small and independent of PAGE_SIZE. Each
  // skeleton card runs its own looping animation, so rendering 20 of them on
  // a low-end Android device during the loading phase would itself be slow.
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

  // True while the background fetch is still pulling the rest of the
  // catalogue in after the fast first page has already been shown.
  const [hydrating,           setHydrating]           = useState(false);
  // True if that background fetch failed partway through — the user still
  // has a working screen, but the catalogue may be incomplete, so we surface
  // a retry affordance instead of failing silently.
  const [hydrationIncomplete, setHydrationIncomplete] = useState(false);

  const mountedRef = useRef(true);
  // Bumped on every loadData() call so a stale background-hydration loop
  // (from a previous load / reload) knows to stop writing to state.
  const bgTokenRef  = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Debounce search input — filtering runs over the full in-memory course
  // list on every change, so we don't want to re-filter on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), CONFIG.SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  // ── Background hydration: pulls the rest of the courses collection in
  //    chunks after the first fast page has already rendered, so search /
  //    filters / "load more" eventually see every course. Failures here are
  //    non-fatal — the user already has a working screen — but we do
  //    surface them via hydrationIncomplete rather than failing silently.
  // ───────────────────────────────────────────────────────────────────────
  const hydrateRemainingCourses = useCallback(async (
    token: number,
    initialCursor: QueryDocumentSnapshot<DocumentData>,
    instById: Map<string, Institution>,
  ) => {
    if (!mountedRef.current || bgTokenRef.current !== token) return;
    setHydrating(true);
    let cursor = initialCursor;

    try {
      // Keep pulling batches until Firestore hands back fewer docs than we
      // asked for — our signal we've reached the end of the collection. No
      // orderBy is used (see note above mapCourseDocs), so nothing is ever
      // silently excluded, and no batch can ever truncate the catalogue.
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
        if (snap.docs.length < CONFIG.BACKGROUND_COURSE_BATCH) break; // reached the end
      }
    } catch (err: unknown) {
      console.error('[Courses] background hydration failed:', err);
      if (mountedRef.current && bgTokenRef.current === token) setHydrationIncomplete(true);
    } finally {
      if (mountedRef.current && bgTokenRef.current === token) setHydrating(false);
    }
  }, []);

  // ── Load institutions + the FIRST page of courses in parallel ─────────────
  //    This is the query that gates the loading skeleton, so it's kept as
  //    cheap as possible: a small, fixed-size batch instead of the whole
  //    collection. The rest streams in afterwards via hydrateRemainingCourses.
  const loadData = useCallback(async () => {
    if (!mountedRef.current) return;
    setStatus('loading');
    setErrorMsg('');
    setHydrating(false);
    setHydrationIncomplete(false);
    const myToken = ++bgTokenRef.current; // invalidate any prior background loop

    try {
      // Both queries fire simultaneously — total wait = max(t_inst, t_courses)
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

      // If we got a full batch back, there's likely more on the server —
      // go fetch it quietly in the background.
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
      setErrorMsg(getFriendlyErrorMessage(err));
      setStatus('error');
    }
  }, [hydrateRemainingCourses]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Faculties ─────────────────────────────────────────────────────────────
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

  // ── Derived ───────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // Render — single DashboardLayout always, so menu always works
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout title="Courses" subtitle="Explore programs across Botswana" showPointsCard={false}>

      {/* Back nav */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(6) }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}
        >
          <Ionicons name="arrow-back" size={17} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary }]}>Back</Text>
        </Pressable>
        <Text style={[typography.caption, { color: colors.textMuted }]}>Dashboard › Courses</Text>
      </View>

      {/* ══ LOADING — skeleton replaces blank spinner ══ */}
      {(status === 'idle' || status === 'loading') && (
        <View>
          {/* Slow connection warning after CONFIG.SLOW_CONNECTION_BANNER_DELAY_MS */}
          <SlowConnectionBanner />

          {/* Hero skeleton */}
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

          {/* Filter pills skeleton */}
          <View style={{ flexDirection: 'row', gap: spacing(2), marginBottom: spacing(5) }}>
            {[80, 100, 80, 80].map((w, i) => <SkeletonPulse key={i} width={w} height={34} />)}
          </View>

          {/* Card skeletons — same grid as real cards, but a lighter count */}
          <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(4) }]}>
            LOADING COURSES…
          </Text>
          <SkeletonGrid count={SKELETON_COUNT} numCols={numCols} cardGap={cardGap} />
        </View>
      )}

      {/* ══ ERROR ══ */}
      {status === 'error' && (
        <View style={[{ alignItems: 'center', padding: spacing(10), backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: `${colors.danger}33`, marginTop: spacing(4) }, elevation]}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: `${colors.danger}18`, borderWidth: 1, borderColor: `${colors.danger}33`, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(5) }}>
            <Ionicons name="cloud-offline-outline" size={30} color={colors.danger} />
          </View>
          <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>Connection problem</Text>
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), textAlign: 'center', maxWidth: 320, lineHeight: 22 }]}>
            {errorMsg}
          </Text>
          <Pressable
            onPress={loadData}
            accessibilityRole="button"
            style={({ pressed }) => ({ marginTop: spacing(6), flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(6), paddingVertical: spacing(4), borderRadius: radii.lg, backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 })}
          >
            <Ionicons name="refresh-outline" size={17} color="#fff" />
            <Text style={[typography.label, { color: '#fff', letterSpacing: 0.4 }]}>TRY AGAIN</Text>
          </Pressable>
        </View>
      )}

      {/* ══ SUCCESS ══ */}
      {status === 'success' && (
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing(8), alignItems: 'flex-start' }}>

          {/* Main column */}
          <View style={{ flex: 1, minWidth: 0, width: '100%' }}>

            {/* Hero */}
            <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: isMobile ? spacing(5) : spacing(7), marginBottom: spacing(6), overflow: 'hidden' }, elevation]}>
              <View style={{ height: 3, backgroundColor: colors.primary, borderRadius: 2, marginBottom: spacing(4) }} />
              <Text style={[typography.hero, { color: colors.textPrimary }]}>Find Your Program</Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2) }]}>
                Filter by type, institution, and faculty to find the right course.
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing(3), marginTop: spacing(4), flexWrap: 'wrap' }}>
                {[
                  { label: `${allCourses.length} total`,         color: colors.primary },
                  { label: `${institutions.length} institutions`, color: colors.success },
                  { label: `${filteredCourses.length} matching`,  color: colors.warning },
                ].map((chip) => (
                  <View key={chip.label} style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: `${chip.color}18`, borderWidth: 1, borderColor: `${chip.color}33` }}>
                    <Text style={[typography.caption, { color: chip.color, fontWeight: '700' }]}>{chip.label}</Text>
                  </View>
                ))}
                {hydrating && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: `${colors.textMuted}18`, borderWidth: 1, borderColor: `${colors.textMuted}33` }}>
                    <ActivityIndicator size="small" color={colors.textMuted} />
                    <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700' }]}>Syncing full catalogue…</Text>
                  </View>
                )}
                {!hydrating && hydrationIncomplete && (
                  <Pressable
                    onPress={loadData}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: `${colors.danger}18`, borderWidth: 1, borderColor: `${colors.danger}33`, opacity: pressed ? 0.85 : 1 })}
                  >
                    <Ionicons name="alert-circle-outline" size={13} color={colors.danger} />
                    <Text style={[typography.caption, { color: colors.danger, fontWeight: '700' }]}>Some courses may be missing — tap to retry</Text>
                  </Pressable>
                )}
              </View>
            </View>

            {/* Mobile progress bar */}
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

            {/* Type filter */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginBottom: spacing(5) }}>
              {TYPE_FILTERS.map(({ key, label }) => {
                const active = typeFilter === key;
                return (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => { setTypeFilter(key); setSelectedInstId(null); setSelectedFacultyId(null); }}
                    style={({ pressed }) => ({ paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: active ? colors.primary : colors.surfaceAlt, borderWidth: 1, borderColor: active ? colors.primary : colors.border, opacity: pressed ? 0.9 : 1 })}
                  >
                    <Text style={[typography.label, { color: active ? '#fff' : colors.textPrimary }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Institution selector */}
            {typeFilter !== 'All' && filteredInstitutions.length > 0 && (
              <View style={{ marginBottom: spacing(6) }}>
                <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) }]}>SELECT INSTITUTION</Text>
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

            {/* Faculty selector */}
            {selectedInstId && faculties.length > 0 && (
              <View style={{ marginBottom: spacing(6) }}>
                <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) }]}>BROWSE BY FACULTY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: spacing(2) }}>
                    <FacultyChip name="All Faculties" isActive={selectedFacultyId === null} onPress={() => setSelectedFacultyId(null)} />
                    {faculties.map((fac) => <FacultyChip key={fac.id} name={fac.name} isActive={selectedFacultyId === fac.id} onPress={() => setSelectedFacultyId(fac.id)} />)}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Search */}
            <View style={{ marginBottom: spacing(6) }}>
              <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(2) }]}>SEARCH</Text>
              <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing(4), minHeight: 52 }, elevation]}>
                <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search course title or faculty…"
                  placeholderTextColor={colors.textMuted}
                  accessibilityLabel="Search courses by title, institution, or faculty"
                  style={[typography.body, { flex: 1, marginLeft: spacing(3), paddingVertical: spacing(3), color: colors.textPrimary }]}
                  returnKeyType="search"
                />
                {isSearchPending && <ActivityIndicator size="small" color={colors.textMuted} />}
                {!isSearchPending && search.length > 0 && (
                  <Pressable onPress={() => setSearch('')} accessibilityRole="button" accessibilityLabel="Clear search" style={{ padding: spacing(2) }}>
                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                  </Pressable>
                )}
              </View>
              {hydrating && debouncedSearch.trim().length > 0 && (
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing(2) }]}>
                  Still syncing the full catalogue — results may grow as more courses come in.
                </Text>
              )}
            </View>

            {/* Results */}
            {filteredCourses.length === 0 ? (
              <View style={[{ alignItems: 'center', padding: spacing(10), backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border }, elevation]}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: `${colors.primary}18`, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(5) }}>
                  <Ionicons name="book-outline" size={28} color={colors.primary} />
                </View>
                <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>No courses found</Text>
                <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), textAlign: 'center' }]}>Try adjusting your filters or search terms.</Text>
                <Pressable onPress={clearFilters} accessibilityRole="button" style={({ pressed }) => ({ marginTop: spacing(6), flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(6), paddingVertical: spacing(4), borderRadius: radii.lg, backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 })}>
                  <Ionicons name="refresh-outline" size={16} color="#fff" />
                  <Text style={[typography.label, { color: '#fff' }]}>CLEAR ALL FILTERS</Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(4) }]}>
                  SHOWING {paginatedCourses.length} OF {filteredCourses.length} COURSES
                </Text>

                {/* Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginRight: numCols > 1 ? -cardGap : 0 }}>
                  {paginatedCourses.map((course) => (
                    <View key={course.id} style={{ width: cardWrapperWidth as any, paddingRight: numCols > 1 ? cardGap : 0, paddingBottom: cardGap }}>
                      <CourseCard course={course} onPress={handleOpenCourse} />
                    </View>
                  ))}
                </View>

                {/* Mobile: infinite scroll sentinel | Desktop: explicit button */}
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
                      LOAD MORE ({filteredCourses.length - paginatedCourses.length} remaining)
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>

          {/* Desktop sidebar */}
          {isDesktop && (
            <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
              <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: spacing(6), overflow: 'hidden' }, elevation]}>
                <View style={{ height: 3, backgroundColor: colors.primary, marginBottom: spacing(5) }} />
                <Text style={[typography.h2, { color: colors.textPrimary }]}>Overview</Text>
                <StatPill icon="book-outline"   label="Total Programs" value={`${allCourses.length}`}       />
                <StatPill icon="search-outline" label="Filtered"       value={`${filteredCourses.length}`}  />
                <StatPill icon="eye-outline"    label="Showing"        value={`${paginatedCourses.length}`} />
                <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing(5) }} />
                <Pressable onPress={clearFilters} accessibilityRole="button" style={({ pressed }) => ({ padding: spacing(4), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, opacity: pressed ? 0.85 : 1 })}>
                  <Text style={[typography.label, { color: colors.primary }]}>Clear All Filters</Text>
                </Pressable>
                <Pressable onPress={loadData} accessibilityRole="button" style={({ pressed }) => ({ marginTop: spacing(3), padding: spacing(4), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, flexDirection: 'row' as const, justifyContent: 'center' as const, gap: spacing(2), opacity: pressed ? 0.85 : 1 })}>
                  <Ionicons name="refresh-outline" size={15} color={colors.textSecondary} />
                  <Text style={[typography.label, { color: colors.textPrimary }]}>Reload Data</Text>
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
    </DashboardLayout>
  );
}

export default function CoursesScreen() {
  return (
    <StudentMenuProvider>
      <CoursesContent />
    </StudentMenuProvider>
  );
}