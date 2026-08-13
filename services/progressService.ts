import { db } from "../constants/firebase";
import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  addDoc,
  deleteDoc,
  collection,
} from "firebase/firestore";

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
 * Even with the Firestore transport fixed (forced long polling on native),
 * a write/read can still legitimately stall on a bad connection. Without a
 * timeout, that hangs the calling UI forever with no feedback — the same
 * symptom as the original Android bug, just from a different cause. This
 * wrapper guarantees every Firestore call in this file either resolves or
 * rejects within a bounded time, so callers' try/catch blocks always fire.
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
 * Because this always targets `students/{userId}/marks/{id}` under the
 * signed-in account rather than any local/device state, an edit made on
 * one device is read back by getStudentMarks() on any other device the
 * same account signs into — there is nothing device-local to go stale.
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