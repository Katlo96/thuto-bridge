// app/student/saved.tsx
// Route: /student/saved

import React, { useState, useMemo } from 'react';
import {
  View, Text, Pressable, useWindowDimensions,
  Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import DashboardLayout, {
  spacing, typography, radii, useTheme,
} from '../../components/student/DashboardLayout';
import { StudentMenuProvider } from '../../components/student/StudentMenu';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type SavedItemType = 'career' | 'course' | 'scholarship';

type SavedCareer = {
  id: string;
  title: string;
  field: string;
  avgSalary: string;
  demand: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

type SavedCourse = {
  id: string;
  title: string;
  institution: string;
  duration: string;
  fee: string;
  level: string;
};

type SavedScholarship = {
  id: string;
  title: string;
  provider: string;
  amount: string;
  deadline: string;
  eligibility: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Mock Saved Data
// ─────────────────────────────────────────────────────────────────────────────
const SAVED_CAREERS: SavedCareer[] = [
  {
    id: 'c1',
    title: 'Software Engineer',
    field: 'Technology & IT',
    avgSalary: 'BWP 8,000 – 22,000/mo',
    demand: 'Very High',
    icon: 'laptop-outline',
    color: '#60A5FA',
  },
  {
    id: 'c2',
    title: 'Civil Engineer',
    field: 'Engineering',
    avgSalary: 'BWP 9,000 – 25,000/mo',
    demand: 'Very High',
    icon: 'business-outline',
    color: '#FBBF24',
  },
];

const SAVED_COURSES: SavedCourse[] = [
  {
    id: 'co1',
    title: 'BSc Computer Science',
    institution: 'University of Botswana',
    duration: '4 years',
    fee: 'BWP 19,000/yr',
    level: 'Undergraduate',
  },
  {
    id: 'co2',
    title: 'Bachelor of Nursing Science',
    institution: 'University of Botswana',
    duration: '4 years',
    fee: 'BWP 18,000/yr',
    level: 'Undergraduate',
  },
  {
    id: 'co3',
    title: 'BEng Mechanical Engineering',
    institution: 'BIUST',
    duration: '4 years',
    fee: 'BWP 24,000/yr',
    level: 'Undergraduate',
  },
];

const SAVED_SCHOLARSHIPS: SavedScholarship[] = [
  {
    id: 's1',
    title: 'Presidential Scholarship',
    provider: 'Government of Botswana',
    amount: 'Full Tuition + Stipend',
    deadline: '15 Aug 2026',
    eligibility: 'Top 5% academic performers',
  },
  {
    id: 's2',
    title: 'Debswana Mining Scholarship',
    provider: 'Debswana',
    amount: 'BWP 85,000/year',
    deadline: '30 Jun 2026',
    eligibility: 'Engineering & Geology students',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Reusable Components
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  const colors = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing(12) }}>
      <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(4) }}>
        <Ionicons name={icon} size={36} color={colors.textMuted} />
      </View>
      <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: spacing(2), textAlign: 'center' }]}>{title}</Text>
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', maxWidth: 280 }]}>{subtitle}</Text>
    </View>
  );
}

