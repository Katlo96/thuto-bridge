import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  useWindowDimensions,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
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

type SubjectRequirement = {
  subject: string;
  minimumGrade: string;
};

type MatchedSubject = {
  subject: string;
  studentGrade: string;
  requiredGrade: string;
  met: boolean;
};

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
  subjectRequirements?: SubjectRequirement[];
  minimumPoints?: number;
  matchedSubjects?: MatchedSubject[];
  pointsMet?: boolean;
  pointsDifference?: number;
  recommendationSummary?: string;
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

function formatMoney(value?: number): string {
  if (!value || Number.isNaN(value)) return 'Tuition not listed';
  return `P${value.toLocaleString()} / year`;
}

function getCourseSubjectRequirements(data: any): SubjectRequirement[] {
  if (Array.isArray(data.subjectRequirements)) return data.subjectRequirements;
  if (data.entryRequirements && Array.isArray(data.entryRequirements.subjectRequirements))
    return data.entryRequirements.subjectRequirements;
  return [];
}

function getCourseMinimumPoints(data: any): number {
  if (data.entryRequirements && typeof data.entryRequirements.minimumPoints === 'number')
    return data.entryRequirements.minimumPoints;
  if (typeof data.minimumPoints === 'number') return data.minimumPoints;
  if (typeof data.requiredPoints === 'number') return data.requiredPoints;
  return 999;
}

function buildRecommendationSummary(course: Course, userPoints: number): string {
  const matched = course.matchedSubjects?.filter((item) => item.met) || [];
  if (matched.length === 0) {
    return `${course.title} was recommended because your ${userPoints} total points meet the minimum admission requirement at ${course.institutionName}.`;
  }
  const subjectList = matched
    .slice(0, 4)
    .map((item) => `${item.studentGrade} in ${item.subject}`)
    .join(', ');
  return `${course.title} was recommended because you obtained ${subjectList}, together with ${userPoints} total points. These results meet or strongly match the admission requirements at ${course.institutionName}.`;
}

function getMatchScoreColor(score: number): string {
  if (score >= 85) return '#059669';
  if (score >= 70) return '#0d9488';
  if (score >= 55) return '#2563eb';
  return '#d97706';
}

function getGradeColor(grade: string): string {
  const pts = gradeToPoints(grade);
  if (pts >= 7) return '#059669';
  if (pts >= 6) return '#0d9488';
  if (pts >= 5) return '#2563eb';
  if (pts >= 4) return '#d97706';
  return '#dc2626';
}

function getInstIcon(type?: string): keyof typeof Ionicons.glyphMap {
  if (type === 'university') return 'school';
  if (type === 'college') return 'library';
  return 'construct';
}

function getQualIcon(level: string): keyof typeof Ionicons.glyphMap {
  const l = level.toLowerCase();
  if (l.includes('bachelor') || l.includes('degree')) return 'ribbon';
  if (l.includes('diploma')) return 'document-text';
  if (l.includes('certificate')) return 'medal';
  if (l.includes('master') || l.includes('post')) return 'star';
  return 'school-outline';
}

// ─────────────────────────────────────────────────────────────────────────────
// Toast Component
// ─────────────────────────────────────────────────────────────────────────────
function SaveToast({
  visible,
  saved,
  colors,
}: {
  visible: boolean;
  saved: boolean;
  colors: any;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 32,
        left: 20,
        right: 20,
        zIndex: 999,
        opacity,
        transform: [{ translateY }],
        alignItems: 'center',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(3),
          backgroundColor: saved ? '#059669' : '#374151',
          paddingHorizontal: spacing(5),
          paddingVertical: spacing(3.5),
          borderRadius: radii.xxl,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 12,
          maxWidth: 340,
        }}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.2)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={saved ? 'heart' : 'heart-dislike'}
            size={16}
            color="#fff"
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
            {saved ? 'Course saved!' : 'Course removed'}
          </Text>
          <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 1 }}>
            {saved ? 'Find it anytime in your Saved tab' : 'Removed from your saved list'}
          </Text>
        </View>
        <Ionicons name={saved ? 'checkmark-circle' : 'close-circle'} size={20} color="rgba(255,255,255,0.7)" />
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Match Score Badge
// ─────────────────────────────────────────────────────────────────────────────
function MatchBadge({ score, colors }: { score: number; colors: any }) {
  const color = getMatchScoreColor(score);
  const label =
    score >= 85 ? 'Excellent' : score >= 70 ? 'Strong' : score >= 55 ? 'Good' : 'Fair';
  return (
    <View
      style={{
        alignItems: 'center',
        backgroundColor: `${color}14`,
        borderRadius: radii.xl,
        borderWidth: 1.5,
        borderColor: `${color}35`,
        paddingHorizontal: spacing(3),
        paddingVertical: spacing(2),
        minWidth: 72,
      }}
    >
      <Text style={{ fontSize: 20, fontWeight: '900', color, letterSpacing: -0.5 }}>
        {score}%
      </Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color, opacity: 0.8, letterSpacing: 0.3 }}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Course Card
