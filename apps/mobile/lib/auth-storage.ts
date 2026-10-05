import * as SecureStore from "expo-secure-store";

export type AuthUser = {
  id: number; fullName: string; email: string; phone?: string | null; address?: string | null;
  avatarUrl?: string | null; isGuest: boolean; rewardPoints: number; referralCode?: string | null; createdAt: string;
};
const TOKEN_KEY = "fuchsia.session";
const USER_KEY = "fuchsia.user";
const BIOMETRIC_KEY = "fuchsia.biometric.enabled";
const THEME_KEY = "fuchsia.theme";
export async function saveSession(user: AuthUser, token: string) { await SecureStore.setItemAsync(TOKEN_KEY, token); await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user)); }
export async function getToken() { return SecureStore.getItemAsync(TOKEN_KEY); }
export async function getUser(): Promise<AuthUser | null> { const raw = await SecureStore.getItemAsync(USER_KEY); if (!raw) return null; try { return JSON.parse(raw) as AuthUser; } catch { return null; } }
export async function clearSession() { await SecureStore.deleteItemAsync(TOKEN_KEY); await SecureStore.deleteItemAsync(USER_KEY); }
export async function getSessionId() { const user = await getUser(); return user ? String(user.id) : null; }
export async function setBiometricEnabled(enabled: boolean) { await SecureStore.setItemAsync(BIOMETRIC_KEY, enabled ? "1" : "0"); }
export async function getBiometricEnabled() { return (await SecureStore.getItemAsync(BIOMETRIC_KEY)) === "1"; }
export async function setThemePreference(theme: "light" | "dark") { await SecureStore.setItemAsync(THEME_KEY, theme); }
export async function getThemePreference(): Promise<"light" | "dark"> { return (await SecureStore.getItemAsync(THEME_KEY)) === "dark" ? "dark" : "light"; }
