import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  Alert,
  type ViewStyle,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { StudentMenuProvider } from '../../components/student/StudentMenu';
import StudentFooter from '../../components/student/StudentFooter';
import { useLanguage } from '../../contexts/LanguageContext';

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
// Firebase
// ─────────────────────────────────────────────────────────────────────────────
import { db } from '../../constants/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Breakpoint = 'mobile' | 'tablet' | 'desktop';
type IconName = keyof typeof Ionicons.glyphMap;

type Faculty = {
  id: string;
  name: string;
  institutionId: string;
};

type Course = {
  id: string;
  title: string;
  qualificationLevel: string;
  duration: string;
  requiredPoints: number;
  facultyId: string;
  facultyName?: string;
};

type University = {
  id: string;
  name: string;
  location: string;
  website: string;
  badge: string;
  about: string;
  ownership: string;
  established: string;
  accentColor: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Elevation helper
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = 0.28;
    const radius = intensity === 'sm' ? 6 : intensity === 'md' ? 14 : 22;
    const offsetY = intensity === 'sm' ? 2 : intensity === 'md' ? 5 : 10;
    return (Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: radius },
      android: { elevation: intensity === 'sm' ? 3 : intensity === 'md' ? 6 : 12 },
      web: { boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})` } as any,
      default: {},
    }) ?? {}) as ViewStyle;
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Card
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
  const colors = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevation, style]}>
      {accentColor && <View style={{ height: 3, backgroundColor: accentColor }} />}
      {children}
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  const colors = useTheme();
  return (
    <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) }]}>
      {title.toUpperCase()}
    </Text>
  );
}

function SectionTitle({ title, icon }: { title: string; icon?: IconName }) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(4) }}>
      {icon && (
        <View style={{ width: 36, height: 36, borderRadius: radii.lg, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
      )}
      <Text style={[typography.h2, { color: colors.textPrimary }]}>{title}</Text>
    </View>
  );
}

function MetaItem({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  const colors = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingVertical: spacing(2), flex: 1, minWidth: 180 }}>
      <View style={{ width: 38, height: 38, borderRadius: radii.lg, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={17} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: 2 }]}>{value}</Text>
      </View>
    </View>
  );
}

function CourseRow({ course, onPress }: { course: Course; onPress: () => void }) {
  const { t } = useLanguage();
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('View details')}: ${course.title}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing(4),
        backgroundColor: colors.surfaceAlt,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing(2),
        opacity: pressed ? 0.85 : 1,
        transform: pressed ? [{ scale: 0.98 }] : [],
      })}
    >
      <View style={{ width: 40, height: 40, borderRadius: radii.md, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center', marginRight: spacing(4) }}>
        <Ionicons name="book-outline" size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{course.title}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing(1) }]}>
          {course.qualificationLevel} • {course.duration}
        </Text>
      </View>
      <View style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: `${colors.primary}22` }}>
        <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{course.requiredPoints} {t('Points')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: spacing(3) }} />
    </Pressable>
  );
}

function FacultyChip({ name, isActive, onPress }: { name: string; isActive: boolean; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: spacing(4),
        paddingVertical: spacing(2.5),
        borderRadius: radii.pill,
        backgroundColor: isActive ? colors.primary : colors.surfaceAlt,
        borderWidth: 1,
        borderColor: isActive ? colors.primary : colors.border,
        opacity: pressed ? 0.9 : 1,
        marginRight: spacing(2),
      })}
    >
      <Text style={[typography.label, { color: isActive ? '#fff' : colors.textPrimary, fontWeight: isActive ? '700' : '600' }]}>
        {name}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Faculty carousel — horizontal scroll with prev/next arrow controls so users
// aren't limited to swipe gestures to reach faculties further along the row.
// ─────────────────────────────────────────────────────────────────────────────
function FacultyCarousel({
  faculties,
  selectedFacultyId,
  onSelect,
}: {
  faculties: Faculty[];
  selectedFacultyId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { t } = useLanguage();
  const colors = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [scrollX, setScrollX] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const SCROLL_STEP = 220;
  const maxScrollX = Math.max(0, contentWidth - containerWidth);
  const canScrollLeft = scrollX > 4;
  const canScrollRight = scrollX < maxScrollX - 4;

  const scrollByStep = useCallback((direction: 'left' | 'right') => {
    const target = direction === 'left'
      ? Math.max(0, scrollX - SCROLL_STEP)
      : Math.min(maxScrollX, scrollX + SCROLL_STEP);
    scrollRef.current?.scrollTo({ x: target, animated: true });
    setScrollX(target);
  }, [scrollX, maxScrollX]);

  const ArrowButton = ({ direction, disabled }: { direction: 'left' | 'right'; disabled: boolean }) => (
    <Pressable
      onPress={() => scrollByStep(direction)}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={direction === 'left' ? t('Previous Faculties') : t('Next Faculties')}
      style={({ pressed }) => ({
        width: 34,
        height: 34,
        borderRadius: radii.pill,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: disabled ? 0.35 : pressed ? 0.8 : 1,
      })}
    >
      <Ionicons name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} size={16} color={colors.primary} />
    </Pressable>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
      <ArrowButton direction="left" disabled={!canScrollLeft} />
      <View
        style={{ flex: 1 }}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
          onContentSizeChange={(w) => setContentWidth(w)}
          scrollEventThrottle={16}
        >
          <FacultyChip name={t('All Faculties')} isActive={selectedFacultyId === null} onPress={() => onSelect(null)} />
          {faculties.map(f => (
            <FacultyChip key={f.id} name={f.name} isActive={selectedFacultyId === f.id} onPress={() => onSelect(f.id)} />
          ))}
        </ScrollView>
      </View>
      <ArrowButton direction="right" disabled={!canScrollRight} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Content
// ─────────────────────────────────────────────────────────────────────────────
function UniversityDetailsContent() {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const uniId = typeof params.id === 'string' ? params.id : '';

  const [university, setUniversity] = useState<University | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);

  // Pagination
  const INITIAL_VISIBLE_COUNT = 6;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const breakpoint = useMemo<Breakpoint>(() => (width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop'), [width]);
  const isMobile = breakpoint === 'mobile';
  const isDesktop = breakpoint === 'desktop';

  useEffect(() => {
    if (!uniId) {
      setError(t("University ID not found"));
      setLoading(false);
      return;
    }

    const fetchUniversityData = async () => {
      try {
        setLoading(true);
        const uniDoc = await getDoc(doc(db, 'institutions', uniId));
        if (!uniDoc.exists()) {
          setError(t("University not found"));
          return;
        }

        const uniData = uniDoc.data();
        setUniversity({
          id: uniDoc.id,
          name: uniData.name,
          location: uniData.location,
          website: uniData.website || '',
          badge: uniData.badge || 'UNI',
          about: uniData.about || '',
          ownership: uniData.ownership || 'Public',
          established: String(uniData.established || 'N/A'),
          accentColor: uniData.ownership === 'Private' ? '#34D399' : '#60A5FA',
        });

        const facultiesSnap = await getDocs(query(collection(db, 'faculties'), where('institutionId', '==', uniId)));
        setFaculties(facultiesSnap.docs.map(d => ({ id: d.id, name: d.data().name, institutionId: d.data().institutionId })).sort((a, b) => a.name.localeCompare(b.name)));

        const coursesSnap = await getDocs(query(collection(db, 'courses'), where('institutionId', '==', uniId)));
        setCourses(coursesSnap.docs.map(d => ({
          id: d.id,
          title: d.data().title,
          qualificationLevel: d.data().qualificationLevel || 'Bachelor Degree',
          duration: d.data().duration || '4 Years',
          requiredPoints: d.data().requiredPoints || 0,
          facultyId: d.data().facultyId,
        })).sort((a, b) => a.title.localeCompare(b.title)));
      } catch (err) {
        setError(t('Failed to load university information'));
      } finally {
        setLoading(false);
      }
    };
    fetchUniversityData();
  }, [uniId, t]);

  const filteredCourses = useMemo(() => {
    const list = selectedFacultyId ? courses.filter(c => c.facultyId === selectedFacultyId) : courses;
    return list;
  }, [courses, selectedFacultyId]);

  const displayedCourses = useMemo(() => filteredCourses.slice(0, visibleCount), [filteredCourses, visibleCount]);
  const hasMore = filteredCourses.length > visibleCount;

  const handleFacultySelect = (id: string | null) => {
    setSelectedFacultyId(id);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  if (loading) return (
    <DashboardLayout title={t('University Details')} subtitle={t('Loading...')} showPointsCard={false}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing(10) }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    </DashboardLayout>
  );

  return (
    <DashboardLayout title={t('University Details')} subtitle={university?.name} showPointsCard={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(6) }}>
        <Pressable
onPress={() => router.back()}
accessibilityRole="button"
accessibilityLabel={t('Go Back')}
style={({ pressed }) => [styles.backBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
          <Ionicons name="arrow-back" size={17} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary }]}>{t('Go Back')}</Text>
        </Pressable>
      </View>

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing(8) }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {/* Hero */}
          <Card intensity="lg" accentColor={university?.accentColor} style={{ marginBottom: spacing(7) }}>
            <View style={{ padding: isMobile ? spacing(5) : spacing(7), gap: spacing(5) }}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                <View style={[styles.badgeContainer, { backgroundColor: `${university?.accentColor}1A`, borderColor: `${university?.accentColor}44` }]}>
                  <Text style={[typography.label, { color: university?.accentColor }]}>{university?.badge}</Text>
                </View>
                <View style={[styles.badgeContainer, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <Text style={[typography.caption, { color: colors.textSecondary }]}>{university?.ownership} · {t('Est.')} {university?.established}</Text>
                </View>
              </View>
              <Text style={[typography.hero, { color: colors.textPrimary, fontSize: isMobile ? 24 : 32 }]}>{university?.name}</Text>
              <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 24 }]}>{university?.about}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(4), paddingTop: spacing(4), borderTopWidth: 1, borderTopColor: colors.divider }}>
                <MetaItem icon="location-outline" label={t('Location')} value={university?.location || ''} />
                <MetaItem icon="globe-outline" label={t('Website')} value={university?.website || 'N/A'} />
              </View>
            </View>
          </Card>

          {/* Filter */}
          <Card style={{ marginBottom: spacing(6) }}>
            <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
              <SectionLabel title={t('Explore')} />
              <SectionTitle title={t('Browse by Faculty')} icon="layers-outline" />
              <FacultyCarousel
                faculties={faculties}
                selectedFacultyId={selectedFacultyId}
                onSelect={handleFacultySelect}
              />
            </View>
          </Card>

          {/* Courses */}
          <Card style={{ marginBottom: spacing(6) }}>
            <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1) }}>
                <SectionLabel title={t('Programmes')} />
                <Text style={[typography.caption, { color: colors.textMuted }]}>{displayedCourses.length} {t('of')} {filteredCourses.length}</Text>
              </View>
              <SectionTitle title={t('Courses Offered')} icon="school-outline" />
              {filteredCourses.length === 0 ? (
                <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', padding: spacing(10) }]}>{t('No courses found.')}</Text>
              ) : (
                <>
                  {displayedCourses.map(c => <CourseRow key={c.id} course={c} onPress={() => router.push({ pathname: '/student/course-details', params: { id: c.id } })} />)}
                  {hasMore && (
                    <Pressable
onPress={() => setVisibleCount(v => v + INITIAL_VISIBLE_COUNT)}
accessibilityRole="button"
accessibilityLabel={t('Load More Courses')} style={({ pressed }) => [styles.loadMore, { backgroundColor: colors.surfaceAlt, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
                      <Text style={[typography.label, { color: colors.primary }]}>{t('Load More Courses')}</Text>
                      <Ionicons name="chevron-down" size={16} color={colors.primary} />
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </Card>
        </View>

        {/* Sidebar */}
        {isDesktop && (
          <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
            <Card intensity="md">
              <View style={{ padding: spacing(6), gap: spacing(3) }}>
                <SectionLabel title={t('Actions')} />
                <Pressable
onPress={() => university?.website && Alert.alert(t('Website'), university.website)}
accessibilityRole="button"
accessibilityLabel={t('Visit Website')} style={[styles.actionBtn, { backgroundColor: colors.primary }]}>
                  <Ionicons name="open-outline" size={18} color="#fff" />
                  <Text style={[typography.label, { color: '#fff' }]}>{t('Visit Website')}</Text>
                </Pressable>
              </View>
            </Card>
          </View>
        )}

        {isMobile && (
          <View style={{ marginBottom: spacing(10) }}>
            <Pressable
onPress={() => university?.website && Alert.alert(t('Website'), university.website)}
accessibilityRole="button"
accessibilityLabel={t('Official Website')} style={[styles.actionBtn, { height: 56, backgroundColor: colors.primary }]}>
              <Ionicons name="open-outline" size={20} color="#fff" />
              <Text style={[typography.bodyStrong, { color: '#fff' }]}>{t('Official Website')}</Text>
            </Pressable>
          </View>
        )}
      </View>

      <StudentFooter
        topSpacing={isMobile ? spacing(8) : spacing(10)}
        maxWidth={1280}
      />
    </DashboardLayout>
  );
}

const styles = {
  backBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.lg, borderWidth: 1 },
  badgeContainer: { paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, borderWidth: 1 },
  loadMore: { marginTop: spacing(6), paddingVertical: spacing(4), borderRadius: radii.lg, borderWidth: 1, alignItems: 'center' as const, justifyContent: 'center' as const, flexDirection: 'row' as const, gap: spacing(2) },
  actionBtn: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, gap: spacing(3), padding: spacing(4), borderRadius: radii.lg },
};

export default function UniversityDetailsScreen() {
  return (
    <StudentMenuProvider>
      <UniversityDetailsContent />
    </StudentMenuProvider>
  );
}