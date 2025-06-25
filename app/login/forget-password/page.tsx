"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Forget } from "@/app/components/forget-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Shield, Clock, RefreshCw, CheckCircle, Smartphone } from "lucide-react";

// Zod schema for form validation
const formSchema = z.object({
  name_2480735657: z.string().length(6, "OTP must be exactly 6 characters"),
});

export default function OTPVerification() {
  const [showForget, setShowForget] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const watchvalue = form.watch("name_2480735657");

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else {
      setCanResend(true);
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer]);

  const handleResend = async () => {
    setIsResending(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setTimer(60);
    setCanResend(false);
    setIsResending(false);
    toast.success("New OTP sent successfully!");
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      console.log(values);
      toast.success("OTP verified successfully!");
      setShowForget(true);
    } catch (error) {
      console.error("Form submission error", error);
      toast.error("Failed to verify OTP. Please try again.");
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-400/5 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />

      <div className="relative z-10 w-full max-w-md">
        {!showForget ? (
          <Card className="bg-white/5 backdrop-blur-md border border-white/10 shadow-2xl rounded-2xl">
            <CardHeader className="text-center pb-8">
              <div className="flex justify-center mb-6 relative">
                <Image
                  src="/whitehashlogo.png"
                  alt="Hash for Gamers"
                  width={100}
                  height={100}
                  className="drop-shadow-2xl z-10 relative"
                />
                <div className="absolute inset-0 bg-green-400/10 rounded-full blur-2xl animate-pulse z-0" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mb-2 tracking-tight">
                Verify Your Identity
              </CardTitle>
              <CardDescription className="text-slate-300 text-base">
                Enter the 6-digit code sent to your registered device
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 px-6 pb-6">
              <FormProvider {...form}>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-6"
                  >
                    {/* OTP Field */}
                    <FormField
                      control={form.control}
                      name="name_2480735657"
                      render={({ field }) => (
                        <FormItem className="space-y-4">
                          <FormLabel className="text-slate-200 font-medium flex items-center gap-2 justify-center">
                            <Smartphone className="w-4 h-4 text-green-400" />
                            One-Time Password
                          </FormLabel>
                          <FormControl>
                            <div className="flex justify-center">
                              <InputOTP maxLength={6} {...field} className="gap-2">
                                <InputOTPGroup className="gap-2">
                                  {[...Array(3)].map((_, i) => (
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
                                  {[...Array(3)].map((_, i) => (
                                    <InputOTPSlot
                                      key={i + 3}
                                      index={i + 3}
                                      className="w-12 h-12 text-lg font-bold bg-white/10 border border-white/20 text-white rounded-md focus:border-green-400 focus:ring-green-400/30 transition-all duration-200"
                                    />
                                  ))}
                                </InputOTPGroup>
                              </InputOTP>
                            </div>
                          </FormControl>
                          <FormDescription className="text-center text-slate-400">
                            Check your phone for the verification code
                          </FormDescription>
                          <FormMessage className="text-red-400 text-center" />
                        </FormItem>
                      )}
                    />

                    {/* Timer and Resend */}
                    <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Clock className="w-4 h-4 text-green-400" />
                          <span className="text-sm">
                            {timer > 0 ? (
                              <>
                                Code expires in{" "}
                                <span className="font-mono font-bold text-green-400">
                                  {formatTime(timer)}
                                </span>
                              </>
                            ) : (
                              "Code expired"
                            )}
                          </span>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResend}
                          disabled={!canResend || isResending}
                          className="text-green-400 hover:text-green-300 hover:bg-green-400/10 disabled:opacity-50 transition-all duration-200"
                        >
                          {isResending ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 mr-1" />
                              Resend
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      disabled={!watchvalue || watchvalue.length < 6}
                      className="w-full h-12 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {watchvalue?.length === 6 ? (
                        <>
                          <CheckCircle className="mr-2 h-5 w-5" />
                          Verify & Continue
                        </>
                      ) : (
                        <>
                          <Shield className="mr-2 h-5 w-5" />
                          Enter Complete Code
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </FormProvider>

              {/* Security Info */}
              <div className="flex items-center justify-center gap-4 pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <Shield className="w-3 h-3" />
                  <span>Secure Verification</span>
                </div>
                <div className="w-1 h-1 bg-slate-600 rounded-full" />
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <Clock className="w-3 h-3" />
                  <span>Auto-Expires</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Forget />
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-slate-500 text-sm">
            © 2024 Hash for Gamers. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
