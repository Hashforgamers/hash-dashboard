"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { LOGIN_URL } from "../../src/config/env";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastAttemptRef = useRef(0);

  function createDummyJWT(identity: { id: number; type: string; email: string }) {
    const header = {
      alg: "HS256",
      typ: "JWT",
    };

    const payload = {
      ...identity,
      iat: Math.floor(Date.now() / 1000), // issued at (seconds)
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // expires in 1 hour (seconds)
    };

    function base64Encode(obj: object) {
      return btoa(JSON.stringify(obj))
        .replace(/=/g, "") // remove '=' padding
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
    }

    const encodedHeader = base64Encode(header);
    const encodedPayload = base64Encode(payload);
    const signature = "dummy_signature"; // fake signature

    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  const identity = {
    id: -1,
    type: "vendor",
    email: "dummy@hash.com",
  };
  
      // Complete session cleanup function
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

   // Enhanced fetch with retry logic for Render.com
    const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3) => {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const controller = new AbortController();
        const timeout = attempt === 1 ? 45000 : 20000; // Longer timeout for first attempt
        const timeoutId = setTimeout(() => controller.abort(), timeout);
  
        try {
          if (attempt === 1) {
            toast.info("Connecting to server... This may take up to 30 seconds.", { 
              duration: 8000,
              id: "server-connecting"
            });
          }
  
          const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
              ...options.headers,
              "Cache-Control": "no-cache, no-store, must-revalidate",
              "Pragma": "no-cache",
              "Expires": "0",
            },
          });
  
          clearTimeout(timeoutId);
          toast.dismiss("server-connecting");
          
          return response;
        } catch (error) {
          clearTimeout(timeoutId);
          toast.dismiss("server-connecting");
          
          if (attempt === maxRetries) throw error;
          
          const delay = attempt === 1 ? 8000 : 3000;
          toast.info(`Connection failed. Retrying in ${delay/1000} seconds...`, { 
            duration: delay - 500 
          });
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };
   
      async function onSubmit(values: z.infer<typeof formSchema>) {
        // Prevent double submissions
        if (isSubmitting) return;
        
        // Rate limiting - prevent rapid submissions
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
    
          // Clear any existing session data first
          clearSessionData();
    
          // Add cache-busting timestamp
          const timestamp = Date.now();
          const loginUrl = `${LOGIN_URL}/api/login?t=${timestamp}`;
    
          const response = await fetchWithRetry(loginUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json",
            },
            body: JSON.stringify({
              email: values.email,
              password: values.password,
              parent_type: "vendor",
              timestamp: timestamp, // Additional cache busting
            }),
          });
    
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
          }
    
          const result = await response.json();
    
          if (result.status === "success") {
            const vendors = result.vendors;
            if (Array.isArray(vendors) && vendors.length > 0) {
              // Small delay to ensure cleanup is complete
              await new Promise(resolve => setTimeout(resolve, 100));
              
              // Store session data
              localStorage.setItem("vendors", JSON.stringify(vendors));
              localStorage.setItem("vendor_login_email", values.email);
    
              const dummyToken = createDummyJWT(identity);
              localStorage.setItem("jwtToken", dummyToken);
    
              const expirationMillis = Date.now() + 60 * 60 * 1000;
              localStorage.setItem("tokenExpiration", expirationMillis.toString());
    
              toast.success("Login successful!");
              
              // Use replace to avoid back button issues
              window.location.replace("/select-cafe");
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
          
          let errorMessage = "Failed to submit the form. Please try again.";
          
          if (error.name === 'AbortError') {
            errorMessage = "Server is taking too long to respond. Please try again in a moment.";
          } else if (error.message.includes('503') || error.message.includes('502')) {
            errorMessage = "Server is starting up. Please try again in a moment.";
          } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = "Network connection issue. Please check your internet connection.";
          } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
            errorMessage = "SSL connection issue. Please try again.";
          }
          
          setLoginError(errorMessage);
          toast.error(errorMessage);
        } finally {
          setLoading(false);
          setIsSubmitting(false);
        }
      }
        
        // Check for session conflicts on component mount
        useEffect(() => {
          const checkSessionConflict = () => {
            const hasVendors = localStorage.getItem("vendors");
            const hasToken = localStorage.getItem("jwtToken");
            const hasEmail = localStorage.getItem("vendor_login_email");
            
            // If partial session data exists, clear it all
            if ((hasVendors && !hasToken) || (hasToken && !hasVendors) || (hasEmail && !hasToken)) {
              console.warn("Detected partial session data, clearing...");
              clearSessionData();
            }
          };
      
          checkSessionConflict();
          
          // Reset form completely
          form.reset({
            email: "",
            password: "",
            parent_type: "vendor",
          });
          setLoginError("");
        }, [form]);

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