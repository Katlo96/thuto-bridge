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
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Breakpoint = 'mobile' | 'tablet' | 'desktop';
type University = {
  id: string;
  name: string;
  location: string;
  tagline: string;
  badge: string;
  type: 'Public' | 'Private';
  established: string;
  accentColor: string;
};
// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
Public: '#60A5FA',
Private: '#34D399',
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
// StatPill (sidebar)
// ─────────────────────────────────────────────────────────────────────────────
function StatPill({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
const colors = useTheme();
return (
<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), paddingHorizontal: spacing(4), paddingVertical: spacing(3), backgroundColor: colors.surfaceAlt, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border }}>
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
// SidebarAction
// ─────────────────────────────────────────────────────────────────────────────
function SidebarAction({ icon, label, onPress, variant = 'ghost' }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; variant?: 'ghost' | 'primary' }) {
const colors = useTheme();
const isPrimary = variant === 'primary';
return (
<Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(3), paddingHorizontal: spacing(4), paddingVertical: spacing(3), borderRadius: radii.lg, borderWidth: 1, borderColor: isPrimary ? colors.primary : colors.border, backgroundColor: isPrimary ? colors.primary : colors.surfaceAlt, opacity: pressed ? 0.85 : 1, transform: pressed ? [{ scale: 0.98 }] : [] })}>
<Ionicons name={icon} size={17} color={isPrimary ? '#fff' : colors.textPrimary} />
<Text style={[typography.label, { color: isPrimary ? '#fff' : colors.textPrimary }]}>{label}</Text>
</Pressable>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// UniversityCard
// ─────────────────────────────────────────────────────────────────────────────
function UniversityCard({
university,
onPress,
compact = false,
}: {
university: University;
onPress: () => void;
compact?: boolean;
}) {
const colors = useTheme();
const elevation = useElevation('md');
const typeColor = TYPE_COLORS[university.type] ?? colors.primary;
return (
<Pressable
onPress={onPress}
accessibilityRole="button"
accessibilityLabel={`Open ${university.name}`}
style={({ pressed }): ViewStyle => ({
width: '48%' as any,
...elevation,
backgroundColor: colors.card,
borderRadius: radii.xxl,
borderWidth: 1,
borderColor: colors.border,
overflow: 'hidden',
opacity: pressed ? 0.9 : 1,
transform: pressed ? [{ scale: 0.985 }] : [],
      })}
>
{/* Accent bar */}
<View style={{ height: 3, backgroundColor: university.accentColor }} />
<View style={{ padding: compact ? spacing(3) : spacing(5), gap: compact ? spacing(2) : spacing(3) }}>
{/* Badge + chevron */}
<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
<View style={{
paddingHorizontal: compact ? spacing(2) : spacing(3),
paddingVertical: spacing(2),
borderRadius: radii.pill,
backgroundColor: `${university.accentColor}18`,
borderWidth: 1,
borderColor: `${university.accentColor}44`,
          }}>
<Text style={[
typography.label,
              {
color: university.accentColor,
letterSpacing: 0.4,
fontSize: compact ? 10 : undefined,
              },
            ]}>{university.badge}</Text>
</View>
<View style={{
width: compact ? 28 : 34,
height: compact ? 28 : 34,
borderRadius: radii.md,
backgroundColor: colors.surfaceAlt,
borderWidth: 1,
borderColor: colors.border,
alignItems: 'center',
justifyContent: 'center',
          }}>
<Ionicons name="chevron-forward" size={compact ? 13 : 16} color={colors.textMuted} />
</View>
</View>
{/* Name */}
<Text
style={[typography.h2, { color: colors.textPrimary, fontSize: compact ? 13 : undefined, lineHeight: compact ? 18 : undefined }]}
numberOfLines={2}
>
{university.name}
</Text>
{/* Location */}
<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(1) }}>
<Ionicons name="location-outline" size={compact ? 11 : 13} color={university.accentColor} />
<Text style={[typography.caption, { color: colors.textSecondary, fontSize: compact ? 10 : undefined }]} numberOfLines={1}>
{university.location}
</Text>
</View>
{/* Tagline — hidden on compact to save space */}
{!compact && (
<Text style={[typography.body, { color: colors.textSecondary, lineHeight: 20 }]} numberOfLines={2}>
{university.tagline}
</Text>
        )}
{/* Meta pills */}
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(1) }}>
<View style={{
flexDirection: 'row',
alignItems: 'center',
gap: spacing(1),
paddingHorizontal: compact ? spacing(2) : spacing(3),
paddingVertical: spacing(1),
borderRadius: radii.pill,
backgroundColor: `${typeColor}14`,
borderWidth: 1,
borderColor: `${typeColor}33`,
          }}>
