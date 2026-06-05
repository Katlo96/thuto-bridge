import React, { useMemo, useState, useCallback } from 'react';
import { useEffect } from 'react';
import { db } from '../../constants/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  View,
  Text,
  Pressable,
  useWindowDimensions,
  Platform,
  TextInput,
  type ViewStyle,
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
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Breakpoint = 'mobile' | 'tablet' | 'desktop';

type College = {
  id: string;
  name: string;
  location: string;
  tagline: string;
  badge: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────


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
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: offsetY },
          shadowOpacity: opacity,
          shadowRadius: radius,
        },
        android: {
          elevation: intensity === 'sm' ? 3 : intensity === 'md' ? 6 : 12,
        },
        web: {
          boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})`,
        },
        default: {},
      }) ?? {}
    );
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// StatPill — sidebar overview stat
// ─────────────────────────────────────────────────────────────────────────────
function StatPill({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const colors = useTheme();
  const elevation = useElevation('sm');
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(3),
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(3),
          backgroundColor: colors.surfaceAlt,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        elevation,
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radii.md,
          backgroundColor: `${colors.primary}22`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
        <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginTop: 2 }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SidebarAction button
// ─────────────────────────────────────────────────────────────────────────────
function SidebarAction({
  icon,
  label,
  onPress,
  variant = 'ghost',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: 'ghost' | 'primary';
}) {
  const colors = useTheme();
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: spacing(3),
        paddingHorizontal: spacing(4),
        paddingVertical: spacing(3),
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: isPrimary ? colors.primary : colors.border,
        backgroundColor: isPrimary ? colors.primary : colors.surfaceAlt,
        opacity: pressed ? 0.85 : 1,
        transform: pressed ? [{ scale: 0.98 }] : [],
      })}
    >
      <Ionicons
        name={icon}
        size={17}
        color={isPrimary ? '#fff' : colors.textPrimary}
      />
      <Text
        style={[
          typography.label,
          { color: isPrimary ? '#fff' : colors.textPrimary },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// College card
// ─────────────────────────────────────────────────────────────────────────────
function CollegeCard({
  college,
  onPress,
}: {
  college: College;
  onPress: () => void;
}) {
  const colors = useTheme();
  const elevation = useElevation('md');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open ${college.name}`}
      style={({ pressed }) => ([
        {
          flex: 1,
          minWidth: 260,
          backgroundColor: colors.card,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing(5),
          overflow: 'hidden' as const,
          opacity: pressed ? 0.9 : 1,
          transform: pressed ? [{ scale: 0.98 }] : [],
        },
        elevation,
      ])}
    >
      {/* Top row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            paddingHorizontal: spacing(3),
            paddingVertical: spacing(2),
            borderRadius: radii.pill,
            backgroundColor: `${colors.primary}22`,
            borderWidth: 1,
            borderColor: `${colors.primary}44`,
          }}
        >
          <Text
            style={[
              typography.label,
              { color: colors.primary, letterSpacing: 0.4 },
            ]}
          >
            {college.badge}
          </Text>
        </View>

        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: radii.md,
            backgroundColor: colors.surfaceAlt,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </View>

      {/* Name */}
      <Text
        style={[
          typography.h2,
          { color: colors.textPrimary, marginTop: spacing(4) },
        ]}
        numberOfLines={2}
      >
        {college.name}
      </Text>

      {/* Location */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(2),
          marginTop: spacing(2),
        }}
      >
        <Ionicons name="location-outline" size={13} color={colors.primary} />
        <Text
          style={[typography.caption, { color: colors.textSecondary }]}
          numberOfLines={1}
        >
          {college.location}
        </Text>
      </View>

      {/* Tagline */}
      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, marginTop: spacing(3), lineHeight: 20 },
        ]}
        numberOfLines={2}
      >
        {college.tagline}
      </Text>

      {/* Footer */}
      <View
        style={{
          marginTop: spacing(4),
          paddingTop: spacing(3),
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={[typography.label, { color: colors.primary }]}>
          View details
        </Text>
        <Ionicons name="arrow-forward" size={15} color={colors.primary} />
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ onReset }: { onReset: () => void }) {
  const colors = useTheme();
  const elevation = useElevation('sm');
  return (
    <View
      style={[
        {
          alignItems: 'center',
          padding: spacing(10),
          backgroundColor: colors.card,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
        },
        elevation,
      ]}
    >
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: radii.xl,
          backgroundColor: `${colors.primary}22`,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing(5),
        }}
      >
        <Ionicons name="search-outline" size={28} color={colors.primary} />
      </View>
      <Text
        style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}
      >
        No colleges found
      </Text>
      <Text
        style={[
          typography.body,
          {
            color: colors.textSecondary,
            marginTop: spacing(2),
            textAlign: 'center',
            maxWidth: 300,
          },
        ]}
      >
        Try a different college name, location, or keyword.
      </Text>
      <Pressable
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel="Reset search"
        style={({ pressed }) => ({
          marginTop: spacing(6),
          flexDirection: 'row' as const,
          alignItems: 'center' as const,
          gap: spacing(2),
          paddingHorizontal: spacing(6),
          paddingVertical: spacing(4),
          borderRadius: radii.lg,
          backgroundColor: colors.primary,
          opacity: pressed ? 0.88 : 1,
          transform: pressed ? [{ scale: 0.98 }] : [],
        })}
      >
        <Ionicons name="refresh-outline" size={17} color="#fff" />
        <Text style={[typography.label, { color: '#fff', letterSpacing: 0.4 }]}>
          RESET SEARCH
        </Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────────────────────
