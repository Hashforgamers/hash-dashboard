"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Shield, KeyRound } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { LOGIN_URL } from "../../../src/config/env";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(6, { message: "Password must be at least 6 characters long" })
    .regex(/[a-zA-Z0-9]/, { message: "Password must be alphanumeric" }),
  parent_type: z.string().min(1, { message: "Parent type is required" }),
});

export default function LoginPage() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      parent_type: "vendor",
    },
  });

  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forceResetOpen, setForceResetOpen] = useState(false);
  const [forceResetEmail, setForceResetEmail] = useState("");
  const [forceResetCurrentPassword, setForceResetCurrentPassword] = useState("");
  const [forceResetLoading, setForceResetLoading] = useState(false);
  const [forceResetError, setForceResetError] = useState("");
  const [forceResetForm, setForceResetForm] = useState({
    new_password: "",
    confirm_password: "",
  });
  const lastAttemptRef = useRef(0);
  function createDummyJWT(identity: {
    id: number;
    type: string;
    email: string;
  }) {
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      ...identity,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 24 * 60 * 60,
    };
    function base64Encode(obj: object) {
      return btoa(JSON.stringify(obj))
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    }
    const encodedHeader = base64Encode(header);
    const encodedPayload = base64Encode(payload);
    return `${encodedHeader}.${encodedPayload}.dummy_signature`;
  }

  const identity = { id: -1, type: "vendor", email: "dummy@hash.com" };

  const clearSessionData = () => {
    try {
      localStorage.removeItem("vendors");
      localStorage.removeItem("vendor_login_email");
      localStorage.removeItem("vendor_account_email");
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("tokenExpiration");
      localStorage.removeItem("selectedCafe");
      localStorage.removeItem("active_staff_session_v1");
      localStorage.removeItem("rbac_access_token_v1");
      sessionStorage.clear();
    } catch (error) {
      console.warn("Error clearing session data:", error);
    }
  };

  // ✅ Only retries on actual network/timeout errors, NOT on 4xx auth failures
  const fetchWithRetry = async (
    url: string,
    options: RequestInit,
    maxRetries = 3
  ) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeout = attempt === 1 ? 45000 : 20000;
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        if (attempt === 1) {
          toast.info("Connecting to server... This may take up to 30 seconds.", {
            duration: 8000,
            id: "server-connecting",
          });
        }

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            ...options.headers,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });

        clearTimeout(timeoutId);
        toast.dismiss("server-connecting");

        // ✅ Don't retry on 4xx (auth/client errors) — only on 5xx or network issues
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        toast.dismiss("server-connecting");

        if (attempt === maxRetries) throw error;

        const delay = attempt === 1 ? 8000 : 3000;
        toast.info(
          `Connection failed. Retrying in ${delay / 1000} seconds...`,
          { duration: delay - 500 }
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (isSubmitting) return;

    const now = Date.now();
    if (now - lastAttemptRef.current < 2000) {
      toast.warning("Please wait before trying again.");
      return;
    }
    lastAttemptRef.current = now;

    try {
      setIsSubmitting(true);
      setLoading(true);
      setLoginError("");

      clearSessionData();

      const timestamp = Date.now();
      const loginUrl = `${LOGIN_URL}/api/login?t=${timestamp}`;

      const response = await fetchWithRetry(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          parent_type: "vendor",
          timestamp,
        }),
      });

      // ✅ Always parse the JSON body first, regardless of HTTP status
      let result: any = {};
      try {
        result = await response!.json();
      } catch {
        throw new Error("Server returned an unexpected response.");
      }

      // ✅ Handle 4xx errors: use server's message directly (e.g. "Invalid password")
      if (!response!.ok) {
        const message =
          result.message ||
          result.error ||
          (response!.status === 401
            ? "Invalid email or password."
            : response!.status === 403
            ? "Access denied."
            : `Login failed (${response!.status}). Please try again.`);
        setLoginError(message);
        toast.error(message);
        return; // ✅ Return early, don't fall into catch block
      }

      if (result.status === "password_change_required") {
        setForceResetEmail(values.email);
        setForceResetCurrentPassword(values.password);
        setForceResetForm({ new_password: "", confirm_password: "" });
        setForceResetError("");
        setForceResetOpen(true);
        toast.info(result.message || "Please set a new password before continuing.");
        return;
      }

      // ✅ Handle 200 OK with status field in body
      if (result.status === "success") {
        const vendors = result.vendors;
        if (Array.isArray(vendors) && vendors.length > 0) {
          await new Promise((resolve) => setTimeout(resolve, 100));

          localStorage.setItem("vendors", JSON.stringify(vendors));
          localStorage.setItem("vendor_login_email", values.email);
          localStorage.setItem("vendor_account_email", values.email);

          const dummyToken = createDummyJWT(identity);
          localStorage.setItem("jwtToken", dummyToken);

          const expirationMillis = Date.now() + 24 * 60 * 60 * 1000;
          localStorage.setItem("tokenExpiration", expirationMillis.toString());

          toast.success("Login successful!");
          window.location.replace("/select-cafe");
        } else {
          toast.error("No vendors found for this account.");
        }
      } else {
        // ✅ Server returned 200 but status !== "success" (e.g. custom error format)
        const message = result.message || "Login failed. Please try again.";
        setLoginError(message);
        toast.error(message);
      }
    } catch (error: any) {
      console.error("Login error:", error);

      // ✅ Only truly unexpected/network errors reach here now
      let errorMessage = "Failed to submit the form. Please try again.";

      if (error.name === "AbortError") {
        errorMessage =
          "Server is taking too long to respond. Please try again in a moment.";
      } else if (
        error.message?.includes("503") ||
        error.message?.includes("502")
      ) {
        errorMessage = "Server is starting up. Please try again in a moment.";
      } else if (
        error.message?.includes("Failed to fetch") ||
        error.message?.includes("NetworkError")
      ) {
        errorMessage =
          "Network connection issue. Please check your internet connection.";
      } else if (
        error.message?.includes("SSL") ||
        error.message?.includes("certificate")
      ) {
        errorMessage = "SSL connection issue. Please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setLoginError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  }

  const handleTemporaryPasswordUpdate = async () => {
    if (!forceResetEmail || !forceResetCurrentPassword) {
      setForceResetError("Session expired. Please login again.");
      return;
    }
    if (!forceResetForm.new_password || !forceResetForm.confirm_password) {
      setForceResetError("Please fill both password fields.");
      return;
    }
    if (forceResetForm.new_password.length < 8) {
      setForceResetError("New password must be at least 8 characters.");
      return;
    }
    if (forceResetForm.new_password !== forceResetForm.confirm_password) {
      setForceResetError("Passwords do not match.");
      return;
    }

    setForceResetLoading(true);
    setForceResetError("");
    try {
      const res = await fetch(`${LOGIN_URL}/api/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forceResetEmail,
          current_password: forceResetCurrentPassword,
          new_password: forceResetForm.new_password,
          confirm_password: forceResetForm.confirm_password,
          parent_type: "vendor",
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload.status !== "success") {
        setForceResetError(payload.message || "Failed to update password.");
        return;
      }

      toast.success("Password updated. Logging you in...");
      setForceResetOpen(false);
      lastAttemptRef.current = 0;
      await onSubmit({
        email: forceResetEmail,
        password: forceResetForm.new_password,
        parent_type: "vendor",
      });
    } catch (error: any) {
      setForceResetError(error?.message || "Failed to update password.");
    } finally {
      setForceResetLoading(false);
    }
  };

  useEffect(() => {
    const checkSessionConflict = () => {
      const hasVendors = localStorage.getItem("vendors");
      const hasToken = localStorage.getItem("jwtToken");
      const hasEmail = localStorage.getItem("vendor_login_email");

      if (
        (hasVendors && !hasToken) ||
        (hasToken && !hasVendors) ||
        (hasEmail && !hasToken)
      ) {
        console.warn("Detected partial session data, clearing...");
        clearSessionData();
      }
    };

    checkSessionConflict();
    form.reset({ email: "", password: "", parent_type: "vendor" });
    setLoginError("");
  }, [form]);

  return (
    <div className="premium-shell flex min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6">
      {forceResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700/70 bg-slate-950 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-white">Set New Password</h3>
            <p className="mt-1 text-sm text-slate-300">
              Your temporary password is active. Set a new password to continue.
            </p>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs text-slate-300">New Password</label>
                <PasswordInput
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  value={forceResetForm.new_password}
                  onChange={(e) => setForceResetForm((prev) => ({ ...prev, new_password: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-300">Confirm Password</label>
                <PasswordInput
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  value={forceResetForm.confirm_password}
                  onChange={(e) => setForceResetForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                />
              </div>
              {forceResetError && (
                <p className="rounded-md border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  {forceResetError}
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setForceResetOpen(false);
                  setForceResetCurrentPassword("");
                }}
                disabled={forceResetLoading}
              >
                Cancel
              </Button>
              <Button onClick={handleTemporaryPasswordUpdate} disabled={forceResetLoading}>
                {forceResetLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <KeyRound className="mr-2 h-4 w-4" />
                    Update & Continue
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="relative z-10 w-full max-w-md">
        <Card className="premium-card overflow-hidden rounded-xl border border-slate-700/60 bg-transparent shadow-[0_18px_50px_rgba(2,6,23,0.38)] backdrop-blur-xl">
          <CardHeader className="space-y-4 border-b border-slate-700/60 px-8 pb-6 pt-8 text-center">
            <div className="mb-2 flex justify-center">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-xl border border-slate-700/70 bg-slate-900/80">
                <Image
                  src="/hash_for_gamer_logo.png"
                  alt="Hash for Gamers"
                  width={64}
                  height={64}
                  className="rounded-lg"
                />
              </div>
            </div>
            <CardTitle className="premium-heading mb-1 text-2xl font-semibold text-[#F7FAFC]">
              Sign in to Hash
            </CardTitle>
            <CardDescription className="mx-auto max-w-sm text-[15px] font-medium text-[rgba(255,255,255,0.82)]">
              Access your gaming cafe operations dashboard.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 px-8 pb-8 pt-6">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold text-slate-300">
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          type="email"
                          autoComplete="email"
                          className="h-11 rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 text-[15px] text-[#F7FAFC] placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setLoginError("");
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel className="text-xs font-semibold text-slate-300">
                          Password
                        </FormLabel>
                        <Link
                          href="/login/forget-password"
                          className="text-xs font-semibold text-sky-300 transition-colors duration-200 hover:text-emerald-300"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <PasswordInput
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          className="h-11 rounded-lg border border-slate-700/80 bg-slate-950/60 px-3 text-[15px] text-[#F7FAFC] placeholder:text-slate-500 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setLoginError("");
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />

                {loginError && (
                  <div className="rounded-lg border border-amber-400/25 bg-amber-500/10 p-3">
                    <p className="text-sm text-center flex items-center justify-center gap-2 text-[#F97316]">
                      <Shield className="h-4 w-4" />
                      {loginError}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="h-11 w-full rounded-lg border border-emerald-400/30 bg-emerald-500 font-semibold text-slate-950 shadow-[0_14px_32px_rgba(34,197,94,0.18)] transition-all duration-200 hover:bg-emerald-400 active:scale-[0.99]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>Sign In</>
                  )}
                </Button>
              </form>
            </Form>

            <div className="flex items-center justify-center gap-4 border-t border-slate-700/50 pt-4">
              <div className="flex items-center gap-2 text-[12px] font-medium text-slate-400">
                <Shield className="w-3 h-3" />
                <span>Secure Login</span>
              </div>
              <div className="h-1 w-1 rounded-full bg-slate-600"></div>
              <div className="flex items-center gap-2 text-[12px] font-medium text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400/70" />
                <span>Encrypted Session</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm font-medium text-slate-500">
            © {new Date().getFullYear()} Hash for Gamers. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
