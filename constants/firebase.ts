import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';


export const firebaseConfig = {
  apiKey: "AIzaSyAXgJ5IVHJdV6Pl-qBhSwWNRQ2nn-ChXmA",
  authDomain: "thuto-bridge-d4d15.firebaseapp.com",
  projectId: "thuto-bridge-d4d15",
  storageBucket: "thuto-bridge-d4d15.firebasestorage.app",
  messagingSenderId: "50104690307",
  appId: "1:50104690307:web:177f700bd0155a03d71db6",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
