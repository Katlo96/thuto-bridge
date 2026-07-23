// components/student/DashboardLayout.tsx
import React, {
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';
import {
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppPreferences } from '../../contexts/AppPreferencesContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useStudentMenu } from './StudentMenu';

export const BASE_SPACING = 4;

const BASE_TYPOGRAPHY = {
  hero: {
    fontSize: 38,
    lineHeight: 46,
    fontWeight: '900' as const,
  },
  h1: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800' as const,
  },
  h2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500' as const,
  },
  bodyStrong: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  label: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700' as const,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as const,
  },
};

type TypographyKey = keyof typeof BASE_TYPOGRAPHY;

let activeSpacingScale = 1;
let activeTextScale = 1;
let activeIconScale = 1;

function createScaledTypography(key: TypographyKey) {
  const baseStyle = BASE_TYPOGRAPHY[key];

  return {
    ...baseStyle,
    fontSize: Math.round(baseStyle.fontSize * activeTextScale),
    lineHeight: Math.round(baseStyle.lineHeight * activeTextScale),
  };
}

export const typography = {
  get hero() {
    return createScaledTypography('hero');
  },

  get h1() {
    return createScaledTypography('h1');
  },

  get h2() {
    return createScaledTypography('h2');
  },

  get subtitle() {
    return createScaledTypography('subtitle');
  },

  get body() {
    return createScaledTypography('body');
  },

  get bodyStrong() {
    return createScaledTypography('bodyStrong');
  },

  get label() {
    return createScaledTypography('label');
  },

  get caption() {
    return createScaledTypography('caption');
  },
};

function applyDesignScales(
  spacingScale: number,
  textScale: number,
  iconScaleValue: number,
) {
  activeSpacingScale = Number.isFinite(spacingScale) ? spacingScale : 1;
  activeTextScale = Number.isFinite(textScale) ? textScale : 1;
  activeIconScale = Number.isFinite(iconScaleValue)
    ? iconScaleValue
    : 1;
}

export const spacing = (value: number) =>
  Math.round(value * BASE_SPACING * activeSpacingScale);

export const iconSize = (size: number) =>
  Math.max(12, Math.round(size * activeIconScale));

export const radii = {
  xs: BASE_SPACING,
  sm: BASE_SPACING * 2,
  md: BASE_SPACING * 3,
  lg: BASE_SPACING * 4,
  xl: BASE_SPACING * 6,
  xxl: BASE_SPACING * 8,
  pill: 9999,
} as const;

export function useTheme() {
  const {
    colors,
    spacingScale,
    textScale,
    iconScale: preferenceIconScale,
  } = useAppPreferences();

  applyDesignScales(
    spacingScale,
    textScale,
    preferenceIconScale,
  );

  return colors;
}

export function useDesignSystem() {
  const preferences = useAppPreferences();

  applyDesignScales(
    preferences.spacingScale,
    preferences.textScale,
    preferences.iconScale,
  );

  return {
    ...preferences,
    spacing,
    typography,
    radii,
    iconSize,
  };
}

type DashboardLayoutProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showPointsCard?: boolean;
  points?: number;
  lastUpdated?: string;
  eligible?: boolean;
  banner?: ReactNode;
};

type NavItem = {
  key: string;
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  href?: string;
  onPress?: () => void;
};

