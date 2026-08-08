import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import * as firebaseAuth from 'firebase/auth';
import { getAuth, type Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/*
 * `getReactNativePersistence` genuinely exists and works at runtime in
 * firebase/auth, but its type declaration has been missing from the
 * package's .d.ts for several SDK versions (see
 * firebase/firebase-js-sdk#9316 on GitHub — still open). Importing the
 * whole module and pulling it off with a cast keeps this file fully
 * typed elsewhere without needing a blanket @ts-ignore.
 */
const { initializeAuth, getReactNativePersistence } = firebaseAuth as typeof firebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => firebaseAuth.Persistence;
};

export const firebaseConfig = {
  apiKey: 'AIzaSyAXgJ5IVHJdV6Pl-qBhSwWNRQ2nn-ChXmA',
  authDomain: 'thuto-bridge-d4d15.firebaseapp.com',
  projectId: 'thuto-bridge-d4d15',
  storageBucket: 'thuto-bridge-d4d15.firebasestorage.app',
  messagingSenderId: '50104690307',
  appId: '1:50104690307:web:177f700bd0155a03d71db6',
};

const app =
  getApps().length === 0
    ? initializeApp(firebaseConfig)
    : getApps()[0];

/*
 * Web: default getAuth(), which persists via browser storage automatically.
 *
 * Native (iOS/Android): getAuth() alone does NOT persist sessions between
 * app launches. It must be initialized with an explicit persistence layer,
 * or users get silently signed out (or re-signed-in with a fresh/empty
 * session) every time the app is killed and reopened.
 */
let authInstance: Auth;

try {
  authInstance =
    Platform.OS === 'web'
      ? getAuth(app)
      : initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
} catch {
  // initializeAuth throws if auth was already initialized for this app
  // (e.g. Expo Fast Refresh reloading this module). Reuse the existing
  // instance instead of crashing.
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const storage = getStorage(app);

let firestore: Firestore;

try {
  /*
   * Expo/React Native uses the Firebase JavaScript SDK, not the native SDK.
   * That JS SDK's default transport (WebChannel streaming) relies on
   * browser-specific network APIs for its "auto-detect long polling"
   * fallback (`experimentalAutoDetectLongPolling`). Inside a compiled
   * Android APK that detection routinely mis-identifies the environment,
   * locks onto the streaming transport, and the connection gets silently
   * dropped by the OS/networking layer — with NO error and NO rejection.
   * Firestore reads/writes just hang forever, which is why Save appeared
   * to "do nothing" on Android while working fine on web.
   *
   * Forcing long polling explicitly (rather than auto-detecting) avoids
   * that failure mode entirely on native. Web keeps the default transport,
   * since browsers handle auto-detection correctly and forcing long
   * polling there is unnecessary overhead.
   *
   * initializeFirestore must run before any getFirestore call for this
   * app instance, or it will throw.
   */
  firestore = initializeFirestore(app, {
    experimentalForceLongPolling: Platform.OS !== 'web',
  });
} catch {
  /*
   * During Expo Fast Refresh, Firestore may already be initialized. Reuse
   * the existing instance instead of crashing with "already initialized".
   */
  firestore = getFirestore(app);
}

export const db = firestore;

export default app;