<View style={{ width: compact ? 5 : 7, height: compact ? 5 : 7, borderRadius: 4, backgroundColor: typeColor }} />
<Text style={[typography.caption, { color: typeColor, fontWeight: '700', fontSize: compact ? 9 : undefined }]}>
{university.type}
</Text>
</View>
<View style={{
flexDirection: 'row',
alignItems: 'center',
gap: spacing(1),
paddingHorizontal: compact ? spacing(2) : spacing(3),
paddingVertical: spacing(1),
borderRadius: radii.pill,
backgroundColor: colors.surfaceAlt,
borderWidth: 1,
borderColor: colors.border,
          }}>
<Ionicons name="calendar-outline" size={compact ? 9 : 11} color={colors.textMuted} />
<Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700', fontSize: compact ? 9 : undefined }]}>
{university.established}
</Text>
</View>
</View>
{/* Footer */}
<View style={{
paddingTop: spacing(2),
borderTopWidth: 1,
borderTopColor: colors.divider,
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'space-between',
        }}>
<Text style={[typography.label, { color: colors.primary, fontSize: compact ? 11 : undefined }]}>
            View details
</Text>
<Ionicons name="arrow-forward" size={compact ? 13 : 15} color={colors.primary} />
</View>
</View>
</Pressable>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ onReset }: { onReset: () => void }) {
const colors = useTheme();
const elevation = useElevation('sm');
return (
<View style={[{ alignItems: 'center', padding: spacing(10), backgroundColor: colors.card, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, width: '100%' }, elevation]}>
<View style={{ width: 68, height: 68, borderRadius: radii.xl, backgroundColor: `${colors.primary}22`, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(5) }}>
<Ionicons name="search-outline" size={28} color={colors.primary} />
</View>
<Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>No universities found</Text>
<Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), textAlign: 'center', maxWidth: 300 }]}>
        Try a different institution name, location, or keyword.
</Text>
<Pressable onPress={onReset} style={({ pressed }) => ({ marginTop: spacing(6), flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(6), paddingVertical: spacing(4), borderRadius: radii.lg, backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 })}>
<Ionicons name="refresh-outline" size={17} color="#fff" />
<Text style={[typography.label, { color: '#fff', letterSpacing: 0.4 }]}>RESET SEARCH</Text>
</Pressable>
</View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// LoadingState
// ─────────────────────────────────────────────────────────────────────────────
function LoadingState() {
const colors = useTheme();
return (
<View style={{ padding: spacing(12), alignItems: 'center', justifyContent: 'center' }}>
<ActivityIndicator size="large" color={colors.primary} />
<Text style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(4) }]}>Loading universities...</Text>
</View>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────────────────────
function UniversitiesContent() {
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
const [typeFilter, setTypeFilter] = useState<'All' | 'Public' | 'Private'>('All');
const [universities, setUniversities] = useState<University[]>([]);
const [loading, setLoading] = useState(true);

// Fetch universities from Firestore
useEffect(() => {
  const fetchUniversities = async () => {
    try {
      setLoading(true);

      const snapshot = await getDocs(collection(db, 'institutions'));

console.log('TOTAL DOCUMENTS:', snapshot.size);

snapshot.forEach((doc) => {
  console.log(doc.id, doc.data());
});
      
      console.log(`✅ Universities fetched: ${snapshot.size}`);
      
      if (snapshot.size === 0) {
        console.log("🔍 No universities found. Let's check what's in the collection...");
        
        // Check if any institutions exist at all
        const allInstitutions = await getDocs(collection(db, 'institutions'));
        console.log(`Total documents in 'institutions' collection: ${allInstitutions.size}`);
        
        allInstitutions.docs.forEach(doc => {
          console.log(`Doc ID: ${doc.id} | Category:`, doc.data().category);
        });
      }

      const fetchedUniversities: University[] = snapshot.docs
  .filter((doc) => doc.data().category === 'university')
  .map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      name: data.name ?? 'Unnamed University',
      location: data.location ?? 'Botswana',
      tagline: data.about
        ? data.about.length > 90
          ? `${data.about.substring(0, 90)}...`
          : data.about
        : 'No description available.',
      badge: data.badge ?? 'UNI',
      type: data.ownership ?? 'Public',
      established: String(data.established ?? 'N/A'),
      accentColor:
        data.ownership === 'Private'
          ? '#34D399'
          : '#60A5FA',
    };
  });

  console.log('Universities only:', fetchedUniversities.length);

      setUniversities(fetchedUniversities);
    } catch (error: any) {
      console.error('Failed to load universities:', error);
      if (error.code === 'permission-denied') {
        console.error('🔐 Permission denied! Check Firestore Security Rules.');
      }
    } finally {
      setLoading(false);
    }
  };

  fetchUniversities();
}, []);

