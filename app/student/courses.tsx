import React, { useMemo, useState, useCallback, useEffect } from 'react';
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
// Firebase
// ─────────────────────────────────────────────────────────────────────────────
import { db } from '../../constants/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Breakpoint = 'mobile' | 'tablet' | 'desktop';
type InstitutionType = 'university' | 'college' | 'brigade';

type Institution = {
  id: string;
  name: string;
  type: InstitutionType;
  badge: string;
  location: string;
};

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
  institutionId: string;
  institutionName: string;
  institutionType: InstitutionType;
  institutionBadge: string;
  facultyId: string;
  facultyName: string;
  location: string;
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
// Reusable Components
// ─────────────────────────────────────────────────────────────────────────────
function StatPill({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const colors = useTheme();
  const elevation = useElevation('sm');
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingHorizontal: spacing(4), paddingVertical: spacing(3), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border }, elevation]}>
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

function CourseCard({ course, onPress }: { course: Course; onPress: () => void }) {
  const colors = useTheme();
  const elevation = useElevation('md');
  const typeColor = course.institutionType === 'university' ? '#60A5FA' : course.institutionType === 'college' ? '#34D399' : '#FBBF24';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          minWidth: 260,
          backgroundColor: colors.card,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing(5),
          overflow: 'hidden',
          opacity: pressed ? 0.9 : 1,
          transform: pressed ? [{ scale: 0.98 }] : [],
        },
        elevation,
      ]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: `${typeColor}1A`, borderWidth: 1, borderColor: `${typeColor}33` }}>
          <Text style={[typography.label, { color: typeColor }]}>{course.institutionBadge}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>

      <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(4) }]} numberOfLines={2}>
        {course.title}
      </Text>

      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing(2) }]}>
        {course.facultyName}
      </Text>

      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(1) }]}>
        {course.qualificationLevel} • {course.duration} • {course.requiredPoints} points
      </Text>

      <View style={{ marginTop: spacing(4), paddingTop: spacing(3), borderTopWidth: 1, borderTopColor: colors.divider, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={[typography.label, { color: colors.primary }]}>View details</Text>
        <Ionicons name="arrow-forward" size={15} color={colors.primary} />
      </View>
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
// Main Content
// ─────────────────────────────────────────────────────────────────────────────
function CoursesContent() {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { openMenu } = useStudentMenu();
  const elevation = useElevation('md');

  const breakpoint = useMemo<Breakpoint>(() => (width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop'), [width]);
  const isDesktop = breakpoint === 'desktop';
  const isMobile = breakpoint === 'mobile';

  const [search, setSearch] = useState('');
  const [institutionTypeFilter, setInstitutionTypeFilter] = useState<'All' | InstitutionType>('All');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState<string | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]); // Current institution's faculties
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  // Fetch core data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const instSnap = await getDocs(collection(db, 'institutions'));
        const instList: Institution[] = instSnap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.name || 'Unknown',
            type: (d.category as InstitutionType) || 'university',
            badge: d.badge || 'INST',
            location: d.location || 'Botswana',
          };
        });
        setInstitutions(instList);

        const courseSnap = await getDocs(collection(db, 'courses'));
        const enriched: Course[] = courseSnap.docs.map(doc => {
          const c = doc.data();
          const inst = instList.find(i => i.id === c.institutionId);
          return {
            id: doc.id,
            title: c.title || 'Untitled',
            qualificationLevel: c.qualificationLevel || 'Certificate',
            duration: c.duration || 'N/A',
            requiredPoints: c.requiredPoints || 0,
            institutionId: c.institutionId,
            institutionName: inst?.name || 'Unknown',
            institutionType: inst?.type || 'university',
            institutionBadge: inst?.badge || 'INST',
            facultyId: c.facultyId || '',
            facultyName: 'General',
            location: inst?.location || 'Botswana',
          };
        }).sort((a, b) => a.title.localeCompare(b.title));

        setAllCourses(enriched);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch faculties when institution is selected
  useEffect(() => {
    if (!selectedInstitutionId) {
      setFaculties([]);
      setSelectedFacultyId(null);
      return;
    }

    const fetchFaculties = async () => {
      try {
        const q = query(collection(db, 'faculties'), where('institutionId', '==', selectedInstitutionId));
        const snap = await getDocs(q);
        const facList = snap.docs.map(doc => ({
          id: doc.id,
          name: doc.data().name || 'Unknown Faculty',
          institutionId: selectedInstitutionId,
        })).sort((a, b) => a.name.localeCompare(b.name));
        setFaculties(facList);
      } catch (err) {
        console.error(err);
      }
    };

    fetchFaculties();
  }, [selectedInstitutionId]);

  const filteredCourses = useMemo(() => {
    let list = allCourses;

    if (institutionTypeFilter !== 'All') {
      list = list.filter(c => c.institutionType === institutionTypeFilter);
    }

    if (selectedInstitutionId) {
      list = list.filter(c => c.institutionId === selectedInstitutionId);
    }

    if (selectedFacultyId) {
      list = list.filter(c => c.facultyId === selectedFacultyId);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        c.institutionName.toLowerCase().includes(q) ||
        c.facultyName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allCourses, institutionTypeFilter, selectedInstitutionId, selectedFacultyId, search]);

  const paginatedCourses = useMemo(() => {
    return filteredCourses.slice(0, page * ITEMS_PER_PAGE);
  }, [filteredCourses, page]);

  const hasMore = paginatedCourses.length < filteredCourses.length;

  const loadMore = () => setPage(p => p + 1);

  const clearFilters = () => {
    setSearch('');
    setInstitutionTypeFilter('All');
    setSelectedInstitutionId(null);
    setSelectedFacultyId(null);
    setPage(1);
  };

  const handleViewCourse = (id: string) => {
    router.push({ pathname: '/student/course-details', params: { id } });
  };

  const filteredInstitutions = useMemo(() => {
    if (institutionTypeFilter === 'All') return institutions;
    return institutions.filter(i => i.type === institutionTypeFilter);
  }, [institutions, institutionTypeFilter]);

  if (loading) {
    return (
      <DashboardLayout title="Courses" subtitle="Loading programs..." showPointsCard={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing(12) }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Courses" subtitle="Explore programs across Botswana" showPointsCard={false}>
      {/* Back Navigation */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(6) }}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}>
          <Ionicons name="arrow-back" size={17} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary }]}>Back</Text>
        </Pressable>
        <Text style={[typography.caption, { color: colors.textMuted }]}>Dashboard › Courses</Text>
      </View>

      <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing(8) }}>
        <View style={{ flex: 1 }}>
          {/* Hero */}
          <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: isMobile ? spacing(5) : spacing(7), marginBottom: spacing(6) }, elevation]}>
            <Text style={[typography.hero, { color: colors.textPrimary }]}>Find Your Program</Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2) }]}>Filter by type, institution, and faculty.</Text>
          </View>

          {/* Institution Type Filter */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginBottom: spacing(5) }}>
            {[
              { key: 'All', label: 'All Programs' },
              { key: 'university', label: 'Universities' },
              { key: 'college', label: 'Colleges' },
              { key: 'brigade', label: 'Brigades' },
            ].map(({ key, label }) => {
              const active = institutionTypeFilter === key;
              return (
                <Pressable
                  key={key}
                  onPress={() => { setInstitutionTypeFilter(key as any); setSelectedInstitutionId(null); setSelectedFacultyId(null); setPage(1); }}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing(4),
                    paddingVertical: spacing(2.5),
                    borderRadius: radii.pill,
                    backgroundColor: active ? colors.primary : colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: active ? colors.primary : colors.border,
                    opacity: pressed ? 0.9 : 1,
                  })}
                >
                  <Text style={[typography.label, { color: active ? '#fff' : colors.textPrimary }]}>{label}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Institution Selector */}
          {institutionTypeFilter !== 'All' && (
            <View style={{ marginBottom: spacing(6) }}>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing(3) }]}>SELECT INSTITUTION</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing(2) }}>
                  {filteredInstitutions.map(inst => (
                    <Pressable
                      key={inst.id}
                      onPress={() => { setSelectedInstitutionId(inst.id); setSelectedFacultyId(null); setPage(1); }}
                      style={({ pressed }) => ({
                        padding: spacing(3),
                        borderRadius: radii.lg,
                        backgroundColor: selectedInstitutionId === inst.id ? colors.primary : colors.surfaceAlt,
                        borderWidth: 1,
                        borderColor: selectedInstitutionId === inst.id ? colors.primary : colors.border,
                        opacity: pressed ? 0.9 : 1,
                        minWidth: 150,
                      })}
                    >
                      <Text style={[typography.label, { color: selectedInstitutionId === inst.id ? '#fff' : colors.textPrimary, fontWeight: '600' }]}>
                        {inst.badge} {inst.name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Faculty Selector - Only when institution is selected */}
          {selectedInstitutionId && faculties.length > 0 && (
            <View style={{ marginBottom: spacing(6) }}>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing(3) }]}>BROWSE BY FACULTY</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: spacing(2) }}>
                  <FacultyChip
                    name="All Faculties"
                    isActive={selectedFacultyId === null}
                    onPress={() => setSelectedFacultyId(null)}
                  />
                  {faculties.map(fac => (
                    <FacultyChip
                      key={fac.id}
                      name={fac.name}
                      isActive={selectedFacultyId === fac.id}
                      onPress={() => setSelectedFacultyId(fac.id)}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Search Bar */}
          <View style={{ marginBottom: spacing(6) }}>
            <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(2) }]}>SEARCH</Text>
            <View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing(4), minHeight: 52 }, elevation]}>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search course title or faculty..."
                placeholderTextColor={colors.textMuted}
                style={[typography.body, { flex: 1, marginLeft: spacing(3), color: colors.textPrimary }]}
              />
              {search.length > 0 && (
                <Pressable onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Results */}
          {paginatedCourses.length === 0 ? (
            <View style={{ padding: spacing(10), alignItems: 'center' }}>
              <Ionicons name="book-outline" size={48} color={colors.textMuted} />
              <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(4) }]}>No courses found</Text>
              <Pressable onPress={clearFilters} style={{ marginTop: spacing(6), paddingHorizontal: spacing(6), paddingVertical: spacing(3), backgroundColor: colors.primary, borderRadius: radii.lg }}>
                <Text style={[typography.label, { color: '#fff' }]}>CLEAR ALL FILTERS</Text>
              </Pressable>
            </View>
          ) : (
            <View>
              <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing(4) }]}>
                SHOWING {paginatedCourses.length} OF {filteredCourses.length} COURSES
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(4) }}>
                {paginatedCourses.map(course => (
                  <CourseCard key={course.id} course={course} onPress={() => handleViewCourse(course.id)} />
                ))}
              </View>

              {hasMore && (
                <Pressable onPress={loadMore} style={({ pressed }) => ({ marginTop: spacing(8), paddingVertical: spacing(4), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, alignItems: 'center' })}>
                  <Text style={[typography.label, { color: colors.primary }]}>LOAD MORE COURSES</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>

        {/* Desktop Sidebar */}
        {isDesktop && (
          <View style={{ width: 300, flexShrink: 0 }}>
            <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: spacing(6) }, elevation]}>
              <Text style={[typography.h2, { color: colors.textPrimary }]}>Overview</Text>
              <StatPill icon="book-outline" label="Total Programs" value={`${allCourses.length}`} />
              <StatPill icon="search-outline" label="Showing" value={`${paginatedCourses.length}`} />
              <Pressable onPress={clearFilters} style={{ marginTop: spacing(4), padding: spacing(4), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border }}>
                <Text style={[typography.label, { color: colors.textPrimary }]}>Clear Filters</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
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