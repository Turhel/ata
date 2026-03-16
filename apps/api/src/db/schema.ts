import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar
} from "drizzle-orm/pg-core";

export const userStatusEnum = pgEnum("user_status", [
  "pending",
  "active",
  "blocked",
  "inactive"
]);

export const roleCodeEnum = pgEnum("role_code", [
  "master",
  "admin",
  "assistant",
  "inspector"
]);

export const sourceOrderStatusEnum = pgEnum("source_order_status", [
  "Assigned",
  "Received",
  "Canceled"
]);

export const orderStatusEnum = pgEnum("order_status", [
  "available",
  "in_progress",
  "submitted",
  "follow_up",
  "rejected",
  "approved",
  "batched",
  "paid",
  "cancelled",
  "archived"
]);

export const orderEventTypeEnum = pgEnum("order_event_type", [
  "created",
  "claimed",
  "updated",
  "submitted",
  "follow_up_requested",
  "resubmitted",
  "rejected",
  "approved",
  "returned_to_pool",
  "batched",
  "paid",
  "cancelled_from_source",
  "archived"
]);

export const importBatchStatusEnum = pgEnum("import_batch_status", [
  "processing",
  "completed",
  "failed",
  "partially_completed"
]);

export const importActionEnum = pgEnum("import_action", [
  "created",
  "updated",
  "ignored",
  "failed"
]);

export const paymentBatchStatusEnum = pgEnum("payment_batch_status", [
  "open",
  "closed",
  "paid",
  "cancelled"
]);

export const routeStatusEnum = pgEnum("route_status", [
  "draft",
  "published",
  "superseded",
  "cancelled"
]);

export const routeEventTypeEnum = pgEnum("route_event_type", [
  "created",
  "published",
  "superseded",
  "cancelled",
  "reordered",
  "imported_gpx",
  "export_generated"
]);

export const routeStopStatusEnum = pgEnum("route_stop_status", [
  "pending",
  "done",
  "skipped"
]);

export const routeStopCategoryEnum = pgEnum("route_stop_category", [
  "regular",
  "exterior",
  "interior",
  "fint",
  "overdue"
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    status: userStatusEnum("status").notNull().default("pending"),
    authUserId: varchar("auth_user_id", { length: 255 }).unique(),
    inspectorId: uuid("inspector_id").unique(),
    lastLoginAt: timestamp("last_login_at"),
    approvedAt: timestamp("approved_at"),
    approvedByUserId: uuid("approved_by_user_id"),
    blockedAt: timestamp("blocked_at"),
    blockedByUserId: uuid("blocked_by_user_id"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    index("users_status_idx").on(t.status),
    foreignKey({
      columns: [t.approvedByUserId],
      foreignColumns: [t.id]
    }),
    foreignKey({
      columns: [t.blockedByUserId],
      foreignColumns: [t.id]
    })
  ]
);

export const userRoles = pgTable(
  "user_roles",
  {
    id: uuid("id").primaryKey().notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roleCode: roleCodeEnum("role_code").notNull(),
    assignedAt: timestamp("assigned_at").notNull().defaultNow(),
    assignedByUserId: uuid("assigned_by_user_id")
      .notNull()
      .references(() => users.id),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    index("user_roles_user_id_idx").on(t.userId),
    index("user_roles_role_code_idx").on(t.roleCode),
    index("user_roles_user_id_is_active_idx").on(t.userId, t.isActive),
    uniqueIndex("user_roles_one_active_per_user_idx")
      .on(t.userId)
      .where(sql`${t.isActive} = true`)
  ]
);

export const teamAssignments = pgTable(
  "team_assignments",
  {
    id: uuid("id").primaryKey().notNull(),
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => users.id),
    assistantUserId: uuid("assistant_user_id")
      .notNull()
      .references(() => users.id),
    isActive: boolean("is_active").notNull().default(true),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    index("team_assignments_admin_user_id_idx").on(t.adminUserId),
    index("team_assignments_assistant_user_id_idx").on(t.assistantUserId),
    index("team_assignments_is_active_idx").on(t.isActive),
    check(
      "team_assignments_admin_not_assistant_chk",
      sql`${t.adminUserId} <> ${t.assistantUserId}`
    ),
    uniqueIndex("team_assignments_one_active_per_assistant_idx")
      .on(t.assistantUserId)
      .where(sql`${t.isActive} = true`)
  ]
);