const filtered = useMemo(() => {
let list = universities;
if (typeFilter !== 'All') list = list.filter((u) => u.type === typeFilter);
if (search.trim()) {
const q = search.toLowerCase();
list = list.filter((u) =>
u.name.toLowerCase().includes(q) ||
u.location.toLowerCase().includes(q) ||
u.tagline.toLowerCase().includes(q)
      );
    }
return list;
  }, [universities, search, typeFilter]);

const handleViewUniversity = useCallback((id: string) => {
router.push({ pathname: '/student/university-details', params: { id } });
  }, []);

const publicCount = universities.filter((u) => u.type === 'Public').length;
const privateCount = universities.filter((u) => u.type === 'Private').length;
const CARD_GAP = spacing(3);

// ── Desktop sidebar ────────────────────────────────────────────────────────
const Sidebar = isDesktop && (
<View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
<View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevation]}>
<View style={{ height: 3, backgroundColor: colors.primary }} />
<View style={{ padding: spacing(6), gap: spacing(4) }}>
<Text style={[typography.h2, { color: colors.textPrimary }]}>Overview</Text>
<View style={{ gap: spacing(3) }}>
<StatPill icon="school-outline" label="Total Universities" value={`${universities.length}`} />
<StatPill icon="search-outline" label="Search Results" value={`${filtered.length}`} />
<StatPill icon="location-outline" label="Coverage" value="Botswana" />
</View>
<View style={{ height: 1, backgroundColor: colors.divider }} />
<Text style={[typography.h2, { color: colors.textPrimary }]}>Filter by Type</Text>
<View style={{ gap: spacing(2) }}>
{([
              { key: 'All', label: 'All Universities', count: universities.length, icon: 'apps-outline' as const },
              { key: 'Public', label: 'Public', count: publicCount, icon: 'business-outline' as const },
              { key: 'Private', label: 'Private', count: privateCount, icon: 'lock-closed-outline' as const },
            ] as { key: typeof typeFilter; label: string; count: number; icon: keyof typeof Ionicons.glyphMap }[]).map(({ key, label, count, icon }) => {
const active = typeFilter === key;
return (
<Pressable key={key} onPress={() => setTypeFilter(key)}
style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(3), paddingHorizontal: spacing(4), paddingVertical: spacing(3), borderRadius: radii.lg, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? `${colors.primary}14` : colors.surfaceAlt, opacity: pressed ? 0.85 : 1 })}>
<Ionicons name={icon} size={17} color={active ? colors.primary : colors.textPrimary} />
<Text style={[typography.label, { color: active ? colors.primary : colors.textPrimary, flex: 1 }]}>{label}</Text>
<View style={{ paddingHorizontal: spacing(2), paddingVertical: 2, borderRadius: radii.pill, backgroundColor: active ? `${colors.primary}22` : colors.surfaceAlt, borderWidth: 1, borderColor: active ? `${colors.primary}44` : colors.border }}>
<Text style={[typography.caption, { color: active ? colors.primary : colors.textMuted, fontWeight: '700' }]}>{count}</Text>
</View>
</Pressable>
              );
            })}
