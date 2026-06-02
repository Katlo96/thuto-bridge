// services/authService.ts
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  reload,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { Platform } from 'react-native';
import { auth, db } from '../constants/firebase';

// ─────────────────────────────────────────────────────────────────────────────
// Friendly error messages
// ─────────────────────────────────────────────────────────────────────────────
export function parseFirebaseError(error: any): string {
  const code: string = error?.code ?? '';
  switch (code) {
    case 'auth/email-already-in-use':        return 'This email is already registered. Please sign in or use a different email.';
    case 'auth/invalid-email':               return 'Please enter a valid email address.';
    case 'auth/weak-password':               return 'Password is too weak. Use at least 8 characters.';
    case 'auth/user-not-found':              return 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':              return 'Incorrect password. Please try again or reset your password.';
    case 'auth/invalid-credential':          return 'Incorrect email or password. Please try again.';
    case 'auth/user-disabled':               return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':           return 'Too many failed attempts. Please wait a few minutes and try again.';
    case 'auth/network-request-failed':      return 'Network error. Please check your connection and try again.';
    case 'auth/invalid-verification-code':   return 'Invalid OTP code. Please check and try again.';
    case 'auth/invalid-verification-id':     return 'Verification session expired. Please request a new OTP.';
    case 'auth/code-expired':                return 'The OTP code has expired. Please request a new one.';
    case 'auth/invalid-phone-number':        return 'Invalid phone number. Please use format: 71 234 567 or +267 71 234 567';
    case 'auth/missing-phone-number':        return 'Please enter a phone number.';
    case 'auth/quota-exceeded':              return 'SMS quota exceeded. Please try again later.';
    case 'auth/captcha-check-failed':        return 'reCAPTCHA verification failed. Please try again.';
    case 'auth/argument-error':              return 'Phone auth setup error. Please restart the app and try again.';
    case 'auth/requires-recent-login':       return 'Please sign in again to complete this action.';
    case 'auth/email-not-verified':          return 'Please verify your email before signing in. Check your inbox for the verification link.';
    default:
      if (error?.message) return error.message;
      return 'Something went wrong. Please try again.';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Phone number normaliser — E.164 format
// ─────────────────────────────────────────────────────────────────────────────
export function normalisePhone(raw: string): string {
  let n = raw.replace(/[\s\-().]/g, '');
  if (n.startsWith('+'))  return n;
  if (n.startsWith('00')) return '+' + n.slice(2);
  if (n.startsWith('0') && n.length >= 9) return '+267' + n;
  if (n.length >= 7 && n.length <= 9)     return '+267' + n;
  return '+' + n;
}

// ─────────────────────────────────────────────────────────────────────────────
// RecaptchaVerifier — web only, created fresh each call
// ─────────────────────────────────────────────────────────────────────────────
let _recaptchaVerifier: RecaptchaVerifier | null = null;

function getWebRecaptchaVerifier(): RecaptchaVerifier {
  if (_recaptchaVerifier) {
    try { _recaptchaVerifier.clear(); } catch { /* ignore */ }
    _recaptchaVerifier = null;
  }
  _recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
    size: 'invisible',
    callback: () => {},
    'expired-callback': () => { _recaptchaVerifier = null; },
  });
  return _recaptchaVerifier;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level store for ConfirmationResult
// (class instances can't be passed through router params)
// ─────────────────────────────────────────────────────────────────────────────
let _confirmationResult: ConfirmationResult | null = null;

export function getStoredConfirmation(): ConfirmationResult | null {
  return _confirmationResult;
}
export function clearStoredConfirmation(): void {
  _confirmationResult = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE STUDENT PROFILE IN FIRESTORE
// ─────────────────────────────────────────────────────────────────────────────
async function createStudentProfile(
  uid: string, fullName: string, email?: string, phone?: string,
): Promise<void> {
  await setDoc(doc(db, 'students', uid), {
    uid, fullName,
    email:     email ?? null,
    phone:     phone ?? null,
    createdAt: serverTimestamp(),
    role:      'student',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL SIGNUP
// ─────────────────────────────────────────────────────────────────────────────
export async function signUpWithEmail(
  email: string, password: string, fullName: string,
): Promise<{ user: User }> {
  const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await sendEmailVerification(user);
  await createStudentProfile(user.uid, fullName, email.trim());
  return { user };
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL LOGIN
// ─────────────────────────────────────────────────────────────────────────────
export async function loginWithEmail(
  email: string, password: string,
): Promise<{ user: User }> {
  const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
  await reload(user);
  if (!user.emailVerified) {
    await signOut(auth);
    throw { code: 'auth/email-not-verified' };
  }
  return { user };
}

// ─────────────────────────────────────────────────────────────────────────────
// RESEND VERIFICATION EMAIL
// ─────────────────────────────────────────────────────────────────────────────
export async function resendVerificationEmail(
  email: string, password: string,
): Promise<void> {
  const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
  await sendEmailVerification(user);
  await signOut(auth);
}

// ─────────────────────────────────────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────────────────────────────────────
export async function forgotPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE — SEND OTP
//
// WEB:    uses invisible RecaptchaVerifier (requires #recaptcha-container in index.html)
// NATIVE: Firebase JS SDK does NOT support phone auth on native without
//         react-native-firebase. For development, use Firebase test phone numbers.
//         For production, migrate phone auth to react-native-firebase.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPhoneOTP(phoneNumber: string): Promise<ConfirmationResult> {
  const normalised = normalisePhone(phoneNumber);
  const digits     = normalised.replace('+', '');

  if (digits.length < 7 || digits.length > 15 || !/^\d+$/.test(digits)) {
    throw {
      code:    'auth/invalid-phone-number',
      message: 'Please enter a valid phone number. Example: 71 234 567 or +267 71 234 567',
    };
  }

  let confirmation: ConfirmationResult;

  if (Platform.OS === 'web') {
    // Web: works natively with RecaptchaVerifier
    const verifier = getWebRecaptchaVerifier();
    confirmation   = await signInWithPhoneNumber(auth, normalised, verifier);
  } else {
    // Native (Expo Go): Firebase JS SDK doesn't support phone auth on native.
    // This will only work with:
    //   1. Firebase test phone numbers (for development) — set up in Firebase Console
    //   2. react-native-firebase (for production builds)
    //
    // For test numbers, Firebase bypasses verification automatically.
    try {
      confirmation = await (signInWithPhoneNumber as any)(auth, normalised, null);
    } catch (e: any) {
      // Provide a clear error if test numbers aren't set up
      if (e?.code === 'auth/argument-error' || e?.code === 'auth/missing-app-credential') {
        throw {
          code:    'auth/phone-not-supported',
          message: 'Phone login requires a test phone number in development.\n\nGo to Firebase Console → Authentication → Sign-in method → Phone numbers for testing, and add your number with a test code.',
        };
      }
      throw e;
    }
  }

  _confirmationResult = confirmation;
  return confirmation;
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE — VERIFY OTP
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyPhoneOTP(
  otpCode: string, fullName?: string,
): Promise<{ user: User; isNewUser: boolean }> {
  if (!_confirmationResult) {
    throw { code: 'auth/invalid-verification-id', message: 'Session expired. Please request a new OTP.' };
  }

  const { user }    = await _confirmationResult.confirm(otpCode);
  const profileSnap = await getDoc(doc(db, 'students', user.uid));
  const isNewUser   = !profileSnap.exists();

  if (isNewUser && fullName) {
    await createStudentProfile(user.uid, fullName, undefined, user.phoneNumber ?? undefined);
  }

  clearStoredConfirmation();
  return { user, isNewUser };
}

// ─────────────────────────────────────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────────────────────────────────────
export async function logOut(): Promise<void> {
  await signOut(auth);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}