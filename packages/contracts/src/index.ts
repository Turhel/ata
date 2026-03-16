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
  inspectorId: string | null;
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
  inspectorId: string | null;
  roleCode: RoleCode | null;
};

export type ListMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
 };

export type ApiErrorDetails = {
  code?: string;
  missingFields?: string[];
  orderIds?: string[];
  forbiddenFields?: string[];
  invalidFields?: string[];
};

export type UsersListResponse =
  | { ok: true; users: UsersListItem[]; meta: ListMeta }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST" | "INTERNAL_ERROR";
      message: string;
    };

export type UserStatusMutationResponse =
  | { ok: true; user: UsersListItem }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INVALID_STATUS" | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };

export type RoleCode = "master" | "admin" | "assistant" | "inspector";

export type UserRoleMutationRequest = {
  roleCode: RoleCode;
};

export type UserRoleMutationResponse =
  | {
      ok: true;
      user: UsersListItem;
      role: {
        userId: string;
        roleCode: RoleCode;
        assignedAt: string;
        assignedByUserId: string;
      };
    }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_ERROR";
      message: string;
    };

export type UserInspectorLinkRequest = {
  inspectorId: string | null;
};

export type UserInspectorLinkResponse =
  | { ok: true; user: UsersListItem }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_ERROR";
      message: string;
    };

export type TeamAssignmentItem = {
  id: string;
  adminUserId: string;
  assistantUserId: string;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  admin: {
    id: string;
    email: string;
  };
  assistant: {
    id: string;
    email: string;
    fullName: string;
  } | null;
};

export type TeamAssignmentsListResponse =
  | { ok: true; assignments: TeamAssignmentItem[] }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR";
      message: string;
    };

export type TeamAssignmentCreateRequest = {
  adminUserId?: string;
  assistantUserId: string;
  startDate?: string;
};

export type TeamAssignmentMutationResponse =
  | {
      ok: true;
      assignment: {
        id: string;
        adminUserId: string;
        assistantUserId: string;
        isActive: boolean;
        startDate: string;
        endDate: string | null;
      };
    }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST" | "INVALID_STATUS" | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };

export type SourceOrderStatus = "Assigned" | "Received" | "Canceled";

export type ImportBatchStatus = "processing" | "completed" | "failed" | "partially_completed";

export type ImportAction = "created" | "updated" | "ignored" | "failed";

export type ClientItem = {
  id: string;
  clientCode: string;
  name: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ClientsListResponse =
  | { ok: true; clients: ClientItem[] }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR";
      message: string;
    };

export type ClientMutationRequest = {
  clientCode: string;
  name?: string | null;
  description?: string | null;
  isActive?: boolean;
};

export type ClientMutationResponse =
  | { ok: true; client: ClientItem }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST" | "NOT_FOUND" | "INVALID_STATUS" | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };

export type WorkTypeItem = {
  id: string;
  code: string;
  name: string | null;
  description: string | null;
  isActive: boolean;
  defaultPaymentAmountAssistant: string | null;
  defaultPaymentAmountInspector: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkTypesListResponse =
  | { ok: true; workTypes: WorkTypeItem[] }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR";
      message: string;
    };

export type WorkTypeMutationRequest = {
  code: string;
  name?: string | null;
  description?: string | null;
  isActive?: boolean;
  defaultPaymentAmountAssistant?: string | number | null;
  defaultPaymentAmountInspector?: string | number | null;
};

export type WorkTypeMutationResponse =
  | { ok: true; workType: WorkTypeItem }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST" | "NOT_FOUND" | "INVALID_STATUS" | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };

export type InspectorItem = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  departureCity: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type InspectorsListResponse =
  | { ok: true; inspectors: InspectorItem[] }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR";
      message: string;
    };

export type InspectorMutationRequest = {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  departureCity?: string | null;
  status?: string;
  notes?: string | null;
};

export type InspectorMutationResponse =
  | { ok: true; inspector: InspectorItem }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST" | "NOT_FOUND" | "INTERNAL_ERROR";
      message: string;
    };

export type InspectorSelfProfile = {
  userId: string;
  inspectorId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  departureCity: string | null;
  status: string;
  notes: string | null;
};

export type InspectorSelfProfileResponse =
  | { ok: true; profile: InspectorSelfProfile }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_ERROR";
      message: string;
    };

export type InspectorSelfProfilePatchRequest = {
  email?: string | null;
  phone?: string | null;
  departureCity?: string | null;
};

export type InspectorSelfProfilePatchResponse = InspectorSelfProfileResponse;

export type RouteListItem = {
  id: string;
  routeDate: string;
  sourceBatchId: string;
  inspectorAccountId: string;
  inspectorAccountCode: string;
  inspectorId: string | null;
  assistantUserId: string | null;
  originCity: string | null;
  optimizationMode: string;
  status: string;
  version: number;
  totalStops: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RoutesListResponse =
  | { ok: true; routes: RouteListItem[]; meta: ListMeta }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST" | "INTERNAL_ERROR";
      message: string;
    };

