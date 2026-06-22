import React, { useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../../constants/firebase';
import DashboardLayout, {
  spacing,
  typography,
  radii,
  useTheme,
} from '../../components/student/DashboardLayout';
import { StudentMenuProvider } from '../../components/student/StudentMenu';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Breakpoint = 'mobile' | 'tablet' | 'desktop';

type Course = {
  id: string;
  title: string;
  qualificationLevel: string;
  duration: string;
  requiredPoints: number;
  tuitionPerYear?: number;
  mode: string;
  about: string;
  institutionId: string;
  facultyId: string;
  institutionName?: string;
  institutionType?: 'university' | 'college' | 'brigade';
  facultyName?: string;
  careers?: string[];
  matchScore?: number;
  eligibilityMet?: boolean;
  subjectRequirements?: Array<{ subject: string; minimumGrade: string }>;
  minimumPoints?: number;
};

type BestRowSummary = {
  subject: string;
  grade: string;
  points: number;
  countsAs: 1 | 2;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function normalizeSubjectName(s: string): string {
  return s.trim().replace(/\s+/g, ' ').toUpperCase();
}

function toTitle(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function gradeToPoints(grade: string): number {
  const upper = grade.toUpperCase().trim();
  if (['A*', 'A'].includes(upper)) return 7;
  if (upper === 'B') return 6;
  if (upper === 'C') return 5;
  if (upper === 'D') return 4;
  if (upper === 'E') return 3;
  return 2;
}

function meetsMinimumGrade(studentGrade: string, requiredGrade: string): boolean {
  return gradeToPoints(studentGrade) >= gradeToPoints(requiredGrade);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
function CourseRecContent() {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const params = useLocalSearchParams<{ totalPoints?: string; bestRows?: string }>();

  const userPoints = parseInt(params.totalPoints || '0', 10);
  const userBestSubjects = useMemo<BestRowSummary[]>(() => {
    try {
      return params.bestRows ? JSON.parse(params.bestRows) : [];
    } catch {
      return [];
    }
  }, [params.bestRows]);

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'university' | 'college' | 'brigade'>('ALL');
  const [sortBy, setSortBy] = useState<'match' | 'points' | 'name'>('match');
  const [showOnlyEligible, setShowOnlyEligible] = useState(true);
  const [savedCourses, setSavedCourses] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(8);

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 720) return 'mobile';
    if (width < 1100) return 'tablet';
    return 'desktop';
  }, [width]);

  const isMobile = breakpoint === 'mobile';

  // Load saved courses from AsyncStorage on mount
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const saved = await AsyncStorage.getItem('savedCourses');
        if (saved) {
          setSavedCourses(new Set(JSON.parse(saved)));
        }
      } catch (e) {
        console.error('Failed to load saved courses', e);
      }
    };
    loadSaved();
  }, []);

  // Load Courses + Institutions with STRICT Recommendation Logic
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Fetch Institutions
        const instSnapshot = await getDocs(collection(db, 'institutions'));
        const instMap = new Map<string, string>();
        instSnapshot.forEach((doc) => {
          const data = doc.data();
          instMap.set(doc.id, data.name || data.institutionName || 'Unknown Institution');
        });

        // Fetch Courses
        const q = query(collection(db, 'courses'), orderBy('requiredPoints'));
        const courseSnapshot = await getDocs(q);
        const loaded: Course[] = [];

        courseSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const institutionName = instMap.get(data.institutionId) || 'Unknown Institution';

          let instType = data.institutionType;
          if (!instType || typeof instType !== 'string' || instType.trim() === '') {
            const instId = (data.institutionId || '').toLowerCase();
            if (instId.includes('uni')) instType = 'university';
            else if (instId.includes('col')) instType = 'college';
            else instType = 'brigade';
          }

          loaded.push({
            id: docSnap.id,
            title: data.title || 'Untitled Course',
            qualificationLevel: data.qualificationLevel || 'Bachelor Degree',
            duration: data.duration || '4 Years',
            requiredPoints: data.requiredPoints || 999,
            tuitionPerYear: data.tuitionPerYear || 25000,
            mode: data.mode || 'Full-time',
            about: data.about || '',
            institutionId: data.institutionId,
            facultyId: data.facultyId,
            institutionName,
            institutionType: instType as 'university' | 'college' | 'brigade',
            facultyName: data.facultyName,
            careers: data.careers || [],
            subjectRequirements: data.subjectRequirements || [],
            minimumPoints: data.minimumPoints || data.requiredPoints,
          });
        });

        // STRICT Recommendation Engine
        const scoredCourses = loaded
          .map((course) => {
            const studentSubjectsMap = new Map(
              userBestSubjects.map((s) => [normalizeSubjectName(s.subject), s.grade])
            );

            let requiredMet = 0;
            const totalRequired = course.subjectRequirements?.length || 0;

            if (course.subjectRequirements && course.subjectRequirements.length > 0) {
              for (const req of course.subjectRequirements) {
                const normSubj = normalizeSubjectName(req.subject);
                const studentGrade = studentSubjectsMap.get(normSubj);
                if (studentGrade && meetsMinimumGrade(studentGrade, req.minimumGrade)) {
                  requiredMet++;
                }
              }
            }

            const minPts = course.minimumPoints || course.requiredPoints;
            const pointsMet = userPoints >= minPts - 3;

            let score = 30;
            const pointsDiff = Math.max(0, minPts - userPoints);
            score += Math.max(0, 70 - pointsDiff * 3);

            const subjectRatio = totalRequired > 0 ? requiredMet / totalRequired : 0.5;
            score += Math.round(subjectRatio * 160);

            if (requiredMet === totalRequired && totalRequired > 0) score += 90;
            if (userPoints >= minPts) score += 70;

            const eligibilityMet =
              (totalRequired === 0 || requiredMet >= Math.ceil(totalRequired * 0.8)) &&
              pointsMet;

            return {
              ...course,
              matchScore: Math.min(100, Math.round(score)),
              eligibilityMet,
            };
          })
          .filter((course) => course.eligibilityMet && course.matchScore >= 70)
          .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

        setCourses(scoredCourses);
      } catch (err) {
        console.error('Failed to load data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userPoints, userBestSubjects]);

  // Filtered, Sorted & Paginated
  const displayedCourses = useMemo(() => {
    let result = [...courses];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((c) =>
        c.title.toLowerCase().includes(term) ||
        (c.institutionName || '').toLowerCase().includes(term) ||
        (c.about || '').toLowerCase().includes(term)
      );
    }

    if (filterType !== 'ALL') {
      result = result.filter((c) => c.institutionType === filterType);
    }

    if (showOnlyEligible) {
      result = result.filter((c) => c.eligibilityMet === true);
    }

    if (sortBy === 'points') {
      result.sort((a, b) => a.requiredPoints - b.requiredPoints);
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }
    // Default is already sorted by matchScore

    return result;
  }, [courses, searchTerm, filterType, sortBy, showOnlyEligible]);

  const visibleCourses = displayedCourses.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 8, displayedCourses.length));
  };

  const toggleSave = async (id: string) => {
    const newSaved = new Set(savedCourses);
    if (newSaved.has(id)) {
      newSaved.delete(id);
    } else {
      newSaved.add(id);
    }
    setSavedCourses(newSaved);
    await AsyncStorage.setItem('savedCourses', JSON.stringify(Array.from(newSaved)));
  };

  const handleCoursePress = (id: string) => {
    router.push(`/student/course-details?id=${id}`);
  };

  return (
    <DashboardLayout title="Recommended Courses" subtitle="Best suited for your results" showPointsCard={false}>
      {/* Hero Summary */}
      <View style={{ marginBottom: spacing(6) }}>
        <View style={{ backgroundColor: colors.primary, borderRadius: radii.xxl, padding: spacing(6), flexDirection: isMobile ? 'column' : 'row', alignItems: 'center', gap: spacing(5) }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 52, fontWeight: '900', color: '#fff', letterSpacing: -2 }}>{userPoints}</Text>
            <Text style={[typography.caption, { color: '#fff', opacity: 0.9 }]}>YOUR POINTS</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.h2, { color: '#fff', marginBottom: spacing(1) }]}>Best Courses For You</Text>
            <Text style={[typography.body, { color: '#fff', opacity: 0.85, lineHeight: 22 }]}>
              Only programs you are strongly qualified for based on your points and best 6 subjects.
            </Text>
          </View>
        </View>
      </View>

      {/* Filters */}
      <View style={{ marginBottom: spacing(5), gap: spacing(4) }}>
        <View style={{ flexDirection: isMobile ? 'column' : 'row', gap: spacing(3) }}>
          <View style={{ flex: 1 }}>
            <TextInput
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search courses, institutions..."
              style={{
                backgroundColor: colors.surfaceAlt,
                borderRadius: radii.xl,
                padding: spacing(4),
                borderWidth: 1,
                borderColor: colors.border,
                fontSize: 16,
              }}
              placeholderTextColor={colors.textMuted}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: spacing(2), flexWrap: 'wrap' }}>
            {(['ALL', 'university', 'college', 'brigade'] as const).map((type) => (
              <Pressable
                key={type}
                onPress={() => { setFilterType(type); setVisibleCount(8); }}
                style={({ pressed }) => ({
                  paddingHorizontal: spacing(4),
                  paddingVertical: spacing(2.5),
                  borderRadius: radii.xl,
                  backgroundColor: filterType === type ? colors.primary : colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: filterType === type ? colors.primary : colors.border,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Text style={[typography.label, { color: filterType === type ? '#fff' : colors.textPrimary }]}>
                  {type === 'ALL' ? 'All' : toTitle(type) + 's'}
                </Text>
              </Pressable>
            ))}

            <Pressable
              onPress={() => { setShowOnlyEligible(!showOnlyEligible); setVisibleCount(8); }}
              style={({ pressed }) => ({
                paddingHorizontal: spacing(4),
                paddingVertical: spacing(2.5),
                borderRadius: radii.xl,
                backgroundColor: showOnlyEligible ? colors.primary : colors.surfaceAlt,
                borderWidth: 1,
                borderColor: showOnlyEligible ? colors.primary : colors.border,
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={[typography.label, { color: showOnlyEligible ? '#fff' : colors.textPrimary }]}>
                Eligible Only
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: spacing(3), alignItems: 'center' }}>
          <Text style={[typography.caption, { color: colors.textMuted }]}>SORT BY</Text>
          {(['match', 'points', 'name'] as const).map((option) => (
            <Pressable
              key={option}
              onPress={() => { setSortBy(option); setVisibleCount(8); }}
              style={({ pressed }) => ({
                paddingHorizontal: spacing(3.5),
                paddingVertical: spacing(2),
                borderRadius: radii.lg,
                backgroundColor: sortBy === option ? colors.primary : colors.surfaceAlt,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={[typography.label, { color: sortBy === option ? '#fff' : colors.textPrimary }]}>
                {option === 'match' ? 'Best Match' : option === 'points' ? 'Points' : 'Name'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Statistics Bar */}
      {!loading && (
        <View style={{ padding: spacing(3), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, marginBottom: spacing(4) }}>
          <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            Total Recommended: {courses.length} • 
            Universities: {courses.filter(c => c.institutionType === 'university').length} • 
            Colleges: {courses.filter(c => c.institutionType === 'college').length} • 
            Brigades: {courses.filter(c => c.institutionType === 'brigade').length}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center', marginTop: 4 }]}>
            Showing {visibleCourses.length} of {displayedCourses.length}
          </Text>
        </View>
      )}

      {/* Results */}
      {loading ? (
        <View style={{ padding: spacing(12), alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(4) }]}>Finding best matches for you...</Text>
        </View>
      ) : (
        <View style={{ gap: spacing(4) }}>
          {visibleCourses.length === 0 ? (
            <View style={{ padding: spacing(10), alignItems: 'center' }}>
              <Ionicons name="school-outline" size={64} color={colors.textMuted} />
              <Text style={[typography.h2, { color: colors.textMuted, marginTop: spacing(4) }]}>No strong matches found</Text>
              <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
                Try turning off "Eligible Only" or check your results.
              </Text>
            </View>
          ) : (
            visibleCourses.map((course: any) => (
              <Pressable
                key={course.id}
                onPress={() => handleCoursePress(course.id)}
                style={({ pressed }) => ({
                  backgroundColor: colors.surface,
                  borderRadius: radii.xxl,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: 'hidden',
                  opacity: pressed ? 0.95 : 1,
                })}
              >
                <View style={{ height: 5, backgroundColor: colors.primary }} />

                <View style={{ padding: spacing(5.5), gap: spacing(4) }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.h2, { fontSize: 18, marginBottom: 4 }]}>{course.title}</Text>
                      <Text style={[typography.body, { color: colors.textSecondary }]}>{course.institutionName}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3) }}>
                      <View style={{ backgroundColor: `${colors.primary}12`, paddingHorizontal: spacing(3), paddingVertical: spacing(1), borderRadius: radii.lg }}>
                        <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{course.matchScore}%</Text>
                      </View>
                      <Pressable onPress={(e) => { e.stopPropagation(); toggleSave(course.id); }} hitSlop={10}>
                        <Ionicons 
                          name={savedCourses.has(course.id) ? "heart" : "heart-outline"} 
                          size={26} 
                          color={savedCourses.has(course.id) ? "#ef4444" : colors.textMuted} 
                        />
                      </Pressable>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: spacing(4), flexWrap: 'wrap' }}>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>{course.qualificationLevel} • {course.duration}</Text>
                    <Text style={[typography.caption, { color: colors.primary }]}>
                      {course.requiredPoints} pts ✓ Qualified
                    </Text>
                  </View>

                  <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 22 }]} numberOfLines={2}>{course.about}</Text>

                  {course.careers?.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                      {course.careers.slice(0, 3).map((career: string, i: number) => (
                        <View key={i} style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(1), backgroundColor: colors.surfaceAlt, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border }}>
                          <Text style={[typography.caption, { color: colors.textPrimary }]}>{career}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </Pressable>
            ))
          )}

          {visibleCourses.length < displayedCourses.length && (
            <Pressable onPress={handleLoadMore} style={{ padding: spacing(4), backgroundColor: colors.surfaceAlt, borderRadius: radii.xl, alignItems: 'center', marginTop: spacing(4) }}>
              <Text style={[typography.label, { color: colors.primary }]}>Load More Recommended Courses</Text>
            </Pressable>
          )}
        </View>
      )}
    </DashboardLayout>
  );
}

export default function CourseRec() {
  return (
    <StudentMenuProvider>
      <CourseRecContent />
    </StudentMenuProvider>
  );
}