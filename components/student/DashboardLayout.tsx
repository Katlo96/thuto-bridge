// components/student/DashboardLayout.tsx
import React, { useMemo, useState, useCallback, ReactNode } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  Platform,
  ScrollView,
  LayoutAnimation,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStudentMenu } from './StudentMenu';
import { usePathname } from 'expo-router';

// ──────────────────────────────────────────────────────────────────────────────
// Design System (Exported)
// ──────────────────────────────────────────────────────────────────────────────
export const BASE_SPACING = 4;
export const spacing = (n: number) => n * BASE_SPACING;

export const typography = {
  hero: { fontSize: 38, lineHeight: 46, fontWeight: '900' as const },
  h1: { fontSize: 28, lineHeight: 36, fontWeight: '800' as const },
  h2: { fontSize: 22, lineHeight: 28, fontWeight: '700' as const },
  subtitle: { fontSize: 16, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '500' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
} as const;

export const radii = {
  xs: spacing(1),
  sm: spacing(2),
  md: spacing(3),
  lg: spacing(4),
  xl: spacing(6),
  xxl: spacing(8),
  pill: 9999,
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// Dark Blue Theme (Modern & Professional)
// ──────────────────────────────────────────────────────────────────────────────
export function useTheme() {
  return useMemo(() => ({
    background: '#0A1428',
    surface: '#1A2339',
    surfaceAlt: '#25314A',
    card: '#1A2339',
    divider: 'rgba(255,255,255,0.08)',
    textPrimary: '#F1F5F9',
    textSecondary: '#94A3B8',
    textMuted: '#64748B',
    primary: '#60A5FA',
    primaryText: '#FFFFFF',
    accent: '#3B82F6',
    success: '#34D399',
    warning: '#FBBF24',
    danger: '#F87171',
    border: 'rgba(255,255,255,0.10)',
  }), []);
}

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────
type DashboardLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showPointsCard?: boolean;
  points?: number;
  lastUpdated?: string;
  isEligible?: boolean;
};

// ──────────────────────────────────────────────────────────────────────────────
// Reusable Layout
// ──────────────────────────────────────────────────────────────────────────────
export default function DashboardLayout({
  children,
  title = "Welcome back, Katlo",
  subtitle = "Here's your latest overview",
  showPointsCard = false,
  points = 48,
  lastUpdated = "28 March 2026",
  isEligible = true,
}: DashboardLayoutProps) {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { openMenu } = useStudentMenu();
  const [navExpanded, setNavExpanded] = useState(true);
  const [showInstitutionModal, setShowInstitutionModal] = useState(false);
  const pathname = usePathname();

  const breakpoint = useMemo<'mobile' | 'tablet' | 'desktop'>(() => {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';
  const contentMaxWidth = isDesktop ? 1280 : width;
  const pagePadding = breakpoint === 'mobile' ? spacing(5) : breakpoint === 'tablet' ? spacing(6) : spacing(8);

  const toggleNav = useCallback(() => {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setNavExpanded((prev) => !prev);
  }, []);

  const openInstitutionModal = useCallback(() => setShowInstitutionModal(true), []);
  const closeInstitutionModal = useCallback(() => setShowInstitutionModal(false), []);

  // Updated Navigation Items - Saved added under My Career section
  const navItems = useMemo(() => [
    { key: 'dashboard', label: 'Home', icon: 'home-outline' as const, href: '/student/dashboard' },
    { key: 'courses', label: 'Courses', icon: 'book-outline' as const, href: '/student/courses' },
    { key: 'institutions', label: 'Institutions', icon: 'school-outline' as const, onPress: openInstitutionModal },
    { key: 'scholarships', label: 'Scholarships', icon: 'ribbon-outline' as const, href: '/student/scholarships' },
    { key: 'progress', label: 'Progress', icon: 'trending-up-outline' as const, href: '/student/progress' },
    { key: 'applications', label: 'Applications', icon: 'document-text-outline' as const, href: '/student/applications' },
    { key: 'myCareer', label: 'My Career', icon: 'compass-outline' as const, href: '/student/my-career' },
    { key: 'saved', label: 'Saved', icon: 'bookmark-outline' as const, href: '/student/saved' },
  ], [openInstitutionModal]);

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={{
            padding: pagePadding,
            paddingBottom: spacing(12),
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
          }}
          showsVerticalScrollIndicator={isDesktop}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={[typography.h1, { color: colors.textPrimary }]}>{title}</Text>
              {subtitle && (
                <Text style={[typography.subtitle, { color: colors.textSecondary, marginTop: spacing(1) }]}>
                  {subtitle}
                </Text>
              )}
            </View>
            <Pressable
              onPress={openMenu}
              style={({ pressed }) => [
                styles.menuButton,
                { backgroundColor: colors.surfaceAlt },
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons name="menu" size={24} color={colors.textPrimary} />
              {isDesktop && <Text style={[typography.label, { marginLeft: spacing(2), color: colors.textPrimary }]}>Menu</Text>}
            </Pressable>
          </View>

          {/* Main Layout */}
          <View style={[styles.main, isDesktop && { flexDirection: 'row', gap: spacing(8) }]}>
            {/* Desktop Sidebar */}
            {isDesktop && (
              <View style={{ width: 280, flexShrink: 0 }}>
                <View style={[styles.card, { backgroundColor: colors.surface }]}>
                  <View style={styles.sidebarHeader}>
                    <Text style={[typography.h2, { color: colors.textPrimary }]}>Student</Text>
                    <Pressable onPress={toggleNav} style={styles.toggleButton}>
                      <Ionicons name={navExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                    </Pressable>
                  </View>

                  {navExpanded && (
                    <View style={{ padding: spacing(4), paddingTop: spacing(2), borderTopWidth: 1, borderTopColor: colors.divider }}>
                      {navItems.map((item) => {
                        const isActive =
                          item.href &&
                          (pathname === item.href || pathname.startsWith(item.href));
                        return (
                          <Pressable
                            key={item.key}
                            onPress={item.href ? () => router.push(item.href) : item.onPress}
                            style={({ pressed }) => [
                              styles.navItem,
                              isActive && styles.navItemActive,
                              pressed && styles.navItemPressed,
                            ]}
                          >
                            <Ionicons name={item.icon} size={20} color={isActive ? colors.primary : colors.textPrimary} />
                            <Text style={[typography.body, { marginLeft: spacing(3), color: isActive ? colors.primary : colors.textPrimary, flex: 1 }]}>
                              {item.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Main Content */}
            <View style={{ flex: 1 }}>
              {showPointsCard && (
                <View style={[styles.card, styles.heroCard, { backgroundColor: colors.surface }]}>
                  <View style={styles.pointsRow}>
                    <View>
                      <Text style={[typography.label, { color: colors.textSecondary }]}>Your Points</Text>
                      <Text style={[typography.h1, { color: colors.primary, marginTop: spacing(1) }]}>{points}</Text>
                      <Text style={[typography.caption, { color: colors.textMuted, marginTop: spacing(1) }]}>
                        Last updated {lastUpdated}
                      </Text>
                    </View>
                    <View style={styles.pointsRight}>
                      <View style={[styles.badge, { backgroundColor: `${colors.success}22`, borderColor: colors.success }]}>
                        <Text style={{ color: colors.success, fontWeight: '700' }}>Eligible</Text>
                      </View>
                      <Pressable
                        onPress={() => router.push('/student/enter-results')}
                        style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
                      >
                        <Text style={[typography.bodyStrong, { color: colors.primaryText }]}>Enter Results</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              )}
              {children}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Institutions Modal */}
      <Modal visible={showInstitutionModal} transparent animationType="fade" onRequestClose={closeInstitutionModal}>
        <Pressable style={modalStyles.overlay} onPress={closeInstitutionModal}>
          <Pressable
            style={[modalStyles.container, { backgroundColor: colors.surface }]}
            onPress={() => {}}
          >
            <View style={modalStyles.header}>
              <Text style={[modalStyles.title, { color: colors.textPrimary }]}>Choose Institution Type</Text>
              <Pressable onPress={closeInstitutionModal} hitSlop={16}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            <View style={modalStyles.options}>
              <Pressable
                style={[modalStyles.option, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => { closeInstitutionModal(); router.push('/student/universities'); }}
              >
                <View style={[modalStyles.iconWrap, { backgroundColor: '#172554' }]}>
                  <Ionicons name="school-outline" size={32} color={colors.primary} />
                </View>
                <Text style={[modalStyles.optionText, { color: colors.textPrimary }]}>Universities</Text>
              </Pressable>
              <Pressable
                style={[modalStyles.option, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => { closeInstitutionModal(); router.push('/student/colleges'); }}
              >
                <View style={[modalStyles.iconWrap, { backgroundColor: '#14532D' }]}>
                  <Ionicons name="business-outline" size={32} color="#34D399" />
                </View>
                <Text style={[modalStyles.optionText, { color: colors.textPrimary }]}>Colleges</Text>
              </Pressable>
              <Pressable
                style={[modalStyles.option, { backgroundColor: colors.surfaceAlt }]}
                onPress={() => { closeInstitutionModal(); router.push('/student/brigades'); }}
              >
                <View style={[modalStyles.iconWrap, { backgroundColor: '#78350F' }]}>
                  <Ionicons name="construct-outline" size={32} color="#FBBF24" />
                </View>
                <Text style={[modalStyles.optionText, { color: colors.textPrimary }]}>Brigades</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing(8) },
  headerLeft: { flex: 1 },
  menuButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing(4), paddingVertical: spacing(3), borderRadius: radii.lg, minHeight: 48 },
  main: { flex: 1 },
  card: { borderRadius: radii.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' },
  heroCard: { padding: spacing(6) },
  pointsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing(6) },
  pointsRight: { alignItems: 'flex-end' },
  badge: { paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.pill, borderWidth: 1, alignSelf: 'flex-start' },
  primaryButton: { paddingHorizontal: spacing(6), paddingVertical: spacing(4), borderRadius: radii.lg, marginTop: spacing(3), backgroundColor: '#3B82F6' },
  buttonPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  sidebarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing(6), paddingBottom: spacing(4) },
  toggleButton: { padding: spacing(2), borderRadius: radii.md },
  navItem: { flexDirection: 'row', alignItems: 'center', padding: spacing(4), borderRadius: radii.lg, marginBottom: spacing(2) },
  navItemActive: { backgroundColor: 'rgba(96,165,250,0.15)' },
  navItemPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: spacing(6) },
  container: { width: '90%', maxWidth: 400, borderRadius: radii.xxl, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing(6), borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  title: { fontSize: 20, fontWeight: '700' },
  options: { padding: spacing(5), gap: spacing(4) },
  option: { flexDirection: 'row', alignItems: 'center', padding: spacing(5), borderRadius: radii.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  iconWrap: { width: 72, height: 72, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', marginRight: spacing(5) },
  optionText: { fontSize: 18, fontWeight: '600' },
});