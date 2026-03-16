export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_STATUS"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR";

export function normalizeApiError(code: string): { error: ApiErrorCode; statusCode: number; legacyCode?: string } {
  if (
    code === "BAD_REQUEST" ||
    code === "UNAUTHORIZED" ||
    code === "FORBIDDEN" ||
    code === "NOT_FOUND" ||
    code === "INVALID_STATUS" ||
    code === "VALIDATION_ERROR" ||
    code === "INTERNAL_ERROR"
  ) {
    return { error: code, statusCode: httpStatusFromError(code) };
  }

  if (code === "ORDER_INCOMPLETE") {
    return { error: "VALIDATION_ERROR", statusCode: 422, legacyCode: code };
  }

  if (code === "CONFLICT" || code === "ALREADY_CLAIMED" || code === "INVALID_STATE" || code === "ORDER_CANCELLED") {
    return { error: "INVALID_STATUS", statusCode: 409, legacyCode: code };
  }

  if (code === "FORBIDDEN_ROLE" || code === "ROLE_MISSING" || code === "OPERATIONAL_PROFILE_MISSING" || code === "USER_NOT_ACTIVE") {
    return { error: "FORBIDDEN", statusCode: 403, legacyCode: code };
  }

  return { error: "INTERNAL_ERROR", statusCode: 500, legacyCode: code };
}

function httpStatusFromError(code: ApiErrorCode) {
  if (code === "BAD_REQUEST") return 400;
  if (code === "UNAUTHORIZED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "NOT_FOUND") return 404;
  if (code === "INVALID_STATUS") return 409;
  if (code === "VALIDATION_ERROR") return 422;
  return 500;
}

