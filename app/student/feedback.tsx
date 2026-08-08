import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Platform,
  Alert,
  ActivityIndicator,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import { getAuth } from 'firebase/auth';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import { StudentMenuProvider } from '../../components/student/StudentMenu';
import DashboardLayout, { spacing, typography, radii, useTheme } from '../../components/student/DashboardLayout';
import { db } from '../../constants/firebase';
import { useLanguage } from '../../contexts/LanguageContext';
import { markFeedbackSubmitted } from '../../contexts/FeedbackContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
type CategoryId = 'bug' | 'usability' | 'feature_request' | 'content' | 'general';
type IconName = keyof typeof Ionicons.glyphMap;

const CATEGORIES: { id: CategoryId; label: string; icon: IconName }[] = [
  { id: 'general', label: 'General Feedback', icon: 'chatbox-ellipses-outline' },
  { id: 'bug', label: 'Bug', icon: 'bug-outline' },
  { id: 'usability', label: 'Usability', icon: 'navigate-outline' },
  { id: 'feature_request', label: 'Feature Request', icon: 'bulb-outline' },
  { id: 'content', label: 'Content', icon: 'document-text-outline' },
];

const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

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

function Card({ children, style, intensity = 'md' }: { children: React.ReactNode; style?: ViewStyle; intensity?: 'sm' | 'md' | 'lg' }) {
  const elevation = useElevation(intensity);
  const colors = useTheme();
  return (
    <View style={[{ backgroundColor: colors.card, borderRadius: radii.xxl, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }, elevation, style]}>
      {children}
    </View>
  );
}

function SectionLabel({ title }: { title: string }) {
  const colors = useTheme();
  return (
    <Text style={[typography.caption, { color: colors.textMuted, letterSpacing: 0.5, marginBottom: spacing(3) }]}>
      {title.toUpperCase()}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Star rating
// ─────────────────────────────────────────────────────────────────────────────
function StarRating({ rating, onChange }: { rating: number; onChange: (n: number) => void }) {
  const colors = useTheme();
  const { t } = useLanguage();
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing(3) }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            accessibilityRole="button"
            accessibilityLabel={`${t('Rate')} ${n} ${t('of')} 5`}
            hitSlop={8}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.94 : 1 }] })}
          >
            <Ionicons name={n <= rating ? 'star' : 'star-outline'} size={36} color={n <= rating ? '#F5B942' : colors.textMuted} />
          </Pressable>
        ))}
      </View>
      <Text style={[typography.label, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing(3) }]}>
        {rating > 0 ? t(RATING_LABELS[rating - 1]) : t('Tap a star to rate your experience')}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Category chip
