import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance singleton
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with auto-detect long polling for seamless proxy and iframe network connectivity
const dbId = (firebaseConfig as any).firestoreDatabaseId;
export const firestoreDb = (() => {
  try {
    return initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true,
    }, dbId);
  } catch {
    // If instance is already initialized, retrieve it
    return getFirestore(firebaseApp, dbId);
  }
})();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
      email: null,
      emailVerified: null,
      isAnonymous: null,
      tenantId: null,
      providerInfo: [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}

// Validate backend connection on initialization
export async function testConnection() {
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('the client is offline or initial connection timed out')), 5000)
    );
    await Promise.race([
      getDocFromServer(doc(firestoreDb, 'test', 'connection')),
      timeout,
    ]);
  } catch (error: any) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('timed out'))) {
      console.info('Firestore offline notice: Operating in offline mode until connection is confirmed.');
    }
  }
}

// Kick off initial connection test
testConnection().catch(() => {});
