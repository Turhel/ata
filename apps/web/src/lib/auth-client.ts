import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001/api/auth" // Not sure if the backend exposes it at /api/auth or root, let me check. Let's default to localhost:3001 until verified.
})

export const { signIn, signUp, useSession, signOut } = authClient;
