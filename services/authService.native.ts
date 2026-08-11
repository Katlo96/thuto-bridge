import {
  PhoneAuthProvider,
  createUserWithEmailAndPassword,
  deleteUser,
  getAdditionalUserInfo,
  getAuth,
  linkWithCredential,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  verifyPhoneNumber,
  type User,
} from '@react-native-firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';

export type AuthUser = User;
export type AuthUnsubscribe = () => void;
export type PhoneAuthMode = 'signup';

const auth = getAuth();
const db = getFirestore();
const PHONE_ALIAS_DOMAIN = 'phone.thutobridge.app';

let storedVerificationId: string | null = null;
let pendingPhone: string | null = null;

// Password-reset-via-phone flow uses its own module state so it can never
// collide with an in-progress signup OTP flow.
let resetVerificationId: string | null = null;
let resetPendingPhone: string | null = null;

function authError(code: string, message?: string): Error & { code: string } {
  const error = new Error(message ?? code) as Error & { code: string };
  error.code = code;
  return error;
}

export function parseFirebaseError(error: unknown): string {
  const value = error as { code?: string; message?: string } | null;
  const code = value?.code ?? '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account already exists for these details. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 8 characters.';
    case 'auth/user-not-found':
    case 'auth/profile-not-found':
      return 'No account was found. Please create an account first.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return 'Incorrect phone number, email address, or password.';
    case 'auth/phone-not-verified':
      return 'This phone number has not been verified. Complete OTP verification before signing in.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/too-many-requests':
      return 'Too many verification attempts were made. Please wait before requesting another OTP.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/invalid-verification-code':
      return 'Invalid OTP code. Please check the code and try again.';
    case 'auth/invalid-verification-id':
    case 'auth/session-expired':
      return 'The verification session expired. Please request a new OTP.';
    case 'auth/code-expired':
      return 'The OTP code expired. Please request a new one.';
    case 'auth/invalid-phone-number':
      return 'Enter a valid Botswana phone number, for example 71 234 567 or +267 71 234 567.';
    case 'auth/missing-phone-number':
      return 'Please enter a phone number.';
    case 'auth/quota-exceeded':
      return 'The SMS limit has been reached. Please try again later.';
    case 'auth/captcha-check-failed':
    case 'auth/missing-app-credential':
    case 'auth/app-not-authorized':
      return 'Firebase could not verify this application. Confirm the Android SHA certificates and rebuild the app.';
    case 'auth/credential-already-in-use':
      return 'This phone number is already linked to another account.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in Firebase Authentication.';
    case 'auth/requires-recent-login':
      return 'Please sign in again to complete this action.';
    case 'auth/email-not-verified':
      return 'Please verify your email before signing in. Check your inbox for the verification link.';
    case 'auth/not-phone-account':
      return 'This phone number is not linked to a password-based account. Please sign in with your original method.';
    default:
      return value?.message || 'Something went wrong. Please try again.';
  }
}

export function normalisePhone(raw: string): string {
  let phone = raw.replace(/[\s\-().]/g, '');
  if (phone.startsWith('00')) phone = `+${phone.slice(2)}`;
  if (phone.startsWith('0')) phone = phone.slice(1);
  if (!phone.startsWith('+')) phone = `+267${phone}`;

  if (!phone.startsWith('+267')) {
    throw authError('auth/invalid-phone-number', 'Thuto Bridge currently accepts Botswana phone numbers only.');
  }

  const localNumber = phone.slice(4);
  if (!/^\d{7,8}$/.test(localNumber)) throw authError('auth/invalid-phone-number');
  return `+267${localNumber}`;
}

function phoneAlias(phone: string): string {
  return `${normalisePhone(phone).replace(/\D/g, '')}@${PHONE_ALIAS_DOMAIN}`;
}

export function isPhonePasswordEmail(email?: string | null): boolean {
  return Boolean(email?.toLowerCase().endsWith(`@${PHONE_ALIAS_DOMAIN}`));
}

