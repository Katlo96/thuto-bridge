import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  type ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import {
  StudentMenuProvider,
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
import StudentFooter from '../../components/student/StudentFooter';

// ─────────────────────────────────────────────────────────────────────────────
// Firebase
// ─────────────────────────────────────────────────────────────────────────────
import { db } from '../../constants/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useLanguage } from '../../contexts/LanguageContext';

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

type College = {
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
    return (
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: radius },
        android: { elevation: intensity === 'sm' ? 3 : intensity === 'md' ? 6 : 12 },
        web: { boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})` } as any,
        default: {},
      }) ?? {}
    ) as ViewStyle;
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable Components
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
      {icon && <Ionicons name={icon} size={20} color={colors.primary} />}
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
  const colors = useTheme();
  const { t } = useLanguage();
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
// Note Modal
// ─────────────────────────────────────────────────────────────────────────────
function NoteModal({
  visible,
  noteText,
  onChangeText,
  onClose,
  onSave,
}: {
  visible: boolean;
  noteText: string;
  onChangeText: (t: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const colors = useTheme();
  const elevation = useElevation('lg');
  const { t } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing(5) }} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxWidth: 500 }}>
          <Pressable style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevation]} onPress={(e) => e.stopPropagation()}>
            <View style={{ height: 3, backgroundColor: colors.primary }} />
            <View style={{ padding: spacing(6), gap: spacing(5) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[typography.h2, { color: colors.textPrimary }]}>{t('Add Quick Note')}</Text>
                <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t('Close')} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <TextInput
                value={noteText}
                onChangeText={onChangeText}
                placeholder={t('e.g. Strong business faculty. Good for entrepreneurship track...')}
                placeholderTextColor={colors.textMuted}
                style={{ minHeight: 120, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing(4), backgroundColor: colors.surfaceAlt, color: colors.textPrimary, textAlignVertical: 'top', fontSize: 15 }}
                multiline
              />

              <View style={{ flexDirection: 'row', gap: spacing(3) }}>
                <Pressable onPress={onClose} style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>{t('Cancel')}</Text>
                </Pressable>
                <Pressable onPress={onSave} style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : 1 })}>
                  <Text style={[typography.label, { color: '#fff' }]}>{t('Save Note')}</Text>
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
// Main Content
// ─────────────────────────────────────────────────────────────────────────────
function CollegeDetailsContent() {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ id?: string }>();
  const collegeId = typeof params.id === 'string' ? params.id : '';

  const [college, setCollege] = useState<College | null>(null);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(null);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');

  // Pagination State
  const INITIAL_VISIBLE_COUNT = 6;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const breakpoint = useMemo<Breakpoint>(() => (width < 768 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop'), [width]);
  const isMobile = breakpoint === 'mobile';
  const isDesktop = breakpoint === 'desktop';

  // Fetch College + Faculties + Courses
  useEffect(() => {
    if (!collegeId) {
      setError(t('College ID not found'));
      setLoading(false);
      return;
    }

    const fetchCollegeData = async () => {
      try {
        setLoading(true);
        setError(null);

        const collegeDoc = await getDoc(doc(db, 'institutions', collegeId));
        if (!collegeDoc.exists()) {
          setError(t('College not found'));
          return;
        }

        const data = collegeDoc.data();
        const accentColor = data.ownership === 'Private' ? '#34D399' : '#60A5FA';

        const collegeData: College = {
          id: collegeDoc.id,
          name: data.name,
          location: data.location,
          website: data.website || '',
          badge: data.badge || 'COL',
          about: data.about || '',
          ownership: data.ownership || 'Public',
          established: String(data.established || 'N/A'),
          accentColor,
        };
        setCollege(collegeData);

        const facultiesQuery = query(collection(db, 'faculties'), where('institutionId', '==', collegeId));
        const facultiesSnap = await getDocs(facultiesQuery);
        const fetchedFaculties = facultiesSnap.docs
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name,
            institutionId: doc.data().institutionId,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        setFaculties(fetchedFaculties);

        const coursesQuery = query(collection(db, 'courses'), where('institutionId', '==', collegeId));
        const coursesSnap = await getDocs(coursesQuery);
        const fetchedCourses = coursesSnap.docs
          .map((doc) => {
            const c = doc.data();
            return {
              id: doc.id,
              title: c.title,
              qualificationLevel: c.qualificationLevel || 'Diploma',
              duration: c.duration || '3 Years',
              requiredPoints: c.requiredPoints || 24,
              facultyId: c.facultyId,
            };
          })
          .sort((a, b) => a.title.localeCompare(b.title));
        setCourses(fetchedCourses);
      } catch (err: any) {
        console.error('COLLEGE DETAILS ERROR:', err);
        setError(t('Failed to load college information'));
      } finally {
        setLoading(false);
      }
    };

    fetchCollegeData();
  }, [collegeId, t]);

  const filteredCourses = useMemo(() => {
    if (!selectedFacultyId) return courses;
    return courses.filter((c) => c.facultyId === selectedFacultyId);
  }, [courses, selectedFacultyId]);

  // Handle "Load More" logic
  const displayedCourses = useMemo(() => {
    return filteredCourses.slice(0, visibleCount);
  }, [filteredCourses, visibleCount]);

  const hasMore = filteredCourses.length > visibleCount;

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + INITIAL_VISIBLE_COUNT);
  };

  const handleVisitWebsite = () => {
    if (college?.website) {
      Alert.alert(t('Visit Website'), `${t('Official Website')}: ${college.website}`);
    } else {
      Alert.alert(t('No website available'));
    }
  };

  const handleOpenCourse = (courseId: string) => {
    router.push({ pathname: '/student/course-details', params: { id: courseId } });
  };

  const handleSaveNote = () => {
    Alert.alert(t('Note Saved'), t('Your note has been saved successfully.'));
    setNoteModalVisible(false);
    setNoteText('');
  };

  const handleFacultySelect = (id: string | null) => {
    setSelectedFacultyId(id);
    setVisibleCount(INITIAL_VISIBLE_COUNT); // Reset pagination when filter changes
  };

  if (loading) {
    return (
      <DashboardLayout title={t('College Details')} subtitle={t('Loading...')} showPointsCard={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing(10) }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(4) }]}>{t('Loading college information...')}</Text>
        </View>
      </DashboardLayout>
    );
  }

  if (error || !college) {
    return (
      <DashboardLayout title={t('College Details')} subtitle={t('Error')} showPointsCard={false}>
        <View style={{ padding: spacing(8), alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(4), textAlign: 'center' }]}>{error || t('Failed to load college')}</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: spacing(6), paddingHorizontal: spacing(6), paddingVertical: spacing(3), backgroundColor: colors.primary, borderRadius: radii.lg }}>
            <Text style={[typography.label, { color: '#fff' }]}>{t('Go Back')}</Text>
          </Pressable>
        </View>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout title={t('College Details')} subtitle={college.name} showPointsCard={false}>
        {/* Back + Breadcrumb */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(6) }}>
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel={t('Go Back')} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}>
            <Ionicons name="arrow-back" size={17} color={colors.primary} />
            <Text style={[typography.label, { color: colors.primary }]}>{t('Go Back')}</Text>
          </Pressable>
          <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]} numberOfLines={1}>
            {t('Institutions › Colleges › ')}{college.badge}
          </Text>
        </View>

        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing(8) }}>
          <View style={{ flex: 1, minWidth: 0 }}>
            {/* Hero Card */}
            <Card intensity="lg" accentColor={college.accentColor} style={{ marginBottom: spacing(7) }}>
              <View style={{ padding: isMobile ? spacing(5) : spacing(7), gap: spacing(5) }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                  <View style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: `${college.accentColor}1A`, borderWidth: 1, borderColor: `${college.accentColor}44` }}>
                    <Text style={[typography.label, { color: college.accentColor }]}>{college.badge}</Text>
                  </View>
                  <View style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
                      {college.ownership} • Est. {college.established}
                    </Text>
                  </View>
                </View>

                <Text style={[typography.hero, { color: colors.textPrimary, fontSize: isMobile ? 24 : 32, lineHeight: isMobile ? 30 : 38 }]}>
                  {college.name}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2) }}>
                  <Ionicons name="location-outline" size={14} color={college.accentColor} />
                  <Text style={[typography.subtitle, { color: colors.textSecondary }]}>{college.location}</Text>
                </View>

                <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 24 }]}>{college.about}</Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(4), paddingTop: spacing(4), borderTopWidth: 1, borderTopColor: colors.divider }}>
                  <MetaItem icon="location-outline" label={t('Location')} value={college.location} />
                  <MetaItem icon="globe-outline" label={t('Website')} value={college.website || t('N/A')} />
                </View>
              </View>
            </Card>

            {/* Faculties Filter */}
            <Card style={{ marginBottom: spacing(6) }}>
              <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
                <SectionLabel title={t('Schools & Departments')} />
                <SectionTitle title={t('Browse by Faculty')} icon="layers-outline" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(2) }}>
                  <FacultyChip name={t('All')} isActive={selectedFacultyId === null} onPress={() => handleFacultySelect(null)} />
                  {faculties.map((faculty) => (
                    <FacultyChip
                      key={faculty.id}
                      name={faculty.name}
                      isActive={selectedFacultyId === faculty.id}
                      onPress={() => handleFacultySelect(faculty.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            </Card>

            {/* Courses Section */}
            <Card style={{ marginBottom: spacing(6) }}>
              <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing(1) }}>
                    <SectionLabel title={t('Programmes')} />
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                        {displayedCourses.length}{t(' of ')}{filteredCourses.length}
                    </Text>
                </View>
                <SectionTitle title={t('Courses Offered')} icon="school-outline" />

                {filteredCourses.length === 0 ? (
                  <View style={{ padding: spacing(8), alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radii.xl }}>
                    <Ionicons name="book-outline" size={48} color={colors.textMuted} />
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(3), textAlign: 'center' }]}>
                      {t('No courses found.')}
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={{ gap: spacing(2) }}>
                      {displayedCourses.map((course) => (
                        <CourseRow key={course.id} course={course} onPress={() => handleOpenCourse(course.id)} />
                      ))}
                    </View>

                    {hasMore && (
                      <Pressable 
                        onPress={handleLoadMore}
                        accessibilityRole="button"
                        accessibilityLabel={t('Load More Courses')} 
                        style={({ pressed }) => ({
                          marginTop: spacing(6),
                          paddingVertical: spacing(4),
                          backgroundColor: colors.surfaceAlt,
                          borderRadius: radii.lg,
                          borderWidth: 1,
                          borderColor: colors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexDirection: 'row',
                          gap: spacing(2),
                          opacity: pressed ? 0.8 : 1
                        })}
                      >
                        <Text style={[typography.label, { color: colors.primary }]}>{t('Load More Courses')}</Text>
                        <Ionicons name="chevron-down" size={16} color={colors.primary} />
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            </Card>
          </View>

          {/* Desktop Sidebar */}
          {isDesktop && (
            <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
              <Card intensity="md">
                <View style={{ padding: spacing(6), gap: spacing(3) }}>
                  <SectionLabel title={t('Actions')} />
                  <SectionTitle title={t('Quick Actions')} />
                  <Pressable onPress={handleVisitWebsite} accessibilityRole="button" accessibilityLabel={t('Visit Website')} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing(3), padding: spacing(4), backgroundColor: colors.primary, borderRadius: radii.lg, opacity: pressed ? 0.9 : 1 })}>
                    <Ionicons name="open-outline" size={18} color="#fff" />
                    <Text style={[typography.label, { color: '#fff' }]}>{t('Visit Website')}</Text>
                  </Pressable>
                  <Pressable onPress={() => setNoteModalVisible(true)} accessibilityRole="button" accessibilityLabel={t('Add Note')} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing(3), padding: spacing(4), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.9 : 1 })}>
                    <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                    <Text style={[typography.label, { color: colors.textSecondary }]}>{t('Add Note')}</Text>
                  </Pressable>
                </View>
              </Card>
            </View>
          )}

          {/* Mobile actions */}
          {isMobile && (
            <View style={{ gap: spacing(3), marginBottom: spacing(4) }}>
              <Pressable
                onPress={handleVisitWebsite}
                accessibilityRole="button"
                accessibilityLabel={t('Visit Official Website')}
                style={({ pressed }) => ({
                  minHeight: 56,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing(3),
                  paddingHorizontal: spacing(4),
                  backgroundColor: colors.primary,
                  borderRadius: radii.xl,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Ionicons name="open-outline" size={20} color="#fff" />
                <Text
                  style={[
                    typography.bodyStrong,
                    { color: '#fff', textAlign: 'center', flexShrink: 1 },
                  ]}
                >
                  {t('Visit Official Website')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setNoteModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={t('Add Note')}
                style={({ pressed }) => ({
                  minHeight: 56,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing(3),
                  paddingHorizontal: spacing(4),
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radii.xl,
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <Ionicons name="create-outline" size={20} color={colors.textSecondary} />
                <Text
                  style={[
                    typography.bodyStrong,
                    { color: colors.textSecondary, textAlign: 'center', flexShrink: 1 },
                  ]}
                >
                  {t('Add Note')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        <StudentFooter
          topSpacing={isMobile ? spacing(8) : spacing(10)}
          maxWidth={1280}
        />
      </DashboardLayout>

      <NoteModal
        visible={noteModalVisible}
        noteText={noteText}
        onChangeText={setNoteText}
        onClose={() => setNoteModalVisible(false)}
        onSave={handleSaveNote}
      />
    </>
  );
}

export default function CollegeDetailsScreen() {
  return (
    <StudentMenuProvider>
      <CollegeDetailsContent />
    </StudentMenuProvider>
  );
}