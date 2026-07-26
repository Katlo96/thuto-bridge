// services/dashboardProfileService.ts
import { doc, getDoc } from 'firebase/firestore';

import { db } from '../constants/firebase';

export type DashboardProfile = {
  name?: string;
  phone?: string;
  school?: string;
  yearForm?: string;
  bio?: string;
  photoURL?: string;
  pointsTotal?: number;
  pointsEligible?: boolean;
  pointsCalculatedAt?: string;
};

export async function getDashboardProfile(
  uid: string,
): Promise<DashboardProfile> {
  const [userSnapshot, studentSnapshot] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDoc(doc(db, 'students', uid)),
  ]);

  const userData = userSnapshot.exists() ? userSnapshot.data() : {};
  const studentData = studentSnapshot.exists() ? studentSnapshot.data() : {};

  return {
    ...studentData,
    ...userData,
    name:
      typeof userData.name === 'string' && userData.name.trim()
        ? userData.name
        : typeof studentData.fullName === 'string'
          ? studentData.fullName
          : '',
    phone:
      typeof userData.phone === 'string' && userData.phone.trim()
        ? userData.phone
        : typeof studentData.phone === 'string'
          ? studentData.phone
          : '',
  } as DashboardProfile;
}
