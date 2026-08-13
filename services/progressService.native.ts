import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  addDoc,
  deleteDoc,
  collection,
  getFirestore,
} from '@react-native-firebase/firestore';

/*
 * Native (Android/iOS) counterpart of progressService.ts.
 *
 * Metro automatically prefers this file over progressService.ts when
 * bundling for Android/iOS, and falls back to progressService.ts on web
 * — the same platform-split pattern already used successfully by
 * authService.ts / authService.native.ts and
 * dashboardProfileService.ts / dashboardProfileService.native.ts.
 *
 * This uses @react-native-firebase/firestore's modular API (doc, getDoc,
 * setDoc, collection, getDocs, addDoc, deleteDoc), which mirrors the web
 * Firebase JS SDK function-for-function, so the logic below is a direct
 * port of progressService.ts.
 *
 * Crucially, on native this reads/writes through the SAME
 * @react-native-firebase Auth session that authService.native.ts's login
 * created — not the separate firebase/auth (JS SDK) session, which is
 * what the Android app was silently missing before.
 */

const db = getFirestore();

export type System = "BGCSE" | "IGCSE";

export type BGCSETrack = "Pure" | "Double" | "Single";

export type IGCSETrack = "Advanced" | "Ordinary";

export type Track = BGCSETrack | IGCSETrack;

export type BGCSEForm = "Form 4" | "Form 5";

export type IGCSEForm = "Form 4" | "Form 5" | "Form 6 (A-Level)";

export type Form = BGCSEForm | IGCSEForm;

export type ExamType =
  | "End of Month Test"
  | "End of Term Exam"
  | "End of Year Exam";

export interface MarkRecord {
  id: string;
  subject: string;
  score: number;
  examType: ExamType;
  date: string;
}

export interface StudentProfile {
  system: System;
  track: Track;
  form: Form;
  subjects: string[];
}

/*
 * Same defensive timeout wrapper as the web version, so a bad native
 * connection fails loudly (via the caller's try/catch) instead of hanging
 * the UI forever.
 */
const DEFAULT_TIMEOUT_MS = 12000;

class FirestoreTimeoutError extends Error {
  constructor(operation: string, ms: number) {
    super(`${operation} timed out after ${ms}ms`);
    this.name = "FirestoreTimeoutError";
  }
}

function withTimeout<T>(
  promise: Promise<T>,
  operation: string,
  ms: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new FirestoreTimeoutError(operation, ms));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export async function getStudentProfile(
  userId: string
): Promise<StudentProfile | null> {
  const snapshot = await withTimeout(
    getDoc(doc(db, "students", userId, "profile", "main")),
    "getStudentProfile"
  );

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as StudentProfile;
}

export async function saveStudentProfile(
  userId: string,
  profile: StudentProfile
) {
  await withTimeout(
    setDoc(doc(db, "students", userId, "profile", "main"), profile),
    "saveStudentProfile"
  );
}

export async function getStudentMarks(
  userId: string
): Promise<MarkRecord[]> {
  const snapshot = await withTimeout(
    getDocs(collection(db, "students", userId, "marks")),
    "getStudentMarks"
  );

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...(docItem.data() as Omit<MarkRecord, "id">),
  }));
}

export async function addStudentMark(
  userId: string,
  record: MarkRecord
): Promise<MarkRecord> {
  const { id, ...data } = record;

  const ref = await withTimeout(
    addDoc(collection(db, "students", userId, "marks"), data),
    "addStudentMark"
  );

  return {
    ...record,
    id: ref.id,
  };
}

/*
 * Edits an existing result in place, keyed by the mark's own Firestore
 * document ID (the same `marks/{id}` doc that addStudentMark created).
 * This targets `students/{userId}/marks/{id}` under the signed-in
 * @react-native-firebase Auth session, so an edit made on this device is
 * read back by getStudentMarks() — on this device or any other, native or
 * web — the next time that same account signs in and this screen loads.
 */
export async function updateStudentMark(
  userId: string,
  record: MarkRecord
): Promise<void> {
  const { id, ...data } = record;

  await withTimeout(
    setDoc(doc(db, "students", userId, "marks", id), data),
    "updateStudentMark"
  );
}

/*
 * Deletes a single result. Kept separate from resetStudentProgress (which
 * wipes everything) so a student can remove one bad/duplicate entry
 * without losing the rest of their history.
 */
export async function deleteStudentMark(
  userId: string,
  markId: string
): Promise<void> {
  await withTimeout(
    deleteDoc(doc(db, "students", userId, "marks", markId)),
    "deleteStudentMark"
  );
}

export async function resetStudentProgress(userId: string) {
  await withTimeout(
    deleteDoc(doc(db, "students", userId, "profile", "main")),
    "resetStudentProgress:deleteProfile"
  );

  const snapshot = await withTimeout(
    getDocs(collection(db, "students", userId, "marks")),
    "resetStudentProgress:getMarks"
  );

  await withTimeout(
    Promise.all(snapshot.docs.map((docItem) => deleteDoc(docItem.ref))),
    "resetStudentProgress:deleteMarks"
  );
}