// services/profileService.ts
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';

import { db, storage } from '../constants/firebase';

export type ProfileData = {
  name: string;
  phone: string;
  school: string;
  yearForm: string;
  bio: string;
  photoURL: string;
};

const USERS_COLLECTION = 'users';
const STUDENTS_COLLECTION = 'students';

export async function fetchProfile(
  uid: string,
): Promise<Partial<ProfileData>> {
  const userSnapshot = await getDoc(doc(db, USERS_COLLECTION, uid));

  if (userSnapshot.exists()) {
    return userSnapshot.data() as Partial<ProfileData>;
  }

  const studentSnapshot = await getDoc(doc(db, STUDENTS_COLLECTION, uid));

  if (!studentSnapshot.exists()) {
    return {};
  }

  const student = studentSnapshot.data() as {
    fullName?: string;
    phone?: string | null;
  };

  return {
    name: student.fullName ?? '',
    phone: student.phone ?? '',
  };
}

export async function saveProfile(
  uid: string,
  data: ProfileData,
): Promise<void> {
  await Promise.all([
    setDoc(
      doc(db, USERS_COLLECTION, uid),
      {
        ...data,
        uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
    setDoc(
      doc(db, STUDENTS_COLLECTION, uid),
      {
        uid,
        fullName: data.name,
        phone: data.phone || null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    ),
  ]);
}

export async function saveProfilePhotoURL(
  uid: string,
  photoURL: string,
): Promise<void> {
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    {
      uid,
      photoURL,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function uploadProfilePhoto(
  uid: string,
  imageUri: string,
): Promise<string> {
  const response = await fetch(imageUri);
  const blob = await response.blob();

  const storageRef = ref(
    storage,
    `users/${uid}/profile/profile-photo.jpg`,
  );

  await uploadBytes(storageRef, blob, {
    contentType: blob.type || 'image/jpeg',
  });

  return getDownloadURL(storageRef);
}
