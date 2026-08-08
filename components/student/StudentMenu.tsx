import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  useWindowDimensions,
  useColorScheme,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { getAuth, signOut } from 'firebase/auth';
import { useLanguage } from '../../contexts/LanguageContext';
import { FeedbackProvider } from '../../contexts/FeedbackContext';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────
const BASE_SPACING = 4;
const spacing = (n: number) => n * BASE_SPACING;

const radii = {
  sm: spacing(2),
  md: spacing(3),
  lg: spacing(4),
  xl: spacing(5),
  xxl: spacing(6),
  pill: 9999,
};

type IconName = keyof typeof Ionicons.glyphMap;
type MenuAction = 'home' | 'profile' | 'settings' | 'notifications' | 'feedback' | 'contact' | 'logout';

type StudentMenuContextValue = {
  openMenu: () => void;
  closeMenu: () => void;
  isOpen: boolean;
};

const StudentMenuContext = createContext<StudentMenuContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Elevation helper — matches the shadow treatment used across student screens
// ─────────────────────────────────────────────────────────────────────────────
function useElevation(intensity: 'sm' | 'md' | 'lg' = 'md'): ViewStyle {
  return useMemo<ViewStyle>(() => {
    const opacity = 0.28;
    const radius = intensity === 'sm' ? 6 : intensity === 'md' ? 14 : 24;
    const offsetY = intensity === 'sm' ? 2 : intensity === 'md' ? 6 : 12;
    return (
      Platform.select({
        ios: { shadowColor: '#000', shadowOffset: { width: 0, height: offsetY }, shadowOpacity: opacity, shadowRadius: radius },
        android: { elevation: intensity === 'sm' ? 3 : intensity === 'md' ? 8 : 14 },
        web: { boxShadow: `0 ${offsetY}px ${radius * 1.5}px rgba(0,0,0,${opacity})` } as any,
        default: {},
      }) ?? {}
    ) as ViewStyle;
  }, [intensity]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function StudentMenuProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { width, height } = useWindowDimensions();
  const rawScheme = useColorScheme();
  const scheme: 'light' | 'dark' = rawScheme === 'dark' ? 'dark' : 'light';

  const isMobile = width < 480;
  const isTablet = width >= 480 && width <= 1024;

  const cardElevation = useElevation('lg');
  const confirmElevation = useElevation('lg');

  const colors = useMemo(
    () => ({
      overlay: 'rgba(6,10,14,0.60)',
      text: scheme === 'light' ? '#0B0F12' : '#EAF2F8',
      muted: scheme === 'light' ? 'rgba(11,15,18,0.55)' : 'rgba(234,242,248,0.60)',
      card: scheme === 'light' ? '#FBFDFE' : '#151F28',
      cardBorder: scheme === 'light' ? 'rgba(11,15,18,0.08)' : 'rgba(234,242,248,0.12)',
      surfaceAlt: scheme === 'light' ? '#F1F6F7' : '#101820',
      primary: '#57AFC2',
      primarySoft: scheme === 'light' ? 'rgba(87,175,194,0.14)' : 'rgba(87,175,194,0.20)',
      primaryBorder: scheme === 'light' ? 'rgba(87,175,194,0.35)' : 'rgba(87,175,194,0.32)',
      danger: '#B22222',
      dangerSoft: scheme === 'light' ? 'rgba(178,34,34,0.10)' : 'rgba(178,34,34,0.18)',
      dangerBorder: scheme === 'light' ? 'rgba(178,34,34,0.20)' : 'rgba(178,34,34,0.28)',
      closeBg: scheme === 'light' ? '#FFFFFF' : '#101820',
      closeBorder: scheme === 'light' ? 'rgba(0,0,0,0.10)' : 'rgba(234,242,248,0.12)',
      divider: scheme === 'light' ? 'rgba(0,0,0,0.10)' : 'rgba(234,242,248,0.10)',
      dividerSoft: scheme === 'light' ? 'rgba(0,0,0,0.07)' : 'rgba(234,242,248,0.08)',
    }),
    [scheme]
  );

  const value = useMemo<StudentMenuContextValue>(
    () => ({
      isOpen,
      openMenu: () => setIsOpen(true),
      closeMenu: () => setIsOpen(false),
    }),
    [isOpen]
  );

  const homeHref: Href = { pathname: '/student/dashboard' as any };
  const profileHref: Href = { pathname: '/student/profile' as any };
  const settingsHref: Href = { pathname: '/student/settings' as any };
  const notificationsHref: Href = { pathname: '/student/notifications' as any };
  const feedbackHref: Href = { pathname: '/student/feedback' as any };
  const contactHref: Href = { pathname: '/student/contact-support' as any };

  function runAction(action: MenuAction) {
    if (action === 'logout') {
      setIsOpen(false);
      setLogoutConfirmOpen(true);
      return;
    }

    setIsOpen(false);

    if (action === 'home') router.push(homeHref);
    if (action === 'profile') router.push(profileHref);
    if (action === 'settings') router.push(settingsHref);
    if (action === 'notifications') router.push(notificationsHref);
    if (action === 'feedback') router.push(feedbackHref);
    if (action === 'contact') router.push(contactHref);
  }

  async function handleLogout() {
    try {
      setIsLoggingOut(true);

      const auth = getAuth();
      await signOut(auth);

      setLogoutConfirmOpen(false);

      router.replace('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setIsLoggingOut(false);
    }
  }

  const cardWidth = isMobile
    ? Math.min(width - spacing(8), 380)
    : isTablet
      ? 380
      : 400;

  const cardMaxHeight = Math.min(height * 0.86, 640);

  return (
    <StudentMenuContext.Provider value={value}>
      <FeedbackProvider>{children}</FeedbackProvider>

      {/* MAIN MENU MODAL */}
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <View style={styles.modalRoot}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: colors.overlay }]}
            onPress={() => setIsOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('Close')}
          />

          <View style={styles.centerLayer} pointerEvents="box-none">
            <View
              style={[
                styles.card,
                cardElevation,
                {
                  width: cardWidth,
                  maxHeight: cardMaxHeight,
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  alignSelf: isMobile ? 'stretch' : 'center',
                },
                isMobile ? styles.cardMobile : styles.cardDesktop,
              ]}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                <View style={[styles.headerBrandIcon, { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder }]}>
                  <Ionicons name="school" size={17} color={colors.primary} />
                </View>
                <Text style={[styles.title, { color: colors.text }]}>{t('Menu')}</Text>

                <Pressable
                  onPress={() => setIsOpen(false)}
                  style={({ pressed }) => [
                    styles.closeBtn,
                    { backgroundColor: colors.closeBg, borderColor: colors.closeBorder, opacity: pressed ? 0.75 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('Close')}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: spacing(1) }}
                style={{ flexGrow: 0 }}
              >
                <View style={{ gap: spacing(1.5), marginTop: spacing(2) }}>
                  <MenuItem
                    icon="home-outline"
                    label={t('Home')}
                    onPress={() => runAction('home')}
                    colors={colors}
                  />
                  <MenuItem
                    icon="person-outline"
                    label={t('Profile')}
                    onPress={() => runAction('profile')}
                    colors={colors}
                  />
                  <MenuItem
                    icon="settings-outline"
                    label={t('Settings')}
                    onPress={() => runAction('settings')}
                    colors={colors}
                  />
                  <MenuItem
                    icon="notifications-outline"
                    label={t('Notifications')}
                    onPress={() => runAction('notifications')}
                    colors={colors}
                  />
                  <MenuItem
                    icon="chatbox-ellipses-outline"
                    label={t('Give Feedback')}
                    onPress={() => runAction('feedback')}
                    colors={colors}
                  />
                </View>

                <View style={[styles.dividerSoft, { backgroundColor: colors.dividerSoft }]} />

                <MenuItem
                  icon="headset-outline"
                  label={t('Contact Support')}
                  onPress={() => runAction('contact')}
                  colors={colors}
                  accent
                />

                <View style={[styles.dividerSoft, { backgroundColor: colors.dividerSoft }]} />

                <MenuItem
                  icon="log-out-outline"
                  label={t('Logout')}
                  onPress={() => runAction('logout')}
                  colors={colors}
                  danger
                />

                {/* Footer brand */}
                <View style={[styles.footer, { borderTopColor: colors.dividerSoft }]}>
                  <View style={styles.footerRow}>
                    <Ionicons name="sparkles-outline" size={12} color={colors.muted} />
                    <Text style={[styles.footerTitle, { color: colors.text }]}>Thuto-Bridge</Text>
                  </View>
                  <Text style={[styles.footerSubtitle, { color: colors.muted }]}>
                    {t('by BrightCode Studios')}
                  </Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* LOGOUT CONFIRMATION MODAL */}
      <Modal
        visible={logoutConfirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutConfirmOpen(false)}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: colors.overlay }]}
            onPress={() => setLogoutConfirmOpen(false)}
            accessibilityRole="button"
            accessibilityLabel={t('Cancel')}
          />

          <View style={styles.centerLayer}>
            <View
              style={[
                styles.confirmCard,
                confirmElevation,
                {
                  width: Math.min(width - spacing(10), 340),
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <View style={[styles.confirmIconWrap, { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder }]}>
                <Ionicons name="log-out-outline" size={22} color={colors.danger} />
              </View>

              <Text style={[styles.confirmTitle, { color: colors.text }]}>{t('Confirm Logout')}</Text>
              <Text style={[styles.confirmText, { color: colors.muted }]}>
                {t('Are you sure you want to log out of your account?')}
              </Text>

              <View style={styles.confirmActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.cancelBtn,
                    { backgroundColor: colors.surfaceAlt, borderColor: colors.cardBorder, opacity: pressed ? 0.85 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('Cancel')}
                  onPress={() => setLogoutConfirmOpen(false)}
                  disabled={isLoggingOut}
                  accessibilityState={{ disabled: isLoggingOut }}
                >
                  <Text style={[styles.cancelText, { color: colors.text }]}>{t('Cancel')}</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.logoutBtn,
                    { backgroundColor: colors.danger, opacity: pressed ? 0.9 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t('Logout')}
                  onPress={handleLogout}
                  disabled={isLoggingOut}
                  accessibilityState={{ disabled: isLoggingOut }}
                >
                  {isLoggingOut ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="log-out-outline" size={15} color="#fff" />
                      <Text style={styles.logoutText}>{t('Logout')}</Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </StudentMenuContext.Provider>
  );
}

export function useStudentMenu() {
  const ctx = useContext(StudentMenuContext);
  if (!ctx) {
    throw new Error('useStudentMenu must be used within <StudentMenuProvider />');
  }
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Menu item row — icon in a colored circle, label, chevron
// ─────────────────────────────────────────────────────────────────────────────
function MenuItem({
  icon,
  label,
  onPress,
  danger,
  accent,
  colors,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  danger?: boolean;
  accent?: boolean;
  colors: Record<string, string>;
}) {
  const tint = danger ? colors.danger : accent ? colors.primary : colors.text;
  const iconBg = danger ? colors.dangerSoft : accent ? colors.primarySoft : colors.surfaceAlt;
  const iconBorder = danger ? colors.dangerBorder : accent ? colors.primaryBorder : colors.cardBorder;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.item,
        accent && { backgroundColor: colors.primarySoft, borderColor: colors.primaryBorder, borderWidth: 1 },
        { opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] },
      ]}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.itemIconWrap, { backgroundColor: iconBg, borderColor: iconBorder }]}>
          <Ionicons name={icon} size={17} color={danger ? colors.danger : accent ? colors.primary : colors.primary} />
        </View>
        <Text style={[styles.itemText, { color: tint, fontWeight: accent ? '800' : '700' }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={danger ? colors.danger : accent ? colors.primary : colors.muted} />
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject },

  centerLayer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing(5),
  },

  card: {
    borderRadius: radii.xxl,
    borderWidth: 1,
    padding: spacing(5),
  },

  cardMobile: { width: '100%' },
  cardDesktop: {},

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },

  headerBrandIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  item: {
    paddingHorizontal: spacing(3),
    paddingVertical: spacing(3),
    borderRadius: radii.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    flex: 1,
    minWidth: 0,
  },

  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemText: {
    fontSize: 14,
    flexShrink: 1,
  },

  dividerSoft: {
    height: 1,
    marginVertical: spacing(3),
  },

  footer: {
    borderTopWidth: 1,
    marginTop: spacing(3),
    paddingTop: spacing(4),
    paddingBottom: spacing(1),
    alignItems: 'center',
    gap: spacing(1),
  },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1.5),
  },

  footerTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  footerSubtitle: {
    fontSize: 11,
    fontWeight: '600',
  },

  confirmCard: {
    padding: spacing(6),
    borderRadius: radii.xxl,
    borderWidth: 1,
    alignItems: 'center',
  },

  confirmIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
  },

  confirmTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: spacing(2),
    textAlign: 'center',
  },

  confirmText: {
    fontSize: 13,
    marginBottom: spacing(5),
    textAlign: 'center',
    lineHeight: 19,
  },

  confirmActions: {
    flexDirection: 'row',
    gap: spacing(3),
    width: '100%',
  },

  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: radii.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    fontWeight: '800',
    fontSize: 13,
  },

  logoutBtn: {
    flex: 1,
    height: 46,
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing(2),
    alignItems: 'center',
    justifyContent: 'center',
  },

  logoutText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 13,
  },
});