// app/student/_layout.tsx
import React from 'react';
import { Stack } from 'expo-router';

import { StudentMenuProvider } from '../../components/student/StudentMenu';

export default function StudentLayout() {
  return (
    <StudentMenuProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </StudentMenuProvider>
  );
}