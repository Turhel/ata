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

export type SourceOrderStatus = "Assigned" | "Received" | "Canceled";

export type ImportBatchStatus = "processing" | "completed" | "failed" | "partially_completed";

export type ImportAction = "created" | "updated" | "ignored" | "failed";

export type PoolImportNormalizedItem = {
  lineNumber: number;
  externalOrderCode: string;
  sourceStatus: SourceOrderStatus;
  residentName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  availableDate?: string | null;
  deadlineDate?: string | null;
  isRush?: boolean | null;
  isVacant?: boolean | null;
  sourceInspectorAccountCode?: string | null;
  sourceClientCode?: string | null;
  sourceWorkTypeCode?: string | null;
  rawPayload: unknown;
};

export type PoolImportRequest = {
  fileName: string;
  items: PoolImportNormalizedItem[];
};

export type PoolImportBatchCounters = {
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  ignoredRows: number;
  errorRows: number;
};

export type PoolImportBatchSummary = {
  id: string;
  fileName: string;
  status: Exclude<ImportBatchStatus, "processing">;
  counters: PoolImportBatchCounters;
};

export type PoolImportResponse =
  | { ok: true; batch: PoolImportBatchSummary }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST" | "INTERNAL_ERROR";
      message: string;
    };

export type PoolImportBatch = {
  id: string;
  fileName: string;
  status: ImportBatchStatus;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  ignoredRows: number;
  errorRows: number;
  startedAt: string;
  finishedAt: string | null;
  importedByUserId: string;
};

export type PoolImportBatchItem = {
  id: string;
  lineNumber: number;
  externalOrderCode: string;
  sourceStatus: SourceOrderStatus;
  importAction: ImportAction;
  matchedOrderId: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type PoolImportBatchGetResponse =
  | { ok: true; batch: PoolImportBatch; items: PoolImportBatchItem[] }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INTERNAL_ERROR";
      message: string;
    };
export type OrderStatus =
  | "available"
  | "in_progress"
  | "submitted"
  | "follow_up"
  | "rejected"
  | "approved"
  | "batched"
  | "paid"
  | "cancelled"
  | "archived";

export type OrdersListItem = {
  id: string;
  externalOrderCode: string;
  sourceStatus: SourceOrderStatus;
  status: OrderStatus;
  residentName: string | null;
  city: string | null;
  state: string | null;
  availableDate: string | null;
  deadlineDate: string | null;
  assistantUserId: string | null;
  sourceImportBatchId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrdersListResponse =
  | { ok: true; orders: OrdersListItem[] }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR";
      message: string;
    };

export type OrderDetail = {
  id: string;
  externalOrderCode: string;
  sourceStatus: SourceOrderStatus;
  status: OrderStatus;
  clientId: string | null;
  residentName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  workTypeId: string | null;
  inspectorAccountId: string | null;
  assignedInspectorId: string | null;
  assistantUserId: string | null;
  sourceImportBatchId: string | null;
  availableDate: string | null;
  deadlineDate: string | null;
  isRush: boolean;
  isVacant: boolean;
  claimedAt: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  followUpAt: string | null;
  returnedToPoolAt: string | null;
  batchedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderGetResponse =
  | { ok: true; order: OrderDetail; importBatch: PoolImportBatch | null }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INTERNAL_ERROR";
      message: string;
    };
export type OrderClaimResponse =
  | {
      ok: true;
      order: {
        id: string;
        status: OrderStatus;
        assistantUserId: string;
        claimedAt: string | null;
      };
    }
  | {
      ok: false;
      error:
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "INVALID_STATUS"
        | "ALREADY_CLAIMED"
        | "INTERNAL_ERROR";
      message: string;
    };

export type OrderSubmitResponse =
  | {
      ok: true;
      order: {
        id: string;
        status: OrderStatus;
        submittedAt: string | null;
      };
    }
  | {
      ok: false;
      error:
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "INVALID_STATUS"
        | "ORDER_CANCELLED"
        | "ORDER_INCOMPLETE"
        | "INTERNAL_ERROR";
      message: string;
      details?: { missingFields?: string[] };
    };