function SavedCard({ item, type, onRemove, onPress }: {
  item: any;
  type: SavedItemType;
  onRemove: (id: string) => void;
  onPress?: () => void;
}) {
  const colors = useTheme();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (type === 'career') {
    const career = item as SavedCareer;
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: radii.xxl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing(5),
        marginBottom: spacing(4),
        opacity: pressed ? 0.9 : 1,
      })}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(4) }}>
          <View style={{ width: 56, height: 56, borderRadius: radii.xl, backgroundColor: `${career.color}22`, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={career.icon} size={28} color={career.color} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyStrong, { fontSize: isMobile ? 16 : 17 }]}>{career.title}</Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 2 }]}>{career.field}</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3), marginTop: spacing(3) }}>
              <View style={{ backgroundColor: `${colors.success}15`, paddingHorizontal: spacing(3), paddingVertical: 4, borderRadius: radii.pill }}>
                <Text style={{ fontSize: 12, color: colors.success, fontWeight: '600' }}>{career.demand} Demand</Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{career.avgSalary}</Text>
            </View>
          </View>

          <Pressable onPress={() => onRemove(career.id)} hitSlop={8}>
            <Ionicons name="bookmark" size={22} color={colors.primary} />
          </Pressable>
        </View>
      </Pressable>
    );
  }

  if (type === 'course') {
    const course = item as SavedCourse;
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: radii.xxl,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing(5),
        marginBottom: spacing(4),
        opacity: pressed ? 0.9 : 1,
      })}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyStrong]}>{course.title}</Text>
            <Text style={[typography.caption, { color: colors.primary, marginTop: 2 }]}>{course.institution}</Text>
          </View>
          <Pressable onPress={() => onRemove(course.id)}>
            <Ionicons name="bookmark" size={22} color={colors.primary} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(3), marginTop: spacing(4) }}>
          <View style={{ backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing(3), paddingVertical: 6, borderRadius: radii.lg }}>
            <Text style={{ fontSize: 13 }}>{course.duration}</Text>
          </View>
          <View style={{ backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing(3), paddingVertical: 6, borderRadius: radii.lg }}>
            <Text style={{ fontSize: 13 }}>{course.fee}</Text>
          </View>
          <View style={{ backgroundColor: colors.surfaceAlt, paddingHorizontal: spacing(3), paddingVertical: 6, borderRadius: radii.lg }}>
            <Text style={{ fontSize: 13 }}>{course.level}</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  // Scholarship
  const scholarship = item as SavedScholarship;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      backgroundColor: colors.surface,
      borderRadius: radii.xxl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing(5),
      marginBottom: spacing(4),
      opacity: pressed ? 0.9 : 1,
    })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyStrong]}>{scholarship.title}</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>{scholarship.provider}</Text>
        </View>
        <Pressable onPress={() => onRemove(scholarship.id)}>
          <Ionicons name="bookmark" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={{ marginTop: spacing(4), padding: spacing(4), backgroundColor: `${colors.warning}12`, borderRadius: radii.lg, borderLeftWidth: 4, borderLeftColor: colors.warning }}>
        <Text style={{ color: colors.warning, fontWeight: '700', marginBottom: spacing(1) }}>{scholarship.amount}</Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>Deadline: {scholarship.deadline}</Text>
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
function SavedContent() {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState<SavedItemType>('career');
  const [savedCareers, setSavedCareers] = useState(SAVED_CAREERS);
  const [savedCourses, setSavedCourses] = useState(SAVED_COURSES);
  const [savedScholarships, setSavedScholarships] = useState(SAVED_SCHOLARSHIPS);

  const removeItem = (id: string, type: SavedItemType) => {
    if (type === 'career') setSavedCareers(prev => prev.filter(i => i.id !== id));
    if (type === 'course') setSavedCourses(prev => prev.filter(i => i.id !== id));
    if (type === 'scholarship') setSavedScholarships(prev => prev.filter(i => i.id !== id));
  };

  const currentItems = useMemo(() => {
    if (activeTab === 'career') return savedCareers;
    if (activeTab === 'course') return savedCourses;
    return savedScholarships;
  }, [activeTab, savedCareers, savedCourses, savedScholarships]);

  const tabs = [
    { key: 'career', label: 'Careers', icon: 'briefcase-outline' as const, count: savedCareers.length },
    { key: 'course', label: 'Courses', icon: 'school-outline' as const, count: savedCourses.length },
    { key: 'scholarship', label: 'Scholarships', icon: 'ribbon-outline' as const, count: savedScholarships.length },
  ] as const;

  return (
    <DashboardLayout title="Saved Items" subtitle="Your bookmarked opportunities" showPointsCard={false}>
      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radii.xl, padding: 4, marginBottom: spacing(6), borderWidth: 1, borderColor: colors.border }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                paddingVertical: spacing(3),
                borderRadius: radii.lg,
                backgroundColor: isActive ? colors.primary : 'transparent',
                alignItems: 'center',
              }}
            >
              <Ionicons name={tab.icon} size={18} color={isActive ? '#fff' : colors.textSecondary} />
              <Text style={[typography.label, { marginTop: 4, color: isActive ? '#fff' : colors.textSecondary }]}>
                {tab.label} {tab.count > 0 && `(${tab.count})`}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {currentItems.length > 0 ? (
          currentItems.map((item) => (
            <SavedCard
              key={item.id}
              item={item}
              type={activeTab}
              onRemove={() => removeItem(item.id, activeTab)}
              onPress={() => {
                if (activeTab === 'career') {
                  router.push('/student/career');
                }
              }}
            />
          ))
        ) : (
          <EmptyState
            icon="bookmark-outline"
            title="No saved items yet"
            subtitle={`You haven't saved any ${activeTab === 'career' ? 'careers' : activeTab === 'course' ? 'courses' : 'scholarships'} yet. Browse and bookmark items you like.`}
          />
        )}

        {/* Quick Actions */}
        {currentItems.length > 0 && (
          <View style={{ marginTop: spacing(8), padding: spacing(5), backgroundColor: colors.surfaceAlt, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border }}>
            <Text style={[typography.h2, { marginBottom: spacing(2) }]}>Need help deciding?</Text>
            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing(4) }]}>
              Compare your saved items or check your eligibility for these programmes.
            </Text>
            <Pressable
              onPress={() => router.push('/student/enter-results')}
              style={({ pressed }) => ({
                backgroundColor: colors.primary,
                height: 56,
                borderRadius: radii.xl,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.9 : 1,
              })}
            >
              <Text style={[typography.label, { color: '#fff', fontSize: 15 }]}>CHECK MY ELIGIBILITY</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </DashboardLayout>
  );
}

export default function SavedScreen() {
  return (
    <StudentMenuProvider>
      <SavedContent />
    </StudentMenuProvider>
  );
}