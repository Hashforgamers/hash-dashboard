"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { Permission, ROLE_PERMISSIONS, StaffRole } from "@/lib/rbac";
import { accessApi, Role } from "@/lib/access-api";

export interface StaffProfile {
  id: string;
  cafeId: string;
  name: string;
  role: StaffRole;
  isActive: boolean;
  pinCode?: string | null;
  createdAt: string;
}

interface ActiveStaff {
  id: string;
  cafeId: string;
  name: string;
  role: StaffRole;
  permissions: Permission[];
}

interface CreateStaffInput {
  name: string;
  role: StaffRole;
}

interface CreateStaffResult {
  ok: boolean;
  message: string;
  generatedPin?: string;
}

type RolePermissionMatrix = Record<StaffRole, Permission[]>;

interface AccessContextValue {
  selectedCafeId: string | null;
  activeStaff: ActiveStaff | null;
  staffProfiles: StaffProfile[];
  rolePermissions: RolePermissionMatrix;
  can: (permission: Permission) => boolean;
  setSelectedCafe: (cafeId: string | null) => void;
  createStaff: (input: CreateStaffInput) => Promise<CreateStaffResult>;
  setActiveByPin: (pin: string) => Promise<{ ok: boolean; message: string }>;
  setRole: (staffId: string, role: StaffRole) => Promise<void>;
  setRolePermission: (role: StaffRole, permission: Permission, enabled: boolean) => Promise<void>;
  resetRolePermissions: () => Promise<void>;
  updateStaffPin: (staffId: string, pin: string) => Promise<{ ok: boolean; message: string; pin?: string }>;
  toggleStaffActive: (staffId: string) => Promise<void>;
  removeStaff: (staffId: string) => Promise<void>;
  clearAccessSession: () => void;
}

interface DecodedToken {
  vendor_id?: number;
  staff?: {
    id?: string;
    name?: string;
    role?: StaffRole;
    permissions?: string[];
  };
  sub?: {
    id?: number;
    name?: string;
  };
}

const STORAGE_ACTIVE = "active_staff_session_v1";
const STORAGE_ACCESS_TOKEN = "rbac_access_token_v1";
const ACCESS_DEBUG_FLAG = "access_debug";

const AccessContext = createContext<AccessContextValue | null>(null);

const DEFAULT_ROLE_PERMISSIONS: RolePermissionMatrix = {
  owner: [...ROLE_PERMISSIONS.owner],
  manager: [...ROLE_PERMISSIONS.manager],
  staff: [...ROLE_PERMISSIONS.staff],
};

function normalizeMatrix(input?: Partial<RolePermissionMatrix>): RolePermissionMatrix {
  return {
    owner: Array.from(new Set((input?.owner || DEFAULT_ROLE_PERMISSIONS.owner).filter(Boolean))),
    manager: Array.from(new Set((input?.manager || DEFAULT_ROLE_PERMISSIONS.manager).filter(Boolean))),
    staff: Array.from(new Set((input?.staff || DEFAULT_ROLE_PERMISSIONS.staff).filter(Boolean))),
  };
}

function decodeStaffFromToken(token: string, cafeId: string, matrix: RolePermissionMatrix): ActiveStaff | null {
  try {
    const claims = jwtDecode<DecodedToken>(token);
    if (claims.staff?.role) {
      const role = claims.staff.role;
      const tokenPerms = Array.isArray(claims.staff.permissions) ? claims.staff.permissions : [];
      const mergedPerms = Array.from(new Set([...tokenPerms, ...(matrix[role] || [])])) as Permission[];
      return {
        id: claims.staff.id || `staff-${cafeId}`,
        cafeId,
        name: claims.staff.name || "Staff",
        role,
        permissions: mergedPerms,
      };
    }
  } catch {
    // no-op
  }
  return null;
}

function ownerFallback(cafeId: string, matrix: RolePermissionMatrix): ActiveStaff {
  return {
    id: `owner-${cafeId}`,
    cafeId,
    name: "Owner",
    role: "owner",
    permissions: matrix.owner,
  };
}

function getRbacToken(): string | null {
  return localStorage.getItem(STORAGE_ACCESS_TOKEN);
}

function getLoginToken(): string | null {
  return localStorage.getItem("jwtToken");
}

function isDummyLoginToken(token: string | null): boolean {
  if (!token) return false;
  return token.endsWith(".dummy_signature");
}

function isAccessDebugEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ACCESS_DEBUG === "true") return true;
  try {
    return localStorage.getItem(ACCESS_DEBUG_FLAG) === "1";
  } catch {
    return false;
  }
}

function maskToken(token: string | null): string {
  if (!token) return "null";
  if (token.length < 20) return "***";
  return `${token.slice(0, 10)}...${token.slice(-8)}`;
}

