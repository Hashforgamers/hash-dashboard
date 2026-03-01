"use client";

import { useState, useEffect, useRef } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import {
  InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  Mail, Shield, Clock, RefreshCw, CheckCircle,
  ArrowLeft, Lock, KeyRound, Loader2,
} from "lucide-react";
import { LOGIN_URL } from "../../../../src/config/env";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().email({ message: "Enter a valid email address" }),
});

const otpSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be exactly 6 digits" }),
});

const passwordSchema = z
  .object({
    new_password: z
      .string()
      .min(8, { message: "Password must be at least 8 characters" }),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

// ─── Step indicator ───────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: number }) {
  const steps = ["Email", "Verify OTP", "New Password"];
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                i + 1 < step
                  ? "bg-green-500 text-white"
                  : i + 1 === step
                  ? "bg-green-500 text-white ring-4 ring-green-500/30"
                  : "bg-white/10 text-slate-400"
              }`}
            >
              {i + 1 < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-xs hidden sm:block ${
                i + 1 === step ? "text-green-400" : "text-slate-500"
              }`}
            >
              {label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-8 h-0.5 mb-4 transition-all duration-300 ${
                i + 1 < step ? "bg-green-500" : "bg-white/10"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // ── OTP countdown timer (only active on step 2) ──────────────────────────
  useEffect(() => {
    if (step !== 2) return;
    if (timer <= 0) { setCanResend(true); return; }
    const interval = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timer, step]);

  const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  // ── Forms ────────────────────────────────────────────────────────────────
  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<z.infer<typeof otpSchema>>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { new_password: "", confirm_password: "" },
  });

  const otpValue = otpForm.watch("otp");

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Send OTP
  // POST /api/forgot-password
  // ─────────────────────────────────────────────────────────────────────────
  async function onEmailSubmit(values: z.infer<typeof emailSchema>) {
    setLoading(true);
    try {
      const res = await fetch(`${ LOGIN_URL }/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      const data = await res.json();

      if (data.status === "success") {
        setEmail(values.email);
        setStep(2);
        setTimer(60);
        setCanResend(false);
        toast.success("Reset code sent! Check your email.");
      } else {
        toast.error(data.message || "Something went wrong.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Verify OTP
  // POST /api/verify-reset-code
  // ─────────────────────────────────────────────────────────────────────────
  async function onOtpSubmit(values: z.infer<typeof otpSchema>) {
    setLoading(true);
    try {
      const res = await fetch(`${LOGIN_URL}/api/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: values.otp }),
      });
      const data = await res.json();

      if (data.status === "success") {
        setOtpCode(values.otp);
        setStep(3);
        toast.success("OTP verified! Set your new password.");
      } else {
        toast.error(data.message || "Invalid or expired code.");
        otpForm.setError("otp", { message: data.message || "Invalid or expired code." });
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Resend OTP (calls step 1 API again)
  // ─────────────────────────────────────────────────────────────────────────
  async function handleResend() {
    setIsResending(true);
    try {
      const res = await fetch(`${LOGIN_URL}/api/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setTimer(60);
        setCanResend(false);
        otpForm.reset();
        toast.success("New OTP sent successfully!");
      } else {
        toast.error(data.message || "Failed to resend OTP.");
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setIsResending(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3 — Reset Password
  // POST /api/reset-password
  // ─────────────────────────────────────────────────────────────────────────
  async function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    setLoading(true);
    try {
      const res = await fetch(`${LOGIN_URL}/api/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code: otpCode,
          new_password: values.new_password,
          confirm_password: values.confirm_password,
        }),
      });
      const data = await res.json();

      if (data.status === "success") {
        toast.success("Password reset successfully! Please login.");
        // Redirect to login after short delay
        setTimeout(() => (window.location.href = "/login"), 1500);
      } else {
        toast.error(data.message || "Failed to reset password.");
        passwordForm.setError("confirm_password", {
          message: data.message || "Failed to reset password.",
        });
      }
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Shared background + layout
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-400/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl">
          <CardHeader className="text-center pb-4">
            {/* Logo */}
            <div className="flex justify-center mb-4 relative">
              {!mounted ? (
                <div className="w-[80px] h-[80px]" />
              ) : (
                <Image
                  src="/whitehashlogo.png"
                  alt="Hash for Gamers"
                  width={80}
                  height={80}
                  className="drop-shadow-2xl z-10 relative"
                />
              )}
              <div className="absolute inset-0 bg-green-400/10 rounded-full blur-2xl animate-pulse z-0" />
            </div>

            {/* Step indicator */}
            <StepIndicator step={step} />

            <CardTitle className="text-2xl font-bold text-white mb-1 tracking-tight">
              {step === 1 && "Forgot Password"}
              {step === 2 && "Verify OTP"}
              {step === 3 && "Reset Password"}
            </CardTitle>
            <CardDescription className="text-slate-400 text-sm">
              {step === 1 && "Enter your registered email to receive a reset code"}
              {step === 2 && (
                <>
                  Code sent to{" "}
                  <span className="text-green-400 font-medium">{email}</span>
                </>
              )}
              {step === 3 && "Choose a strong new password for your account"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 px-6 pb-6">

            {/* ── STEP 1: Email ──────────────────────────────────────────── */}
            {step === 1 && (
              <Form {...emailForm}>
                <form
                  onSubmit={emailForm.handleSubmit(onEmailSubmit)}
                  className="space-y-5"
                >
                  <FormField
                    control={emailForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200 font-medium flex items-center gap-2">
                          <Mail className="w-4 h-4 text-green-400" />
                          Email Address
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your registered email"
                            type="email"
                            autoComplete="email"
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-green-400 focus:ring-green-400/20 h-12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-green-500/25"
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending Code...</>
                    ) : (
                      <><Mail className="mr-2 h-5 w-5" /> Send Reset Code</>
                    )}
                  </Button>

                  <div className="text-center">
                    <Link
                      href="/login"
                      className="text-slate-400 hover:text-slate-200 text-sm flex items-center justify-center gap-1 transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Back to Login
                    </Link>
                  </div>
                </form>
              </Form>
            )}

            {/* ── STEP 2: OTP ───────────────────────────────────────────── */}
            {step === 2 && (
              <Form {...otpForm}>
                <form
                  onSubmit={otpForm.handleSubmit(onOtpSubmit)}
                  className="space-y-5"
                >
                  <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                      <FormItem className="space-y-4">
                        <FormLabel className="text-slate-200 font-medium flex items-center gap-2 justify-center">
                          <KeyRound className="w-4 h-4 text-green-400" />
                          6-Digit Reset Code
                        </FormLabel>
                        <FormControl>
                          <div className="flex justify-center">
                            <InputOTP maxLength={6} {...field}>
                              <InputOTPGroup className="gap-2">
                                {[0, 1, 2].map((i) => (
                                  <InputOTPSlot
                                    key={i}
                                    index={i}
                                    className="w-12 h-12 text-lg font-bold bg-white/10 border border-white/20 text-white rounded-md focus:border-green-400 focus:ring-green-400/30 transition-all duration-200"
                                  />
                                ))}
                              </InputOTPGroup>
                              <InputOTPSeparator className="text-slate-500">
                                <div className="w-2 h-0.5 bg-slate-500 rounded-full" />
                              </InputOTPSeparator>
                              <InputOTPGroup className="gap-2">
                                {[3, 4, 5].map((i) => (
                                  <InputOTPSlot
                                    key={i}
                                    index={i}
                                    className="w-12 h-12 text-lg font-bold bg-white/10 border border-white/20 text-white rounded-md focus:border-green-400 focus:ring-green-400/30 transition-all duration-200"
                                  />
                                ))}
                              </InputOTPGroup>
                            </InputOTP>
                          </div>
                        </FormControl>
                        <FormMessage className="text-red-400 text-center" />
                      </FormItem>
                    )}
                  />

                  {/* Timer + Resend */}
                  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Clock className="w-4 h-4 text-green-400" />
                        <span className="text-sm">
                          {timer > 0 ? (
                            <>
                              Expires in{" "}
                              <span className="font-mono font-bold text-green-400">
                                {formatTime(timer)}
                              </span>
                            </>
                          ) : (
                            <span className="text-red-400">Code expired</span>
                          )}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleResend}
                        disabled={!canResend || isResending}
                        className="text-green-400 hover:text-green-300 hover:bg-green-400/10 disabled:opacity-40 transition-all"
                      >
                        {isResending ? (
                          <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Sending...</>
                        ) : (
                          <><RefreshCw className="w-4 h-4 mr-1" /> Resend</>
                        )}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading || !otpValue || otpValue.length < 6}
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-50"
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</>
                    ) : otpValue?.length === 6 ? (
                      <><CheckCircle className="mr-2 h-5 w-5" /> Verify & Continue</>
                    ) : (
                      <><Shield className="mr-2 h-5 w-5" /> Enter Complete Code</>
                    )}
                  </Button>

                  <button
                    type="button"
                    onClick={() => { setStep(1); otpForm.reset(); }}
                    className="w-full text-slate-400 hover:text-slate-200 text-sm flex items-center justify-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" /> Change Email
                  </button>
                </form>
              </Form>
            )}

            {/* ── STEP 3: New Password ───────────────────────────────────── */}
            {step === 3 && (
              <Form {...passwordForm}>
                <form
                  onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                  className="space-y-5"
                >
                  <FormField
                    control={passwordForm.control}
                    name="new_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200 font-medium flex items-center gap-2">
                          <Lock className="w-4 h-4 text-green-400" />
                          New Password
                        </FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Enter new password (min 8 chars)"
                            autoComplete="new-password"
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-green-400 focus:ring-green-400/20 h-12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={passwordForm.control}
                    name="confirm_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-slate-200 font-medium flex items-center gap-2">
                          <Lock className="w-4 h-4 text-green-400" />
                          Confirm Password
                        </FormLabel>
                        <FormControl>
                          <PasswordInput
                            placeholder="Re-enter your new password"
                            autoComplete="new-password"
                            className="bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus:border-green-400 focus:ring-green-400/20 h-12"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage className="text-red-400" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-green-500/25"
                  >
                    {loading ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Resetting Password...</>
                    ) : (
                      <><CheckCircle className="mr-2 h-5 w-5" /> Reset Password</>
                    )}
                  </Button>
                </form>
              </Form>
            )}

            {/* Footer security badges */}
            <div className="flex items-center justify-center gap-4 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1 text-slate-500 text-xs">
                <Shield className="w-3 h-3" />
                <span>Secure</span>
              </div>
              <div className="w-1 h-1 bg-slate-600 rounded-full" />
              <div className="flex items-center gap-1 text-slate-500 text-xs">
                <Clock className="w-3 h-3" />
                <span>OTP expires in 10 min</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <p className="text-slate-500 text-sm">
            © 2024 Hash for Gamers. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
