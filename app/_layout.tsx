// app/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

import { LanguageProvider } from '../contexts/LanguageContext';
import { AppPreferencesProvider } from '../contexts/AppPreferencesContext';

export default function RootLayout() {
  return (
    <AppPreferencesProvider>
      <LanguageProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </LanguageProvider>
    </AppPreferencesProvider>
  );
}