function accessDebug(message: string, meta?: Record<string, unknown>) {
  if (!isAccessDebugEnabled()) return;
  if (meta) {
    console.info(`[AccessDebug] ${message}`, meta);
  } else {
    console.info(`[AccessDebug] ${message}`);
  }
}

function toRole(value: string): Role {
  if (value === "manager") return "manager";
  if (value === "staff") return "staff";
  return "owner";
}

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [selectedCafeId, setSelectedCafeId] = useState<string | null>(null);
  const [staffProfiles, setStaffProfiles] = useState<StaffProfile[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMatrix>(DEFAULT_ROLE_PERMISSIONS);
  const [activeStaff, setActiveStaff] = useState<ActiveStaff | null>(null);

  const ensureRbacToken = async (cafeId: string): Promise<string | null> => {
    const existing = getRbacToken();
    if (existing) {
      accessDebug("Using existing RBAC token", { cafeId, token: maskToken(existing) });
      return existing;
    }

    const loginToken = getLoginToken();
    if (!loginToken || isDummyLoginToken(loginToken)) {
      accessDebug("Cannot bootstrap RBAC token from login token", {
        cafeId,
        hasLoginToken: !!loginToken,
        isDummy: isDummyLoginToken(loginToken),
      });
      return null;
    }

    try {
      accessDebug("Calling /session/owner for RBAC bootstrap", {
        cafeId,
        loginToken: maskToken(loginToken),
      });
      const ownerSession = await accessApi.getOwnerSession(cafeId, loginToken);
      localStorage.setItem(STORAGE_ACCESS_TOKEN, ownerSession.token);
      accessDebug("RBAC bootstrap success", { cafeId, token: maskToken(ownerSession.token) });
      setActiveStaff({
        id: ownerSession.staff.id,
        cafeId,
        name: ownerSession.staff.name,
        role: toRole(ownerSession.staff.role) as StaffRole,
        permissions: ownerSession.staff.permissions as Permission[],
      });
      return ownerSession.token;
    } catch (e: any) {
      accessDebug("RBAC bootstrap failed", { cafeId, error: e?.message || "unknown" });
      return null;
    }
  };

  const loadServerState = async (cafeId: string) => {
    const loginToken = getLoginToken();
    accessDebug("loadServerState start", {
      cafeId,
      loginToken: maskToken(loginToken),
      rbacToken: maskToken(getRbacToken()),
      isDummyLoginToken: isDummyLoginToken(loginToken),
    });
    if (!loginToken) {
      setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      setStaffProfiles([]);
      setActiveStaff(ownerFallback(cafeId, DEFAULT_ROLE_PERMISSIONS));
      return;
    }

    let matrix = DEFAULT_ROLE_PERMISSIONS;
    let tokenForProtectedCalls = await ensureRbacToken(cafeId);

    try {
      if (tokenForProtectedCalls) {
        accessDebug("Fetching role-permissions", { cafeId, token: maskToken(tokenForProtectedCalls) });
        const roleRes = await accessApi.getRolePermissions(cafeId, tokenForProtectedCalls);
        matrix = normalizeMatrix({
          owner: roleRes.matrix.owner as Permission[],
          manager: roleRes.matrix.manager as Permission[],
          staff: roleRes.matrix.staff as Permission[],
        });
        setRolePermissions(matrix);
      } else {
        setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      }
    } catch (e: any) {
      accessDebug("Failed to fetch role-permissions", { cafeId, error: e?.message || "unknown" });
      setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
    }

    const activeToken = tokenForProtectedCalls || (isDummyLoginToken(loginToken) ? null : loginToken);
    const staffFromToken = activeToken ? decodeStaffFromToken(activeToken, cafeId, matrix) : null;
    if (staffFromToken) {
      setActiveStaff(staffFromToken);
    } else {
      setActiveStaff(ownerFallback(cafeId, matrix));
    }

    try {
      if (tokenForProtectedCalls) {
        accessDebug("Fetching staff list", { cafeId, token: maskToken(tokenForProtectedCalls) });
        const list = await accessApi.listStaff(cafeId, tokenForProtectedCalls);
        setStaffProfiles(
          list.map((s) => ({
            id: String(s.id),
            cafeId,
            name: s.name,
            role: toRole(s.role) as StaffRole,
            isActive: s.is_active,
            pinCode: s.pin_code ?? null,
            createdAt: s.created_at || new Date().toISOString(),
          }))
        );
      } else {
        setStaffProfiles([]);
      }
    } catch (e: any) {
      accessDebug("Failed to fetch staff list", { cafeId, error: e?.message || "unknown" });
      setStaffProfiles([]);
    }
  };

  useEffect(() => {
    const cafeId = localStorage.getItem("selectedCafe");
    setSelectedCafeId(cafeId);

    const storedActive = localStorage.getItem(STORAGE_ACTIVE);
    if (storedActive) {
      try {
        setActiveStaff(JSON.parse(storedActive));
      } catch {
        setActiveStaff(null);
      }
    }

    if (cafeId) {
      void loadServerState(cafeId);
    }
  }, []);

  useEffect(() => {
    if (activeStaff) {
      localStorage.setItem(STORAGE_ACTIVE, JSON.stringify(activeStaff));
    } else {
      localStorage.removeItem(STORAGE_ACTIVE);
    }
  }, [activeStaff]);

  const can = (permission: Permission) => {
    if (!activeStaff) return false;
    return activeStaff.permissions.includes(permission);
  };

  const setSelectedCafe = (cafeId: string | null) => {
    setSelectedCafeId(cafeId);

    if (!cafeId) {
      localStorage.removeItem("selectedCafe");
      localStorage.removeItem(STORAGE_ACCESS_TOKEN);
      setActiveStaff(null);
      setStaffProfiles([]);
      setRolePermissions(DEFAULT_ROLE_PERMISSIONS);
      return;
    }

    localStorage.setItem("selectedCafe", cafeId);
    void loadServerState(cafeId);
  };

  const createStaff = async (input: CreateStaffInput): Promise<CreateStaffResult> => {
    if (!selectedCafeId) {
      return { ok: false, message: "No cafe selected" };
    }
    if (!input.name.trim()) {
      return { ok: false, message: "Name is required" };
    }

    const token = await ensureRbacToken(selectedCafeId);
    if (!token) {
      return { ok: false, message: "RBAC session not initialized. Please re-login to this cafe." };
    }

    try {
      accessDebug("Creating staff", { cafeId: selectedCafeId, role: input.role, name: input.name.trim() });
      const created = await accessApi.createStaff(selectedCafeId, token, {
        name: input.name.trim(),
        role: toRole(input.role) as "manager" | "staff",
      });

      setStaffProfiles((prev) => [
        ...prev,
        {
          id: String(created.id),
          cafeId: selectedCafeId,
          name: created.name,
          role: toRole(created.role) as StaffRole,
          isActive: created.is_active,
          pinCode: created.pin_code ?? created.generated_pin ?? null,
          createdAt: created.created_at || new Date().toISOString(),
        },
      ]);

      return { ok: true, message: "Staff created", generatedPin: created.generated_pin };
    } catch (e: any) {
      accessDebug("Create staff failed", { cafeId: selectedCafeId, error: e?.message || "unknown" });
      return { ok: false, message: e.message || "Failed to create staff" };
    }
  };

  const setActiveByPin = async (pin: string) => {
    if (!selectedCafeId) return { ok: false, message: "No cafe selected" };

    try {
      accessDebug("Calling /unlock", { cafeId: selectedCafeId, pinLength: pin.length });
      const unlocked = await accessApi.unlockByPin(selectedCafeId, pin);
      localStorage.setItem(STORAGE_ACCESS_TOKEN, unlocked.token);
      accessDebug("Unlock success", { cafeId: selectedCafeId, role: unlocked.staff.role, name: unlocked.staff.name });

      setActiveStaff({
        id: unlocked.staff.id,
        cafeId: selectedCafeId,
        name: unlocked.staff.name,
        role: toRole(unlocked.staff.role) as StaffRole,
        permissions: unlocked.staff.permissions as Permission[],
      });

      return { ok: true, message: `Switched to ${unlocked.staff.name}` };
    } catch (e: any) {
      accessDebug("Unlock failed", { cafeId: selectedCafeId, error: e?.message || "unknown" });
      return { ok: false, message: e.message || "Invalid PIN" };
    }
  };

  const setRole = async (staffId: string, role: StaffRole) => {
    if (!selectedCafeId) {
      throw new Error("No cafe selected");
    }
    const token = await ensureRbacToken(selectedCafeId);
    if (!token) {
      throw new Error("RBAC session missing. Re-unlock cafe with PIN.");
    }
    if (role === "owner") {
      throw new Error("Owner role cannot be assigned here");
    }

    await accessApi.updateStaff(selectedCafeId, token, staffId, { role });

    setStaffProfiles((prev) =>
      prev.map((staff) => (staff.id === staffId ? { ...staff, role } : staff))
    );

    if (activeStaff?.id === staffId) {
      setActiveStaff({
        ...activeStaff,
        role,
        permissions: rolePermissions[role],
      });
    }
  };

  const setRolePermission = async (role: StaffRole, permission: Permission, enabled: boolean) => {
    if (!selectedCafeId) {
      throw new Error("No cafe selected");
    }
    const token = await ensureRbacToken(selectedCafeId);
    if (!token) {
      throw new Error("RBAC session missing. Re-unlock cafe with PIN.");
    }

    const next = normalizeMatrix(rolePermissions);
    const set = new Set(next[role]);
    if (enabled) set.add(permission);
    else set.delete(permission);
    next[role] = Array.from(set);

    const response = await accessApi.setRolePermissions(selectedCafeId, token, {
      owner: next.owner,
      manager: next.manager,
      staff: next.staff,
    });

    const normalized = normalizeMatrix({
      owner: response.matrix.owner as Permission[],
      manager: response.matrix.manager as Permission[],
      staff: response.matrix.staff as Permission[],
    });

    setRolePermissions(normalized);

    if (activeStaff) {
      setActiveStaff({
        ...activeStaff,
        permissions: normalized[activeStaff.role],
      });
    }
  };

  const resetRolePermissions = async () => {
    if (!selectedCafeId) {
      throw new Error("No cafe selected");
    }
    const token = await ensureRbacToken(selectedCafeId);
    if (!token) {
      throw new Error("RBAC session missing. Re-unlock cafe with PIN.");
    }

    const response = await accessApi.resetRolePermissions(selectedCafeId, token);
    const normalized = normalizeMatrix({
      owner: response.matrix.owner as Permission[],
      manager: response.matrix.manager as Permission[],
      staff: response.matrix.staff as Permission[],
    });
    setRolePermissions(normalized);

    if (activeStaff) {
      setActiveStaff({
        ...activeStaff,
        permissions: normalized[activeStaff.role],
      });
    }
  };

  const updateStaffPin = async (staffId: string, pin: string) => {
    if (!selectedCafeId) {
      return { ok: false, message: "No cafe selected" };
    }
    const token = await ensureRbacToken(selectedCafeId);
    if (!token) {
      return { ok: false, message: "RBAC session missing. Re-unlock cafe with PIN." };
    }

    try {
      const updated = await accessApi.updateStaff(selectedCafeId, token, staffId, { pin });
      setStaffProfiles((prev) =>
        prev.map((s) =>
          s.id === staffId ? { ...s, pinCode: updated.pin_code ?? pin } : s
        )
      );
      return { ok: true, message: "PIN updated", pin: updated.pin_code ?? pin };
    } catch (e: any) {
      return { ok: false, message: e?.message || "Failed to update PIN" };
    }
  };

  const toggleStaffActive = async (staffId: string) => {
    if (!selectedCafeId) {
      throw new Error("No cafe selected");
    }
    const token = await ensureRbacToken(selectedCafeId);
    if (!token) {
      throw new Error("RBAC session missing. Re-unlock cafe with PIN.");
    }

    const staff = staffProfiles.find((s) => s.id === staffId);
    if (!staff) {
      throw new Error("Staff record not found");
    }

    const updated = await accessApi.updateStaff(selectedCafeId, token, staffId, {
      is_active: !staff.isActive,
    });

    setStaffProfiles((prev) =>
      prev.map((s) => (s.id === staffId ? { ...s, isActive: updated.is_active } : s))
    );

    if (activeStaff?.id === staffId && !updated.is_active) {
      setActiveStaff(ownerFallback(selectedCafeId, rolePermissions));
    }
  };

  const removeStaff = async (staffId: string) => {
    if (!selectedCafeId) {
      throw new Error("No cafe selected");
    }
    const token = await ensureRbacToken(selectedCafeId);
    if (!token) {
      throw new Error("RBAC session missing. Re-unlock cafe with PIN.");
    }

    await accessApi.removeStaff(selectedCafeId, token, staffId);
    setStaffProfiles((prev) => prev.filter((s) => s.id !== staffId));

    if (activeStaff?.id === staffId) {
      setActiveStaff(ownerFallback(selectedCafeId, rolePermissions));
    }
  };

  const clearAccessSession = () => {
    setActiveStaff(null);
    localStorage.removeItem(STORAGE_ACTIVE);
    localStorage.removeItem(STORAGE_ACCESS_TOKEN);
  };

  return (
    <AccessContext.Provider
      value={{
        selectedCafeId,
        activeStaff,
        staffProfiles,
        rolePermissions,
        can,
        setSelectedCafe,
        createStaff,
        setActiveByPin,
        setRole,
        setRolePermission,
        resetRolePermissions,
        updateStaffPin,
        toggleStaffActive,
        removeStaff,
        clearAccessSession,
      }}
    >
      {children}
    </AccessContext.Provider>
  );
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) {
    throw new Error("useAccess must be used within AccessProvider");
  }
  return ctx;
}