async function createStudentProfile(user: User, fullName: string, phone?: string): Promise<void> {
  const profileRef = doc(db, 'students', user.uid);
  const existing = await getDoc(profileRef);
  await setDoc(
    profileRef,
    {
      uid: user.uid,
      fullName: fullName.trim(),
      email: isPhonePasswordEmail(user.email) ? null : user.email ?? null,
      phone: phone ?? user.phoneNumber ?? null,
      phoneVerified: Boolean(user.phoneNumber),
      role: 'student',
      updatedAt: serverTimestamp(),
      ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true },
  );
}

export async function signUpWithEmail(email: string, password: string, fullName: string): Promise<{ user: User }> {
  const credential = await createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  try {
    await createStudentProfile(credential.user, fullName);
    await sendEmailVerification(credential.user);
    return { user: credential.user };
  } finally {
    await signOut(auth).catch(() => undefined);
  }
}

export async function signUpWithPhonePassword(phoneInput: string, password: string, fullName: string): Promise<{ user: User; phone: string }> {
  const phone = normalisePhone(phoneInput);
  const alias = phoneAlias(phone);
  let user: User;

  try {
    const credential = await createUserWithEmailAndPassword(auth, alias, password);
    user = credential.user;
  } catch (error: any) {
    if (error?.code !== 'auth/email-already-in-use') throw error;
    const credential = await signInWithEmailAndPassword(auth, alias, password);
    user = credential.user;
    await reload(user);
    if (user.phoneNumber) {
      await signOut(auth).catch(() => undefined);
      throw authError('auth/email-already-in-use', 'This phone number is already registered. Please sign in.');
    }
  }

  await createStudentProfile(user, fullName, phone);
  pendingPhone = phone;
  const verificationSnapshot = await verifyPhoneNumber(auth, phone);
  storedVerificationId = verificationSnapshot.verificationId;

  if (!storedVerificationId) {
    throw authError(
      'auth/invalid-verification-id',
      'Firebase did not return a valid phone verification session.',
    );
  }

  return { user, phone };
}

export async function resendPhoneSignupOTP(phoneInput: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !isPhonePasswordEmail(user.email)) {
    throw authError('auth/session-expired', 'Your signup session expired. Please sign in with your phone number and password, then verify your number.');
  }
  const phone = normalisePhone(phoneInput);
  pendingPhone = phone;
  const verificationSnapshot = await verifyPhoneNumber(auth, phone);
  storedVerificationId = verificationSnapshot.verificationId;

  if (!storedVerificationId) {
    throw authError(
      'auth/invalid-verification-id',
      'Firebase did not return a valid phone verification session.',
    );
  }
}

export function getStoredVerificationId(): string | null {
  return storedVerificationId;
}

export function clearStoredPhoneVerification(): void {
  storedVerificationId = null;
  pendingPhone = null;
}

export async function completePhonePasswordSignup(otpCode: string, fullName?: string): Promise<{ user: User }> {
  const user = auth.currentUser;
  if (!user || !storedVerificationId || !pendingPhone) throw authError('auth/session-expired');

  const phoneCredential = PhoneAuthProvider.credential(storedVerificationId, otpCode);
  const linked = await linkWithCredential(user, phoneCredential);
  await reload(linked.user);
  await createStudentProfile(linked.user, fullName ?? '', pendingPhone);
  await setDoc(
    doc(db, 'students', linked.user.uid),
    { phone: pendingPhone, phoneVerified: true, verifiedAt: serverTimestamp(), updatedAt: serverTimestamp() },
    { merge: true },
  );
  clearStoredPhoneVerification();
  return { user: linked.user };
}

export async function loginWithEmail(email: string, password: string): Promise<{ user: User }> {
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await reload(credential.user);
  if (!credential.user.emailVerified) {
    await signOut(auth);
    throw authError('auth/email-not-verified');
  }
  return { user: credential.user };
}

export async function loginWithPhonePassword(phoneInput: string, password: string): Promise<{ user: User }> {
  const credential = await signInWithEmailAndPassword(auth, phoneAlias(phoneInput), password);
  await reload(credential.user);
  if (!credential.user.phoneNumber) {
    await signOut(auth);
    throw authError('auth/phone-not-verified');
  }
  return { user: credential.user };
}

export async function resendVerificationEmail(email: string, password: string): Promise<void> {
  const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  try {
    await reload(credential.user);
    if (credential.user.emailVerified) throw authError('auth/email-already-verified', 'This email address is already verified. You can sign in.');
    await sendEmailVerification(credential.user);
  } finally {
    await signOut(auth).catch(() => undefined);
  }
}

