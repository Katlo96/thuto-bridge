import React, { useMemo, useState, useCallback } from 'react';
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
import { useEffect } from 'react';
import { db } from '../../constants/firebase';
import { collection, getDocs } from 'firebase/firestore';
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
import StudentFooter from '../../components/student/StudentFooter';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type Breakpoint = 'mobile' | 'tablet' | 'desktop';

type Brigade = {
  id: string;
  name: string;
  location: string;
  tagline: string;
  badge: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Elevation helper
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = 0.28;
    const radius  = intensity === 'sm' ? 6  : intensity === 'md' ? 14 : 22;
    const offsetY = intensity === 'sm' ? 2  : intensity === 'md' ? 5  : 10;
    return (
      Platform.select({
        ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: radius },
        android: { elevation: intensity === 'sm' ? 3 : intensity === 'md' ? 6 : 12 },
        web:     { boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})` },
        default: {},
      }) ?? {}
    );
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// StatPill
// ─────────────────────────────────────────────────────────────────────────────
function StatPill({
  icon,
  label,
  value,
}: {
  icon:  keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  const colors    = useTheme();
  const elevation = useElevation('sm');
  return (
    <View
      style={[
        {
          flexDirection:     'row',
          alignItems:        'center',
          gap:               spacing(3),
          paddingHorizontal: spacing(4),
          paddingVertical:   spacing(3),
          backgroundColor:   colors.surfaceAlt,
          borderRadius:      radii.lg,
          borderWidth:       1,
          borderColor:       colors.border,
        },
        elevation,
      ]}
    >
      <View
        style={{
          width:           36,
          height:          36,
          borderRadius:    radii.md,
          backgroundColor: `${colors.primary}22`,
          alignItems:      'center',
          justifyContent:  'center',
        }}
      >
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
function SidebarAction({
  icon,
  label,
  onPress,
  variant = 'ghost',
}: {
  icon:     keyof typeof Ionicons.glyphMap;
  label:    string;
  onPress:  () => void;
  variant?: 'ghost' | 'primary';
}) {
  const colors    = useTheme();
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection:     'row' as const,
        alignItems:        'center' as const,
        gap:               spacing(3),
        paddingHorizontal: spacing(4),
        paddingVertical:   spacing(3),
        borderRadius:      radii.lg,
        borderWidth:       1,
        borderColor:       isPrimary ? colors.primary : colors.border,
        backgroundColor:   isPrimary ? colors.primary : colors.surfaceAlt,
        opacity:           pressed ? 0.85 : 1,
        transform:         pressed ? [{ scale: 0.98 }] : [],
      })}
    >
      <Ionicons name={icon} size={17} color={isPrimary ? '#fff' : colors.textPrimary} />
      <Text style={[typography.label, { color: isPrimary ? '#fff' : colors.textPrimary }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BrigadeCard
// width is controlled entirely by the WRAPPER in the grid, not here.
// The card itself is always width: '100%' so it fills whatever slot it's given.
// ─────────────────────────────────────────────────────────────────────────────
function BrigadeCard({
  brigade,
  onPress,
}: {
  brigade: Brigade;
  onPress: () => void;
}) {
  const colors    = useTheme();
  const elevation = useElevation('md');
  const { t } = useLanguage();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t('View details')}: ${brigade.name}`}
      style={({ pressed }) => [
        {
          width:           '100%',      // always fill the wrapper
          backgroundColor: colors.surface,
          borderRadius:    radii.xl,
          borderWidth:     1,
          borderColor:     colors.border,
          padding:         spacing(5),
          overflow:        'hidden' as const,
          opacity:         pressed ? 0.9 : 1,
          transform:       pressed ? [{ scale: 0.98 }] : [],
        },
        elevation,
      ]}
    >
      {/* Top accent bar */}
      <View style={{ height: 3, backgroundColor: colors.primary, borderRadius: 2, marginBottom: spacing(4) }} />

      {/* Top row: badge + chevron */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View
          style={{
            paddingHorizontal: spacing(3),
            paddingVertical:   spacing(2),
            borderRadius:      radii.pill,
            backgroundColor:   `${colors.primary}22`,
            borderWidth:       1,
            borderColor:       `${colors.primary}44`,
          }}
        >
          <Text style={[typography.label, { color: colors.primary, letterSpacing: 0.4 }]}>
            {brigade.badge}
          </Text>
        </View>

        <View
          style={{
            width:           34,
            height:          34,
            borderRadius:    radii.md,
            backgroundColor: colors.surfaceAlt,
            borderWidth:     1,
            borderColor:     colors.border,
            alignItems:      'center',
            justifyContent:  'center',
          }}
        >
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </View>
      </View>

      {/* Name */}
      <Text
        style={[typography.h2, { color: colors.textPrimary, marginTop: spacing(4) }]}
        numberOfLines={2}
      >
        {brigade.name}
      </Text>

      {/* Location */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(2), marginTop: spacing(2) }}>
        <Ionicons name="location-outline" size={13} color={colors.primary} />
        <Text style={[typography.caption, { color: colors.textSecondary, flex: 1 }]} numberOfLines={1}>
          {brigade.location}
        </Text>
      </View>

      {/* Tagline */}
      <Text
        style={[typography.body, { color: colors.textSecondary, marginTop: spacing(3), lineHeight: 20 }]}
        numberOfLines={3}
      >
        {brigade.tagline}
      </Text>

      {/* Footer */}
      <View
        style={{
          marginTop:        spacing(4),
          paddingTop:       spacing(3),
          borderTopWidth:   1,
          borderTopColor:   colors.divider,
          flexDirection:    'row',
          alignItems:       'center',
          justifyContent:   'space-between',
        }}
      >
        <Text style={[typography.label, { color: colors.primary }]}>{t('View details')}</Text>
        <Ionicons name="arrow-forward" size={15} color={colors.primary} />
      </View>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EmptyState
// ─────────────────────────────────────────────────────────────────────────────
function EmptyState({ onReset }: { onReset: () => void }) {
  const colors    = useTheme();
  const elevation = useElevation('sm');
  const { t } = useLanguage();
  return (
    <View
      style={[
        {
          alignItems:      'center',
          padding:         spacing(10),
          backgroundColor: colors.surface,
          borderRadius:    radii.xxl,
          borderWidth:     1,
          borderColor:     colors.border,
        },
        elevation,
      ]}
    >
      <View
        style={{
          width:           68,
          height:          68,
          borderRadius:    radii.xl,
          backgroundColor: `${colors.primary}22`,
          borderWidth:     1,
          borderColor:     colors.border,
          alignItems:      'center',
          justifyContent:  'center',
          marginBottom:    spacing(5),
        }}
      >
        <Ionicons name="search-outline" size={28} color={colors.primary} />
      </View>
      <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center' }]}>
        {t('No brigades found')}
      </Text>
      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, marginTop: spacing(2), textAlign: 'center', maxWidth: 300 },
        ]}
      >
        {t('Try a different brigade name, location, or keyword.')}
      </Text>
      <Pressable
        onPress={onReset}
        accessibilityRole="button"
        accessibilityLabel={t('RESET SEARCH')}
        style={({ pressed }) => ({
          marginTop:         spacing(6),
          flexDirection:     'row' as const,
          alignItems:        'center' as const,
          gap:               spacing(2),
          paddingHorizontal: spacing(6),
          paddingVertical:   spacing(4),
          borderRadius:      radii.lg,
          backgroundColor:   colors.primary,
          opacity:           pressed ? 0.88 : 1,
          transform:         pressed ? [{ scale: 0.98 }] : [],
        })}
      >
        <Ionicons name="refresh-outline" size={17} color="#fff" />
        <Text style={[typography.label, { color: '#fff', letterSpacing: 0.4 }]}>{t('RESET SEARCH')}</Text>
      </Pressable>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BrigadesContent
