// services/savedItemsService.native.ts
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  serverTimestamp,
  setDoc,
} from '@react-native-firebase/firestore';

import { getCurrentUser } from './authService';

export type SavedItemType = 'course' | 'career' | 'scholarship';

export type SavedItemRecord = {
  id: string;
  type: SavedItemType;
  title: string;
  savedAt?: unknown;
  [key: string]: unknown;
};

export type SavedItemInput = {
  id: string;
  title: string;
  [key: string]: unknown;
};

const db = getFirestore();

function requireUserId(): string {
  const user = getCurrentUser();

  if (!user) {
    throw new Error('auth_required');
  }

  return user.uid;
}

function savedItemDocumentId(type: SavedItemType, itemId: string): string {
  return `${type}_${itemId}`;
}

export async function isItemSaved(
  type: SavedItemType,
  itemId: string,
): Promise<boolean> {
  const uid = requireUserId();
  const snapshot = await getDoc(
    doc(db, 'users', uid, 'savedItems', savedItemDocumentId(type, itemId)),
  );

  return snapshot.exists();
}

export async function saveItem(
  type: SavedItemType,
  item: SavedItemInput,
): Promise<void> {
  const uid = requireUserId();

  await setDoc(
    doc(db, 'users', uid, 'savedItems', savedItemDocumentId(type, item.id)),
    {
      ...item,
      type,
      ownerId: uid,
      savedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function removeSavedItem(
  type: SavedItemType,
  itemId: string,
): Promise<void> {
  const uid = requireUserId();

  await deleteDoc(
    doc(db, 'users', uid, 'savedItems', savedItemDocumentId(type, itemId)),
  );
}

export async function getSavedItems(): Promise<SavedItemRecord[]> {
  const uid = requireUserId();
  const snapshot = await getDocs(collection(db, 'users', uid, 'savedItems'));

  return snapshot.docs
    .map((item) => {
      const data = item.data() as Record<string, unknown>;
      return {
        ...data,
        id: String(data.id ?? ''),
        type: data.type as SavedItemType,
      } as SavedItemRecord;
    })
    .filter(
      (item) =>
        Boolean(item.id) &&
        (item.type === 'course' ||
          item.type === 'career' ||
          item.type === 'scholarship'),
    );
}

export function getSavedItemsErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  const message = error instanceof Error ? error.message : '';

  if (message === 'auth_required') {
    return 'Please sign in to save and view your courses, careers and scholarships.';
  }

  if (code === 'permission-denied' || code === 'firestore/permission-denied') {
    return 'Your account does not have permission to access these saved items.';
  }

  if (code === 'unavailable' || code === 'firestore/unavailable') {
    return 'Saved items are temporarily unavailable. Please check your connection.';
  }

  return 'Saved items could not be updated. Please try again.';
}
