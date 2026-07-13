// app/student/saved.tsx
// Route: /student/saved
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';

import { auth } from '../../constants/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  getSavedItems,
  getSavedItemsErrorMessage,
  removeSavedItem,
} from '../../services/savedItemsService';
import DashboardLayout, {
  radii,
  spacing,
  typography,
  useTheme,
} from '../../components/student/DashboardLayout';
import { StudentMenuProvider } from '../../components/student/StudentMenu';


type SavedItemType = 'course' | 'career' | 'scholarship';

type SavedCourse = {
  id: string;
  title: string;
  institution: string;
  duration: string;
  fee: string;
  level: string;
  requiredPoints?: number;
};

type SavedCareer = {
  id: string;
  title: string;
  field: string;
  fieldId?: string;
  roleId?: string;
  careerId?: string;
  description?: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  institutionCount?: number;
  courseCount?: number;
  minimumPoints?: number | null;
  savedAt?: number;
};

type SavedScholarship = {
  id: string;
  title: string;
  provider: string;
  amount?: string;
  deadline?: string;
  eligibility?: string;
  savedAt?: number;
};

type TabDefinition = {
  key: SavedItemType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const TABS: TabDefinition[] = [
  { key: 'course', label: 'Courses', icon: 'book-outline' },
  { key: 'career', label: 'Careers', icon: 'briefcase-outline' },
  { key: 'scholarship', label: 'Scholarships', icon: 'ribbon-outline' },
];

function parseArray<T>(raw: string | null): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatFee(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `BWP ${value.toLocaleString()}/yr`;
  }
  if (typeof value === 'string' && value.trim()) return value.trim();
  return 'Contact institution';
}

