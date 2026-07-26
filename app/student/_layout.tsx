// app/student/_layout.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { Stack, router } from 'expo-router';

import { StudentMenuProvider } from '../../components/student/StudentMenu';
import {
  isPhonePasswordEmail,
  logOut,
  subscribeToAuthState,
  type AuthUser,
} from '../../services/authService';

export default function StudentLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [checkingSession, setCheckingSession] = useState(true);
  const [authorizedUser, setAuthorizedUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = subscribeToAuthState((user) => {
      void (async () => {
        if (!mounted) return;

        const isPhonePasswordAccount = Boolean(
          user?.phoneNumber || isPhonePasswordEmail(user?.email),
        );

        const emailAccountIsUnverified = Boolean(
          user?.email &&
            !isPhonePasswordAccount &&
            !user.emailVerified,
        );

        const phonePasswordAccountIsUnverified = Boolean(
          user &&
            isPhonePasswordEmail(user.email) &&
            !user.phoneNumber,
        );

        if (!user || emailAccountIsUnverified || phonePasswordAccountIsUnverified) {
          setAuthorizedUser(null);
          setCheckingSession(false);

          if (user) {
            await logOut().catch(() => undefined);
          }

          router.replace('/login');
          return;
        }

        setAuthorizedUser(user);
        setCheckingSession(false);
      })();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (checkingSession || !authorizedUser) {
    const backgroundColor = scheme === 'dark' ? '#0A111A' : '#F8FCFD';
    const textColor = scheme === 'dark' ? '#EAF2F8' : '#0A111A';

    return (
      <View style={[styles.loadingScreen, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#4A9FC6" />
        <Text style={[styles.loadingText, { color: textColor }]}>
          Securing your session…
        </Text>
      </View>
    );
  }

  return (
    <StudentMenuProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </StudentMenuProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  loadingText: { marginTop: 14, fontSize: 14, fontWeight: '600' },
});
