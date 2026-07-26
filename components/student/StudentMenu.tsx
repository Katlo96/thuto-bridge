import React, { createContext, useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  useWindowDimensions,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { getAuth, signOut } from 'firebase/auth';
import { useLanguage } from '../../contexts/LanguageContext';


const BASE_SPACING = 4;
const spacing = (n: number) => n * BASE_SPACING;

const radii = {
  md: spacing(3),
  lg: spacing(4),
  xl: spacing(5),
  pill: 9999,
};

type MenuAction = 'home' | 'profile' | 'settings' | 'notifications' | 'logout';

type StudentMenuContextValue = {
  openMenu: () => void;
  closeMenu: () => void;
  isOpen: boolean;
};

const StudentMenuContext = createContext<StudentMenuContextValue | null>(null);

export function StudentMenuProvider({ children }: { children: React.ReactNode }) {

 
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const { width } = useWindowDimensions();
  const rawScheme = useColorScheme();
  const scheme: 'light' | 'dark' = rawScheme === 'dark' ? 'dark' : 'light';

  const isMobile = width < 480;
  const isTablet = width >= 480 && width <= 1024;

  const colors = useMemo(
    () => ({
      overlay: 'rgba(0,0,0,0.55)',
      text: scheme === 'light' ? '#0B0F12' : '#EAF2F8',
      muted: scheme === 'light' ? 'rgba(11,15,18,0.55)' : 'rgba(234,242,248,0.60)',
      card: scheme === 'light' ? '#F7FBFC' : '#18222C',
      cardBorder: scheme === 'light' ? 'rgba(11,15,18,0.08)' : 'rgba(234,242,248,0.12)',
      section: scheme === 'light' ? '#FFFFFF' : '#111A22',
      sectionBorder: scheme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(234,242,248,0.10)',
      tealSoft: scheme === 'light' ? 'rgba(87,175,194,0.14)' : 'rgba(87,175,194,0.22)',
      tealBorder: scheme === 'light' ? 'rgba(87,175,194,0.35)' : 'rgba(87,175,194,0.30)',
      danger: '#B22222',
      dangerSoft: scheme === 'light' ? 'rgba(178,34,34,0.10)' : 'rgba(178,34,34,0.18)',
      dangerBorder: scheme === 'light' ? 'rgba(178,34,34,0.18)' : 'rgba(178,34,34,0.24)',
      closeBg: scheme === 'light' ? '#FFFFFF' : '#101820',
      closeBorder: scheme === 'light' ? 'rgba(0,0,0,0.10)' : 'rgba(234,242,248,0.10)',
      divider: scheme === 'light' ? 'rgba(0,0,0,0.10)' : 'rgba(234,242,248,0.10)',
      dividerSoft: scheme === 'light' ? 'rgba(0,0,0,0.08)' : 'rgba(234,242,248,0.08)',
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

  function runAction(action: MenuAction) {
    setIsOpen(false);

    if (action === 'home') router.push(homeHref);
    if (action === 'profile') router.push(profileHref);
    if (action === 'settings') router.push(settingsHref);
    if (action === 'notifications') router.push(notificationsHref);

    if (action === 'logout') {
      setIsOpen(false);
      setLogoutConfirmOpen(true);
      return;
    }
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

  return (
    <StudentMenuContext.Provider value={value}>
      {children}

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
                {
                  width: cardWidth,
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                  alignSelf: isMobile ? 'stretch' : 'center',
                },
                isMobile ? styles.cardMobile : styles.cardDesktop,
              ]}
            >
              <View style={styles.headerRow}>
                <View style={{ width: 34 }} />
                <Text style={[styles.title, { color: colors.text }]}>{t('Menu')}</Text>

                <Pressable
                  onPress={() => setIsOpen(false)}
                  style={styles.closeBtn}
                  accessibilityRole="button"
                  accessibilityLabel={t('Close')}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </View>

              <MenuItem label={t('Home')} onPress={() => runAction('home')} />
              <MenuItem label={t('Profile')} onPress={() => runAction('profile')} />
              <MenuItem label={t('Settings')} onPress={() => runAction('settings')} />
              <MenuItem label={t('Notifications')} onPress={() => runAction('notifications')} />

              <View style={[styles.dividerSoft, { backgroundColor: colors.dividerSoft }]} />

              <MenuItem
                label={t('Logout')}
                danger
                onPress={() => runAction('logout')}
              />
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
                {
                  backgroundColor: colors.card,
                  borderColor: colors.cardBorder,
                },
              ]}
            >
              <Text style={[styles.confirmTitle, { color: colors.text }]}>{t('Confirm Logout')}</Text>
              <Text style={[styles.confirmText, { color: colors.muted }]}>
                {t('Are you sure you want to log out of your account?')}
              </Text>

              <View style={styles.confirmActions}>
                <Pressable
                  style={[styles.cancelBtn]}
                  accessibilityRole="button"
                  accessibilityLabel={t('Cancel')}
                  onPress={() => setLogoutConfirmOpen(false)}
                  disabled={isLoggingOut}
                  accessibilityState={{ disabled: isLoggingOut }}
                >
                  <Text style={[styles.cancelText, { color: colors.text }]}>{t('Cancel')}</Text>
                </Pressable>

                <Pressable
                  style={[styles.logoutBtn]}
                  accessibilityRole="button"
                  accessibilityLabel={t('Logout')}
                  onPress={handleLogout}
                  disabled={isLoggingOut}
                  accessibilityState={{ disabled: isLoggingOut }}
                >
                  {isLoggingOut ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.logoutText}>{t('Logout')}</Text>
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

function MenuItem({
  label,
  onPress,
  danger,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.item}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={[styles.itemText, danger && { color: '#B22222' }]}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color="#888" />
    </Pressable>
  );
}

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
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing(4),
  },

  cardMobile: { width: '100%' },
  cardDesktop: {},

  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  title: { fontSize: 16, fontWeight: '900' },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },

  item: {
    padding: spacing(3),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  itemText: {
    fontSize: 14,
    fontWeight: '700',
  },

  dividerSoft: {
    height: 1,
    marginVertical: spacing(2),
  },

  confirmCard: {
    width: 300,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
  },

  confirmTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 8,
  },

  confirmText: {
    fontSize: 13,
    marginBottom: 16,
    color: '#555',
  },

  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  cancelBtn: {
    padding: 10,
  },

  cancelText: {
    color: '#333',
    fontWeight: '700',
  },

  logoutBtn: {
    padding: 10,
    backgroundColor: '#B22222',
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },

  logoutText: {
    color: '#fff',
    fontWeight: '800',
  },
});
