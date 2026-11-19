import { auth } from './firebase';

/**
 * Returns verified Firebase Authorization header for authenticated backend API calls.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const currentUser = auth.currentUser;
  if (!currentUser) return {};
  try {
    const idToken = await currentUser.getIdToken();
    return idToken ? { Authorization: `Bearer ${idToken}` } : {};
  } catch {
    return {};
  }
}
