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
import { Loader2, Shield, Gamepad2, Lock, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { LOGIN_URL } from "../../../src/config/env";
import { useTheme } from "next-themes";

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
  const lastAttemptRef = useRef(0);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function createDummyJWT(identity: {
    id: number;
    type: string;
    email: string;
  }) {
    const header = { alg: "HS256", typ: "JWT" };
    const payload = {
      ...identity,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
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
      localStorage.removeItem("jwtToken");
      localStorage.removeItem("tokenExpiration");
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

          const expirationMillis = Date.now() + 60 * 60 * 1000;
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
    <div className="premium-shell flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="relative z-10 w-full max-w-md">
        <Card className="premium-card rounded-2xl border shadow-2xl">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                {!mounted ? (
                  <Image
                    src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
                    alt="Hash for Gamers"
                    width={120}
                    height={120}
                    className="drop-shadow-2xl"
                  />
                ) : (
                  <Image
                    src={
                      resolvedTheme === "dark"
                        ? "/whitehashlogo.png"
                        : "/blackhashlogo.png"
                    }
                    alt="Hash for Gamers"
                    width={120}
                    height={120}
                    className="drop-shadow-2xl"
                  />
                )}
                <div className="absolute inset-0 rounded-full bg-emerald-400/20 blur-xl animate-pulse"></div>
              </div>
            </div>
            <CardTitle className="premium-heading mb-2 text-3xl font-bold tracking-tight text-foreground">
              Welcome Back
            </CardTitle>
            <CardDescription className="premium-subtle text-base">
              Sign in to manage your cafe, bookings, and live sessions.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
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
                      <FormLabel className="text-foreground font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4 text-green-400" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          type="email"
                          autoComplete="email"
                          className="bg-input border-input text-foreground placeholder:text-muted-foreground focus:border-green-400 focus:ring-green-400/20 h-12"
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
                        <FormLabel className="text-foreground font-medium flex items-center gap-2">
                          <Lock className="w-4 h-4 text-green-400" />
                          Password
                        </FormLabel>
                        <Link
                          href="/login/forget-password"
                          className="text-sm text-primary hover:text-primary/80 transition-colors duration-200 hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <PasswordInput
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          className="bg-input border-input text-foreground placeholder:text-muted-foreground focus:border-green-400 focus:ring-green-400/20 h-12"
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
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                    <p className="text-destructive text-sm text-center flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" />
                      {loginError}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 font-semibold text-primary-foreground shadow-lg transition-all duration-200 hover:from-emerald-600 hover:to-cyan-600 hover:shadow-emerald-500/20 active:scale-[0.98]"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <Gamepad2 className="mr-2 h-5 w-5" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Shield className="w-3 h-3" />
                <span>Secure Login</span>
              </div>
              <div className="w-1 h-1 bg-muted-foreground rounded-full"></div>
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Lock className="w-3 h-3" />
                <span>256-bit SSL</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="premium-subtle text-sm">
            © {new Date().getFullYear()} Hash for Gamers. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
