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
ActivityIndicator,
ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
// Firebase
// ─────────────────────────────────────────────────────────────────────────────
import { db } from '../../constants/firebase';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
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
    <View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: 'hidden',
        },
        elevation,
        style,
      ]}
    >
      {accentColor && <View style={{ height: 3, backgroundColor: accentColor }} />}
      {children}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionLabel + SectionTitle
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// MetaItem
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// CourseRow
// ─────────────────────────────────────────────────────────────────────────────
function CourseRow({ course, onPress }: { course: Course; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`View ${course.title}`}
      style={({ pressed }) => ({
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
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
          {course.qualificationLevel} • {course.duration} • {course.requiredPoints} points
        </Text>
      </View>
      <View style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(1), borderRadius: radii.pill, backgroundColor: `${colors.primary}22` }}>
        <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{course.requiredPoints}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ marginLeft: spacing(3) }} />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Faculty Chip
// ─────────────────────────────────────────────────────────────────────────────
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
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing(5) }}
        onPress={onClose}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', maxWidth: 500 }}>
          <Pressable
            style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevation]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ height: 3, backgroundColor: colors.primary }} />
            <View style={{ padding: spacing(6), gap: spacing(5) }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={[typography.h2, { color: colors.textPrimary }]}>Add Quick Note</Text>
                <Pressable onPress={onClose} style={({ pressed }) => ({ width: 40, height: 40, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const, opacity: pressed ? 0.7 : 1 })}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
              <TextInput
                value={noteText}
                onChangeText={onChangeText}
                placeholder="e.g. Strong engineering faculty. Compare points with my results..."
                placeholderTextColor={colors.textMuted}
                style={{ minHeight: 120, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing(4), backgroundColor: colors.surfaceAlt, color: colors.textPrimary, textAlignVertical: 'top', fontSize: 15 }}
                multiline
              />
              <View style={{ flexDirection: 'row', gap: spacing(3) }}>
                <Pressable onPress={onClose} style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center' as const, justifyContent: 'center' as const, opacity: pressed ? 0.85 : 1 })}>
                  <Text style={[typography.label, { color: colors.textPrimary }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={onSave} style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center' as const, justifyContent: 'center' as const, opacity: pressed ? 0.9 : 1 })}>
                  <Text style={[typography.label, { color: '#fff' }]}>Save Note</Text>
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
  uni,
  onVisitWebsite,
  onAddNote,
}: {
  uni: University;
  onVisitWebsite: () => void;
  onAddNote: () => void;
}) {
  const colors = useTheme();
  const elevation = useElevation('md');
  return (
    <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
      {/* Quick actions card */}
      <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevation]}>
        <View style={{ height: 3, backgroundColor: uni.accentColor }} />
        <View style={{ padding: spacing(6), gap: spacing(3) }}>
          <SectionLabel title="Actions" />
          <SectionTitle title="Quick Actions" />
          <Pressable onPress={onVisitWebsite} style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(3), padding: spacing(4), backgroundColor: colors.primary, borderRadius: radii.lg, opacity: pressed ? 0.9 : 1, transform: pressed ? [{ scale: 0.98 }] : [] })}>
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={[typography.label, { color: '#fff' }]}>Visit Website</Text>
          </Pressable>
          <Pressable onPress={onAddNote} style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(3), padding: spacing(4), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.9 : 1, transform: pressed ? [{ scale: 0.98 }] : [] })}>
            <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
            <Text style={[typography.label, { color: colors.textSecondary }]}>Add Note</Text>
          </Pressable>
        </View>
      </View>

      {/* Quick facts */}
      <View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: spacing(6), gap: spacing(1) }, elevation]}>
        <SectionLabel title="Overview" />
        <SectionTitle title="Quick Facts" />
        <MetaItem icon="calendar-outline" label="Established" value={`Est. ${uni.established}`} />
        <View style={{ height: 1, backgroundColor: colors.divider }} />
        <MetaItem icon={uni.ownership === 'Public' ? 'business-outline' : 'lock-closed-outline'} label="Institution Type" value={uni.ownership} />
        <View style={{ height: 1, backgroundColor: colors.divider }} />
        <MetaItem icon="location-outline" label="Location" value={uni.location} />
      </View>

      {/* Tip */}
      <View style={{ padding: spacing(4), backgroundColor: `${colors.primary}14`, borderRadius: radii.xl, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
        <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
          💡 Tap any course to view detailed entry requirements, career paths, and sponsorship options.
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main screen content
// ─────────────────────────────────────────────────────────────────────────────
function UniversityDetailsContent() {
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
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isMobile = breakpoint === 'mobile';
  const isDesktop = breakpoint === 'desktop';

  // Fetch University + Faculties + Courses
  useEffect(() => {
    if (!uniId) {
      setError("University ID not found");
      setLoading(false);
      return;
    }

    const fetchUniversityData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch University
        const uniDoc = await getDoc(doc(db, 'institutions', uniId));
        if (!uniDoc.exists()) {
          setError("University not found");
          return;
        }

        const uniData = uniDoc.data();
        const accentColor = uniData.ownership === 'Private' ? '#34D399' : '#60A5FA';

        const uni: University = {
          id: uniDoc.id,
          name: uniData.name,
          location: uniData.location,
          website: uniData.website || '',
          badge: uniData.badge || 'UNI',
          about: uniData.about || '',
          ownership: uniData.ownership || 'Public',
          established: String(uniData.established || 'N/A'),
          accentColor,
        };

        setUniversity(uni);

        // Fetch Faculties
        const facultiesQuery = query(
  collection(db, 'faculties'),
  where('institutionId', '==', uniId)
);
        const facultiesSnap = await getDocs(facultiesQuery);
        const fetchedFaculties = facultiesSnap.docs
  .map(doc => ({
    id: doc.id,
    name: doc.data().name,
    institutionId: doc.data().institutionId,
  }))
  .sort((a, b) => a.name.localeCompare(b.name));
        setFaculties(fetchedFaculties);

        // Fetch Courses
        const coursesQuery = query(
  collection(db, 'courses'),
  where('institutionId', '==', uniId)
);
        const coursesSnap = await getDocs(coursesQuery);
        const fetchedCourses = coursesSnap.docs
  .map(doc => {
    const data = doc.data();

    return {
      id: doc.id,
      title: data.title,
      qualificationLevel: data.qualificationLevel || 'Bachelor Degree',
      duration: data.duration || '4 Years',
      requiredPoints: data.requiredPoints || 0,
      facultyId: data.facultyId,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title));

  setCourses(fetchedCourses);

  

      } catch (err: any) {
  console.error('UNIVERSITY DETAILS ERROR:', err);

  setError(
    err?.message ||
    JSON.stringify(err) ||
    'Unknown error'
  );
} finally {
        setLoading(false);
      }
    };

    fetchUniversityData();
  }, [uniId]);

  

  

  const filteredCourses = useMemo(() => {
    if (!selectedFacultyId) return courses;
    return courses.filter(course => course.facultyId === selectedFacultyId);
  }, [courses, selectedFacultyId]);

  const handleVisitWebsite = useCallback(() => {
    if (university?.website) {
      Alert.alert('Visit Website', `Would open: ${university.website}`);
    } else {
      Alert.alert('No website available');
    }
  }, [university]);

  const handleOpenCourse = useCallback((courseId: string) => {
    router.push({ pathname: '/student/course-details', params: { id: courseId } });
  }, []);

  const handleSaveNote = useCallback(() => {
    Alert.alert('Note Saved', 'Your note has been saved successfully.');
    setNoteModalVisible(false);
    setNoteText('');
  }, []);

  const clearFacultyFilter = () => setSelectedFacultyId(null);

  // Loading State
  if (loading) {
    return (
      <DashboardLayout title="University Details" subtitle="Loading..." showPointsCard={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing(10) }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(4) }]}>Loading university information...</Text>
        </View>
      </DashboardLayout>
    );
  }

  if (error || !university) {
    return (
      <DashboardLayout title="University Details" subtitle="Error" showPointsCard={false}>
        <View style={{ padding: spacing(8), alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(4), textAlign: 'center' }]}>{error || 'Failed to load university'}</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: spacing(6), paddingHorizontal: spacing(6), paddingVertical: spacing(3), backgroundColor: colors.primary, borderRadius: radii.lg }}>
            <Text style={[typography.label, { color: '#fff' }]}>Go Back</Text>
          </Pressable>
        </View>
      </DashboardLayout>
    );
  }

  return (
    <>
      <DashboardLayout
        title="University Details"
        subtitle={university.name}
        showPointsCard={false}
      >
        {/* Back + breadcrumb */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(6) }}>
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => ({
              flexDirection: 'row' as const,
              alignItems: 'center' as const,
              gap: spacing(2),
              paddingHorizontal: spacing(4),
              paddingVertical: spacing(2),
              borderRadius: radii.lg,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.8 : 1,
            })}
          >
            <Ionicons name="arrow-back" size={17} color={colors.primary} />
            <Text style={[typography.label, { color: colors.primary }]}>Back</Text>
          </Pressable>
          <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]} numberOfLines={1}>
            Institutions › Universities › {university.badge}
          </Text>
        </View>

        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: spacing(8), alignItems: 'flex-start' }}>
          {/* Main Content */}
          <View style={{ flex: 1, minWidth: 0 }}>
            {/* Hero Card */}
            <Card intensity="lg" accentColor={university.accentColor} style={{ marginBottom: spacing(7) }}>
              <View style={{ padding: isMobile ? spacing(5) : spacing(7), gap: spacing(5) }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
                  <View style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: `${university.accentColor}1A`, borderWidth: 1, borderColor: `${university.accentColor}44` }}>
                    <Text style={[typography.label, { color: university.accentColor, letterSpacing: 0.4 }]}>{university.badge}</Text>
                  </View>
                  <View style={{ paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
                    <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
                      {university.ownership} · Est. {university.established}
                    </Text>
                  </View>
                </View>

                <View>
                  <Text style={[typography.hero, { color: colors.textPrimary, fontSize: isMobile ? 24 : 32, lineHeight: isMobile ? 30 : 38 }]}>
                    {university.name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(2) }}>
                    <Ionicons name="location-outline" size={14} color={university.accentColor} />
                    <Text style={[typography.subtitle, { color: colors.textSecondary }]}>{university.location}</Text>
                  </View>
                </View>

                <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 24 }]}>{university.about}</Text>

                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(4), paddingTop: spacing(4), borderTopWidth: 1, borderTopColor: colors.divider }}>
                  <MetaItem icon="location-outline" label="Location" value={university.location} />
                  <MetaItem icon="globe-outline" label="Website" value={university.website || 'N/A'} />
                </View>
              </View>
            </Card>

            {/* Faculties Filter */}
            <Card style={{ marginBottom: spacing(6) }}>
              <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
                <SectionLabel title="Faculties" />
                <SectionTitle title="Browse by Faculty" icon="layers-outline" />

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: spacing(2) }}
                >
                  <FacultyChip
                    name="All Faculties"
                    isActive={selectedFacultyId === null}
                    onPress={clearFacultyFilter}
                  />
                  {faculties.map((faculty) => (
                    <FacultyChip
                      key={faculty.id}
                      name={faculty.name}
                      isActive={selectedFacultyId === faculty.id}
                      onPress={() => setSelectedFacultyId(faculty.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            </Card>

            {/* Courses Section */}
            <Card style={{ marginBottom: spacing(6) }}>
              <View style={{ padding: isMobile ? spacing(5) : spacing(6) }}>
                <SectionLabel title="Programmes" />
                <SectionTitle title="Courses" icon="school-outline" />

                <Text style={[typography.caption, { color: colors.textMuted, marginBottom: spacing(4) }]}>
                  {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
                </Text>

                {filteredCourses.length === 0 ? (
                  <View style={{ padding: spacing(8), alignItems: 'center', backgroundColor: colors.surfaceAlt, borderRadius: radii.xl }}>
                    <Ionicons name="book-outline" size={48} color={colors.textMuted} />
                    <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(3), textAlign: 'center' }]}>
                      No courses found in this faculty.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: spacing(2) }}>
                    {filteredCourses.map((course) => (
                      <CourseRow
                        key={course.id}
                        course={course}
                        onPress={() => handleOpenCourse(course.id)}
                      />
                    ))}
                  </View>
                )}
              </View>
            </Card>

            {/* Quick Note for non-desktop */}
            {!isDesktop && (
              <Card style={{ marginBottom: spacing(6) }}>
                <View style={{ padding: spacing(6) }}>
                  <SectionLabel title="Personal" />
                  <SectionTitle title="Quick Note" icon="create-outline" />
                  <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing(4) }]}>
                    Save important details about this university for later.
                  </Text>
                  <Pressable
                    onPress={() => setNoteModalVisible(true)}
                    style={({ pressed }) => ({
                      padding: spacing(4),
                      backgroundColor: colors.surfaceAlt,
                      borderRadius: radii.lg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: 'center',
                      opacity: pressed ? 0.9 : 1,
                    })}
                  >
                    <Text style={[typography.label, { color: colors.primary }]}>Add Personal Note</Text>
                  </Pressable>
                </View>
              </Card>
            )}
          </View>

          {/* Desktop Sidebar */}
          {isDesktop && (
            <DesktopSidebar
              uni={university}
              onVisitWebsite={handleVisitWebsite}
              onAddNote={() => setNoteModalVisible(true)}
            />
          )}
        </View>
      </DashboardLayout>

      {/* Mobile Sticky Bar */}
      {isMobile && (
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          flexDirection: 'row',
          padding: spacing(5),
          paddingBottom: spacing(8),
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          gap: spacing(3),
        }}>
          <Pressable
            onPress={handleVisitWebsite}
            style={({ pressed }) => ({
              flex: 1,
              height: 52,
              borderRadius: radii.lg,
              backgroundColor: colors.surfaceAlt,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={[typography.label, { color: colors.textPrimary }]}>Website</Text>
          </Pressable>
          <Pressable
            onPress={() => {}}
            style={({ pressed }) => ({
              flex: 2,
              height: 52,
              borderRadius: radii.lg,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row' as const,
              gap: spacing(2),
              opacity: pressed ? 0.9 : 1,
            })}
          >
            <Ionicons name="school-outline" size={18} color="#fff" />
            <Text style={[typography.label, { color: '#fff' }]}>Explore Courses</Text>
          </Pressable>
        </View>
      )}

      {/* Note Modal */}
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

// ─────────────────────────────────────────────────────────────────────────────
// Exported Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function UniversityDetailsScreen() {
  return (
    <StudentMenuProvider>
      <UniversityDetailsContent />
    </StudentMenuProvider>
  );
}