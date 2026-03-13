export type SignInEmailInput = {
  apiUrl: string;
  email: string;
  password: string;
};

type BetterAuthErrorBody = { message?: string; code?: string } | unknown;

export async function signInEmail(input: SignInEmailInput) {
  const response = await fetch("/api/auth/sign-in/email", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ email: input.email, password: input.password })
  });

  if (!response.ok) {
    const body: BetterAuthErrorBody = await response.json().catch(() => undefined);
    const message =
      typeof body === "object" && body != null && "message" in body && typeof (body as any).message === "string"
        ? (body as any).message
        : `HTTP ${response.status} no sign-in`;
    const code =
      typeof body === "object" && body != null && "code" in body && typeof (body as any).code === "string"
        ? (body as any).code
        : undefined;
    throw new Error(code ? `${message} (${code})` : message);
  }

  await response.json().catch(() => undefined);
}

export async function signOut() {
  await fetch("/api/auth/sign-out", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" }
  }).catch(() => undefined);
}