// ─────────────────────────────────────────────────────────────────────────────
function CategoryChip({ label, icon, isActive, onPress }: { label: string; icon: IconName; isActive: boolean; onPress: () => void }) {
  const colors = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing(2),
        paddingHorizontal: spacing(4),
        paddingVertical: spacing(2.5),
        borderRadius: radii.pill,
        backgroundColor: isActive ? colors.primary : colors.surfaceAlt,
        borderWidth: 1,
        borderColor: isActive ? colors.primary : colors.border,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Ionicons name={icon} size={15} color={isActive ? '#fff' : colors.textSecondary} />
      <Text style={[typography.label, { color: isActive ? '#fff' : colors.textPrimary, fontWeight: isActive ? '700' : '600' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main content
// ─────────────────────────────────────────────────────────────────────────────
function FeedbackContent() {
  const { t } = useLanguage();
  const colors = useTheme();

  // Safe navigation: router.back() throws a "GO_BACK not handled" warning
  // when this screen has no prior screen on the stack (e.g. opened fresh
  // from the feedback prompt after a reload). Fall back to the dashboard.
  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/student/dashboard' as any);
    }
  };

  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState<CategoryId>('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert(t('Rating required'), t('Please select a rating before submitting.'));
      return;
    }

    try {
      setSubmitting(true);
      const auth = getAuth();
      const uid = auth.currentUser?.uid ?? null;

      await addDoc(collection(db, 'feedback'), {
        userId: uid,
        rating,
        category,
        message: message.trim(),
        appVersion: Constants.expoConfig?.version ?? 'unknown',
        platform: Platform.OS,
        createdAt: serverTimestamp(),
      });

      await markFeedbackSubmitted();
      setSubmitted(true);
    } catch (err) {
      console.error('FEEDBACK SUBMIT ERROR:', err);
      Alert.alert(t('Something went wrong'), t('We could not submit your feedback. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <DashboardLayout title={t('Feedback')} subtitle={t('Thank you')} showPointsCard={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing(10) }}>
          <View style={{ width: 72, height: 72, borderRadius: 999, backgroundColor: `${colors.primary}22`, alignItems: 'center', justifyContent: 'center', marginBottom: spacing(5) }}>
            <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
          </View>
          <Text style={[typography.h2, { color: colors.textPrimary, textAlign: 'center', marginBottom: spacing(2) }]}>
            {t('Thanks for your feedback!')}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', maxWidth: 340, marginBottom: spacing(7) }]}>
            {t('Your input helps us make ThutoBridge better for every student.')}
          </Text>
          <Pressable
            onPress={goBack}
            accessibilityRole="button"
            accessibilityLabel={t('Done')}
            style={({ pressed }) => ({ paddingHorizontal: spacing(8), height: 52, borderRadius: radii.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.9 : 1 })}
          >
            <Text style={[typography.label, { color: '#fff' }]}>{t('Done')}</Text>
          </Pressable>
        </View>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t('Feedback')} subtitle={t('Help us improve ThutoBridge')} showPointsCard={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing(3), marginBottom: spacing(6) }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('Go Back')}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing(2), paddingHorizontal: spacing(4), paddingVertical: spacing(2), borderRadius: radii.lg, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.8 : 1 })}
        >
          <Ionicons name="arrow-back" size={17} color={colors.primary} />
          <Text style={[typography.label, { color: colors.primary }]}>{t('Go Back')}</Text>
        </Pressable>
      </View>

      <View style={{ maxWidth: 640, width: '100%', alignSelf: 'center', gap: spacing(6) }}>
        {/* Rating */}
        <Card style={{ padding: spacing(6) }}>
          <SectionLabel title={t('Your Experience')} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: spacing(5) }]}>
            {t('How would you rate ThutoBridge so far?')}
          </Text>
          <StarRating rating={rating} onChange={setRating} />
        </Card>

        {/* Category */}
        <Card style={{ padding: spacing(6) }}>
          <SectionLabel title={t('Category')} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: spacing(5) }]}>
            {t('What is this about?')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing(2.5) }}>
            {CATEGORIES.map((c) => (
              <CategoryChip key={c.id} label={t(c.label)} icon={c.icon} isActive={category === c.id} onPress={() => setCategory(c.id)} />
            ))}
          </View>
        </Card>

        {/* Message */}
        <Card style={{ padding: spacing(6) }}>
          <SectionLabel title={t('Your Thoughts')} />
          <Text style={[typography.h2, { color: colors.textPrimary, marginBottom: spacing(4) }]}>
            {t('What could we improve?')}
          </Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={t('Optional — tell us anything that would make ThutoBridge better for you...')}
            placeholderTextColor={colors.textMuted}
            multiline
            style={{
              minHeight: 130,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing(4),
              backgroundColor: colors.surfaceAlt,
              color: colors.textPrimary,
              textAlignVertical: 'top',
              fontSize: 15,
            }}
          />
        </Card>

        {/* Submit */}
        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          accessibilityLabel={t('Submit Feedback')}
          style={({ pressed }) => ({
            height: 56,
            borderRadius: radii.lg,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: spacing(2),
            opacity: submitting ? 0.75 : pressed ? 0.9 : 1,
            marginBottom: spacing(10),
          })}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="paper-plane-outline" size={17} color="#fff" />
              <Text style={[typography.bodyStrong, { color: '#fff' }]}>{t('Submit Feedback')}</Text>
            </>
          )}
        </Pressable>
      </View>
    </DashboardLayout>
  );
}

export default function feedback() {
  return (
    <StudentMenuProvider>
      <FeedbackContent />
    </StudentMenuProvider>
  );
}