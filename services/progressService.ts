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

export async function getStudentProfile(
  userId: string
): Promise<StudentProfile | null> {
  const snapshot = await getDoc(
    doc(db, "students", userId, "profile", "main")
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
  await setDoc(
    doc(db, "students", userId, "profile", "main"),
    profile
  );
}

export async function getStudentMarks(
  userId: string
): Promise<MarkRecord[]> {
  const snapshot = await getDocs(
    collection(db, "students", userId, "marks")
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

  const ref = await addDoc(
    collection(db, "students", userId, "marks"),
    data
  );

  return {
    ...record,
    id: ref.id,
  };
}

export async function resetStudentProgress(userId: string) {
  await deleteDoc(
    doc(db, "students", userId, "profile", "main")
  );

  const snapshot = await getDocs(
    collection(db, "students", userId, "marks")
  );

  await Promise.all(
    snapshot.docs.map((docItem) => deleteDoc(docItem.ref))
  );
}