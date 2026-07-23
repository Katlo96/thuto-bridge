import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

import { auth, db } from '../constants/firebase';

export type AppearancePreference = 'system' | 'light' | 'dark';
export type ResolvedAppearance = 'light' | 'dark';
export type DisplayDensity = 'comfortable' | 'compact';
export type TextSizePreference = 'small' | 'normal' | 'large' | 'extraLarge';
export type IconSizePreference = 'small' | 'normal' | 'large';

export type AppPreferences = {
  appearance: AppearancePreference;
  density: DisplayDensity;
  textSize: TextSizePreference;
  iconSize: IconSizePreference;
};

export type AppThemeColors = {
  background: string;
  surface: string;
  surfaceAlt: string;
  card: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  border: string;
  overlay: string;
};

type AppPreferencesContextValue = {
  preferences: AppPreferences;
  resolvedAppearance: ResolvedAppearance;
  colors: AppThemeColors;
  spacingScale: number;
  textScale: number;
  iconScale: number;
  isPreferencesLoading: boolean;
  isPreferencesSaving: boolean;
  updatePreferences: (updates: Partial<AppPreferences>) => Promise<void>;
  setAppearance: (appearance: AppearancePreference) => Promise<void>;
  setDensity: (density: DisplayDensity) => Promise<void>;
  setTextSize: (textSize: TextSizePreference) => Promise<void>;
  setIconSize: (iconSize: IconSizePreference) => Promise<void>;
};

const DEFAULT_PREFERENCES: AppPreferences = {
  appearance: 'system',
  density: 'comfortable',
  textSize: 'normal',
  iconSize: 'normal',
};

const LIGHT_COLORS: AppThemeColors = {
  background: '#F4F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF3F8',
  card: '#FFFFFF',
  divider: 'rgba(15,23,42,0.08)',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  primary: '#2563EB',
  primaryText: '#FFFFFF',
  accent: '#1D4ED8',
  success: '#059669',
  warning: '#D97706',
  danger: '#DC2626',
  border: 'rgba(15,23,42,0.12)',
  overlay: 'rgba(15,23,42,0.55)',
};

const DARK_COLORS: AppThemeColors = {
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
  overlay: 'rgba(0,0,0,0.72)',
};

const TEXT_SCALES: Record<TextSizePreference, number> = {
  small: 0.9,
  normal: 1,
  large: 1.15,
  extraLarge: 1.3,
};

const ICON_SCALES: Record<IconSizePreference, number> = {
  small: 0.9,
  normal: 1,
  large: 1.2,
};

const DENSITY_SCALES: Record<DisplayDensity, number> = {
  comfortable: 1,
  compact: 0.78,
};

const CACHE_PREFIX = '@thuto_bridge/app_preferences';
const AppPreferencesContext = createContext<AppPreferencesContextValue | undefined>(
  undefined,
);

function cacheKey(uid?: string | null) {
  return `${CACHE_PREFIX}:${uid ?? 'guest'}`;
}

function isAppearance(value: unknown): value is AppearancePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function isDensity(value: unknown): value is DisplayDensity {
  return value === 'comfortable' || value === 'compact';
}

function isTextSize(value: unknown): value is TextSizePreference {
  return (
    value === 'small' ||
    value === 'normal' ||
    value === 'large' ||
    value === 'extraLarge'
  );
}

function isIconSize(value: unknown): value is IconSizePreference {
  return value === 'small' || value === 'normal' || value === 'large';
}

function normalisePreferences(value: unknown): AppPreferences {
  const candidate =
    value && typeof value === 'object'
      ? (value as Partial<AppPreferences>)
      : {};

  return {
    appearance: isAppearance(candidate.appearance)
      ? candidate.appearance
      : DEFAULT_PREFERENCES.appearance,
    density: isDensity(candidate.density)
      ? candidate.density
      : DEFAULT_PREFERENCES.density,
    textSize: isTextSize(candidate.textSize)
      ? candidate.textSize
      : DEFAULT_PREFERENCES.textSize,
    iconSize: isIconSize(candidate.iconSize)
      ? candidate.iconSize
      : DEFAULT_PREFERENCES.iconSize,
  };
}

function samePreferences(a: AppPreferences, b: AppPreferences) {
  return (
    a.appearance === b.appearance &&
    a.density === b.density &&
    a.textSize === b.textSize &&
    a.iconSize === b.iconSize
  );
}