export async function forgotPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────
// Phone-based password reset
//
// Phone-signup accounts have no real email address to send a reset link to
// (their Auth email is an internal alias). Instead we prove ownership of the
// phone number via OTP, sign in on the account that phone is linked to, and
// let the user set a new password directly on that authenticated session.
//
// IMPORTANT: Firebase's phone sign-in will silently create a brand-new
// account if no existing user has that phone number linked. We detect that
// case (isNewUser) and delete the orphan immediately so a mistyped or
// unregistered number never creates junk accounts or leaks enumeration
// info beyond "no account found."
// ─────────────────────────────────────────────────────────────────────────

export async function sendPasswordResetOTP(phoneInput: string): Promise<{ phone: string }> {
  const phone = normalisePhone(phoneInput);
  resetPendingPhone = phone;
  const verificationSnapshot = await verifyPhoneNumber(auth, phone);
  resetVerificationId = verificationSnapshot.verificationId;

  if (!resetVerificationId) {
    throw authError(
      'auth/invalid-verification-id',
      'Firebase did not return a valid phone verification session.',
    );
  }

  return { phone };
}

export async function resendPasswordResetOTP(phoneInput: string): Promise<void> {
  const phone = normalisePhone(phoneInput);
  resetPendingPhone = phone;
  const verificationSnapshot = await verifyPhoneNumber(auth, phone);
  resetVerificationId = verificationSnapshot.verificationId;

  if (!resetVerificationId) {
    throw authError(
      'auth/invalid-verification-id',
      'Firebase did not return a valid phone verification session.',
    );
  }
}

export function clearStoredPasswordResetVerification(): void {
  resetVerificationId = null;
  resetPendingPhone = null;
}

/**
 * Verifies the OTP and signs in to whichever account that phone number is
 * linked to. Leaves the user authenticated so completePasswordReset() can
 * set a new password on the same session. Throws and cleans up on any
 * mismatch (wrong code, unregistered number, non-phone account).
 */
export async function verifyPasswordResetOTP(otpCode: string): Promise<void> {
  if (!resetVerificationId || !resetPendingPhone) throw authError('auth/session-expired');

  const phoneCredential = PhoneAuthProvider.credential(resetVerificationId, otpCode);
  const userCredential = await signInWithCredential(auth, phoneCredential);
  const additionalInfo = getAdditionalUserInfo(userCredential);

  if (additionalInfo?.isNewUser) {
    await deleteUser(userCredential.user).catch(() => undefined);
    clearStoredPasswordResetVerification();
    throw authError('auth/profile-not-found', 'No account was found for this phone number. Please create an account first.');
  }

  if (!isPhonePasswordEmail(userCredential.user.email)) {
    await signOut(auth).catch(() => undefined);
    clearStoredPasswordResetVerification();
    throw authError('auth/not-phone-account');
  }

  clearStoredPasswordResetVerification();
}

/**
 * Sets a new password on the currently authenticated session established by
 * verifyPasswordResetOTP(), then signs the user out so no device is left in
 * a silently-authenticated state after a password reset.
 */
export async function completePasswordReset(newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !isPhonePasswordEmail(user.email)) {
    throw authError('auth/session-expired', 'Your reset session expired. Please verify your phone number again.');
  }
  try {
    await updatePassword(user, newPassword);
  } finally {
    await signOut(auth).catch(() => undefined);
  }
}

export function subscribeToAuthState(callback: (user: User | null) => void): AuthUnsubscribe {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export async function waitForAuthenticatedUser(timeoutMs = 5000): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;
  return new Promise((resolve) => {
    let finished = false;
    let unsubscribe: AuthUnsubscribe = () => undefined;
    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      unsubscribe();
      resolve(auth.currentUser);
    }, timeoutMs);
    unsubscribe = onAuthStateChanged(auth, (user) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      unsubscribe();
      resolve(user);
    });
  });
}

export async function logOut(): Promise<void> {
  clearStoredPhoneVerification();
  clearStoredPasswordResetVerification();
  await signOut(auth);
}