export type HealthResponse = {
  ok: true;
  db?: { ok: boolean; error?: string };
};

export type AuthUserBasic = {
  id: string;
  email: string;
  name: string;
  image?: string | null;
};

export type AuthSessionBasic = {
  id: string;
  expiresAt: string;
};

export type OperationalUserStatus = "pending" | "active" | "blocked" | "inactive";

export type OperationalUserProfile = {
  id: string;
  email: string;
  fullName: string;
  status: OperationalUserStatus;
  authUserId: string | null;
};

export type MeResponse =
  | {
      ok: true;
      auth: { user: AuthUserBasic; session: AuthSessionBasic };
      profile: OperationalUserProfile | null;
      profileStatus: "linked" | "missing";
    }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "INTERNAL_ERROR";
      message: string;
    };

export type UsersListItem = {
  id: string;
  email: string;
  fullName: string;
  status: OperationalUserStatus;
  authUserId: string | null;
};

export type UsersListResponse =
  | { ok: true; users: UsersListItem[] }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR";
      message: string;
    };

export type UserStatusMutationResponse =
  | { ok: true; user: UsersListItem }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INVALID_STATE" | "INTERNAL_ERROR";
      message: string;
    };