// ─────────────────────────────────────────────────────────────────────────────
function CourseCard({
  course,
  userPoints,
  saved,
  onToggleSave,
  onPress,
  colors,
  isMobile,
}: {
  course: Course;
  userPoints: number;
  saved: boolean;
  onToggleSave: () => void;
  onPress: () => void;
  colors: any;
  isMobile: boolean;
}) {
  const passedSubjects = course.matchedSubjects?.filter((item) => item.met) || [];
  const missingSubjects = course.matchedSubjects?.filter((item) => !item.met) || [];
  const scoreColor = getMatchScoreColor(course.matchScore || 0);
  const instIcon = getInstIcon(course.institutionType);
  const qualIcon = getQualIcon(course.qualificationLevel);

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: `${colors.primary}10` }}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: radii.xxl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        opacity: pressed ? 0.97 : 1,
        shadowColor: '#000',
        shadowOpacity: Platform.OS === 'ios' ? 0.07 : 0,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      })}
    >
      {/* Accent top bar */}
      <View style={{ height: 4, backgroundColor: scoreColor }} />

      <View style={{ padding: isMobile ? spacing(4.5) : spacing(5.5), gap: spacing(4) }}>

        {/* ── Header row ── */}
        <View style={{ flexDirection: 'row', gap: spacing(3), alignItems: 'flex-start' }}>
          {/* Institution icon pill */}
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 14,
              backgroundColor: `${colors.primary}14`,
              borderWidth: 1,
              borderColor: `${colors.primary}25`,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Ionicons name={instIcon} size={22} color={colors.primary} />
          </View>

          <View style={{ flex: 1 }}>
            <Text
              style={[
                typography.h2,
                {
                  fontSize: isMobile ? 16 : 18,
                  lineHeight: isMobile ? 22 : 25,
                  color: colors.textPrimary,
                  marginBottom: 3,
                },
              ]}
            >
              {course.title}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
              <Ionicons name="location-outline" size={12} color={colors.textMuted} />
              <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13 }]}>
                {course.institutionName}
              </Text>
            </View>
            {!!course.facultyName && (
              <Text style={[typography.caption, { color: colors.textMuted, marginTop: 2, fontSize: 12 }]}>
                {course.facultyName}
              </Text>
            )}
          </View>

          {/* Score badge + save */}
          <View style={{ alignItems: 'center', gap: spacing(2.5), flexShrink: 0 }}>
            <MatchBadge score={course.matchScore || 0} colors={colors} />
            <Pressable
              onPress={(e) => { e.stopPropagation(); onToggleSave(); }}
              hitSlop={12}
              style={{ alignItems: 'center' }}
            >
              <Ionicons
                name={saved ? 'heart' : 'heart-outline'}
                size={24}
                color={saved ? '#ef4444' : colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        {/* ── Meta chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: spacing(2) }}>
            {[
              { icon: qualIcon, label: course.qualificationLevel },
              { icon: 'time-outline' as const, label: course.duration },
              { icon: 'desktop-outline' as const, label: course.mode },
              {
                icon: 'trending-up-outline' as const,
                label: `Min ${course.minimumPoints || course.requiredPoints} pts`,
                highlight: true,
              },
              ...(course.tuitionPerYear
                ? [{ icon: 'card-outline' as const, label: formatMoney(course.tuitionPerYear), highlight: false }]
                : []),
            ].map((chip, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing(1.5),
                  paddingHorizontal: spacing(3),
                  paddingVertical: spacing(1.5),
                  backgroundColor: chip.highlight ? `${colors.primary}12` : colors.surfaceAlt,
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: chip.highlight ? `${colors.primary}30` : colors.border,
                }}
              >
                <Ionicons
                  name={chip.icon}
                  size={11}
                  color={chip.highlight ? colors.primary : colors.textMuted}
                />
                <Text
                  style={[
                    typography.caption,
                    {
                      fontSize: 11,
                      color: chip.highlight ? colors.primary : colors.textSecondary,
                      fontWeight: chip.highlight ? '700' : '500',
                    },
                  ]}
                >
                  {chip.label}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* ── About ── */}
        {!!course.about && (
          <Text
            style={[typography.body, { color: colors.textSecondary, lineHeight: 21, fontSize: 13 }]}
            numberOfLines={2}
          >
            {course.about}
          </Text>
        )}

        {/* ── Why recommended panel ── */}
        <View
          style={{
            backgroundColor: colors.surfaceAlt,
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.border,
            overflow: 'hidden',
          }}
        >
          {/* Panel header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing(2.5),
              paddingHorizontal: spacing(4),
              paddingVertical: spacing(3),
              backgroundColor: `${colors.primary}08`,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="shield-checkmark" size={15} color="#fff" />
            </View>
            <Text style={[typography.label, { color: colors.textPrimary, fontWeight: '800', flex: 1 }]}>
              Why this was recommended
            </Text>
            <View
              style={{
                paddingHorizontal: spacing(2),
                paddingVertical: spacing(0.5),
                backgroundColor: `${colors.primary}18`,
                borderRadius: radii.pill,
              }}
            >
              <Text style={[typography.caption, { color: colors.primary, fontSize: 10, fontWeight: '700' }]}>
                {passedSubjects.length} subject{passedSubjects.length !== 1 ? 's' : ''} matched
              </Text>
            </View>
          </View>

          <View style={{ padding: spacing(4), gap: spacing(3) }}>
            {/* Summary text */}
            <Text style={[typography.body, { color: colors.textSecondary, lineHeight: 21, fontSize: 13 }]}>
              {course.recommendationSummary}
            </Text>

            {/* Subject matches */}
            {passedSubjects.length > 0 && (
              <View style={{ gap: spacing(2) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                  <Ionicons name="checkmark-done-circle-outline" size={13} color="#059669" />
                  <Text style={[typography.caption, { color: '#059669', fontWeight: '800', fontSize: 11, letterSpacing: 0.4 }]}>
                    SUBJECTS YOU QUALIFIED IN
                  </Text>
                </View>
                {passedSubjects.slice(0, 5).map((item, index) => (
                  <View
                    key={`passed-${item.subject}-${index}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing(2.5),
                      paddingVertical: spacing(2),
                      paddingHorizontal: spacing(3),
                      backgroundColor: '#05966910',
                      borderRadius: radii.lg,
                      borderLeftWidth: 3,
                      borderLeftColor: getGradeColor(item.studentGrade),
                    }}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 10,
                        backgroundColor: getGradeColor(item.studentGrade),
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                        {item.studentGrade}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[typography.body, { fontSize: 13, color: colors.textPrimary, fontWeight: '600' }]}>
                        {item.subject}
                      </Text>
                      <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                        Required {item.requiredGrade} or better · you got {item.studentGrade}
                      </Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  </View>
                ))}
              </View>
            )}

            {/* Points row */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing(2.5),
                paddingVertical: spacing(2),
                paddingHorizontal: spacing(3),
                backgroundColor: course.pointsMet ? '#05966910' : '#d9770610',
                borderRadius: radii.lg,
                borderLeftWidth: 3,
                borderLeftColor: course.pointsMet ? '#059669' : '#d97706',
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 10,
                  backgroundColor: course.pointsMet ? '#059669' : '#d97706',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Ionicons
                  name={course.pointsMet ? 'star' : 'star-half'}
                  size={15}
                  color="#fff"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[typography.body, { fontSize: 13, color: colors.textPrimary, fontWeight: '600' }]}>
                  {userPoints} total points
                </Text>
                <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                  {course.pointsMet
                    ? `${userPoints - (course.minimumPoints || course.requiredPoints)} pts above the minimum of ${course.minimumPoints || course.requiredPoints}`
                    : `${Math.abs(course.pointsDifference || 0)} pts below minimum of ${course.minimumPoints || course.requiredPoints}`}
                </Text>
              </View>
              <Ionicons
                name={course.pointsMet ? 'checkmark-circle' : 'alert-circle-outline'}
                size={18}
                color={course.pointsMet ? '#059669' : '#d97706'}
              />
            </View>

            {/* Subjects to improve */}
            {missingSubjects.length > 0 && (
              <View style={{ gap: spacing(1.5) }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                  <Ionicons name="trending-up-outline" size={13} color={colors.textMuted} />
                  <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '800', fontSize: 11, letterSpacing: 0.4 }]}>
                    SUBJECTS TO IMPROVE
                  </Text>
                </View>
                {missingSubjects.slice(0, 3).map((item, index) => (
                  <View
                    key={`missing-${item.subject}-${index}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing(2),
                      paddingVertical: spacing(1.5),
                      paddingHorizontal: spacing(3),
                      backgroundColor: colors.surfaceAlt,
                      borderRadius: radii.lg,
                    }}
                  >
                    <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
                    <Text style={[typography.caption, { color: colors.textMuted, flex: 1, lineHeight: 18, fontSize: 12 }]}>
                      {item.subject}: you have {item.studentGrade === 'Not taken' ? 'not taken this subject' : item.studentGrade}, minimum required {item.requiredGrade}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Info grid ── */}
        <View style={{ flexDirection: 'row', gap: spacing(2.5) }}>
          {[
            { icon: 'desktop-outline' as const, label: 'Mode', value: course.mode },
            { icon: 'card-outline' as const, label: 'Tuition', value: formatMoney(course.tuitionPerYear) },
          ].map((item, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                backgroundColor: colors.surfaceAlt,
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border,
                padding: spacing(3),
                gap: spacing(1),
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
                <Ionicons name={item.icon} size={12} color={colors.textMuted} />
                <Text style={[typography.caption, { color: colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 0.4 }]}>
                  {item.label.toUpperCase()}
                </Text>
              </View>
              <Text style={[typography.label, { color: colors.textPrimary, fontSize: 13 }]}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Careers ── */}
        {course.careers && course.careers.length > 0 && (
          <View style={{ gap: spacing(2) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
              <Ionicons name="briefcase-outline" size={13} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '800', fontSize: 11, letterSpacing: 0.4 }]}>
                POSSIBLE CAREERS
              </Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2) }}>
              {course.careers.slice(0, 4).map((career: string, index: number) => (
                <View
                  key={`career-${index}`}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing(1),
                    paddingHorizontal: spacing(3),
                    paddingVertical: spacing(1.5),
                    backgroundColor: colors.surfaceAlt,
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Ionicons name="arrow-forward-circle-outline" size={11} color={colors.textMuted} />
                  <Text style={[typography.caption, { color: colors.textPrimary, fontSize: 12 }]}>
                    {career}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── View details CTA ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing(2),
            paddingVertical: spacing(3),
            borderTopWidth: 1,
            borderTopColor: colors.border,
            marginTop: spacing(1),
          }}
        >
          <Ionicons name="eye-outline" size={15} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary, fontWeight: '700', fontSize: 13 }]}>
            View full course details
          </Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </View>
      </View>
    </Pressable>
  );
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
  const [searchFocused, setSearchFocused] = useState(false);
  const [filterType, setFilterType] = useState<'ALL' | 'university' | 'college' | 'brigade'>('ALL');
  const [sortBy, setSortBy] = useState<'match' | 'points' | 'name'>('match');
  const [savedCourses, setSavedCourses] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(6);

  // Toast state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastSaved, setToastSaved] = useState(true);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 720) return 'mobile';
    if (width < 1100) return 'tablet';
    return 'desktop';
  }, [width]);

  const isMobile = breakpoint === 'mobile';

  useEffect(() => {
    const loadSaved = async () => {
      try {
        const saved = await AsyncStorage.getItem('savedCourses');
        if (saved) setSavedCourses(new Set(JSON.parse(saved)));
      } catch (e) {
        console.error('Failed to load saved courses', e);
      }
    };
    loadSaved();
  }, []);

useEffect(() => {
  const loadData = async () => {
    try {
      setLoading(true);

      const [instSnapshot, courseSnapshot] = await Promise.all([
        getDocs(collection(db, 'institutions')),
        getDocs(collection(db, 'courses')),
      ]);

      const instMap = new Map<
        string,
        { name: string; category?: 'university' | 'college' | 'brigade' }
      >();

      instSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        instMap.set(docSnap.id, {
          name: data.name || data.institutionName || 'Unknown Institution',
          category: data.category || data.type,
        });
      });

      const loaded: Course[] = [];

      courseSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const institution = instMap.get(data.institutionId);

        let instType = institution?.category || data.institutionType;

        if (!instType || typeof instType !== 'string' || instType.trim() === '') {
          const instId = (data.institutionId || '').toLowerCase();

          if (instId.includes('uni')) {
            instType = 'university';
          } else if (instId.includes('col')) {
            instType = 'college';
          } else {
            instType = 'brigade';
          }
        }

        loaded.push({
          id: docSnap.id,
          title: data.title || 'Untitled Course',
          qualificationLevel: data.qualificationLevel || 'Programme',
          duration: data.duration || 'Duration not listed',
          requiredPoints: data.requiredPoints || getCourseMinimumPoints(data),
          tuitionPerYear: data.tuitionPerYear,
          mode: data.mode || 'Full-time',
          about: data.about || '',
          institutionId: data.institutionId,
          facultyId: data.facultyId,
          institutionName: institution?.name || 'Unknown Institution',
          institutionType: instType as 'university' | 'college' | 'brigade',
          facultyName: data.facultyName,
          careers: data.careers || [],
          subjectRequirements: getCourseSubjectRequirements(data),
          minimumPoints: getCourseMinimumPoints(data),
        });
      });

      const studentSubjectsMap = new Map(
        userBestSubjects.map((s) => [
          normalizeSubjectName(s.subject),
          { grade: s.grade, originalSubject: s.subject },
        ])
      );

      const scoredCourses = loaded
        .map((course) => {
          let requiredMet = 0;
          const totalRequired = course.subjectRequirements?.length || 0;

          const matchedSubjects: MatchedSubject[] =
            course.subjectRequirements?.map((req) => {
              const normSubj = normalizeSubjectName(req.subject);
              const studentSubject = studentSubjectsMap.get(normSubj);

              const met = Boolean(
                studentSubject &&
                  meetsMinimumGrade(studentSubject.grade, req.minimumGrade)
              );

              if (met) requiredMet++;

              return {
                subject: req.subject,
                studentGrade: studentSubject?.grade || 'Not taken',
                requiredGrade: req.minimumGrade,
                met,
              };
            }) || [];

          const minPts = course.minimumPoints || course.requiredPoints;
          const pointsDifference = userPoints - minPts;
          const pointsMet = userPoints >= minPts;

          const allSubjectsMet = totalRequired === 0 || requiredMet === totalRequired;
          const subjectRatio = totalRequired > 0 ? requiredMet / totalRequired : 1;

          let score = 20;

          if (pointsMet) {
            score += 45;
            score += Math.min(15, Math.max(0, pointsDifference));
          } else {
            score += Math.max(0, 30 - Math.abs(pointsDifference) * 3);
          }

          score += Math.round(subjectRatio * 35);

          if (pointsMet && allSubjectsMet) {
            score += 15;
          }

          let finalScore = Math.min(100, Math.round(score));

          if (!pointsMet) {
            finalScore = Math.min(finalScore, 69);
          }

          if (!allSubjectsMet && totalRequired > 0) {
            finalScore = Math.min(finalScore, 84);
          }

          const eligibilityMet = pointsMet && allSubjectsMet;

          const courseWithReason: Course = {
            ...course,
            matchScore: finalScore,
            eligibilityMet,
            matchedSubjects,
            pointsMet,
            pointsDifference,
          };

          return {
            ...courseWithReason,
            recommendationSummary: buildRecommendationSummary(courseWithReason, userPoints),
          };
        })
        .filter((course) => {
          if (!course.pointsMet) return false;
          return (course.matchScore || 0) >= 45;
        })
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

  const displayedCourses = useMemo(() => {
    let result = [...courses];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(term) ||
          (c.institutionName || '').toLowerCase().includes(term) ||
          (c.about || '').toLowerCase().includes(term) ||
          (c.facultyName || '').toLowerCase().includes(term)
      );
    }

    if (filterType !== 'ALL') {
      result = result.filter((c) => c.institutionType === filterType);
    }

    if (sortBy === 'points') {
      result.sort((a, b) => a.requiredPoints - b.requiredPoints);
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else {
      result.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    return result;
  }, [courses, searchTerm, filterType, sortBy]);

  const visibleCourses = displayedCourses.slice(0, visibleCount);

  const handleLoadMore = () => {
    setVisibleCount((prev) => Math.min(prev + 6, displayedCourses.length));
  };

  const showToast = (isSaved: boolean) => {
    setToastSaved(isSaved);
    setToastVisible(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastVisible(false), 3000);
  };

  const toggleSave = async (id: string) => {
    const newSaved = new Set(savedCourses);
    let isSaved: boolean;
    if (newSaved.has(id)) {
      newSaved.delete(id);
      isSaved = false;
    } else {
      newSaved.add(id);
      isSaved = true;
    }
    setSavedCourses(newSaved);
    await AsyncStorage.setItem('savedCourses', JSON.stringify(Array.from(newSaved)));
    showToast(isSaved);
  };

  const handleCoursePress = (id: string) => {
    router.push(`/student/course-details?id=${id}`);
  };

  const statsUni = courses.filter((c) => c.institutionType === 'university').length;
  const statsCol = courses.filter((c) => c.institutionType === 'college').length;
  const statsBrig = courses.filter((c) => c.institutionType === 'brigade').length;
  const avgScore =
    courses.length > 0
      ? Math.round(courses.reduce((s, c) => s + (c.matchScore || 0), 0) / courses.length)
      : 0;

  return (
    <View style={{ flex: 1 }}>
      <DashboardLayout
        title="Recommended Courses"
        subtitle="Courses matched to your academic results"
        showPointsCard={false}
      >
        {/* ── Hero ── */}
        <View style={{ marginBottom: spacing(6) }}>
          <View
            style={{
              backgroundColor: colors.primary,
              borderRadius: radii.xxl,
              padding: isMobile ? spacing(5) : spacing(6),
              overflow: 'hidden',
              shadowColor: colors.primary,
              shadowOpacity: 0.3,
              shadowRadius: 20,
              shadowOffset: { width: 0, height: 8 },
              elevation: 6,
            }}
          >
            {/* Decorative blobs */}
            <View style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: 70, backgroundColor: '#ffffff15' }} />
            <View style={{ position: 'absolute', bottom: -30, left: 60, width: 100, height: 100, borderRadius: 50, backgroundColor: '#ffffff10' }} />
            <View style={{ position: 'absolute', top: 20, right: 80, width: 50, height: 50, borderRadius: 25, backgroundColor: '#ffffff10' }} />

            <View
              style={{
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: isMobile ? 'flex-start' : 'center',
                gap: spacing(4),
              }}
            >
              {/* Points */}
              <View
                style={{
                  backgroundColor: '#ffffff20',
                  borderRadius: radii.xl,
                  paddingHorizontal: spacing(5),
                  paddingVertical: spacing(3.5),
                  alignItems: 'center',
                  borderWidth: 1,
                  borderColor: '#ffffff25',
                }}
              >
                <Text style={{ fontSize: isMobile ? 48 : 58, fontWeight: '900', color: '#fff', letterSpacing: -2, lineHeight: isMobile ? 52 : 62 }}>
                  {userPoints}
                </Text>
                <Text style={{ color: '#ffffffcc', fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginTop: 2 }}>
                  TOTAL POINTS
                </Text>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[typography.h2, { color: '#fff', fontSize: isMobile ? 20 : 24, marginBottom: spacing(1.5) }]}>
                  {loading ? 'Finding your matches…' : `${courses.length} courses matched`}
                </Text>
                <Text style={{ color: '#ffffffcc', fontSize: 13, lineHeight: 20 }}>
                  Each recommendation includes a full explanation of why you qualify, based on your subjects and points.
                </Text>
              </View>
            </View>

            {/* Stats row */}
            {!loading && courses.length > 0 && (
              <View style={{ flexDirection: 'row', gap: spacing(2), marginTop: spacing(4) }}>
                {[
                  { icon: 'pulse-outline' as const, label: 'Avg Match', value: `${avgScore}%` },
                  { icon: 'school-outline' as const, label: 'Universities', value: statsUni },
                  { icon: 'library-outline' as const, label: 'Colleges', value: statsCol },
                  { icon: 'construct-outline' as const, label: 'Brigades', value: statsBrig },
                ].map((stat, i) => (
                  <View
                    key={i}
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      backgroundColor: '#ffffff15',
                      borderRadius: radii.lg,
                      paddingVertical: spacing(2.5),
                      gap: spacing(0.5),
                      borderWidth: 1,
                      borderColor: '#ffffff20',
                    }}
                  >
                    <Ionicons name={stat.icon} size={14} color="rgba(255,255,255,0.75)" />
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: isMobile ? 15 : 17 }}>
                      {stat.value}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9, fontWeight: '600', letterSpacing: 0.3, textAlign: 'center' }}>
                      {stat.label.toUpperCase()}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Search ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surfaceAlt,
            borderRadius: radii.xl,
            borderWidth: 1.5,
            borderColor: searchFocused ? colors.primary : colors.border,
            paddingHorizontal: spacing(4),
            gap: spacing(2.5),
            marginBottom: spacing(4),
          }}
        >
          <Ionicons name="search" size={17} color={searchFocused ? colors.primary : colors.textMuted} />
          <TextInput
            value={searchTerm}
            onChangeText={(text) => { setSearchTerm(text); setVisibleCount(6); }}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Search courses, institutions, faculties…"
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              paddingVertical: Platform.OS === 'ios' ? spacing(4) : spacing(3),
              fontSize: 15,
              color: colors.textPrimary,
            }}
          />
          {searchTerm.length > 0 && (
            <Pressable onPress={() => setSearchTerm('')} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* ── Type filter chips ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: spacing(2), paddingRight: spacing(2), marginBottom: spacing(1) }}
          style={{ marginBottom: spacing(3) }}
        >
          {([
            { key: 'ALL', label: 'All Types', icon: 'apps-outline' },
            { key: 'university', label: 'Universities', icon: 'school-outline' },
            { key: 'college', label: 'Colleges', icon: 'library-outline' },
            { key: 'brigade', label: 'Brigades', icon: 'construct-outline' },
          ] as const).map((type) => {
            const active = filterType === type.key;
            return (
              <Pressable
                key={type.key}
                onPress={() => { setFilterType(type.key); setVisibleCount(6); }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing(1.5),
                  paddingHorizontal: spacing(4),
                  paddingVertical: spacing(2.5),
                  borderRadius: radii.pill,
                  backgroundColor: active ? colors.primary : colors.surfaceAlt,
                  borderWidth: 1.5,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons
                  name={type.icon}
                  size={13}
                  color={active ? '#fff' : colors.textSecondary}
                />
                <Text style={[typography.label, { color: active ? '#fff' : colors.textPrimary, fontSize: 13, fontWeight: active ? '700' : '500' }]}>
                  {type.label}
                </Text>
                {active && courses.filter(c => type.key === 'ALL' || c.institutionType === type.key).length > 0 && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                      {type.key === 'ALL' ? displayedCourses.length : displayedCourses.filter(c => c.institutionType === type.key).length}
                    </Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* ── Sort row ── */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginBottom: spacing(5) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
            <Ionicons name="funnel-outline" size={13} color={colors.textMuted} />
            <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.4 }]}>
              SORT
            </Text>
          </View>
          {([
            { key: 'match', label: 'Best Match', icon: 'star-outline' },
            { key: 'points', label: 'Points', icon: 'trending-up-outline' },
            { key: 'name', label: 'A–Z', icon: 'text-outline' },
          ] as const).map((option) => {
            const active = sortBy === option.key;
            return (
              <Pressable
                key={option.key}
                onPress={() => { setSortBy(option.key); setVisibleCount(6); }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing(1.5),
                  paddingHorizontal: spacing(3.5),
                  paddingVertical: spacing(2),
                  borderRadius: radii.lg,
                  backgroundColor: active ? colors.primary : colors.surfaceAlt,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name={option.icon} size={11} color={active ? '#fff' : colors.textSecondary} />
                <Text style={[typography.label, { color: active ? '#fff' : colors.textPrimary, fontSize: 12, fontWeight: active ? '700' : '500' }]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Count bar ── */}
        {!loading && (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: spacing(4),
              paddingVertical: spacing(3),
              backgroundColor: colors.surfaceAlt,
              borderRadius: radii.xl,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: spacing(5),
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1.5) }}>
              <Ionicons name="list-outline" size={14} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 12 }]}>
                Showing <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{visibleCourses.length}</Text> of <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{displayedCourses.length}</Text> matched courses
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
              <Ionicons name="shield-checkmark" size={13} color="#059669" />
              <Text style={[typography.caption, { color: '#059669', fontWeight: '700', fontSize: 11 }]}>
                Qualified
              </Text>
            </View>
          </View>
        )}

        {/* ── Results ── */}
        {loading ? (
          <View style={{ paddingVertical: spacing(16), alignItems: 'center', gap: spacing(4) }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: `${colors.primary}12`,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
            <View style={{ alignItems: 'center', gap: spacing(1) }}>
              <Text style={[typography.h2, { color: colors.textPrimary, fontSize: 18 }]}>
                Finding your matches…
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary, fontSize: 13 }]}>
                Analysing subjects, points and requirements
              </Text>
            </View>
          </View>
        ) : visibleCourses.length === 0 ? (
          <View
            style={{
              padding: spacing(10),
              alignItems: 'center',
              backgroundColor: colors.surface,
              borderRadius: radii.xxl,
              borderWidth: 1,
              borderColor: colors.border,
              gap: spacing(3),
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: colors.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="school-outline" size={32} color={colors.textMuted} />
            </View>
            <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>
              No courses found
            </Text>
            <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center', lineHeight: 21 }]}>
              {searchTerm
                ? `No results for "${searchTerm}". Try a different search.`
                : 'No courses match the current filter. Try selecting a different type.'}
            </Text>
            {(searchTerm || filterType !== 'ALL') && (
              <Pressable
                onPress={() => { setSearchTerm(''); setFilterType('ALL'); }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing(2),
                  paddingHorizontal: spacing(5),
                  paddingVertical: spacing(3),
                  backgroundColor: colors.primary,
                  borderRadius: radii.xl,
                  marginTop: spacing(2),
                }}
              >
                <Ionicons name="refresh-outline" size={15} color="#fff" />
                <Text style={[typography.label, { color: '#fff' }]}>Clear filters</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={{ gap: spacing(5) }}>
            {visibleCourses.map((course: Course) => (
              <CourseCard
                key={course.id}
                course={course}
                userPoints={userPoints}
                saved={savedCourses.has(course.id)}
                onToggleSave={() => toggleSave(course.id)}
                onPress={() => handleCoursePress(course.id)}
                colors={colors}
                isMobile={isMobile}
              />
            ))}

            {visibleCourses.length < displayedCourses.length && (
              <Pressable
                onPress={handleLoadMore}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing(2),
                  paddingVertical: spacing(4),
                  backgroundColor: colors.surfaceAlt,
                  borderRadius: radii.xl,
                  borderWidth: 1.5,
                  borderColor: colors.border,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Ionicons name="chevron-down-circle-outline" size={18} color={colors.primary} />
                <Text style={[typography.label, { color: colors.primary, fontWeight: '700' }]}>
                  Load {Math.min(6, displayedCourses.length - visibleCourses.length)} more courses
                </Text>
              </Pressable>
            )}

            {visibleCourses.length === displayedCourses.length && displayedCourses.length > 0 && (
              <View style={{ alignItems: 'center', paddingVertical: spacing(4), gap: spacing(1.5) }}>
                <Ionicons name="checkmark-done-circle" size={24} color={colors.primary} />
                <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
                  You've seen all {displayedCourses.length} matched courses
                </Text>
              </View>
            )}
          </View>
        )}
      </DashboardLayout>

      {/* ── Save toast (outside DashboardLayout so it overlays everything) ── */}
      <SaveToast visible={toastVisible} saved={toastSaved} colors={colors} />
    </View>
  );
}

export default function CourseRec() {
  return (
    <StudentMenuProvider>
      <CourseRecContent />
    </StudentMenuProvider>
  );
}