export const poolImportBatches = pgTable(
  "pool_import_batches",
  {
    id: uuid("id").primaryKey().notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    status: importBatchStatusEnum("status").notNull(),
    totalRows: integer("total_rows").notNull().default(0),
    insertedRows: integer("inserted_rows").notNull().default(0),
    updatedRows: integer("updated_rows").notNull().default(0),
    ignoredRows: integer("ignored_rows").notNull().default(0),
    errorRows: integer("error_rows").notNull().default(0),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    finishedAt: timestamp("finished_at"),
    importedByUserId: uuid("imported_by_user_id")
      .notNull()
      .references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    index("pool_import_batches_status_idx").on(t.status),
    index("pool_import_batches_imported_by_user_id_idx").on(t.importedByUserId),
    index("pool_import_batches_started_at_idx").on(t.startedAt)
  ]
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().notNull(),
    clientCode: varchar("client_code", { length: 80 }).notNull(),
    name: varchar("name", { length: 255 }),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    uniqueIndex("clients_client_code_idx").on(t.clientCode),
    index("clients_is_active_idx").on(t.isActive)
  ]
);

export const workTypes = pgTable(
  "work_types",
  {
    id: uuid("id").primaryKey().notNull(),
    code: varchar("code", { length: 50 }).notNull(),
    name: varchar("name", { length: 120 }),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    defaultPaymentAmountAssistant: numeric("default_payment_amount_assistant", {
      precision: 12,
      scale: 2
    }),
    defaultPaymentAmountInspector: numeric("default_payment_amount_inspector", {
      precision: 12,
      scale: 2
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    uniqueIndex("work_types_code_idx").on(t.code),
    index("work_types_is_active_idx").on(t.isActive)
  ]
);

export const inspectors = pgTable(
  "inspectors",
  {
    id: uuid("id").primaryKey().notNull(),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    departureCity: varchar("departure_city", { length: 120 }),
    status: varchar("status", { length: 30 }).notNull().default("active"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [index("inspectors_status_idx").on(t.status), index("inspectors_full_name_idx").on(t.fullName)]
);

export const inspectorAccounts = pgTable(
  "inspector_accounts",
  {
    id: uuid("id").primaryKey().notNull(),
    accountCode: varchar("account_code", { length: 50 }).notNull(),
    accountType: varchar("account_type", { length: 30 }).notNull().default("field"),
    description: varchar("description", { length: 255 }),
    currentInspectorId: uuid("current_inspector_id").references(() => inspectors.id),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    uniqueIndex("inspector_accounts_account_code_idx").on(t.accountCode),
    index("inspector_accounts_account_type_idx").on(t.accountType),
    index("inspector_accounts_current_inspector_id_idx").on(t.currentInspectorId)
  ]
);

export const inspectorAccountAssignments = pgTable(
  "inspector_account_assignments",
  {
    id: uuid("id").primaryKey().notNull(),
    inspectorAccountId: uuid("inspector_account_id")
      .notNull()
      .references(() => inspectorAccounts.id),
    inspectorId: uuid("inspector_id")
      .notNull()
      .references(() => inspectors.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    isActive: boolean("is_active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    index("inspector_account_assignments_inspector_account_id_idx").on(t.inspectorAccountId),
    index("inspector_account_assignments_inspector_id_idx").on(t.inspectorId),
    index("inspector_account_assignments_is_active_idx").on(t.isActive)
  ]
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().notNull(),
    externalOrderCode: varchar("external_order_code", { length: 120 })
      .notNull()
      .unique(),
    sourceStatus: sourceOrderStatusEnum("source_status").notNull(),
    status: orderStatusEnum("status").notNull().default("available"),

    clientId: uuid("client_id").references(() => clients.id),
    residentName: varchar("resident_name", { length: 255 }),
    addressLine1: varchar("address_line_1", { length: 255 }),
    addressLine2: varchar("address_line_2", { length: 255 }),
    city: varchar("city", { length: 120 }),
    state: varchar("state", { length: 50 }),
    zipCode: varchar("zip_code", { length: 30 }),
    workTypeId: uuid("work_type_id").references(() => workTypes.id),
    inspectorAccountId: uuid("inspector_account_id").references(() => inspectorAccounts.id),
    assignedInspectorId: uuid("assigned_inspector_id").references(() => inspectors.id),

    assistantUserId: uuid("assistant_user_id").references(() => users.id),
    sourceImportBatchId: uuid("source_import_batch_id").references(
      () => poolImportBatches.id
    ),

    availableDate: date("available_date"),
    deadlineDate: date("deadline_date"),
    isRush: boolean("is_rush").notNull().default(false),
    isVacant: boolean("is_vacant").notNull().default(false),

    claimedAt: timestamp("claimed_at"),
    submittedAt: timestamp("submitted_at"),
    approvedAt: timestamp("approved_at"),
    rejectedAt: timestamp("rejected_at"),
    followUpAt: timestamp("follow_up_at"),
    returnedToPoolAt: timestamp("returned_to_pool_at"),
    batchedAt: timestamp("batched_at"),
    paidAt: timestamp("paid_at"),
    cancelledAt: timestamp("cancelled_at"),
    completedAt: timestamp("completed_at"),

    paymentLocked: boolean("payment_locked").notNull().default(false),
    currentPaymentBatchItemId: uuid("current_payment_batch_item_id"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    index("orders_source_status_idx").on(t.sourceStatus),
    index("orders_status_idx").on(t.status),
    index("orders_client_id_idx").on(t.clientId),
    index("orders_work_type_id_idx").on(t.workTypeId),
    index("orders_inspector_account_id_idx").on(t.inspectorAccountId),
    index("orders_assigned_inspector_id_idx").on(t.assignedInspectorId),
    index("orders_assistant_user_id_idx").on(t.assistantUserId),
    index("orders_available_date_idx").on(t.availableDate),
    index("orders_deadline_date_idx").on(t.deadlineDate),
    index("orders_status_assistant_user_id_idx").on(t.status, t.assistantUserId),
    index("orders_status_inspector_account_id_idx").on(t.status, t.inspectorAccountId)
  ]
);

export const poolImportItems = pgTable(
  "pool_import_items",
  {
    id: uuid("id").primaryKey().notNull(),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => poolImportBatches.id),
    externalOrderCode: varchar("external_order_code", { length: 120 }).notNull(),
    sourceStatus: sourceOrderStatusEnum("source_status").notNull(),
    sourceInspectorAccountCode: varchar("source_inspector_account_code", {
      length: 50
    }),
    sourceClientCode: varchar("source_client_code", { length: 80 }),
    sourceWorkTypeCode: varchar("source_work_type_code", { length: 50 }),
    rawPayload: jsonb("raw_payload").notNull(),
    matchedOrderId: uuid("matched_order_id").references(() => orders.id),
    importAction: importActionEnum("import_action").notNull(),
    lineNumber: integer("line_number").notNull(),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    index("pool_import_items_batch_id_idx").on(t.batchId),
    index("pool_import_items_external_order_code_idx").on(t.externalOrderCode),
    index("pool_import_items_matched_order_id_idx").on(t.matchedOrderId),
    index("pool_import_items_source_status_idx").on(t.sourceStatus)
  ]
);

export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid("id").primaryKey().notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    eventType: orderEventTypeEnum("event_type").notNull(),
    fromStatus: orderStatusEnum("from_status"),
    toStatus: orderStatusEnum("to_status"),
    performedByUserId: uuid("performed_by_user_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (t) => [
    index("order_events_order_id_idx").on(t.orderId),
    index("order_events_event_type_idx").on(t.eventType),
    index("order_events_performed_by_user_id_idx").on(t.performedByUserId),
    index("order_events_created_at_idx").on(t.createdAt)
  ]
);

export const orderNotes = pgTable(
  "order_notes",
  {
    id: uuid("id").primaryKey().notNull(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id),
    noteType: varchar("note_type", { length: 30 }).notNull(),
    content: text("content").notNull(),
    isInternal: boolean("is_internal").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    index("order_notes_order_id_idx").on(t.orderId),
    index("order_notes_author_user_id_idx").on(t.authorUserId),
    index("order_notes_note_type_idx").on(t.noteType),
    index("order_notes_created_at_idx").on(t.createdAt)
  ]
);

export const paymentBatches = pgTable(
  "payment_batches",
  {
    id: uuid("id").primaryKey().notNull(),
    referenceCode: varchar("reference_code", { length: 80 }).notNull(),
    status: paymentBatchStatusEnum("status").notNull().default("open"),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    totalItems: integer("total_items").notNull().default(0),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull().default("0"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    closedByUserId: uuid("closed_by_user_id").references(() => users.id),
    paidByUserId: uuid("paid_by_user_id").references(() => users.id),
    closedAt: timestamp("closed_at"),
    paidAt: timestamp("paid_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    uniqueIndex("payment_batches_reference_code_idx").on(t.referenceCode),
    index("payment_batches_status_idx").on(t.status),
    index("payment_batches_period_idx").on(t.periodStart, t.periodEnd)
  ]
);

export const paymentBatchItems = pgTable(
  "payment_batch_items",
  {
    id: uuid("id").primaryKey().notNull(),
    paymentBatchId: uuid("payment_batch_id")
      .notNull()
      .references(() => paymentBatches.id),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    assistantUserId: uuid("assistant_user_id").references(() => users.id),
    inspectorId: uuid("inspector_id").references(() => inspectors.id),
    inspectorAccountId: uuid("inspector_account_id").references(() => inspectorAccounts.id),
    clientId: uuid("client_id").references(() => clients.id),
    workTypeId: uuid("work_type_id").references(() => workTypes.id),
    externalOrderCode: varchar("external_order_code", { length: 120 }).notNull(),
    amountAssistant: numeric("amount_assistant", { precision: 12, scale: 2 }).notNull().default("0"),
    amountInspector: numeric("amount_inspector", { precision: 12, scale: 2 }).notNull().default("0"),
    quantity: integer("quantity").notNull().default(1),
    snapshotPayload: jsonb("snapshot_payload"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    index("payment_batch_items_payment_batch_id_idx").on(t.paymentBatchId),
    index("payment_batch_items_order_id_idx").on(t.orderId),
    index("payment_batch_items_assistant_user_id_idx").on(t.assistantUserId),
    index("payment_batch_items_inspector_id_idx").on(t.inspectorId),
    index("payment_batch_items_inspector_account_id_idx").on(t.inspectorAccountId),
    uniqueIndex("payment_batch_items_batch_order_idx").on(t.paymentBatchId, t.orderId)
  ]
);

export const routeSourceBatches = pgTable(
  "route_source_batches",
  {
    id: uuid("id").primaryKey().notNull(),
    routeDate: date("route_date").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileHash: varchar("file_hash", { length: 64 }),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    index("route_source_batches_route_date_idx").on(t.routeDate),
    index("route_source_batches_uploaded_by_user_id_idx").on(t.uploadedByUserId)
  ]
);

export const routeCandidates = pgTable(
  "route_candidates",
  {
    id: uuid("id").primaryKey().notNull(),
    sourceBatchId: uuid("source_batch_id")
      .notNull()
      .references(() => routeSourceBatches.id),
    lineNumber: integer("line_number").notNull(),
    externalOrderCode: varchar("external_order_code", { length: 120 }).notNull(),
    sourceStatus: sourceOrderStatusEnum("source_status").notNull(),
    sourceInspectorAccountCode: varchar("source_inspector_account_code", { length: 50 }),
    sourceClientCode: varchar("source_client_code", { length: 80 }),
    sourceWorkTypeCode: varchar("source_work_type_code", { length: 50 }),
    residentName: varchar("resident_name", { length: 255 }),
    addressLine1: varchar("address_line_1", { length: 255 }),
    addressLine2: varchar("address_line_2", { length: 255 }),
    city: varchar("city", { length: 120 }),
    state: varchar("state", { length: 50 }),
    zipCode: varchar("zip_code", { length: 30 }),
    normalizedAddressLine1: varchar("normalized_address_line_1", { length: 255 }),
    normalizedCity: varchar("normalized_city", { length: 120 }),
    normalizedState: varchar("normalized_state", { length: 50 }),
    normalizedZipCode: varchar("normalized_zip_code", { length: 30 }),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    geocodeStatus: varchar("geocode_status", { length: 30 }).notNull().default("pending"),
    geocodeQuality: varchar("geocode_quality", { length: 30 }),
    geocodeSource: varchar("geocode_source", { length: 50 }),
    geocodeReviewRequired: boolean("geocode_review_required").notNull().default(false),
    geocodeReviewReason: text("geocode_review_reason"),
    geocodedAt: timestamp("geocoded_at"),
    dueDate: date("due_date"),
    startDate: date("start_date"),
    hasWindow: boolean("has_window").notNull().default(false),
    isRush: boolean("is_rush").notNull().default(false),
    isFollowUp: boolean("is_follow_up").notNull().default(false),
    isVacant: boolean("is_vacant").notNull().default(false),
    rawPayload: jsonb("raw_payload").notNull(),
    orderId: uuid("order_id").references(() => orders.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    uniqueIndex("route_candidates_batch_line_idx").on(t.sourceBatchId, t.lineNumber),
    index("route_candidates_source_batch_id_idx").on(t.sourceBatchId),
    index("route_candidates_external_order_code_idx").on(t.externalOrderCode),
    index("route_candidates_source_inspector_account_code_idx").on(t.sourceInspectorAccountCode),
    index("route_candidates_due_date_idx").on(t.dueDate)
  ]
);

export const routes = pgTable(
  "routes",
  {
    id: uuid("id").primaryKey().notNull(),
    routeDate: date("route_date").notNull(),
    sourceBatchId: uuid("source_batch_id")
      .notNull()
      .references(() => routeSourceBatches.id),
    inspectorAccountId: uuid("inspector_account_id")
      .notNull()
      .references(() => inspectorAccounts.id),
    inspectorId: uuid("inspector_id").references(() => inspectors.id),
    assistantUserId: uuid("assistant_user_id").references(() => users.id),
    originCity: varchar("origin_city", { length: 120 }),
    optimizationMode: varchar("optimization_mode", { length: 50 })
      .notNull()
      .default("heuristic_city_zip"),
    status: routeStatusEnum("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    supersededByRouteId: uuid("superseded_by_route_id").references((): any => routes.id),
    publishedAt: timestamp("published_at"),
    publishedByUserId: uuid("published_by_user_id").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    uniqueIndex("routes_date_account_version_idx").on(t.routeDate, t.inspectorAccountId, t.version),
    uniqueIndex("routes_one_active_per_day_account_idx")
      .on(t.routeDate, t.inspectorAccountId)
      .where(sql`${t.status} in ('draft','published')`),
    index("routes_route_date_idx").on(t.routeDate),
    index("routes_inspector_account_id_idx").on(t.inspectorAccountId),
    index("routes_status_idx").on(t.status)
  ]
);

export const routeStops = pgTable(
  "route_stops",
  {
    id: uuid("id").primaryKey().notNull(),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id),
    seq: integer("seq").notNull(),
    candidateId: uuid("candidate_id").references(() => routeCandidates.id),
    orderId: uuid("order_id").references(() => orders.id),
    routeCategory: routeStopCategoryEnum("route_category").notNull().default("regular"),
    stopStatus: routeStopStatusEnum("stop_status").notNull().default("pending"),
    residentName: varchar("resident_name", { length: 255 }),
    addressLine1: varchar("address_line_1", { length: 255 }),
    addressLine2: varchar("address_line_2", { length: 255 }),
    city: varchar("city", { length: 120 }),
    state: varchar("state", { length: 50 }),
    zipCode: varchar("zip_code", { length: 30 }),
    normalizedAddressLine1: varchar("normalized_address_line_1", { length: 255 }),
    normalizedCity: varchar("normalized_city", { length: 120 }),
    normalizedState: varchar("normalized_state", { length: 50 }),
    normalizedZipCode: varchar("normalized_zip_code", { length: 30 }),
    latitude: numeric("latitude", { precision: 10, scale: 7 }),
    longitude: numeric("longitude", { precision: 10, scale: 7 }),
    geocodeStatus: varchar("geocode_status", { length: 30 }).notNull().default("pending"),
    geocodeQuality: varchar("geocode_quality", { length: 30 }),
    geocodeSource: varchar("geocode_source", { length: 50 }),
    geocodeReviewRequired: boolean("geocode_review_required").notNull().default(false),
    geocodeReviewReason: text("geocode_review_reason"),
    geocodedAt: timestamp("geocoded_at"),
    dueDate: date("due_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => [
    uniqueIndex("route_stops_route_seq_idx").on(t.routeId, t.seq),
    index("route_stops_route_id_idx").on(t.routeId),
    index("route_stops_candidate_id_idx").on(t.candidateId),
    index("route_stops_order_id_idx").on(t.orderId)
  ]
);

export const routeEvents = pgTable(
  "route_events",
  {
    id: uuid("id").primaryKey().notNull(),
    routeId: uuid("route_id")
      .notNull()
      .references(() => routes.id),
    eventType: routeEventTypeEnum("event_type").notNull(),
    fromStatus: routeStatusEnum("from_status"),
    toStatus: routeStatusEnum("to_status"),
    performedByUserId: uuid("performed_by_user_id")
      .notNull()
      .references(() => users.id),
    reason: text("reason"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (t) => [index("route_events_route_id_idx").on(t.routeId), index("route_events_created_at_idx").on(t.createdAt)]
);