function CollegesContent() {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { openMenu } = useStudentMenu();
  const elevation = useElevation('md');

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isMobile = breakpoint === 'mobile';

  const [search, setSearch] = useState('');
const [colleges, setColleges] = useState<College[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchColleges = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, 'institutions'));

      console.log('TOTAL DOCS:', snapshot.size);

      snapshot.forEach((doc) => {
        console.log(doc.id, doc.data());
      });

      const collegesData: College[] = snapshot.docs
        .filter((doc) => {
          const data = doc.data();

          return (
            data.category?.toLowerCase() === 'college'
          );
        })
        .map((doc) => {
          const data = doc.data();

          return {
            id: doc.id,
            name: data.name ?? 'Unnamed College',
            location: data.location ?? 'Botswana',
            tagline:
              data.about ??
              data.tagline ??
              'No description available.',
            badge: data.badge ?? 'COL',
          };
        });

      console.log('COLLEGES FOUND:', collegesData.length);

      setColleges(collegesData);
    } catch (error) {
      console.error('Failed to load colleges:', error);
    } finally {
      setLoading(false);
    }
  };

  fetchColleges();
}, []);





  const filtered = useMemo(() => {
  if (!search.trim()) return colleges;

  const q = search.toLowerCase();

  return colleges.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.tagline.toLowerCase().includes(q)
  );
}, [search, colleges]);

  const handleViewCollege = useCallback((id: string) => {
    router.push({ pathname: '/student/college-details', params: { id } });
  }, []);

  

  // ── Desktop Sidebar ────────────────────────────────────────────────────────
  const Sidebar = isDesktop && (
    <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
      <View
        style={[
          {
            backgroundColor: colors.surface,
            borderRadius: radii.xxl,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing(6),
            gap: spacing(4),
          },
          elevation,
        ]}
      >
        <Text style={[typography.h2, { color: colors.textPrimary }]}>
          Overview
        </Text>

        <View style={{ gap: spacing(3) }}>
          <StatPill
            icon="business-outline"
            label="Total Colleges"
            value={`${colleges.length}`}
          />
          <StatPill
            icon="search-outline"
            label="Search Results"
            value={`${filtered.length}`}
          />
          <StatPill
            icon="location-outline"
            label="Coverage"
            value="Botswana"
          />
        </View>

        <View style={{ height: 1, backgroundColor: colors.divider }} />

        <Text style={[typography.h2, { color: colors.textPrimary }]}>
          Quick Actions
        </Text>
        <View style={{ gap: spacing(3) }}>
          <SidebarAction
            icon="menu-outline"
            label="Open Menu"
            onPress={openMenu}
            variant="primary"
          />
          <SidebarAction
            icon="refresh-outline"
            label="Clear Search"
            onPress={() => setSearch('')}
          />
          <SidebarAction
            icon="school-outline"
            label="All Institutions"
            onPress={() => router.push('/student/institutions')}
          />
        </View>

        {/* Tip */}
        <View
          style={{
            padding: spacing(4),
            backgroundColor: `${colors.primary}14`,
            borderRadius: radii.lg,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
          }}
        >
          <Text
            style={[
              typography.caption,
              { color: colors.textSecondary, lineHeight: 18 },
            ]}
          >
            💡 Tip: Search by college name, city, or specialty to narrow results
            faster.
          </Text>
        </View>
      </View>
    </View>
  );

  // ── Hero banner ────────────────────────────────────────────────────────────
  const HeroBanner = (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.xxl,
          borderWidth: 1,
          borderColor: colors.border,
          padding: isMobile ? spacing(5) : spacing(7),
          marginBottom: spacing(6),
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap: spacing(4),
        },
        elevation,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[typography.hero, { color: colors.textPrimary }]}>
          Find the right college
        </Text>
        <Text
          style={[
            typography.body,
            {
              color: colors.textSecondary,
              marginTop: spacing(2),
              maxWidth: 480,
            },
          ]}
        >
          Explore colleges across Botswana, compare options, and open detailed
          pages for a deeper look at courses and admission requirements.
        </Text>
      </View>

      {/* Result count pill */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(2),
          paddingHorizontal: spacing(4),
          paddingVertical: spacing(2),
          borderRadius: radii.pill,
          backgroundColor: `${colors.primary}22`,
          borderWidth: 1,
          borderColor: `${colors.primary}44`,
          alignSelf: isMobile ? 'flex-start' : 'center',
        }}
      >
        <Ionicons name="business-outline" size={15} color={colors.primary} />
        <Text style={[typography.label, { color: colors.primary }]}>
          {filtered.length} result{filtered.length === 1 ? '' : 's'}
        </Text>
      </View>
    </View>
  );

  // ── Mobile stats strip ─────────────────────────────────────────────────────
  const MobileStatsStrip = isMobile && (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing(3),
        marginBottom: spacing(6),
        flexWrap: 'wrap',
      }}
    >
      {[
        { icon: 'business-outline' as const, label: 'Total', value: `${colleges.length}` },
        { icon: 'search-outline' as const, label: 'Results', value: `${filtered.length}` },
        { icon: 'location-outline' as const, label: 'Coverage', value: 'BW' },
      ].map((s) => (
        <View
          key={s.label}
          style={{
            flex: 1,
            minWidth: 90,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing(2),
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing(3),
          }}
        >
          <Ionicons name={s.icon} size={14} color={colors.primary} />
          <View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {s.label}
            </Text>
            <Text style={[typography.label, { color: colors.textPrimary }]}>
              {s.value}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );

  // ── Search bar ─────────────────────────────────────────────────────────────
  const SearchBar = (
    <View style={{ marginBottom: spacing(6) }}>
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
        SEARCH
      </Text>
      <View
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: spacing(4),
            minHeight: 52,
          },
          elevation,
        ]}
      >
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search colleges by name, location, or specialty..."
          placeholderTextColor={colors.textMuted}
          style={[
            typography.body,
            {
              flex: 1,
              marginLeft: spacing(3),
              paddingVertical: spacing(3),
              color: colors.textPrimary,
            },
          ]}
          accessibilityLabel="Search colleges"
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => setSearch('')}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={({ pressed }) => ({
              padding: spacing(2),
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <DashboardLayout
        title="Colleges"
        subtitle="Explore colleges across Botswana"
        showPointsCard={false}
      >
        <Text
          style={[
            typography.body,
            {
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: spacing(10),
            },
          ]}
        >
          Loading colleges...
        </Text>
      </DashboardLayout>
    );
  }

  // ── Card grid ──────────────────────────────────────────────────────────────
  const Grid =
    filtered.length === 0 ? (
      <EmptyState onReset={() => setSearch('')} />
    ) : (
      <View>
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
          COLLEGES
        </Text>
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing(4),
          }}
        >
          {filtered.map((college) => (
            <CollegeCard
              key={college.id}
              college={college}
              onPress={() => handleViewCollege(college.id)}
            />
          ))}
        </View>
      </View>
    );

  // ─────────────────────────────────────────────────────────────────────────
  // Render — DashboardLayout owns: SafeAreaView, scroll, header, sidebar nav,
  // dark blue theme, and menu button.
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      title="Colleges"
      subtitle="Explore colleges across Botswana"
      showPointsCard={false}
    >
      {/* Back navigation + breadcrumb */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing(3),
          marginBottom: spacing(6),
        }}
      >
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

        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Institutions › Colleges
        </Text>
      </View>

      {/* Desktop: two-column; mobile/tablet: stacked */}
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          gap: spacing(8),
          alignItems: 'flex-start',
        }}
      >
        {/* Main column */}
        <View style={{ flex: 1 }}>
          {HeroBanner}
          {MobileStatsStrip}
          {SearchBar}
          {Grid}
        </View>

        {/* Sidebar — desktop only */}
        {Sidebar}
      </View>
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function CollegesScreen() {
  return (
    <StudentMenuProvider>
      <CollegesContent />
    </StudentMenuProvider>
  );
}