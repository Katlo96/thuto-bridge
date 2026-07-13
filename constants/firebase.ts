import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  type Firestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

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

export const auth = getAuth(app);
export const storage = getStorage(app);

let firestore: Firestore;

try {
  /*
   * Expo/React Native uses the Firebase JavaScript SDK. Some mobile networks,
   * proxies and Wi-Fi configurations interrupt Firestore's default WebChannel
   * transport. Auto-detected long polling gives Firestore a more reliable
   * fallback without forcing it for every environment.
   *
   * initializeFirestore must run before getFirestore for this app instance.
   */
  firestore = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true,
  });
} catch {
  /*
   * During Expo Fast Refresh, Firestore may already be initialized. Reuse the
   * existing instance instead of crashing with "already initialized".
   */
  firestore = getFirestore(app);
}

export const db = firestore;

export default app;