export type RouteSourceBatchGeocodeResponse =
  | {
      ok: true;
      batchId: string;
      totalCandidates: number;
      processedCandidates: number;
      resolvedCandidates: number;
      notFoundCandidates: number;
      failedCandidates: number;
      skippedCandidates: number;
    }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_ERROR";
      message: string;
    };

export type InspectorAccountItem = {
  id: string;
  accountCode: string;
  accountType: string;
  description: string | null;
  currentInspectorId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type InspectorAccountsListResponse =
  | { ok: true; inspectorAccounts: InspectorAccountItem[] }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR";
      message: string;
    };

export type InspectorAccountMutationRequest = {
  accountCode: string;
  accountType?: string;
  description?: string | null;
  currentInspectorId?: string | null;
  isActive?: boolean;
};

export type InspectorAccountMutationResponse =
  | { ok: true; inspectorAccount: InspectorAccountItem }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST" | "NOT_FOUND" | "INVALID_STATUS" | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };

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

export type PoolImportFailureCategory =
  | "catalog_resolution"
  | "invalid_input"
  | "internal_error";

export type PoolImportFailureItem = {
  id: string;
  lineNumber: number;
  externalOrderCode: string;
  sourceStatus: SourceOrderStatus;
  sourceInspectorAccountCode: string | null;
  sourceClientCode: string | null;
  sourceWorkTypeCode: string | null;
  importAction: "failed";
  matchedOrderId: string | null;
  errorMessage: string | null;
  rawPayload: unknown;
  createdAt: string;
  failureCategory: PoolImportFailureCategory;
  unresolvedReferences: string[];
};

export type PoolImportBatchGetResponse =
  | { ok: true; batch: PoolImportBatch; items: PoolImportBatchItem[] }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INTERNAL_ERROR";
      message: string;
    };

export type PoolImportFailuresGetResponse =
  | { ok: true; batch: PoolImportBatch; failures: PoolImportFailureItem[] }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INTERNAL_ERROR";
      message: string;
    };

export type PoolImportReprocessedItem = {
  id: string;
  batchId: string;
  lineNumber: number;
  externalOrderCode: string;
  sourceStatus: SourceOrderStatus;
  sourceInspectorAccountCode: string | null;
  sourceClientCode: string | null;
  sourceWorkTypeCode: string | null;
  rawPayload: unknown;
  matchedOrderId: string | null;
  importAction: ImportAction;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PoolImportItemReprocessResponse =
  | { ok: true; batch: PoolImportBatch; item: PoolImportReprocessedItem }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_ERROR";
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

export type OrderEventType =
  | "created"
  | "claimed"
  | "updated"
  | "submitted"
  | "follow_up_requested"
  | "resubmitted"
  | "rejected"
  | "approved"
  | "returned_to_pool"
  | "batched"
  | "paid"
  | "cancelled_from_source"
  | "archived";

export type OrderEvent = {
  id: string;
  orderId: string;
  eventType: OrderEventType;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  performedByUserId: string;
  reason: string | null;
  metadata: unknown;
  createdAt: string;
};

export type OrderEventsListResponse =
  | { ok: true; events: OrderEvent[] }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INTERNAL_ERROR";
      message: string;
    };

export type OrderNote = {
  id: string;
  orderId: string;
  authorUserId: string;
  noteType: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OrderNotesListResponse =
  | { ok: true; notes: OrderNote[] }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INTERNAL_ERROR";
      message: string;
    };

export type OrderNoteCreateRequest = {
  noteType?: string;
  content: string;
  isInternal?: boolean;
};

export type OrderNoteCreateResponse =
  | { ok: true; note: OrderNote }
  | {
      ok: false;
      error:
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "BAD_REQUEST"
        | "INVALID_STATUS"
        | "INTERNAL_ERROR";
      message: string;
    };

export type PaymentBatchStatus = "open" | "closed" | "paid" | "cancelled";

export type PaymentBatch = {
  id: string;
  referenceCode: string;
  status: PaymentBatchStatus;
  periodStart: string;
  periodEnd: string;
  totalItems: number;
  totalAmount: string;
  createdByUserId: string;
  closedByUserId: string | null;
  paidByUserId: string | null;
  closedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentBatchItem = {
  id: string;
  paymentBatchId: string;
  orderId: string;
  assistantUserId: string | null;
  inspectorId: string | null;
  inspectorAccountId: string | null;
  clientId: string | null;
  workTypeId: string | null;
  externalOrderCode: string;
  amountAssistant: string;
  amountInspector: string;
  quantity: number;
  snapshotPayload: unknown;
  createdAt: string;
  updatedAt: string;
};

export type PaymentBatchesListResponse =
  | { ok: true; batches: PaymentBatch[]; meta: ListMeta }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST" | "INTERNAL_ERROR";
      message: string;
    };

export type PaymentBatchGetResponse =
  | { ok: true; batch: PaymentBatch; items: PaymentBatchItem[] }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INTERNAL_ERROR";
      message: string;
    };

