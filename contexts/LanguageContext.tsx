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
import { onAuthStateChanged } from 'firebase/auth';
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { auth, db } from '../constants/firebase';
import {
  translate,
  type AppLanguage,
} from '../constants/translations';

type TranslationReplacements = Record<string, string | number>;

type LanguageContextValue = {
  language: AppLanguage;
  isLanguageLoading: boolean;
  isLanguageSaving: boolean;
  setLanguage: (language: AppLanguage) => Promise<void>;
  t: (key: string, replacements?: TranslationReplacements) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(
  undefined,
);

const DEFAULT_LANGUAGE: AppLanguage = 'en';
const CACHE_PREFIX = '@thuto_bridge/preferred_language';

function isAppLanguage(value: unknown): value is AppLanguage {
  return value === 'en' || value === 'tn';
}

function cacheKey(uid?: string | null) {
  return `${CACHE_PREFIX}:${uid ?? 'guest'}`;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] =
    useState<AppLanguage>(DEFAULT_LANGUAGE);
  const [isLanguageLoading, setIsLanguageLoading] = useState(true);
  const [isLanguageSaving, setIsLanguageSaving] = useState(false);
  const [activeUid, setActiveUid] = useState<string | null>(
    auth.currentUser?.uid ?? null,
  );

  const activeUidRef = useRef<string | null>(
    auth.currentUser?.uid ?? null,
  );

  useEffect(() => {
    let unsubscribeUserDocument: (() => void) | undefined;
    let authChangeSequence = 0;

    const unsubscribeAuth = onAuthStateChanged(auth, async user => {
      const sequence = ++authChangeSequence;

      unsubscribeUserDocument?.();
      unsubscribeUserDocument = undefined;

      const uid = user?.uid ?? null;
      activeUidRef.current = uid;
      setActiveUid(uid);
      setIsLanguageLoading(true);

      try {
        const cachedLanguage = await AsyncStorage.getItem(cacheKey(uid));

        if (sequence !== authChangeSequence) {
          return;
        }

        setLanguageState(
          isAppLanguage(cachedLanguage)
            ? cachedLanguage
            : DEFAULT_LANGUAGE,
        );
      } catch (error) {
        console.warn('Failed to read cached preferred language:', error);

        if (sequence === authChangeSequence) {
          setLanguageState(DEFAULT_LANGUAGE);
        }
      }

      if (sequence !== authChangeSequence) {
        return;
      }

      if (!user) {
        setIsLanguageLoading(false);
        return;
      }

      const userRef = doc(db, 'users', user.uid);

      unsubscribeUserDocument = onSnapshot(
        userRef,
        async snapshot => {
          const remoteLanguage = snapshot.data()?.preferredLanguage;
          const resolvedLanguage = isAppLanguage(remoteLanguage)
            ? remoteLanguage
            : DEFAULT_LANGUAGE;

          setLanguageState(resolvedLanguage);

          try {
            await AsyncStorage.setItem(
              cacheKey(user.uid),
              resolvedLanguage,
            );

            if (!isAppLanguage(remoteLanguage)) {
              await setDoc(
                userRef,
                {
                  preferredLanguage: DEFAULT_LANGUAGE,
                  languageUpdatedAt: serverTimestamp(),
                },
                { merge: true },
              );
            }
          } catch (error) {
            console.error(
              'Failed to initialise preferred language:',
              error,
            );
          } finally {
            setIsLanguageLoading(false);
          }
        },
        error => {
          console.error('Failed to sync preferred language:', error);
          setIsLanguageLoading(false);
        },
      );
    });

    return () => {
      authChangeSequence += 1;
      unsubscribeUserDocument?.();
      unsubscribeAuth();
    };
  }, []);

  const setLanguage = useCallback(
    async (nextLanguage: AppLanguage) => {
      if (!isAppLanguage(nextLanguage)) {
        throw new Error(`Unsupported language: ${String(nextLanguage)}`);
      }

      if (nextLanguage === language || isLanguageSaving) {
        return;
      }

      const previousLanguage = language;
      const uidAtStart = activeUidRef.current;

      setIsLanguageSaving(true);
      setLanguageState(nextLanguage);

      try {
        await AsyncStorage.setItem(
          cacheKey(uidAtStart),
          nextLanguage,
        );

        const currentUser = auth.currentUser;

        if (currentUser && currentUser.uid === uidAtStart) {
          await setDoc(
            doc(db, 'users', currentUser.uid),
            {
              preferredLanguage: nextLanguage,
              languageUpdatedAt: serverTimestamp(),
            },
            { merge: true },
          );
        }
      } catch (error) {
        if (activeUidRef.current === uidAtStart) {
          setLanguageState(previousLanguage);

          try {
            await AsyncStorage.setItem(
              cacheKey(uidAtStart),
              previousLanguage,
            );
          } catch (cacheError) {
            console.warn(
              'Failed to restore cached preferred language:',
              cacheError,
            );
          }
        }

        throw error;
      } finally {
        setIsLanguageSaving(false);
      }
    },
    [isLanguageSaving, language],
  );

  const t = useCallback(
    (key: string, replacements?: TranslationReplacements) =>
      translate(language, key, replacements),
    [language],
  );

  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      isLanguageLoading,
      isLanguageSaving,
      setLanguage,
      t,
    }),
    [
      isLanguageLoading,
      isLanguageSaving,
      language,
      setLanguage,
      t,
    ],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      'useLanguage must be used inside LanguageProvider.',
    );
  }

  return context;
}