</View>
<View style={{ height: 1, backgroundColor: colors.divider }} />
<Text style={[typography.h2, { color: colors.textPrimary }]}>Quick Actions</Text>
<View style={{ gap: spacing(3) }}>
<SidebarAction icon="menu-outline" label="Open Menu" onPress={openMenu} variant="primary" />
<SidebarAction icon="refresh-outline" label="Clear Search" onPress={() => { setSearch(''); setTypeFilter('All'); }} />
<SidebarAction icon="school-outline" label="All Institutions" onPress={() => router.push('/student/institutions')} />
</View>
<View style={{ padding: spacing(4), backgroundColor: `${colors.primary}14`, borderRadius: radii.lg, borderLeftWidth: 3, borderLeftColor: colors.primary }}>
<Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
              💡 Tap any card to explore programmes, entry requirements, and application info.
</Text>
</View>
</View>
</View>
</View>
  );

// ── Hero banner ────────────────────────────────────────────────────────────
const HeroBanner = (
<View style={[{ backgroundColor: colors.surface, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, padding: isMobile ? spacing(4) : spacing(7), marginBottom: spacing(5), width: '100%' }, elevation]}>
<View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing(3) }}>
<View style={{ flex: 1 }}>
<Text style={[typography.hero, { color: colors.textPrimary, fontSize: isMobile ? 18 : 28, lineHeight: isMobile ? 24 : 34 }]}>
            Find the right university
</Text>
<Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing(2), lineHeight: 20, fontSize: isMobile ? 13 : undefined }]}>
            Explore universities across Botswana, compare options, and view detailed programme and admission information.
</Text>
</View>
<View style={{ flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, backgroundColor: `${colors.primary}22`, borderWidth: 1, borderColor: `${colors.primary}44` }}>
<Ionicons name="school-outline" size={14} color={colors.primary} />
<Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>{filtered.length}</Text>
</View>
</View>
</View>
  );

// ── Mobile stats strip ─────────────────────────────────────────────────────
const MobileStatsStrip = isMobile && (
<View style={{ flexDirection: 'row', gap: spacing(2), marginBottom: spacing(4), width: '100%' }}>
{[
        { icon: 'school-outline' as const, label: 'Total', value: `${universities.length}` },
        { icon: 'search-outline' as const, label: 'Results', value: `${filtered.length}` },
        { icon: 'location-outline' as const, label: 'Region', value: 'BW' },
      ].map((s) => (
<View key={s.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing(2), backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.border, padding: spacing(2) }}>
<Ionicons name={s.icon} size={12} color={colors.primary} />
<View style={{ flex: 1, minWidth: 0 }}>
<Text style={[typography.caption, { color: colors.textSecondary, fontSize: 9 }]} numberOfLines={1}>{s.label}</Text>
<Text style={[typography.label, { color: colors.textPrimary, fontSize: 11 }]} numberOfLines={1}>{s.value}</Text>
</View>
</View>
      ))}
</View>
  );

// ── Type filter strip (mobile + tablet) ───────────────────────────────────
const TypeFilterStrip = !isDesktop && (
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2), marginBottom: spacing(4) }}>
{(['All', 'Public', 'Private'] as const).map((t) => {
const active = typeFilter === t;
const color = t === 'Public' ? TYPE_COLORS.Public : t === 'Private' ? TYPE_COLORS.Private : colors.primary;
return (
<Pressable key={t} onPress={() => setTypeFilter(t)}
style={({ pressed }) => ({ flexDirection: 'row' as const, alignItems: 'center' as const, gap: spacing(2), paddingHorizontal: spacing(3), paddingVertical: spacing(2), borderRadius: radii.pill, borderWidth: 1, borderColor: active ? color : colors.border, backgroundColor: active ? color : colors.surfaceAlt, opacity: pressed ? 0.85 : 1 })}>
{t !== 'All' && <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: active ? '#fff' : color }} />}
<Text style={[typography.caption, { color: active ? '#fff' : colors.textSecondary, fontWeight: '700', fontSize: isMobile ? 11 : undefined }]}>{t}</Text>
</Pressable>
        );
      })}
