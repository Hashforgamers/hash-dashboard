import { DASHBOARD_URL } from "@/src/config/env";
import { httpJson } from "@/lib/http-client";

export type Role = "owner" | "manager" | "staff";

export interface StaffDto {
  id: number;
  vendor_id: number;
  name: string;
  role: Role;
  is_active: boolean;
  pin_code?: string | null;
  created_at?: string;
  updated_at?: string;
  generated_pin?: string;
}

export interface SessionDto {
  token: string;
  vendor_id: number;
  staff: {
    id: string;
    name: string;
    role: Role;
    permissions: string[];
  };
}

export interface RolePermissionResponse {
  permissions: string[];
  matrix: Record<Role, string[]>;
}

function withTimestamp(url: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${Date.now()}`;
}

async function accessCall<T>(
  vendorId: string,
  path: string,
  token?: string,
  options?: RequestInit
): Promise<T> {
  const method = (options?.method || "GET").toUpperCase();
  return httpJson<T>(withTimestamp(`${DASHBOARD_URL}/api/vendor/${vendorId}/access${path}`), {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
    timeoutMs: 10_000,
    retries: method === "GET" ? 2 : 0,
    dedupe: method === "GET",
  });
}

export const accessApi = {
  getOwnerSession: (vendorId: string, token: string) =>
    accessCall<SessionDto>(vendorId, "/session/owner", token, { method: "POST" }),

  unlockByPin: (vendorId: string, pin: string) =>
    accessCall<SessionDto>(vendorId, "/unlock", undefined, {
      method: "POST",
      body: JSON.stringify({ pin }),
    }),

  listStaff: (vendorId: string, token: string) => accessCall<StaffDto[]>(vendorId, "/staff", token),

  createStaff: (vendorId: string, token: string, payload: { name: string; role: Exclude<Role, "owner"> }) =>
    accessCall<StaffDto>(vendorId, "/staff", token, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateStaff: (
    vendorId: string,
    token: string,
    staffId: string,
    payload: {
      role?: Exclude<Role, "owner">;
      is_active?: boolean;
      name?: string;
      pin?: string;
      regenerate_pin?: boolean;
    }
  ) =>
    accessCall<StaffDto>(vendorId, `/staff/${staffId}`, token, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  removeStaff: (vendorId: string, token: string, staffId: string) =>
    accessCall<{ deleted: boolean; id: number }>(vendorId, `/staff/${staffId}`, token, {
      method: "DELETE",
    }),

  getRolePermissions: (vendorId: string, token: string) =>
    accessCall<RolePermissionResponse>(vendorId, "/role-permissions", token),

  setRolePermissions: (
    vendorId: string,
    token: string,
    matrix: Record<Role, string[]>
  ) =>
    accessCall<{ matrix: Record<Role, string[]> }>(vendorId, "/role-permissions", token, {
      method: "PUT",
      body: JSON.stringify({ matrix }),
    }),

  resetRolePermissions: (vendorId: string, token: string) =>
    accessCall<{ matrix: Record<Role, string[]> }>(vendorId, "/role-permissions", token, {
      method: "DELETE",
    }),
};
