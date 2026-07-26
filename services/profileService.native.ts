// services/profileService.native.ts
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';
import {
  getDownloadURL,
  getStorage,
  putFile,
  ref,
} from '@react-native-firebase/storage';

export type ProfileData = {
  name: string;
  phone: string;
  school: string;
  yearForm: string;
  bio: string;
  photoURL: string;
};

const db = getFirestore();
const storage = getStorage();

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
  const storageRef = ref(
    storage,
    `users/${uid}/profile/profile-photo.jpg`,
  );

  await putFile(storageRef, imageUri);
  return getDownloadURL(storageRef);
}