</View>
  );

// ── Search bar ─────────────────────────────────────────────────────────────
const SearchBar = (
<View style={{ marginBottom: spacing(5), width: '100%' }}>
<Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(2), fontSize: isMobile ? 10 : undefined }]}>SEARCH</Text>
<View style={[{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing(3), minHeight: isMobile ? 44 : 52 }, elevation]}>
<Ionicons name="search-outline" size={isMobile ? 17 : 20} color={colors.textSecondary} />
<TextInput
value={search}
onChangeText={setSearch}
placeholder={isMobile ? 'Search universities...' : 'Search by name, location, or specialty...'}
placeholderTextColor={colors.textMuted}
style={[typography.body, { flex: 1, marginLeft: spacing(2), paddingVertical: spacing(3), color: colors.textPrimary, fontSize: isMobile ? 13 : undefined }]}
accessibilityLabel="Search universities"
returnKeyType="search"
/>
{search.length > 0 && (
<Pressable onPress={() => setSearch('')} style={({ pressed }) => ({ padding: spacing(2), opacity: pressed ? 0.7 : 1 })}>
<Ionicons name="close-circle" size={18} color={colors.textSecondary} />
</Pressable>
        )}
</View>
</View>
  );

// ── Card grid ──────────────────────────────────────────────────────────────
const Grid = loading ? (
<LoadingState />
    ) : filtered.length === 0 ? (
<EmptyState onReset={() => { setSearch(''); setTypeFilter('All'); }} />
    ) : (
<View style={{ width: '100%' }}>
<Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3), fontSize: isMobile ? 10 : undefined }]}>
          UNIVERSITIES · {filtered.length} FOUND
</Text>
{/* 2-column grid */}
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP }}>
{filtered.map((uni) => (
<UniversityCard
key={uni.id}
university={uni}
onPress={() => handleViewUniversity(uni.id)}
compact={isMobile}
/>
          ))}
</View>
</View>
    );

// ─────────────────────────────────────────────────────────────────────────
// Render
// ─────────────────────────────────────────────────────────────────────────
return (
<DashboardLayout
title="Universities"
subtitle="Explore institutions across Botswana"
showPointsCard={false}
>
{/* Back + breadcrumb */}
<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(5) }}>
<Pressable
onPress={() => router.back()}
accessibilityRole="button"
accessibilityLabel="Go back"
style={({ pressed }) => ({
flexDirection: 'row' as const,
alignItems: 'center' as const,
gap: spacing(2),
paddingHorizontal: spacing(3),
paddingVertical: spacing(2),
borderRadius: radii.lg,
backgroundColor: colors.surfaceAlt,
borderWidth: 1,
borderColor: colors.border,
opacity: pressed ? 0.8 : 1,
          })}
>
<Ionicons name="arrow-back" size={16} color={colors.primary} />
<Text style={[typography.label, { color: colors.primary, fontSize: isMobile ? 12 : undefined }]}>Back</Text>
</Pressable>
<Text style={[typography.caption, { color: colors.textMuted, flex: 1, fontSize: isMobile ? 11 : undefined }]} numberOfLines={1}>
          Institutions › Universities
</Text>
</View>
{/* Two-column on desktop, single column on mobile/tablet */}
<View
style={{
flexDirection: isDesktop ? 'row' : 'column',
gap: spacing(8),
alignItems: 'flex-start',
        }}
>
{/* Main column */}
<View style={{ flex: 1, minWidth: 0 }}>
{HeroBanner}
{MobileStatsStrip}
{TypeFilterStrip}
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
export default function UniversitiesScreen() {
return (
<StudentMenuProvider>
<UniversitiesContent />
</StudentMenuProvider>
  );
}