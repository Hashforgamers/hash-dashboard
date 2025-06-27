"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { LOGIN_URL } from "@/src/config/env";

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

  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      setLoading(true);
      setLoginError("");

      const response = await fetch(`${LOGIN_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          parent_type: "vendor",
        }),
      });

      const result = await response.json();

      if (response.ok && result.status === "success") {
        const vendors = result.vendors;
        if (Array.isArray(vendors) && vendors.length > 0) {
          localStorage.setItem("vendors", JSON.stringify(vendors));
          // set dummy jwt we will override it in further page 
          toast.success("Login successful!");
          window.location.href = "/select-cafe";
        } else {
          toast.error("No vendors found for this account.");
          return;
        }
      } else {
        const message = result.message || "Login failed";
        setLoginError(message);
        toast.error(message);
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginError("Failed to submit the form. Please try again.");
      toast.error("Failed to submit the form. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center p-4 relative overflow-hidden">
      {/* Optional animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-400/5 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Optional grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none"></div>

      <div className="relative z-10 w-full max-w-md">
        <Card className="bg-transparent border border-slate-700/50 shadow-2xl">
          {/* Frosted glass alternative: bg-white/5 backdrop-blur-md */}
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <Image
                  src="/whitehashlogo.png"
                  alt="Hash for Gamers"
                  width={120}
                  height={120}
                  className="drop-shadow-2xl"
                />
                <div className="absolute inset-0 bg-green-400/20 rounded-full blur-xl animate-pulse"></div>
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-white mb-2 tracking-tight">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-slate-400 text-base">
              Sign in to your gaming account and level up your experience
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-200 font-medium flex items-center gap-2">
                        <Mail className="w-4 h-4 text-green-400" />
                        Email Address
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          type="email"
                          autoComplete="email"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-400 focus:ring-green-400/20 h-12"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setLoginError("");
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center">
                        <FormLabel className="text-slate-200 font-medium flex items-center gap-2">
                          <Lock className="w-4 h-4 text-green-400" />
                          Password
                        </FormLabel>
                        <Link
                          href="/login/forget-password"
                          className="hidden text-sm text-green-400 hover:text-green-300 transition-colors duration-200 hover:underline"
                        >
                          Forgot password?
                        </Link>
                      </div>
                      <FormControl>
                        <PasswordInput
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-green-400 focus:ring-green-400/20 h-12"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            setLoginError("");
                          }}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400" />
                    </FormItem>
                  )}
                />

                {loginError && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                    <p className="text-red-400 text-sm text-center flex items-center justify-center gap-2">
                      <Shield className="w-4 h-4" />
                      {loginError}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-green-500/25"
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

            {/* Trust indicators */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Shield className="w-3 h-3" />
                <span>Secure Login</span>
              </div>
              <div className="w-1 h-1 bg-slate-600 rounded-full"></div>
              <div className="flex items-center gap-2 text-slate-500 text-xs">
                <Lock className="w-3 h-3" />
                <span>256-bit SSL</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            © 2024 Hash for Gamers. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}