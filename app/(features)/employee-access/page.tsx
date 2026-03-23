"use client";

import { useMemo, useState } from "react";
import { DashboardLayout } from "../../(layout)/dashboard-layout";
import { useAccess } from "@/app/context/AccessContext";
import { Permission, StaffRole } from "@/lib/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, KeyRound, RefreshCw, Shield, Sparkles, UserCog, Users } from "lucide-react";
import { toast } from "sonner";

const ROLE_ORDER: StaffRole[] = ["owner", "manager", "staff"];
const STAFF_ACTION_LABELS: Record<"role" | "toggle" | "remove" | "pin", string> = {
  role: "Updating role...",
  toggle: "Updating...",
  remove: "Removing...",
  pin: "Saving PIN...",
};

const SERVICE_PERMISSION_MAP: Array<{
  label: string;
  permission: Permission;
  section: "Operations" | "Analytics" | "Admin";
}> = [
  { label: "Dashboard", permission: "dashboard.view", section: "Operations" },
  { label: "Manage Gaming Console", permission: "gaming.manage", section: "Operations" },
  { label: "Manage Booking", permission: "booking.manage", section: "Operations" },
  { label: "Extra Services", permission: "extras.manage", section: "Operations" },
  { label: "Store", permission: "store.manage", section: "Operations" },
  { label: "Passes", permission: "passes.manage", section: "Operations" },
  { label: "Games", permission: "games.manage", section: "Operations" },
  { label: "Tournaments", permission: "tournaments.manage", section: "Operations" },
  { label: "Know Your Gamers", permission: "gamers.view", section: "Analytics" },
  { label: "Reviews", permission: "reviews.manage", section: "Analytics" },
  { label: "Transaction Report", permission: "transactions.view", section: "Analytics" },
  { label: "Console Pricing", permission: "pricing.manage", section: "Admin" },
  { label: "Gamers Credit", permission: "pricing.manage", section: "Admin" },
  { label: "My Account", permission: "account.manage", section: "Admin" },
  { label: "Subscription", permission: "subscription.manage", section: "Admin" },
  { label: "Select Cafe", permission: "cafe.switch", section: "Admin" },
  { label: "Employee Access", permission: "staff.manage", section: "Admin" },
];