export type PaymentBatchCreateRequest = {
  referenceCode: string;
  periodStart: string;
  periodEnd: string;
  orderIds: string[];
  notes?: string | null;
};

export type PaymentBatchCreateResponse =
  | {
      ok: true;
      batch: {
        id: string;
        referenceCode: string;
        status: "open";
        totalItems: number;
        totalAmount: string;
      };
    }
  | {
      ok: false;
      error:
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "BAD_REQUEST"
        | "NOT_FOUND"
        | "INVALID_STATUS"
        | "VALIDATION_ERROR"
        | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };

export type PaymentBatchCloseResponse =
  | {
      ok: true;
      batch: {
        id: string;
        status: "closed";
        closedAt: string | null;
        closedByUserId: string | null;
      };
    }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INVALID_STATUS" | "VALIDATION_ERROR" | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };

export type PaymentBatchPayResponse =
  | {
      ok: true;
      batch: {
        id: string;
        status: "paid";
        paidAt: string | null;
        paidByUserId: string | null;
      };
    }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "INVALID_STATUS" | "VALIDATION_ERROR" | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };

export type AdminDashboardResponse =
  | {
      ok: true;
      dashboard: {
        scope: "global" | "team";
        users: {
          pending: number;
          active: number;
          blocked: number;
        };
        orders: {
          available: number;
          inProgress: number;
          submitted: number;
          followUp: number;
          rejected: number;
          approved: number;
          batched: number;
          paid: number;
          cancelled: number;
        };
        payments: {
          open: number;
          closed: number;
          paid: number;
          cancelled: number;
        };
        imports: {
          processing: number;
          completed: number;
          partiallyCompleted: number;
          failed: number;
        };
        team: {
          assistants: number;
          orders: {
            availableToTeam: number;
            inProgress: number;
            submitted: number;
            followUp: number;
            approved: number;
            batched: number;
            paid: number;
          };
        } | null;
      };
    }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR";
      message: string;
    };

export type AssistantDashboardResponse =
  | {
      ok: true;
      dashboard: {
        availableOrders: number;
        mine: {
          inProgress: number;
          submitted: number;
          followUp: number;
          rejected: number;
          approved: number;
          batched: number;
          paid: number;
        };
      };
    }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_ERROR";
      message: string;
    };

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
  | { ok: true; orders: OrdersListItem[]; meta: ListMeta }
  | {
      ok: false;
      error: "UNAUTHORIZED" | "FORBIDDEN" | "BAD_REQUEST" | "INTERNAL_ERROR";
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
        | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
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
        | "VALIDATION_ERROR"
        | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };

export type OrderResubmitResponse =
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
        | "VALIDATION_ERROR"
        | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };

export type OrderPatchRequest = {
  residentName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  workTypeId?: string | null;
  isRush?: boolean;
  isVacant?: boolean;
  inspectorAccountId?: string | null;
  assignedInspectorId?: string | null;
  clientId?: string | null;
};

export type OrderPatchResponse =
  | {
      ok: true;
      order: {
        id: string;
        status: OrderStatus;
        updatedAt: string;
        residentName: string | null;
        addressLine1: string | null;
        addressLine2: string | null;
        city: string | null;
        state: string | null;
        zipCode: string | null;
        workTypeId: string | null;
        isRush: boolean;
        isVacant: boolean;
        clientId?: string | null;
        inspectorAccountId?: string | null;
        assignedInspectorId?: string | null;
      };
    }
  | {
      ok: false;
      error:
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "INVALID_STATUS"
        | "BAD_REQUEST"
        | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };
export type OrderFollowUpRequest = { reason: string };
export type OrderRejectRequest = { reason: string };
export type OrderReturnToPoolRequest = { reason: string };

export type OrderFollowUpResponse =
  | { ok: true; order: { id: string; status: OrderStatus; followUpAt: string | null } }
  | {
      ok: false;
      error:
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "INVALID_STATUS"
        | "VALIDATION_ERROR"
        | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };

export type OrderRejectResponse =
  | { ok: true; order: { id: string; status: OrderStatus; rejectedAt: string | null } }
  | {
      ok: false;
      error:
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "INVALID_STATUS"
        | "VALIDATION_ERROR"
        | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };

export type OrderApproveResponse =
  | { ok: true; order: { id: string; status: OrderStatus; approvedAt: string | null } }
  | {
      ok: false;
      error:
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "INVALID_STATUS"
        | "VALIDATION_ERROR"
        | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };

export type OrderReturnToPoolResponse =
  | { ok: true; order: { id: string; status: OrderStatus; assistantUserId: string | null; returnedToPoolAt: string | null } }
  | {
      ok: false;
      error:
        | "UNAUTHORIZED"
        | "FORBIDDEN"
        | "NOT_FOUND"
        | "INVALID_STATUS"
        | "VALIDATION_ERROR"
        | "INTERNAL_ERROR";
      message: string;
      details?: ApiErrorDetails;
    };
