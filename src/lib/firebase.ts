import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, setPersistence, browserLocalPersistence } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel,
  type Firestore
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress benign internal gRPC idle stream disconnect warnings
setLogLevel('error');

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Set persistence to local (survives browser restart/refresh)
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.error("Auth persistence error:", err);
});

// Enable IndexedDB persistent local cache for near-instant repeat workspace loads
// with automatic fallback when browser storage is restricted (e.g. strict private mode)
function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      },
      firebaseConfig.firestoreDatabaseId
    );
  } catch {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true
      },
      firebaseConfig.firestoreDatabaseId
    );
  }
}

export const db = createFirestoreInstance();
export const googleProvider = new GoogleAuthProvider();

let pendingSignIn: Promise<any> | null = null;

export const signInWithGoogle = async () => {
  if (pendingSignIn) {
    return pendingSignIn;
  }

  pendingSignIn = (async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error: any) {
      // Gracefully handle benign user cancelation or duplicate popup requests
      if (
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/user-cancelled'
      ) {
        return null;
      }
      console.error('Error signing in with Google:', error);
      throw error;
    } finally {
      pendingSignIn = null;
    }
  })();

  return pendingSignIn;
};

