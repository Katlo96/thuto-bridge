import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import FeedbackPromptModal from '../components/student/FeedbackPromptModal';

// ─────────────────────────────────────────────────────────────────────────────
// Storage keys
// ─────────────────────────────────────────────────────────────────────────────
const PREFIX = '@thuto_feedback_';
const KEYS = {
  submitted: `${PREFIX}submitted`,
  sessionCount: `${PREFIX}session_count`,
  actionCount: `${PREFIX}action_count`,
  dismissCount: `${PREFIX}dismiss_count`,
  lastDismissSession: `${PREFIX}last_dismiss_session`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tuning — adjust these to change how eager/relaxed the prompt is
// ─────────────────────────────────────────────────────────────────────────────
const MIN_SESSIONS_BEFORE_PROMPT = 3;       // never on session 1 (fresh login)
const MIN_MEANINGFUL_ACTIONS = 2;           // e.g. viewed courses + used career rec
const DISMISS_COOLDOWN_SESSIONS = 4;        // wait this many more sessions after "Not Now"
const MAX_DISMISSALS = 3;                   // stop asking entirely after this many "Not Now"
const PROMPT_DELAY_MS = 1600;               // let the screen settle before showing it

// Suggested action-name constants so callers stay consistent.
export const FEEDBACK_ACTIONS = {
  VIEWED_COURSES: 'viewed_courses',
  CAREER_RECOMMENDATIONS: 'career_recommendations',
  VIEWED_INSTITUTION: 'viewed_institution',
  ENTERED_RESULTS: 'entered_results',
} as const;

// module-level guards — persist for the lifetime of the JS app instance,
// independent of screen navigation and provider remounts (StudentMenuProvider
// remounts on every screen, but these `let`s live at module scope so they
// survive that).
let sessionCounted = false;
let promptEvaluatedThisRun = false;

type FeedbackContextValue = {
  recordMeaningfulAction: (action: string) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

async function readCount(key: string): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

async function writeCount(key: string, value: number) {
  try {
    await AsyncStorage.setItem(key, String(value));
  } catch {
    // non-critical — losing a trigger-tracking write shouldn't break the app
  }
}

// Call this after a successful Firestore write from FeedbackScreen so the
// prompt never appears again for this user/device.
export async function markFeedbackSubmitted() {
  try {
    await AsyncStorage.setItem(KEYS.submitted, 'true');
  } catch {
    // non-critical
  }
}

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const [promptVisible, setPromptVisible] = useState(false);
  const evaluating = useRef(false);
  const promptTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const evaluateEligibility = useCallback(async () => {
    if (evaluating.current || promptEvaluatedThisRun) return;
    evaluating.current = true;
    try {
      const submitted = (await AsyncStorage.getItem(KEYS.submitted)) === 'true';
      if (submitted) return;

      const dismissCount = await readCount(KEYS.dismissCount);
      if (dismissCount >= MAX_DISMISSALS) return;

      const sessionCount = await readCount(KEYS.sessionCount);
      const actionCount = await readCount(KEYS.actionCount);

      if (sessionCount < MIN_SESSIONS_BEFORE_PROMPT) return;
      if (actionCount < MIN_MEANINGFUL_ACTIONS) return;

      if (dismissCount > 0) {
        const lastDismissSession = await readCount(KEYS.lastDismissSession);
        if (sessionCount - lastDismissSession < DISMISS_COOLDOWN_SESSIONS) return;
      }

      promptEvaluatedThisRun = true;
      promptTimer.current = setTimeout(() => setPromptVisible(true), PROMPT_DELAY_MS);
    } finally {
      evaluating.current = false;
    }
  }, []);

  useEffect(() => {
    (async () => {
      if (!sessionCounted) {
        sessionCounted = true;
        const current = await readCount(KEYS.sessionCount);
        await writeCount(KEYS.sessionCount, current + 1);
      }
      evaluateEligibility();
    })();

    return () => {
      if (promptTimer.current) clearTimeout(promptTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordMeaningfulAction = useCallback(
    (_action: string) => {
      (async () => {
        const current = await readCount(KEYS.actionCount);
        await writeCount(KEYS.actionCount, current + 1);
        evaluateEligibility();
      })();
    },
    [evaluateEligibility]
  );

  const handleDismiss = useCallback(() => {
    setPromptVisible(false);
    (async () => {
      const dismissCount = await readCount(KEYS.dismissCount);
      const sessionCount = await readCount(KEYS.sessionCount);
      await writeCount(KEYS.dismissCount, dismissCount + 1);
      await writeCount(KEYS.lastDismissSession, sessionCount);
    })();
  }, []);

  const handleGiveFeedback = useCallback(() => {
    setPromptVisible(false);
    router.push('/student/feedback' as any);
  }, []);

  const value = useMemo<FeedbackContextValue>(() => ({ recordMeaningfulAction }), [recordMeaningfulAction]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <FeedbackPromptModal
        visible={promptVisible}
        onGiveFeedback={handleGiveFeedback}
        onNotNow={handleDismiss}
      />
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error('useFeedback must be used within <FeedbackProvider />');
  }
  return ctx;
}