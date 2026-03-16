import { createAuthClient } from "better-auth/react";

function getAuthBaseUrl() {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const root = apiUrl && apiUrl.length > 0 ? apiUrl.replace(/\/$/, "") : "http://localhost:3001";
  return `${root}/api/auth`;
}

export const authClient = createAuthClient({
  baseURL: getAuthBaseUrl()
});

export const { signIn, signUp, useSession, signOut } = authClient;