// ─────────────────────────────────────────────────────────────────────────────
function BrigadesContent() {
  const { width } = useWindowDimensions();
  const colors    = useTheme();
  const { t } = useLanguage();
  const { openMenu } = useStudentMenu();
  const elevation = useElevation('md');

  const breakpoint = useMemo<Breakpoint>(() => {
    if (width < 768)  return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const isTablet  = breakpoint === 'tablet';
  const isMobile  = breakpoint === 'mobile';

  const [search,   setSearch]   = useState('');
  const [brigades, setBrigades] = useState<Brigade[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const fetchBrigades = async () => {
      try {
        setLoading(true);
        const snapshot = await getDocs(collection(db, 'institutions'));
        const brigadesData: Brigade[] = snapshot.docs
          .filter((doc) => doc.data().category?.toLowerCase() === 'brigade')
          .map((doc) => {
            const data = doc.data();
            return {
              id:       doc.id,
              name:     data.name     ?? 'Unnamed Brigade',
              location: data.location ?? 'Botswana',
              tagline:  data.about ?? data.tagline ?? 'No description available.',
              badge:    data.badge    ?? 'BRG',
            };
          });
        setBrigades(brigadesData);
      } catch (error) {
        console.error('Failed to load brigades:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBrigades();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return brigades;
    const q = search.toLowerCase();
    return brigades.filter(
      (b) =>
        b.name.toLowerCase().includes(q)     ||
        b.location.toLowerCase().includes(q) ||
        b.tagline.toLowerCase().includes(q),
    );
  }, [search, brigades]);

  const handleViewBrigade = useCallback((id: string) => {
    router.push({ pathname: '/student/brigade-details', params: { id } });
  }, []);

  // ── Column count for the card grid ──────────────────────────────────────
  // mobile: 1 col  |  tablet: 2 cols  |  desktop: 2 cols (sidebar takes the 3rd)
  const numCols = isMobile ? 1 : 2;

  // ── Sidebar (desktop only) ───────────────────────────────────────────────
  const Sidebar = isDesktop && (
    <View style={{ width: 300, flexShrink: 0, gap: spacing(5) }}>
      <View
        style={[
          {
            backgroundColor: colors.surface,
            borderRadius:    radii.xxl,
            borderWidth:     1,
            borderColor:     colors.border,
            padding:         spacing(6),
            gap:             spacing(4),
          },
          elevation,
        ]}
      >
        <Text style={[typography.h2, { color: colors.textPrimary }]}>{t('Overview')}</Text>
        <View style={{ gap: spacing(3) }}>
          <StatPill icon="business-outline" label={t('Total Brigades')} value={`${brigades.length}`} />
          <StatPill icon="search-outline" label={t('Search Results')} value={`${filtered.length}`} />
          <StatPill icon="location-outline" label={t('Coverage')} value="Botswana" />
        </View>

        <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing(1) }} />

        <Text style={[typography.h2, { color: colors.textPrimary }]}>{t('Quick Actions')}</Text>
        <View style={{ gap: spacing(3) }}>
          <SidebarAction icon="menu-outline" label={t('Open Menu')} onPress={openMenu} variant="primary" />
          <SidebarAction icon="refresh-outline" label={t('Clear Search')} onPress={() => setSearch('')} />
          <SidebarAction icon="school-outline" label={t('All Institutions')} onPress={() => router.push('/student/institutions')} />
        </View>

        <View
          style={{
            marginTop:       spacing(2),
            padding:         spacing(4),
            backgroundColor: `${colors.primary}14`,
            borderRadius:    radii.lg,
            borderLeftWidth: 3,
            borderLeftColor: colors.primary,
          }}
        >
          <Text style={[typography.caption, { color: colors.textSecondary, lineHeight: 18 }]}>
            {t('💡 Tip: Search by brigade name, city, or specialty to narrow results faster.')}
          </Text>
        </View>
      </View>
    </View>
  );

  // ── Hero banner ──────────────────────────────────────────────────────────
  const HeroBanner = (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius:    radii.xxl,
          borderWidth:     1,
          borderColor:     colors.border,
          padding:         isMobile ? spacing(5) : spacing(7),
          marginBottom:    spacing(6),
          overflow:        'hidden',
        },
        elevation,
      ]}
    >
      {/* Accent top bar */}
      <View style={{ height: 3, backgroundColor: colors.primary, borderRadius: 2, marginBottom: spacing(4) }} />

      <View
        style={{
          flexDirection:  isMobile ? 'column' : 'row',
          alignItems:     isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between',
          gap:            spacing(4),
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={[typography.hero, { color: colors.textPrimary }]}>
            {t('Find the right brigade')}
          </Text>
          <Text
            style={[
              typography.body,
              { color: colors.textSecondary, marginTop: spacing(2) },
            ]}
          >
            {t('Explore brigades across Botswana, compare options, and open detailed pages for a deeper look at courses and scholarships.')}
          </Text>
        </View>

        {/* Result count pill */}
        <View
          style={{
            flexDirection:     'row',
            alignItems:        'center',
            gap:               spacing(2),
            paddingHorizontal: spacing(4),
            paddingVertical:   spacing(2),
            borderRadius:      radii.pill,
            backgroundColor:   `${colors.primary}22`,
            borderWidth:       1,
            borderColor:       `${colors.primary}44`,
            alignSelf:         isMobile ? 'flex-start' : 'center',
            flexShrink:        0,
          }}
        >
          <Ionicons name="construct-outline" size={15} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary }]}>
            {filtered.length} {filtered.length === 1 ? t('Search Results').replace(/s$/i, '') : t('Search Results')}
          </Text>
        </View>
      </View>
    </View>
  );

  // ── Search bar ───────────────────────────────────────────────────────────
  const SearchBar = (
    <View style={{ marginBottom: spacing(6) }}>
      <Text
        style={[
          typography.caption,
          { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(2) },
        ]}
      >
        {t('SEARCH')}
      </Text>
      <View
        style={[
          {
            flexDirection:     'row',
            alignItems:        'center',
            backgroundColor:   colors.surface,
            borderRadius:      radii.xl,
            borderWidth:       1,
            borderColor:       colors.border,
            paddingHorizontal: spacing(4),
            minHeight:         52,
          },
          elevation,
        ]}
      >
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={t('Search by name, location, or specialty…')}
          placeholderTextColor={colors.textMuted}
          style={[
            typography.body,
            {
              flex:            1,
              marginLeft:      spacing(3),
              paddingVertical: spacing(3),
              color:           colors.textPrimary,
            },
          ]}
          accessibilityLabel={t('Search by name, location, or specialty…')}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable
            onPress={() => setSearch('')}
            accessibilityRole="button"
            accessibilityLabel={t('Clear Search')}
            style={({ pressed }) => ({ padding: spacing(2), opacity: pressed ? 0.7 : 1 })}
          >
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
    </View>
  );

  // ── Mobile stats strip ───────────────────────────────────────────────────
  // Using `width: '33.33%'` wrappers instead of flex+minWidth to avoid overflow
  const MobileStatsStrip = isMobile && (
    <View style={{ flexDirection: 'row', marginBottom: spacing(6) }}>
      {[
        { icon: 'business-outline' as const, label: t('Total Brigades'), value: `${brigades.length}` },
        { icon: 'search-outline' as const, label: t('Search Results'), value: `${filtered.length}` },
        { icon: 'location-outline' as const, label: t('Coverage'), value: 'BW' },
      ].map((s, i) => (
        <View
          key={s.label}
          style={{
            width:           '33.33%',
            paddingRight:    i < 2 ? spacing(2) : 0,
          }}
        >
          <View
            style={{
              flexDirection:   'row',
              alignItems:      'center',
              gap:             spacing(2),
              backgroundColor: colors.surface,
              borderRadius:    radii.lg,
              borderWidth:     1,
              borderColor:     colors.border,
              padding:         spacing(3),
            }}
          >
            <Ionicons name={s.icon} size={14} color={colors.primary} />
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                {s.label}
              </Text>
              <Text style={[typography.label, { color: colors.textPrimary }]} numberOfLines={1}>
                {s.value}
              </Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );

  // ── Card grid ────────────────────────────────────────────────────────────
  // Each card sits in an explicit percentage-width wrapper.
  // This is the only reliable way to make flex-wrap grids work on both
  // React Native mobile and web — never use minWidth on the card itself.
  const cardWrapperWidth = numCols === 1 ? '100%' : '50%';
  const cardGap          = spacing(4);

  const Grid =
    filtered.length === 0 ? (
      <EmptyState onReset={() => setSearch('')} />
    ) : (
      <View>
        <Text
          style={[
            typography.caption,
            { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) },
          ]}
        >
          {t('BRIGADES (')}{filtered.length})
        </Text>

        {/* Outer negative-margin trick so cards in multi-col have even gutters */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap:      'wrap',
            marginRight:   numCols > 1 ? -cardGap : 0,
          }}
        >
          {filtered.map((brigade) => (
            <View
              key={brigade.id}
              style={{
                width:         cardWrapperWidth as any,
                paddingRight:  numCols > 1 ? cardGap : 0,
                paddingBottom: cardGap,
              }}
            >
              <BrigadeCard
                brigade={brigade}
                onPress={() => handleViewBrigade(brigade.id)}
              />
            </View>
          ))}
        </View>
      </View>
    );

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <DashboardLayout
        title={t('Brigades')}
        subtitle={t('Explore brigades across Botswana')}
        showPointsCard={false}
      >
        <View style={{ alignItems: 'center', marginTop: spacing(12), gap: spacing(4) }}>
          <View
            style={{
              width:           56,
              height:          56,
              borderRadius:    28,
              backgroundColor: `${colors.primary}22`,
              alignItems:      'center',
              justifyContent:  'center',
            }}
          >
            <Ionicons name="construct-outline" size={26} color={colors.primary} />
          </View>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
            {t('Loading brigade information...')}
          </Text>
        </View>
      </DashboardLayout>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout
      title={t('Brigades')}
      subtitle={t('Explore brigades across Botswana')}
      showPointsCard={false}
    >
      {/* Back navigation */}
      <View
        style={{
          flexDirection: 'row',
          alignItems:    'center',
          gap:           spacing(3),
          marginBottom:  spacing(6),
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('Go Back')}
          style={({ pressed }) => ({
            flexDirection:     'row' as const,
            alignItems:        'center' as const,
            gap:               spacing(2),
            paddingHorizontal: spacing(4),
            paddingVertical:   spacing(2),
            borderRadius:      radii.lg,
            backgroundColor:   colors.surfaceAlt,
            borderWidth:       1,
            borderColor:       colors.border,
            opacity:           pressed ? 0.8 : 1,
          })}
        >
          <Ionicons name="arrow-back" size={17} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary }]}>{t('Go Back')}</Text>
        </Pressable>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          {t('Institutions › Brigades')}
        </Text>
      </View>

      {/* Desktop: two-column. Mobile/tablet: stacked */}
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          gap:           spacing(8),
          alignItems:    'flex-start',
        }}
      >
        {/* Main column */}
        <View style={{ flex: 1, minWidth: 0, width: '100%' }}>
          {HeroBanner}
          {MobileStatsStrip}
          {SearchBar}
          {Grid}
        </View>

        {/* Sidebar — desktop only */}
        {Sidebar}
      </View>

      {/* Shared responsive student footer */}
      <StudentFooter
        topSpacing={isMobile ? spacing(8) : spacing(10)}
        maxWidth={1280}
      />
    </DashboardLayout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exported Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function BrigadesScreen() {
  return (
    <StudentMenuProvider>
      <BrigadesContent />
    </StudentMenuProvider>
  );
}