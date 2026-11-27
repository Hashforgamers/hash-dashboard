"use client";

import { clearAuthSession } from "@/lib/auth-session";
import { endCafeStaffSession } from "@/lib/cafe-api";

/** Ends the staff session, clears auth and returns to the login screen. */
export async function logoutStaff() {
  await endCafeStaffSession();
  clearAuthSession();
  window.location.href = "/login"; // Redirect after logout
}
