import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  setDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * Simple string hashing function (DJB2)
 */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

export interface CacheData {
  result: any;
  resumeHash: string;
  jobDescHash: string;
  createdAt: string;
  expiresAt: string;
  model: string;
  tokensUsed: number;
}

class FirestoreCacheService {
  private getCollection(userId: string) {
    return collection(db, 'users', userId, 'cache');
  }

  async getCache(userId: string, resumeText: string, jobDesc: string): Promise<any | null> {
    const resumeHash = hashString(resumeText);
    const jobDescHash = hashString(jobDesc);

    try {
      const q = query(
        this.getCollection(userId),
        where('resumeHash', '==', resumeHash),
        where('jobDescHash', '==', jobDescHash)
      );

      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;

      const docSnapshot = snapshot.docs[0];
      const data = docSnapshot.data() as CacheData;

      // Check expiration
      if (new Date(data.expiresAt) < new Date()) {
        await deleteDoc(doc(db, 'users', userId, 'cache', docSnapshot.id));
        return null;
      }

      return data.result;
    } catch (error) {
      console.error('Firestore cache retrieval failed:', error);
      return null;
    }
  }

  async setCache(userId: string, resumeText: string, jobDesc: string, result: any): Promise<void> {
    const resumeHash = hashString(resumeText);
    const jobDescHash = hashString(jobDesc);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    const cacheEntry: CacheData = {
      result,
      resumeHash,
      jobDescHash,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      model: 'gemini-1.5-flash',
      tokensUsed: 0, // Placeholder
    };

    try {
      const cacheId = `${resumeHash}_${jobDescHash}`;
      await setDoc(doc(db, 'users', userId, 'cache', cacheId), cacheEntry);
    } catch (error) {
      console.error('Firestore cache storage failed:', error);
    }
  }

  async cleanupExpired(userId: string): Promise<void> {
    try {
      const q = query(
        this.getCollection(userId),
        where('expiresAt', '<', new Date().toISOString())
      );
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(docSnapshot => deleteDoc(doc(db, 'users', userId, 'cache', docSnapshot.id)));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Cache cleanup failed:', error);
    }
  }

  // Utility to help with UI
  getHashes(resumeText: string, jobDesc: string) {
    return {
      resumeHash: hashString(resumeText),
      jobDescHash: hashString(jobDesc)
    };
  }
}

export const firestoreCache = new FirestoreCacheService();
