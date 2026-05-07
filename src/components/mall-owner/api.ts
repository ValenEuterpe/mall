import type { ApiResponse } from "@/lib/api-client";

export function unwrapApiResponse<T>(res: ApiResponse<T>): T {
  if (!res.success) {
    // `apiClient` should throw on non-2xx, but keep this safe.
    throw new Error(res.error.message);
  }
  return res.data;
}