export default function DashboardLayout({
  children,
  title,
  subtitle,
  showPointsCard = false,
  points,
  lastUpdated,
  eligible,
  banner,
}: DashboardLayoutProps) {
  const { width } = useWindowDimensions();
  const colors = useTheme();
  const { t } = useLanguage();
  const { openMenu } = useStudentMenu();
  const pathname = usePathname();

  const [navExpanded, setNavExpanded] = useState(true);
  const [showInstitutionModal, setShowInstitutionModal] =
    useState(false);

  const breakpoint = useMemo<
    'mobile' | 'tablet' | 'desktop'
  >(() => {
    if (width < 768) {
      return 'mobile';
    }

    if (width < 1024) {
      return 'tablet';
    }

    return 'desktop';
  }, [width]);

  const isDesktop = breakpoint === 'desktop';

  const contentMaxWidth = isDesktop ? 1280 : width;

  const pagePadding =
    breakpoint === 'mobile'
      ? spacing(5)
      : breakpoint === 'tablet'
        ? spacing(6)
        : spacing(8);

  const resolvedSubtitle =
    subtitle ?? t("Here's your latest overview");

  const toggleNav = useCallback(() => {
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(
        LayoutAnimation.Presets.easeInEaseOut,
      );
    }

    setNavExpanded(previous => !previous);
  }, []);

  const openInstitutionModal = useCallback(() => {
    setShowInstitutionModal(true);
  }, []);

  const closeInstitutionModal = useCallback(() => {
    setShowInstitutionModal(false);
  }, []);

  const navigateTo = useCallback((href: string) => {
    router.push(href);
  }, []);

  const navItems = useMemo<NavItem[]>(
    () => [
      {
        key: 'dashboard',
        labelKey: 'Home',
        icon: 'home-outline',
        href: '/student/dashboard',
      },
      {
        key: 'courses',
        labelKey: 'Courses',
        icon: 'book-outline',
        href: '/student/courses',
      },
      {
        key: 'institutions',
        labelKey: 'Institutions',
        icon: 'school-outline',
        onPress: openInstitutionModal,
      },
      {
        key: 'scholarships',
        labelKey: 'Scholarships',
        icon: 'ribbon-outline',
        href: '/student/scholarships',
      },
      {
        key: 'progress',
        labelKey: 'Progress',
        icon: 'trending-up-outline',
        href: '/student/progress',
      },
      {
        key: 'myCareer',
        labelKey: 'My Career',
        icon: 'compass-outline',
        href: '/student/my-career',
      },
      {
        key: 'saved',
        labelKey: 'Saved',
        icon: 'bookmark-outline',
        href: '/student/saved',
      },
    ],
    [openInstitutionModal],
  );

  const hasPoints =
    showPointsCard &&
    typeof points === 'number' &&
    Number.isFinite(points);

  return (
    <View
      style={[
        styles.page,
        {
          backgroundColor: colors.background,
        },
      ]}
    >
      <SafeAreaView
        style={styles.safeArea}
        edges={['top', 'bottom']}
      >
        <ScrollView
          showsVerticalScrollIndicator={isDesktop}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: pagePadding,
            paddingBottom: spacing(12),
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          <View
            style={[
              styles.header,
              {
                marginBottom: spacing(8),
              },
            ]}
          >
            <View style={styles.headerLeft}>
              {!!title && (
                <Text
                  style={[
                    typography.h1,
                    {
                      color: colors.textPrimary,
                    },
                  ]}
                >
                  {title}
                </Text>
              )}

              {!!resolvedSubtitle && (
                <Text
                  style={[
                    typography.subtitle,
                    {
                      color: colors.textSecondary,
                      marginTop: title ? spacing(1) : 0,
                    },
                  ]}
                >
                  {resolvedSubtitle}
                </Text>
              )}
            </View>

            <Pressable
              onPress={openMenu}
              accessibilityRole="button"
              accessibilityLabel={t('Open student menu')}
              hitSlop={8}
              style={({ pressed }) => [
                styles.menuButton,
                {
                  backgroundColor: colors.surfaceAlt,
                  borderColor: colors.border,
                  paddingHorizontal: spacing(4),
                  paddingVertical: spacing(3),
                  borderRadius: radii.lg,
                },
                pressed && styles.buttonPressed,
              ]}
            >
              <Ionicons
                name="menu"
                size={iconSize(24)}
                color={colors.textPrimary}
              />

              {isDesktop && (
                <Text
                  style={[
                    typography.label,
                    {
                      marginLeft: spacing(2),
                      color: colors.textPrimary,
                    },
                  ]}
                >
                  {t('Menu')}
                </Text>
              )}
            </Pressable>
          </View>

          {!!banner && (
            <View
              style={{
                marginBottom: spacing(6),
              }}
            >
              {banner}
            </View>
          )}

          <View
            style={[
              styles.main,
              isDesktop && {
                flexDirection: 'row',
                gap: spacing(8),
              },
            ]}
          >
            {isDesktop && (
              <View style={styles.sidebarColumn}>
                <View
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radii.xl,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.sidebarHeader,
                      {
                        padding: spacing(6),
                        paddingBottom: spacing(4),
                      },
                    ]}
                  >
                    <Text
                      style={[
                        typography.h2,
                        {
                          color: colors.textPrimary,
                        },
                      ]}
                    >
                      {t('Student')}
                    </Text>

                    <Pressable
                      onPress={toggleNav}
                      accessibilityRole="button"
                      accessibilityLabel={
                        navExpanded
                          ? t('Close menu')
                          : t('Open menu')
                      }
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.toggleButton,
                        {
                          padding: spacing(2),
                          borderRadius: radii.md,
                        },
                        pressed && styles.buttonPressed,
                      ]}
                    >
                      <Ionicons
                        name={
                          navExpanded
                            ? 'chevron-up'
                            : 'chevron-down'
                        }
                        size={iconSize(20)}
                        color={colors.textSecondary}
                      />
                    </Pressable>
                  </View>

                  {navExpanded && (
                    <View
                      style={{
                        padding: spacing(4),
                        paddingTop: spacing(2),
                        borderTopWidth: 1,
                        borderTopColor: colors.divider,
                      }}
                    >
                      {navItems.map(item => {
                        const isActive =
                          typeof item.href === 'string' &&
                          (
                            pathname === item.href ||
                            pathname.startsWith(
                              `${item.href}/`,
                            )
                          );

                        const handlePress = () => {
                          if (item.href) {
                            navigateTo(item.href);
                            return;
                          }

                          if (item.onPress) {
                            item.onPress();
                          }
                        };

                        return (
                          <Pressable
                            key={item.key}
                            onPress={handlePress}
                            accessibilityRole="button"
                            accessibilityLabel={t(
                              item.labelKey,
                            )}
                            accessibilityState={{
                              selected: Boolean(isActive),
                            }}
                            style={({ pressed }) => [
                              styles.navItem,
                              {
                                padding: spacing(4),
                                borderRadius: radii.lg,
                                marginBottom: spacing(2),
                              },
                              isActive && {
                                backgroundColor: `${colors.primary}18`,
                              },
                              pressed &&
                                styles.navItemPressed,
                            ]}
                          >
                            <Ionicons
                              name={item.icon}
                              size={iconSize(20)}
                              color={
                                isActive
                                  ? colors.primary
                                  : colors.textPrimary
                              }
                            />

                            <Text
                              style={[
                                typography.body,
                                {
                                  marginLeft: spacing(3),
                                  color: isActive
                                    ? colors.primary
                                    : colors.textPrimary,
                                  flex: 1,
                                },
                              ]}
                            >
                              {t(item.labelKey)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            )}

            <View style={styles.contentColumn}>
              {hasPoints && (
                <View
                  style={[
                    styles.card,
                    styles.heroCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      borderRadius: radii.xl,
                      padding: spacing(6),
                      marginBottom: spacing(6),
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.pointsRow,
                      {
                        gap: spacing(6),
                      },
                    ]}
                  >
                    <View style={styles.pointsContent}>
                      <Text
                        style={[
                          typography.label,
                          {
                            color: colors.textSecondary,
                          },
                        ]}
                      >
                        {t('Your Points')}
                      </Text>

                      <Text
                        style={[
                          typography.h1,
                          {
                            color: colors.primary,
                            marginTop: spacing(1),
                          },
                        ]}
                      >
                        {points}
                      </Text>

                      {!!lastUpdated && (
                        <Text
                          style={[
                            typography.caption,
                            {
                              color: colors.textMuted,
                              marginTop: spacing(1),
                            },
                          ]}
                        >
                          {t('Calculated {{date}}', {
                            date: lastUpdated,
                          })}
                        </Text>
                      )}
                    </View>

                    {typeof eligible === 'boolean' && (
                      <View style={styles.pointsRight}>
                        <View
                          style={[
                            styles.badge,
                            {
                              paddingHorizontal:
                                spacing(4),
                              paddingVertical: spacing(2),
                              borderRadius: radii.pill,
                            },
                            eligible
                              ? {
                                  backgroundColor: `${colors.success}22`,
                                  borderColor:
                                    colors.success,
                                }
                              : {
                                  backgroundColor: `${colors.danger}22`,
                                  borderColor:
                                    colors.danger,
                                },
                          ]}
                        >
                          <Text
                            style={[
                              typography.label,
                              {
                                color: eligible
                                  ? colors.success
                                  : colors.danger,
                              },
                            ]}
                          >
                            {eligible
                              ? t('Eligible')
                              : t('Below threshold')}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {children}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      <Modal
        visible={showInstitutionModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeInstitutionModal}
      >
        <Pressable
          style={[
            modalStyles.overlay,
            {
              backgroundColor: colors.overlay,
              padding: spacing(6),
            },
          ]}
          onPress={closeInstitutionModal}
        >
          <Pressable
            accessibilityRole="none"
            style={[
              modalStyles.container,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radii.xxl,
              },
            ]}
            onPress={event => {
              event.stopPropagation();
            }}
          >
            <View
              style={[
                modalStyles.header,
                {
                  padding: spacing(6),
                  borderBottomColor: colors.divider,
                },
              ]}
            >
              <Text
                style={[
                  typography.h2,
                  modalStyles.title,
                  {
                    color: colors.textPrimary,
                  },
                ]}
              >
                {t('Choose Institution Type')}
              </Text>

              <Pressable
                onPress={closeInstitutionModal}
                accessibilityRole="button"
                accessibilityLabel={t('Close')}
                hitSlop={16}
                style={({ pressed }) => [
                  modalStyles.closeButton,
                  {
                    backgroundColor:
                      colors.surfaceAlt,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                  },
                  pressed && styles.buttonPressed,
                ]}
              >
                <Ionicons
                  name="close"
                  size={iconSize(22)}
                  color={colors.textPrimary}
                />
              </Pressable>
            </View>

            <View
              style={[
                modalStyles.options,
                {
                  padding: spacing(5),
                  gap: spacing(4),
                },
              ]}
            >
              <InstitutionOption
                title={t('Universities')}
                icon="school-outline"
                iconBackground="#172554"
                iconColor="#60A5FA"
                colors={colors}
                onPress={() => {
                  closeInstitutionModal();
                  router.push('/student/universities');
                }}
              />

              <InstitutionOption
                title={t('Colleges')}
                icon="business-outline"
                iconBackground="#14532D"
                iconColor="#34D399"
                colors={colors}
                onPress={() => {
                  closeInstitutionModal();
                  router.push('/student/colleges');
                }}
              />

              <InstitutionOption
                title={t('Brigades')}
                icon="construct-outline"
                iconBackground="#78350F"
                iconColor="#FBBF24"
                colors={colors}
                onPress={() => {
                  closeInstitutionModal();
                  router.push('/student/brigades');
                }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

type InstitutionOptionProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBackground: string;
  iconColor: string;
  colors: ReturnType<typeof useTheme>;
  onPress: () => void;
};

function InstitutionOption({
  title,
  icon,
  iconBackground,
  iconColor,
  colors,
  onPress,
}: InstitutionOptionProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        modalStyles.option,
        {
          backgroundColor: colors.surfaceAlt,
          borderColor: colors.border,
          padding: spacing(5),
          borderRadius: radii.xl,
        },
        pressed && styles.buttonPressed,
      ]}
    >
      <View
        style={[
          modalStyles.iconWrap,
          {
            width: 72,
            height: 72,
            borderRadius: radii.lg,
            marginRight: spacing(5),
            backgroundColor: iconBackground,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={iconSize(32)}
          color={iconColor}
        />
      </View>

      <Text
        style={[
          typography.subtitle,
          modalStyles.optionText,
          {
            color: colors.textPrimary,
          },
        ]}
      >
        {title}
      </Text>

      <Ionicons
        name="chevron-forward"
        size={iconSize(20)}
        color={colors.textMuted}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  headerLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 1,
  },

  main: {
    flex: 1,
  },

  sidebarColumn: {
    width: 280,
    flexShrink: 0,
  },

  contentColumn: {
    flex: 1,
    minWidth: 0,
  },

  card: {
    borderWidth: 1,
    overflow: 'hidden',
  },

  heroCard: {},

  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  pointsContent: {
    flex: 1,
    minWidth: 0,
  },

  pointsRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },

  badge: {
    borderWidth: 1,
    alignSelf: 'flex-start',
  },

  buttonPressed: {
    opacity: 0.88,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  toggleButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  navItemPressed: {
    opacity: 0.88,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  container: {
    width: '90%',
    maxWidth: 430,
    maxHeight: '90%',
    borderWidth: 1,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
  },

  title: {
    flex: 1,
    minWidth: 0,
    paddingRight: 12,
  },

  closeButton: {
    width: 42,
    height: 42,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  options: {},

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },

  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  optionText: {
    flex: 1,
    minWidth: 0,
  },
});