function EmptyState({
  icon,
  title,
  subtitle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}) {
  const colors = useTheme();

  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing(14), paddingHorizontal: spacing(5) }}>
      <View
        style={{
          width: 84,
          height: 84,
          borderRadius: 42,
          backgroundColor: colors.surfaceAlt,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing(5),
        }}
      >
        <Ionicons name={icon} size={38} color={colors.textMuted} />
      </View>
      <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>
        {title}
      </Text>
      <Text
        style={[
          typography.body,
          {
            color: colors.textSecondary,
            textAlign: 'center',
            maxWidth: 360,
            marginTop: spacing(2),
            lineHeight: 22,
          },
        ]}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function DeleteButton({ label, onPress }: { label: string; onPress: () => void }) {
  const colors = useTheme();

  return (
    <Pressable
      onPress={(event) => {
        event.stopPropagation?.();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        borderRadius: radii.lg,
        backgroundColor: `${colors.danger}12`,
        borderWidth: 1,
        borderColor: `${colors.danger}35`,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name="trash-outline" size={19} color={colors.danger} />
    </Pressable>
  );
}

function CourseCard({ item, onDelete }: { item: SavedCourse; onDelete: () => void }) {
  const colors = useTheme();

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/student/course-details', params: { id: item.id } })}
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: radii.xxl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginBottom: spacing(4),
        opacity: pressed ? 0.9 : 1,
        ...Platform.select({
          ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },
          android: { elevation: 3 },
          web: { boxShadow: '0 5px 18px rgba(0,0,0,0.08)' } as any,
        }),
      })}
    >
      <View style={{ height: 3, backgroundColor: colors.primary }} />
      <View style={{ padding: spacing(5) }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(4) }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: radii.xl,
              backgroundColor: `${colors.primary}18`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="book-outline" size={23} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 16 }]}>
              {item.title}
            </Text>
            <Text style={[typography.caption, { color: colors.primary, marginTop: 3 }]}>
              {item.institution}
            </Text>
          </View>
          <DeleteButton label={`Delete saved course ${item.title}`} onPress={onDelete} />
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginTop: spacing(4) }}>
          {[
            { icon: 'time-outline' as const, text: item.duration },
            { icon: 'cash-outline' as const, text: item.fee },
            { icon: 'school-outline' as const, text: item.level },
            ...(typeof item.requiredPoints === 'number'
              ? [{ icon: 'star-outline' as const, text: `${item.requiredPoints} points` }]
              : []),
          ].map((chip) => (
            <View
              key={`${chip.icon}-${chip.text}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: colors.surfaceAlt,
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: colors.border,
                paddingHorizontal: spacing(3),
                paddingVertical: spacing(2),
              }}
            >
              <Ionicons name={chip.icon} size={12} color={colors.textMuted} />
              <Text style={[typography.caption, { color: colors.textSecondary, fontSize: 11 }]}>
                {chip.text}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </Pressable>
  );
}

function CareerCard({
  item,
  onDelete,
  onViewInfo,
}: {
  item: SavedCareer;
  onDelete: () => void;
  onViewInfo: () => void;
}) {
  const colors = useTheme();

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radii.xxl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginBottom: spacing(4),
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 5 },
          },
          android: { elevation: 3 },
          web: { boxShadow: '0 5px 18px rgba(0,0,0,0.08)' } as any,
        }),
      }}
    >
      <View style={{ height: 3, backgroundColor: item.color || colors.primary }} />

      <View style={{ padding: spacing(5) }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            gap: spacing(4),
          }}
        >
          <View
            style={{
              width: 52,
              height: 52,
              borderRadius: radii.xl,
              backgroundColor: `${item.color || colors.primary}20`,
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Ionicons
              name={item.icon || 'briefcase-outline'}
              size={24}
              color={item.color || colors.primary}
            />
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <Text
              style={[
                typography.bodyStrong,
                { color: colors.textPrimary, fontSize: 16 },
              ]}
            >
              {item.title}
            </Text>

            <Text
              style={[
                typography.caption,
                {
                  color: item.color || colors.primary,
                  marginTop: 3,
                  fontWeight: '700',
                },
              ]}
            >
              {item.field || 'Career pathway'}
            </Text>

            {!!item.description && (
              <Text
                numberOfLines={2}
                style={[
                  typography.caption,
                  {
                    color: colors.textSecondary,
                    marginTop: spacing(2),
                    lineHeight: 18,
                  },
                ]}
              >
                {item.description}
              </Text>
            )}
          </View>

          <DeleteButton
            label={`Delete saved career ${item.title}`}
            onPress={onDelete}
          />
        </View>

        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing(2),
            marginTop: spacing(4),
          }}
        >
          {typeof item.courseCount === 'number' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: spacing(3),
                paddingVertical: spacing(2),
                borderRadius: radii.pill,
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons
                name="book-outline"
                size={12}
                color={colors.textMuted}
              />
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, fontSize: 11 },
                ]}
              >
                {item.courseCount} related course
                {item.courseCount === 1 ? '' : 's'}
              </Text>
            </View>
          )}

          {typeof item.institutionCount === 'number' && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: spacing(3),
                paddingVertical: spacing(2),
                borderRadius: radii.pill,
                backgroundColor: colors.surfaceAlt,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons
                name="school-outline"
                size={12}
                color={colors.textMuted}
              />
              <Text
                style={[
                  typography.caption,
                  { color: colors.textSecondary, fontSize: 11 },
                ]}
              >
                {item.institutionCount} institution
                {item.institutionCount === 1 ? '' : 's'}
              </Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={onViewInfo}
          accessibilityRole="button"
          accessibilityLabel={`View full information for ${item.title}`}
          style={({ pressed }) => ({
            marginTop: spacing(4),
            minHeight: 48,
            borderRadius: radii.lg,
            backgroundColor: item.color || colors.primary,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: spacing(2),
            opacity: pressed ? 0.84 : 1,
            ...Platform.select({
              web: { cursor: 'pointer' } as any,
            }),
          })}
        >
          <Ionicons name="information-circle-outline" size={18} color="#fff" />
          <Text style={[typography.label, { color: '#fff' }]}>
            View Full Info
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function ScholarshipCard({ item, onDelete }: { item: SavedScholarship; onDelete: () => void }) {
  const colors = useTheme();

  return (
    <Pressable
      onPress={() =>
        router.push({
          pathname: '/student/scholarship-details',
          params: { id: item.id },
        })
      }
      style={({ pressed }) => ({
        backgroundColor: colors.surface,
        borderRadius: radii.xxl,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginBottom: spacing(4),
        opacity: pressed ? 0.9 : 1,
        ...Platform.select({
          ios: {
            shadowColor: '#000',
            shadowOpacity: 0.08,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 5 },
          },
          android: { elevation: 3 },
          web: { boxShadow: '0 5px 18px rgba(0,0,0,0.08)' } as any,
        }),
      })}
    >
      <View style={{ height: 3, backgroundColor: colors.warning }} />
      <View style={{ padding: spacing(5) }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing(4) }}>
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: radii.xl,
              backgroundColor: `${colors.warning}18`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="ribbon-outline" size={23} color={colors.warning} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 16 }]}>
              {item.title}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary, marginTop: 3 }]}>
              {item.provider || 'Scholarship provider'}
            </Text>
          </View>
          <DeleteButton label={`Delete saved scholarship ${item.title}`} onPress={onDelete} />
        </View>

        {(item.amount || item.deadline) && (
          <View
            style={{
              marginTop: spacing(4),
              padding: spacing(4),
              borderRadius: radii.lg,
              backgroundColor: `${colors.warning}10`,
              borderLeftWidth: 4,
              borderLeftColor: colors.warning,
            }}
          >
            {!!item.amount && <Text style={[typography.bodyStrong, { color: colors.warning }]}>{item.amount}</Text>}
            {!!item.deadline && (
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing(1) }]}>
                Deadline: {item.deadline}
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

function SavedContent() {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const isMobile = width < 768;

  const [activeTab, setActiveTab] = useState<SavedItemType>('course');
  const [savedCourses, setSavedCourses] = useState<SavedCourse[]>([]);
  const [savedCareers, setSavedCareers] = useState<SavedCareer[]>([]);
  const [savedScholarships, setSavedScholarships] = useState<SavedScholarship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    type: SavedItemType;
    title: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedCareer, setSelectedCareer] = useState<SavedCareer | null>(null);

  const loadSavedItems = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (!auth.currentUser) {
        setSavedCourses([]);
        setSavedCareers([]);
        setSavedScholarships([]);
        setError('Please sign in to view saved items linked to your account.');
        return;
      }

      const records = await getSavedItems();

      setSavedCourses(
        records
          .filter((item) => item.type === 'course')
          .map((item) => ({
            id: item.id,
            title: String(item.title || 'Untitled Course'),
            institution: String(item.institution || 'Unknown Institution'),
            duration: String(item.duration || 'Not specified'),
            fee: String(item.fee || 'Contact institution'),
            level: String(item.level || 'Programme'),
            requiredPoints:
              typeof item.requiredPoints === 'number'
                ? item.requiredPoints
                : undefined,
          })),
      );

      setSavedCareers(
        records
          .filter((item) => item.type === 'career')
          .map((item) => ({
            id: item.id,
            title: String(item.title || 'Untitled Career'),
            field: String(item.field || 'Career pathway'),
            fieldId:
              typeof item.fieldId === 'string' ? item.fieldId : undefined,
            roleId:
              typeof item.roleId === 'string' ? item.roleId : undefined,
            careerId:
              typeof item.careerId === 'string' ? item.careerId : undefined,
            description:
              typeof item.description === 'string'
                ? item.description
                : undefined,
            icon: (item.icon || 'briefcase-outline') as keyof typeof Ionicons.glyphMap,
            color: String(item.color || colors.primary),
            institutionCount:
              typeof item.institutionCount === 'number'
                ? item.institutionCount
                : undefined,
            courseCount:
              typeof item.courseCount === 'number'
                ? item.courseCount
                : undefined,
            minimumPoints:
              typeof item.minimumPoints === 'number'
                ? item.minimumPoints
                : null,
            savedAt:
              item.savedAt &&
              typeof item.savedAt === 'object' &&
              'toMillis' in (item.savedAt as object)
                ? (item.savedAt as { toMillis: () => number }).toMillis()
                : undefined,
          })),
      );

      setSavedScholarships(
        records
          .filter((item) => item.type === 'scholarship')
          .map((item) => ({
            id: item.id,
            title: String(item.title || 'Untitled Scholarship'),
            provider: String(item.provider || 'Scholarship provider'),
            amount:
              typeof item.amount === 'string' ? item.amount : undefined,
            deadline:
              typeof item.deadline === 'string' ? item.deadline : undefined,
            eligibility:
              typeof item.eligibility === 'string'
                ? item.eligibility
                : undefined,
            savedAt:
              item.savedAt &&
              typeof item.savedAt === 'object' &&
              'toMillis' in (item.savedAt as object)
                ? (item.savedAt as { toMillis: () => number }).toMillis()
                : undefined,
          })),
      );
    } catch (loadError) {
      console.error('Failed to load saved items:', loadError);
      setError(getSavedItemsErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [colors.primary]);

  useFocusEffect(
    useCallback(() => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        void loadSavedItems();
      });

      void loadSavedItems();
      return unsubscribe;
    }, [loadSavedItems]),
  );

  const counts = useMemo(
    () => ({
      course: savedCourses.length,
      career: savedCareers.length,
      scholarship: savedScholarships.length,
    }),
    [savedCareers.length, savedCourses.length, savedScholarships.length],
  );

  const removeImmediately = useCallback(
    async (id: string, type: SavedItemType) => {
      await removeSavedItem(type, id);

      if (type === 'course') {
        setSavedCourses((items) => items.filter((item) => item.id !== id));
        return;
      }

      if (type === 'career') {
        setSavedCareers((items) => items.filter((item) => item.id !== id));
        return;
      }

      setSavedScholarships((items) => items.filter((item) => item.id !== id));
    },
    [],
  );

  const requestDelete = useCallback(
    (id: string, type: SavedItemType, title: string) => {
      setPendingDelete({ id, type, title });
    },
    [],
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || deleting) return;

    try {
      setDeleting(true);
      await removeImmediately(pendingDelete.id, pendingDelete.type);
      setPendingDelete(null);
    } catch (deleteError) {
      console.error('Failed to delete saved item:', deleteError);
      setError('The saved item could not be removed. Please try again.');
    } finally {
      setDeleting(false);
    }
  }, [deleting, pendingDelete, removeImmediately]);

  const currentItems =
    activeTab === 'course'
      ? savedCourses
      : activeTab === 'career'
        ? savedCareers
        : savedScholarships;

  return (
    <>
      <DashboardLayout
      title="Saved"
      subtitle="Your courses, careers and scholarships in one place"
      showPointsCard={false}
    >
      <View
        style={{
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing(2),
          marginBottom: spacing(6),
          flexDirection: 'row',
          gap: spacing(2),
        }}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 54,
                borderRadius: radii.xl,
                backgroundColor: active ? `${colors.primary}16` : 'transparent',
                borderWidth: active ? 1 : 0,
                borderColor: active ? `${colors.primary}35` : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: isMobile ? 'column' : 'row',
                gap: isMobile ? 2 : spacing(2),
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons name={active ? tab.icon.replace('-outline', '') as any : tab.icon} size={18} color={active ? colors.primary : colors.textMuted} />
              <Text style={[typography.label, { color: active ? colors.primary : colors.textSecondary, fontSize: isMobile ? 11 : 13 }]}>
                {tab.label} ({counts[tab.key]})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing(14) }}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(4) }]}>
            Loading your saved items…
          </Text>
        </View>
      ) : error ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing(12) }}>
          <Ionicons name="alert-circle-outline" size={54} color={colors.danger} />
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing(3) }]}>
            {error}
          </Text>
          <Pressable
            onPress={() => void loadSavedItems()}
            style={({ pressed }) => ({
              marginTop: spacing(5),
              paddingHorizontal: spacing(5),
              paddingVertical: spacing(3),
              borderRadius: radii.lg,
              backgroundColor: colors.primary,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={[typography.label, { color: '#fff' }]}>Try Again</Text>
          </Pressable>
        </View>
      ) : currentItems.length === 0 ? (
        <EmptyState
          icon={activeTab === 'course' ? 'book-outline' : activeTab === 'career' ? 'briefcase-outline' : 'ribbon-outline'}
          title={`No saved ${activeTab === 'career' ? 'careers' : activeTab === 'course' ? 'courses' : 'scholarships'} yet`}
          subtitle={`Use the Save button while exploring ${activeTab === 'career' ? 'career paths' : activeTab === 'course' ? 'courses' : 'scholarships'} and they will appear here.`}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing(12) }}>
          {activeTab === 'course' && savedCourses.map((item) => (
            <CourseCard key={item.id} item={item} onDelete={() => requestDelete(item.id, 'course', item.title)} />
          ))}
          {activeTab === 'career' &&
            savedCareers.map((item) => (
              <CareerCard
                key={item.id}
                item={item}
                onDelete={() =>
                  requestDelete(item.id, 'career', item.title)
                }
                onViewInfo={() => setSelectedCareer(item)}
              />
            ))}
          {activeTab === 'scholarship' && savedScholarships.map((item) => (
            <ScholarshipCard key={item.id} item={item} onDelete={() => requestDelete(item.id, 'scholarship', item.title)} />
          ))}
        </ScrollView>
      )}
      </DashboardLayout>

      <Modal
        visible={selectedCareer !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedCareer(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.64)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing(5),
          }}
        >
          <Pressable
            onPress={() => setSelectedCareer(null)}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
            accessibilityRole="button"
            accessibilityLabel="Close career information"
          />

          {selectedCareer && (
            <View
              style={{
                width: '100%',
                maxWidth: 560,
                maxHeight: '90%',
                backgroundColor: colors.surface,
                borderRadius: radii.xxl,
                borderWidth: 1,
                borderColor: colors.border,
                overflow: 'hidden',
                ...Platform.select({
                  ios: {
                    shadowColor: '#000',
                    shadowOpacity: 0.24,
                    shadowRadius: 28,
                    shadowOffset: { width: 0, height: 14 },
                  },
                  android: { elevation: 14 },
                  web: {
                    boxShadow: '0 22px 70px rgba(0,0,0,0.32)',
                  } as any,
                }),
              }}
            >
              <View
                style={{
                  height: 4,
                  backgroundColor:
                    selectedCareer.color || colors.primary,
                }}
              />

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  padding: spacing(6),
                  paddingBottom: spacing(7),
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                    gap: spacing(4),
                  }}
                >
                  <View
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: radii.xl,
                      backgroundColor: `${
                        selectedCareer.color || colors.primary
                      }20`,
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Ionicons
                      name={
                        selectedCareer.icon ||
                        'briefcase-outline'
                      }
                      size={29}
                      color={
                        selectedCareer.color || colors.primary
                      }
                    />
                  </View>

                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[
                        typography.h2,
                        {
                          color: colors.textPrimary,
                          lineHeight: 28,
                        },
                      ]}
                    >
                      {selectedCareer.title}
                    </Text>

                    <Text
                      style={[
                        typography.bodyStrong,
                        {
                          color:
                            selectedCareer.color ||
                            colors.primary,
                          marginTop: spacing(1),
                        },
                      ]}
                    >
                      {selectedCareer.field ||
                        'Career pathway'}
                    </Text>
                  </View>

                  <Pressable
                    onPress={() => setSelectedCareer(null)}
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    hitSlop={8}
                    style={({ pressed }) => ({
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Ionicons
                      name="close"
                      size={21}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>

                <View
                  style={{
                    height: 1,
                    backgroundColor: colors.divider,
                    marginVertical: spacing(5),
                  }}
                />

                <Text
                  style={[
                    typography.caption,
                    {
                      color: colors.textMuted,
                      letterSpacing: 0.5,
                      marginBottom: spacing(2),
                    },
                  ]}
                >
                  CAREER OVERVIEW
                </Text>

                <Text
                  style={[
                    typography.body,
                    {
                      color: colors.textSecondary,
                      lineHeight: 23,
                    },
                  ]}
                >
                  {selectedCareer.description ||
                    `${selectedCareer.title} is one of the career pathways connected to programmes available on Thuto-Bridge.`}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: spacing(3),
                    marginTop: spacing(5),
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      minWidth: 145,
                      padding: spacing(4),
                      borderRadius: radii.lg,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Ionicons
                      name="book-outline"
                      size={19}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors.textMuted,
                          marginTop: spacing(2),
                        },
                      ]}
                    >
                      RELATED COURSES
                    </Text>
                    <Text
                      style={[
                        typography.bodyStrong,
                        {
                          color: colors.textPrimary,
                          marginTop: 3,
                        },
                      ]}
                    >
                      {typeof selectedCareer.courseCount ===
                      'number'
                        ? selectedCareer.courseCount
                        : 'Not specified'}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      minWidth: 145,
                      padding: spacing(4),
                      borderRadius: radii.lg,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Ionicons
                      name="school-outline"
                      size={19}
                      color={colors.success}
                    />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors.textMuted,
                          marginTop: spacing(2),
                        },
                      ]}
                    >
                      INSTITUTIONS
                    </Text>
                    <Text
                      style={[
                        typography.bodyStrong,
                        {
                          color: colors.textPrimary,
                          marginTop: 3,
                        },
                      ]}
                    >
                      {typeof selectedCareer.institutionCount ===
                      'number'
                        ? selectedCareer.institutionCount
                        : 'Not specified'}
                    </Text>
                  </View>

                  <View
                    style={{
                      flex: 1,
                      minWidth: 145,
                      padding: spacing(4),
                      borderRadius: radii.lg,
                      backgroundColor: colors.surfaceAlt,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Ionicons
                      name="star-outline"
                      size={19}
                      color={colors.warning}
                    />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors.textMuted,
                          marginTop: spacing(2),
                        },
                      ]}
                    >
                      MINIMUM POINTS
                    </Text>
                    <Text
                      style={[
                        typography.bodyStrong,
                        {
                          color: colors.textPrimary,
                          marginTop: 3,
                        },
                      ]}
                    >
                      {typeof selectedCareer.minimumPoints ===
                      'number'
                        ? selectedCareer.minimumPoints
                        : 'Varies'}
                    </Text>
                  </View>
                </View>


                <View
                  style={{
                    marginTop: spacing(6),
                    padding: spacing(5),
                    borderRadius: radii.xl,
                    backgroundColor: `${selectedCareer.color || colors.primary}0D`,
                    borderWidth: 1,
                    borderColor: `${selectedCareer.color || colors.primary}28`,
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: colors.textMuted,
                        letterSpacing: 0.5,
                        marginBottom: spacing(3),
                      },
                    ]}
                  >
                    PATHWAY SNAPSHOT
                  </Text>

                  {[
                    {
                      icon: 'navigate-outline' as const,
                      title: 'Career field',
                      value: selectedCareer.field || 'Career pathway not specified',
                    },
                    {
                      icon: 'book-outline' as const,
                      title: 'Study route',
                      value:
                        typeof selectedCareer.courseCount === 'number' && selectedCareer.courseCount > 0
                          ? `${selectedCareer.courseCount} related programme${selectedCareer.courseCount === 1 ? '' : 's'} currently connect to this career.`
                          : 'Related study programmes may vary by institution.',
                    },
                    {
                      icon: 'school-outline' as const,
                      title: 'Where to study',
                      value:
                        typeof selectedCareer.institutionCount === 'number' && selectedCareer.institutionCount > 0
                          ? `${selectedCareer.institutionCount} institution${selectedCareer.institutionCount === 1 ? '' : 's'} currently offer connected programmes.`
                          : 'Available institutions may change as new programmes are added.',
                    },
                    {
                      icon: 'star-outline' as const,
                      title: 'Entry guidance',
                      value:
                        typeof selectedCareer.minimumPoints === 'number'
                          ? `Connected programmes may begin from approximately ${selectedCareer.minimumPoints} points. Always confirm the exact requirements with the institution.`
                          : 'Entry points and subject requirements differ between programmes and institutions.',
                    },
                  ].map((row, index, rows) => (
                    <View
                      key={row.title}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: spacing(3),
                        paddingVertical: spacing(3),
                        borderBottomWidth: index === rows.length - 1 ? 0 : 1,
                        borderBottomColor: colors.divider,
                      }}
                    >
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: radii.lg,
                          backgroundColor: `${selectedCareer.color || colors.primary}18`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Ionicons
                          name={row.icon}
                          size={17}
                          color={selectedCareer.color || colors.primary}
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>
                          {row.title}
                        </Text>
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: colors.textSecondary,
                              marginTop: 3,
                              lineHeight: 18,
                            },
                          ]}
                        >
                          {row.value}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View
                  style={{
                    marginTop: spacing(5),
                    padding: spacing(5),
                    borderRadius: radii.xl,
                    backgroundColor: colors.surfaceAlt,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={[
                      typography.caption,
                      {
                        color: colors.textMuted,
                        letterSpacing: 0.5,
                        marginBottom: spacing(3),
                      },
                    ]}
                  >
                    HOW TO PREPARE
                  </Text>

                  {[
                    'Compare the connected courses and choose a programme that matches your interests and strengths.',
                    'Check the exact points, subject grades, fees, duration and study mode for each institution.',
                    'Research the day-to-day responsibilities and skills commonly required in this career field.',
                    'Build practical experience through projects, internships, volunteering or entry-level opportunities where possible.',
                  ].map((step, index) => (
                    <View
                      key={step}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        gap: spacing(3),
                        marginBottom: index === 3 ? 0 : spacing(3),
                      }}
                    >
                      <View
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: 13,
                          backgroundColor: `${colors.success}18`,
                          borderWidth: 1,
                          borderColor: `${colors.success}35`,
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Text style={[typography.caption, { color: colors.success, fontWeight: '700' }]}>
                          {index + 1}
                        </Text>
                      </View>
                      <Text
                        style={[
                          typography.body,
                          {
                            color: colors.textSecondary,
                            flex: 1,
                            lineHeight: 21,
                          },
                        ]}
                      >
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>

                <View
                  style={{
                    marginTop: spacing(5),
                    padding: spacing(4),
                    borderRadius: radii.lg,
                    backgroundColor: `${colors.warning}10`,
                    borderLeftWidth: 4,
                    borderLeftColor: colors.warning,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: spacing(3),
                    }}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={19}
                      color={colors.warning}
                      style={{ marginTop: 1 }}
                    />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors.textSecondary,
                          flex: 1,
                          lineHeight: 19,
                        },
                      ]}
                    >
                      This information is based on the career data saved from Thuto-Bridge. Course availability, entry requirements and institution information can change, so verify the latest details before applying.
                    </Text>
                  </View>
                </View>

                {!!selectedCareer.savedAt && (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing(2),
                      marginTop: spacing(5),
                      padding: spacing(4),
                      borderRadius: radii.lg,
                      backgroundColor: `${
                        selectedCareer.color ||
                        colors.primary
                      }10`,
                      borderWidth: 1,
                      borderColor: `${
                        selectedCareer.color ||
                        colors.primary
                      }28`,
                    }}
                  >
                    <Ionicons
                      name="bookmark-outline"
                      size={18}
                      color={
                        selectedCareer.color ||
                        colors.primary
                      }
                    />
                    <Text
                      style={[
                        typography.caption,
                        {
                          color: colors.textSecondary,
                          flex: 1,
                        },
                      ]}
                    >
                      Saved on{' '}
                      {new Date(
                        selectedCareer.savedAt,
                      ).toLocaleDateString()}
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={() => setSelectedCareer(null)}
                  accessibilityRole="button"
                  style={({ pressed }) => ({
                    minHeight: 48,
                    marginTop: spacing(6),
                    borderRadius: radii.lg,
                    backgroundColor:
                      selectedCareer.color ||
                      colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.84 : 1,
                    ...Platform.select({
                      web: { cursor: 'pointer' } as any,
                    }),
                  })}
                >
                  <Text
                    style={[
                      typography.label,
                      { color: '#fff' },
                    ]}
                  >
                    Done
                  </Text>
                </Pressable>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

      <Modal
        visible={pendingDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!deleting) setPendingDelete(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.58)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing(5),
          }}
        >
          <Pressable
            onPress={() => {
              if (!deleting) setPendingDelete(null);
            }}
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
            accessibilityLabel="Close remove confirmation"
          />

          <View
            style={{
              width: '100%',
              maxWidth: 440,
              backgroundColor: colors.surface,
              borderRadius: radii.xxl,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing(6),
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOpacity: 0.22,
                  shadowRadius: 24,
                  shadowOffset: { width: 0, height: 12 },
                },
                android: { elevation: 12 },
                web: { boxShadow: '0 18px 55px rgba(0,0,0,0.28)' } as any,
              }),
            }}
          >
            <View
              style={{
                width: 54,
                height: 54,
                borderRadius: 27,
                backgroundColor: `${colors.danger}15`,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing(4),
              }}
            >
              <Ionicons name="trash-outline" size={25} color={colors.danger} />
            </View>

            <Text style={[typography.h2, { color: colors.textPrimary }]}>
              Remove saved item?
            </Text>
            <Text
              style={[
                typography.body,
                {
                  color: colors.textSecondary,
                  marginTop: spacing(2),
                  lineHeight: 22,
                },
              ]}
            >
              {pendingDelete
                ? `${pendingDelete.title} will be permanently removed from your saved ${
                    pendingDelete.type === 'course'
                      ? 'courses'
                      : pendingDelete.type === 'career'
                        ? 'careers'
                        : 'scholarships'
                  }.`
                : ''}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                gap: spacing(3),
                marginTop: spacing(6),
              }}
            >
              <Pressable
                disabled={deleting}
                onPress={() => setPendingDelete(null)}
                style={({ pressed }) => ({
                  minWidth: 100,
                  minHeight: 46,
                  paddingHorizontal: spacing(4),
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceAlt,
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: deleting ? 0.5 : pressed ? 0.78 : 1,
                })}
              >
                <Text style={[typography.label, { color: colors.textPrimary }]}>
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                disabled={deleting}
                onPress={() => void confirmDelete()}
                style={({ pressed }) => ({
                  minWidth: 112,
                  minHeight: 46,
                  paddingHorizontal: spacing(4),
                  borderRadius: radii.lg,
                  backgroundColor: colors.danger,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: spacing(2),
                  opacity: deleting ? 0.72 : pressed ? 0.84 : 1,
                })}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="trash-outline" size={17} color="#fff" />
                )}
                <Text style={[typography.label, { color: '#fff' }]}>
                  {deleting ? 'Removing…' : 'Remove'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function SavedScreen() {
  return (
    <StudentMenuProvider>
      <SavedContent />
    </StudentMenuProvider>
  );
}
