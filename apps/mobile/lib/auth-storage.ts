import * as SecureStore from "expo-secure-store";

export type AuthUser = {
  id: number; fullName: string; email: string; phone?: string | null; address?: string | null;
  avatarUrl?: string | null; isGuest: boolean; rewardPoints: number; referralCode?: string | null; createdAt: string;
};

const TOKEN_KEY = "fuchsia.session";
const USER_KEY = "fuchsia.user";

export async function saveSession(user: AuthUser, token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}
export async function getToken() { return SecureStore.getItemAsync(TOKEN_KEY); }
export async function getUser(): Promise<AuthUser | null> {
  const raw = await SecureStore.getItemAsync(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; } catch { return null; }
}
export async function clearSession() { await SecureStore.deleteItemAsync(TOKEN_KEY); await SecureStore.deleteItemAsync(USER_KEY); }
export async function getSessionId() {
  const user = await getUser();
  return user ? String(user.id) : null;
}