export function AppPreferencesProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [preferences, setPreferencesState] =
    useState<AppPreferences>(DEFAULT_PREFERENCES);
  const [isPreferencesLoading, setIsPreferencesLoading] = useState(true);
  const [isPreferencesSaving, setIsPreferencesSaving] = useState(false);

  const activeUidRef = useRef<string | null>(auth.currentUser?.uid ?? null);
  const preferencesRef = useRef<AppPreferences>(DEFAULT_PREFERENCES);

  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  useEffect(() => {
    let unsubscribeUserDocument: (() => void) | undefined;
    let authChangeSequence = 0;

    const unsubscribeAuth = onAuthStateChanged(auth, async user => {
      const sequence = ++authChangeSequence;

      unsubscribeUserDocument?.();
      unsubscribeUserDocument = undefined;

      const uid = user?.uid ?? null;
      activeUidRef.current = uid;
      setIsPreferencesLoading(true);

      try {
        const cached = await AsyncStorage.getItem(cacheKey(uid));

        if (sequence !== authChangeSequence) {
          return;
        }

        const cachedPreferences = cached
          ? normalisePreferences(JSON.parse(cached))
          : DEFAULT_PREFERENCES;

        setPreferencesState(cachedPreferences);
      } catch (error) {
        console.warn('Failed to read cached app preferences:', error);

        if (sequence === authChangeSequence) {
          setPreferencesState(DEFAULT_PREFERENCES);
        }
      }

      if (sequence !== authChangeSequence) {
        return;
      }

      if (!user) {
        setIsPreferencesLoading(false);
        return;
      }

      const userRef = doc(db, 'users', user.uid);

      unsubscribeUserDocument = onSnapshot(
        userRef,
        async snapshot => {
          const remoteValue = snapshot.data()?.preferences;
          const resolvedPreferences = normalisePreferences(remoteValue);

          setPreferencesState(resolvedPreferences);

          try {
            await AsyncStorage.setItem(
              cacheKey(user.uid),
              JSON.stringify(resolvedPreferences),
            );

            const remotePreferences = normalisePreferences(remoteValue);
            const remoteWasComplete =
              remoteValue &&
              typeof remoteValue === 'object' &&
              isAppearance((remoteValue as Partial<AppPreferences>).appearance) &&
              isDensity((remoteValue as Partial<AppPreferences>).density) &&
              isTextSize((remoteValue as Partial<AppPreferences>).textSize) &&
              isIconSize((remoteValue as Partial<AppPreferences>).iconSize);

            if (!remoteWasComplete || !samePreferences(remotePreferences, resolvedPreferences)) {
              await setDoc(
                userRef,
                {
                  preferences: resolvedPreferences,
                  preferencesUpdatedAt: serverTimestamp(),
                },
                { merge: true },
              );
            }
          } catch (error) {
            console.error('Failed to initialise app preferences:', error);
          } finally {
            setIsPreferencesLoading(false);
          }
        },
        error => {
          console.error('Failed to sync app preferences:', error);
          setIsPreferencesLoading(false);
        },
      );
    });

    return () => {
      authChangeSequence += 1;
      unsubscribeUserDocument?.();
      unsubscribeAuth();
    };
  }, []);

  const updatePreferences = useCallback(
    async (updates: Partial<AppPreferences>) => {
      if (isPreferencesSaving) {
        return;
      }

      const previous = preferencesRef.current;
      const next = normalisePreferences({ ...previous, ...updates });

      if (samePreferences(previous, next)) {
        return;
      }

      const uidAtStart = activeUidRef.current;
      setIsPreferencesSaving(true);
      setPreferencesState(next);
      preferencesRef.current = next;

      try {
        await AsyncStorage.setItem(
          cacheKey(uidAtStart),
          JSON.stringify(next),
        );

        const currentUser = auth.currentUser;

        if (currentUser && currentUser.uid === uidAtStart) {
          await setDoc(
            doc(db, 'users', currentUser.uid),
            {
              preferences: next,
              preferencesUpdatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
      } catch (error) {
        if (activeUidRef.current === uidAtStart) {
          setPreferencesState(previous);
          preferencesRef.current = previous;

          try {
            await AsyncStorage.setItem(
              cacheKey(uidAtStart),
              JSON.stringify(previous),
            );
          } catch (cacheError) {
            console.warn('Failed to restore cached app preferences:', cacheError);
          }
        }

        throw error;
      } finally {
        setIsPreferencesSaving(false);
      }
    },
    [isPreferencesSaving],
  );

  const setAppearance = useCallback(
    (appearance: AppearancePreference) => updatePreferences({ appearance }),
    [updatePreferences],
  );

  const setDensity = useCallback(
    (density: DisplayDensity) => updatePreferences({ density }),
    [updatePreferences],
  );

  const setTextSize = useCallback(
    (textSize: TextSizePreference) => updatePreferences({ textSize }),
    [updatePreferences],
  );

  const setIconSize = useCallback(
    (iconSize: IconSizePreference) => updatePreferences({ iconSize }),
    [updatePreferences],
  );

  const resolvedAppearance: ResolvedAppearance =
    preferences.appearance === 'system'
      ? systemColorScheme === 'light'
        ? 'light'
        : 'dark'
      : preferences.appearance;

  const value = useMemo<AppPreferencesContextValue>(
    () => ({
      preferences,
      resolvedAppearance,
      colors: resolvedAppearance === 'light' ? LIGHT_COLORS : DARK_COLORS,
      spacingScale: DENSITY_SCALES[preferences.density],
      textScale: TEXT_SCALES[preferences.textSize],
      iconScale: ICON_SCALES[preferences.iconSize],
      isPreferencesLoading,
      isPreferencesSaving,
      updatePreferences,
      setAppearance,
      setDensity,
      setTextSize,
      setIconSize,
    }),
    [
      isPreferencesLoading,
      isPreferencesSaving,
      preferences,
      resolvedAppearance,
      setAppearance,
      setDensity,
      setIconSize,
      setTextSize,
      updatePreferences,
    ],
  );

  return (
    <AppPreferencesContext.Provider value={value}>
      {children}
    </AppPreferencesContext.Provider>
  );
}

export function useAppPreferences() {
  const context = useContext(AppPreferencesContext);

  if (!context) {
    throw new Error(
      'useAppPreferences must be used inside AppPreferencesProvider.',
    );
  }

  return context;
}