export default function EmployeeAccessPage() {
  const {
    can,
    staffProfiles,
    createStaff,
    setRole,
    toggleStaffActive,
    removeStaff,
    activeStaff,
    rolePermissions,
    setRolePermission,
    resetRolePermissions,
    updateStaffPin,
  } = useAccess();

  const [name, setName] = useState("");
  const [role, setRoleState] = useState<StaffRole>("staff");
  const [lastCreatedPin, setLastCreatedPin] = useState<string | null>(null);
  const [lastCreatedName, setLastCreatedName] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [isResettingPermissions, setIsResettingPermissions] = useState(false);
  const [pendingPermissionKey, setPendingPermissionKey] = useState<string | null>(null);
  const [pendingStaffAction, setPendingStaffAction] = useState<Record<string, "role" | "toggle" | "remove" | "pin">>({});

  const serviceSections = useMemo(() => {
    return {
      Operations: SERVICE_PERMISSION_MAP.filter((item) => item.section === "Operations"),
      Analytics: SERVICE_PERMISSION_MAP.filter((item) => item.section === "Analytics"),
      Admin: SERVICE_PERMISSION_MAP.filter((item) => item.section === "Admin"),
    };
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const result = await createStaff({ name, role });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setLastCreatedPin(result.generatedPin || null);
      setLastCreatedName(name.trim());
      toast.success(`Employee added. PIN: ${result.generatedPin}`);
      setName("");
      setRoleState("staff");
    } finally {
      setIsCreating(false);
    }
  };

  const handleResetPermissions = async () => {
    try {
      setIsResettingPermissions(true);
      await resetRolePermissions();
      toast.success("Role permissions reset");
    } catch (e: any) {
      toast.error(e?.message || "Failed to reset permissions");
    } finally {
      setIsResettingPermissions(false);
    }
  };

  const handleSetRole = async (staffId: string, value: StaffRole) => {
    try {
      setPendingStaffAction((prev) => ({ ...prev, [staffId]: "role" }));
      await setRole(staffId, value);
      toast.success("Role updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update role");
    } finally {
      setPendingStaffAction((prev) => {
        const next = { ...prev };
        delete next[staffId];
        return next;
      });
    }
  };

  const handleToggleStaff = async (staffId: string) => {
    try {
      setPendingStaffAction((prev) => ({ ...prev, [staffId]: "toggle" }));
      await toggleStaffActive(staffId);
      toast.success("Staff status updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update staff status");
    } finally {
      setPendingStaffAction((prev) => {
        const next = { ...prev };
        delete next[staffId];
        return next;
      });
    }
  };

  const handleRemoveStaff = async (staffId: string) => {
    try {
      setPendingStaffAction((prev) => ({ ...prev, [staffId]: "remove" }));
      await removeStaff(staffId);
      toast.success("Staff removed");
    } catch (e: any) {
      toast.error(e?.message || "Failed to remove staff");
    } finally {
      setPendingStaffAction((prev) => {
        const next = { ...prev };
        delete next[staffId];
        return next;
      });
    }
  };

  const handleChangePin = async (staffId: string, currentPin?: string | null) => {
    const entered = window.prompt("Enter new PIN (4 digits)", currentPin || "");
    if (!entered) return;
    const pin = entered.trim();
    if (!/^\d{4}$/.test(pin)) {
      toast.error("PIN must be 4 digits");
      return;
    }
    const duplicateStaff = staffProfiles.find(
      (staff) => staff.id !== staffId && (staff.pinCode || "").trim() === pin
    );
    if (duplicateStaff) {
      const message = `PIN ${pin} is already assigned to ${duplicateStaff.name}. Please use a different PIN.`;
      toast.error(message);
      window.alert(message);
      return;
    }

    setPendingStaffAction((prev) => ({ ...prev, [staffId]: "pin" }));
    const loadingToastId = toast.loading("Updating PIN...");
    try {
      const result = await updateStaffPin(staffId, pin);
      if (!result.ok) {
        const message = result.message || "Failed to update PIN";
        toast.error(message);
        window.alert(message);
        return;
      }
      toast.success("PIN updated");
    } catch (e: any) {
      const message = e?.message || "Failed to update PIN";
      toast.error(message);
      window.alert(message);
    } finally {
      toast.dismiss(loadingToastId);
      setPendingStaffAction((prev) => {
        const next = { ...prev };
        delete next[staffId];
        return next;
      });
    }
  };

  const handleSetRolePermission = async (roleKey: StaffRole, permission: Permission, enabled: boolean) => {
    try {
      setPendingPermissionKey(`${roleKey}:${permission}`);
      await setRolePermission(roleKey, permission, enabled);
    } catch (e: any) {
      toast.error(e?.message || "Failed to update permission");
    } finally {
      setPendingPermissionKey(null);
    }
  };

  const copyPin = async (pin: string) => {
    try {
      await navigator.clipboard.writeText(pin);
      toast.success("PIN copied");
    } catch {
      toast.error("Unable to copy PIN");
    }
  };

  if (!can("staff.manage")) {
    return (
      <DashboardLayout>
        <div className="flex h-full min-h-[220px] items-center justify-center">
          <div className="w-full max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center">
            <h2 className="text-xl font-semibold text-red-200">Owner Access Required</h2>
            <p className="mt-2 text-sm text-red-100/80">
              Only owner role can manage employee onboarding and permissions.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout contentScroll="page">
      <div className="access-scope flex flex-col gap-4">
        <div className="gaming-panel shrink-0 rounded-xl border border-cyan-500/25 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="premium-heading">Employee Access Control</h1>
                <Sparkles className="h-4 w-4 text-emerald-400 sm:h-5 sm:w-5" />
              </div>
              <p className="premium-subtle mt-1">Onboard employees with auto-generated PIN and control service access by role.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/35 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
              <Shield className="h-3.5 w-3.5" />
              Active session: {activeStaff?.name || "Owner"} ({activeStaff?.role || "owner"})
            </div>
          </div>
        </div>

        <Tabs defaultValue="add-employee" className="flex flex-col">
          <TabsList className="gaming-panel h-auto w-full shrink-0 gap-1 overflow-x-auto rounded-xl border border-cyan-500/25 bg-slate-900/50 p-1 sm:w-fit">
            <TabsTrigger
              value="add-employee"
              className="rounded-lg px-4 py-2 text-xs font-semibold tracking-[0.06em] data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100"
            >
              Add Employee
            </TabsTrigger>
            <TabsTrigger
              value="service-mapping"
              className="rounded-lg px-4 py-2 text-xs font-semibold tracking-[0.06em] data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-100"
            >
              Role to Service Mapping
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="add-employee"
            className="mt-4 data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-col data-[state=active]:gap-4"
          >
            <div className="gaming-panel shrink-0 rounded-xl border border-cyan-500/25 p-4">
              <h2 className="dash-title !text-sm">Add Employee</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-5">
                <div className="space-y-1 md:col-span-3">
                  <Label htmlFor="staff-name">Employee Name</Label>
                  <Input
                    id="staff-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Akash"
                    disabled={isCreating}
                    className="border-slate-600/70 bg-slate-900/70"
                  />
                </div>
                <div className="space-y-1 md:col-span-1">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(value: StaffRole) => setRoleState(value)} disabled={isCreating}>
                    <SelectTrigger className="border-slate-600/70 bg-slate-900/70">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end md:col-span-1">
                  <Button className="w-full" onClick={() => void handleCreate()} disabled={!name.trim() || isCreating}>
                    {isCreating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <UserCog className="mr-2 h-4 w-4" />}
                    {isCreating ? "Adding..." : "Add"}
                  </Button>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/50 px-3 py-2 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-cyan-300" />
                  PIN is auto-generated in the background when an employee is created.
                </div>
              </div>

              {lastCreatedPin && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm">
                  <div className="text-emerald-200">
                    <span className="font-semibold">{lastCreatedName}</span> PIN: <span className="tracking-widest">{lastCreatedPin}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => copyPin(lastCreatedPin)}>
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    Copy PIN
                  </Button>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-cyan-500/25 bg-slate-900/40">
              <div className="hidden grid-cols-12 border-b border-cyan-500/20 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400 md:grid">
                <div className="col-span-4">Employee</div>
                <div className="col-span-2">Role</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">PIN</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>

              <div className="h-full overflow-y-auto">
                {staffProfiles.length === 0 ? (
                  <div className="px-3 py-6 text-sm text-slate-400">No employees added for this cafe yet.</div>
                ) : (
                  staffProfiles.map((staff) => (
                    <div key={staff.id} className="border-b border-slate-800/70 p-3 text-sm text-slate-200 md:px-3 md:py-2">
                      <div className="flex items-center gap-2 truncate font-medium md:hidden">
                        <Users className="h-4 w-4 shrink-0 text-cyan-300" />
                        <span className="truncate">{staff.name}</span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-3 md:mt-0 md:grid-cols-12 md:items-center">
                        <div className="hidden md:col-span-4 md:flex md:items-center md:gap-2 md:truncate md:font-medium">
                          <Users className="h-4 w-4 text-cyan-300" />
                          <span className="truncate">{staff.name}</span>
                        </div>

                        <div className="md:col-span-2">
                          <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-slate-400 md:hidden">Role</p>
                          <Select
                            value={staff.role}
                            onValueChange={(value: StaffRole) => void handleSetRole(staff.id, value)}
                            disabled={Boolean(pendingStaffAction[staff.id])}
                          >
                            <SelectTrigger className="h-8 border-slate-600/70 bg-slate-900/70">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="staff">Staff</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="md:col-span-2">
                          <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-slate-400 md:hidden">Status</p>
                          <Badge
                            className={staff.isActive ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-rose-400/30 bg-rose-500/10 text-rose-200"}
                          >
                            {staff.isActive ? "Active" : "Disabled"}
                          </Badge>
                        </div>

                        <div className="md:col-span-2">
                          <p className="mb-1 text-[11px] uppercase tracking-[0.08em] text-slate-400 md:hidden">PIN</p>
                          <div className="flex items-center gap-2 tracking-wider text-slate-200">
                            {staff.pinCode || "Not set"}
                            {staff.pinCode && (
                              <button
                                type="button"
                                className="text-slate-400 transition-colors hover:text-cyan-300"
                                onClick={() => copyPin(staff.pinCode as string)}
                                disabled={Boolean(pendingStaffAction[staff.id])}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="md:col-span-2">
                          {pendingStaffAction[staff.id] && (
                            <span className="mb-2 inline-block text-[11px] text-cyan-300">{STAFF_ACTION_LABELS[pendingStaffAction[staff.id]]}</span>
                          )}
                          <div className="grid grid-cols-2 gap-2 md:flex md:items-center md:justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleToggleStaff(staff.id)}
                              disabled={Boolean(pendingStaffAction[staff.id])}
                            >
                              {pendingStaffAction[staff.id] === "toggle" ? "Updating..." : staff.isActive ? "Disable" : "Enable"}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => void handleRemoveStaff(staff.id)}
                              disabled={Boolean(pendingStaffAction[staff.id])}
                            >
                              {pendingStaffAction[staff.id] === "remove" ? "Removing..." : "Remove"}
                            </Button>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => void handleChangePin(staff.id, staff.pinCode)}
                              disabled={Boolean(pendingStaffAction[staff.id])}
                              className="col-span-2 md:col-span-1"
                            >
                              {pendingStaffAction[staff.id] === "pin" ? (
                                <>
                                  <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                "Change PIN"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent
            value="service-mapping"
            className="mt-4 min-h-0 flex-1 overflow-hidden rounded-xl border border-cyan-500/25 bg-slate-900/40 data-[state=inactive]:hidden data-[state=active]:flex data-[state=active]:flex-col"
          >
            <div className="flex items-center justify-between border-b border-cyan-500/20 px-3 py-2">
              <h2 className="dash-title !text-sm">Role to Service Mapping</h2>
              <div className="flex items-center gap-3">
                {pendingPermissionKey && !isResettingPermissions && (
                  <span className="inline-flex items-center text-xs text-cyan-300">
                    <RefreshCw className="mr-1.5 h-3 w-3 animate-spin" />
                    Saving permission changes...
                  </span>
                )}
                <Button size="sm" variant="outline" onClick={() => void handleResetPermissions()} disabled={isResettingPermissions}>
                  <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isResettingPermissions ? "animate-spin" : ""}`} />
                  {isResettingPermissions ? "Resetting..." : "Reset Default"}
                </Button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {Object.entries(serviceSections).map(([section, items]) => (
                <div key={section} className="mb-4 rounded-lg border border-slate-700/80 bg-slate-950/50">
                  <div className="border-b border-slate-700 px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-cyan-300">
                    {section}
                  </div>

                  <div className="hidden grid-cols-12 border-b border-slate-700/60 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400 md:grid">
                    <div className="col-span-6">Service</div>
                    <div className="col-span-2 text-center">Owner</div>
                    <div className="col-span-2 text-center">Manager</div>
                    <div className="col-span-2 text-center">Staff</div>
                  </div>

                  {items.map((item) => (
                    <div key={`${item.permission}-${item.label}`} className="border-b border-slate-800/60 px-3 py-2 text-sm md:grid md:grid-cols-12 md:items-center">
                      <div className="text-slate-200 md:col-span-6">{item.label}</div>

                      <div className="mt-2 grid grid-cols-3 gap-2 md:col-span-6 md:mt-0 md:contents">
                        {ROLE_ORDER.map((roleKey) => {
                        const checked = rolePermissions[roleKey].includes(item.permission);
                        const isOwner = roleKey === "owner";

                        return (
                          <div key={`${item.permission}-${roleKey}`} className="flex flex-col items-center gap-1 md:col-span-2 md:flex-row md:justify-center">
                            <span className="text-[10px] uppercase tracking-[0.08em] text-slate-400 md:hidden">{roleKey}</span>
                            <Switch
                              checked={checked}
                              disabled={isOwner || isResettingPermissions || pendingPermissionKey !== null}
                              onCheckedChange={(enabled) => void handleSetRolePermission(roleKey, item.permission, enabled)}
                            />
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}

              <div className="rounded-lg border border-slate-700/80 bg-slate-950/40 px-3 py-2 text-xs text-slate-400">
                Owner toggles are locked by design. Manager and Staff permissions are editable per cafe.
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
