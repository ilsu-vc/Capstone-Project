/**
 * @file api.types.ts
 * @description
 *   Shared API envelope types used by EVERY endpoint in this backend.
 *   ─────────────────────────────────────────────────────────────────
 *   ✅  Copy this file directly into the frontend's src/types/ folder.
 *       It has NO backend-specific imports — pure TypeScript interfaces.
 * ─────────────────────────────────────────────────────────────────────
 */

// ─── Success / Error Envelope ─────────────────────────────────────────────────

/**
 * Standard success response wrapper.
 * Every successful API response will follow this shape.
 *
 * @template T - The shape of the `data` payload.
 */
export interface ApiSuccess<T = unknown> {
  success: true;
  data: T;
  /** Optional human-readable message */
  message?: string;
  /** ISO timestamp of when the response was generated */
  timestamp: string;
}

/**
 * Standard error response wrapper.
 * Every failed API response will follow this shape.
 */
export interface ApiError {
  success: false;
  error: {
    /** Short machine-readable error code, e.g. "PATH_TRAVERSAL", "NOT_FOUND" */
    code: string;
    /** Human-readable description */
    message: string;
    /** Optional per-field validation errors */
    details?: Record<string, string[]>;
  };
  timestamp: string;
}

/** Union of the two possible response shapes */
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ─── Request Helpers ─────────────────────────────────────────────────────────

/** Query params accepted by any list endpoint */
export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  /** ISO date string lower bound */
  from?: string;
  /** ISO date string upper bound */
  to?: string;
}
