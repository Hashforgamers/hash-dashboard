"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Forget } from "@/app/components/forget-form";

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

// Zod schema for form validation
const formSchema = z.object({
  name_2480735657: z.string().length(6, "OTP must be exactly 6 characters"),
});

export default function MyForm() {
  const [showForget, setShowForget] = useState(false);
  const [timer, setTimer] = useState(60); // Timer set to 60 seconds
  const [canResend, setCanResend] = useState(false); // Resend link state

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  const watchvalue = form.watch("name_2480735657");

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null; // Ensure interval is initialized to null

    if (timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else {
      setCanResend(true); // Enable the Resend link when the timer ends
      if (interval) clearInterval(interval); // Clear interval when timer ends
    }

    return () => {
      if (interval) clearInterval(interval); // Cleanup on component unmount
    };
  }, [timer]);

  const handleResend = () => {
    setTimer(60); // Reset the timer to 60 seconds
    setCanResend(false); // Disable the Resend link
    toast.success("OTP resent successfully!");
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      console.log(values);
      toast(
        <pre className="mt-2 w-[340px] rounded-md bg-accent p-4">
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      );
      setShowForget(true);
    } catch (error) {
      console.error("Form submission error", error);
      toast.error("Failed to submit the form. Please try again.");
    }
  }

  return (
    <div className="flex justify-center items-center min-h-screen w-full px-4">
      {!showForget ? (
        <div className="max-w-sm w-full p-6 border border-gray-300 rounded-lg shadow-lg">
          <FormProvider {...form}>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-8"
              >
                {/* OTP Input Field */}
                <FormField
                  control={form.control}
                  name="name_2480735657"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white font-medium">
                        One-Time Password
                      </FormLabel>
                      <FormControl>
                        <InputOTP maxLength={6} {...field}>
                          <InputOTPGroup>
                            <InputOTPSlot index={0} />
                            <InputOTPSlot index={1} />
                            <InputOTPSlot index={2} />
                          </InputOTPGroup>
                          <InputOTPSeparator />
                          <InputOTPGroup>
                            <InputOTPSlot index={3} />
                            <InputOTPSlot index={4} />
                            <InputOTPSlot index={5} />
                          </InputOTPGroup>
                        </InputOTP>
                      </FormControl>
                      <FormDescription className="text-sm text-white">
                        Please enter the one-time password sent to your phone
                        number.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                
                <div className="flex justify-between items-center">
                  <p className="text-sm text-white cursor-pointer">
                    {timer > 0
                      ? `Resend OTP in ${timer}s`
                      : "Didn't receive the OTP?"}
                  </p>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (canResend) handleResend();
                    }}
                    className={`text-blue-500 font-medium ${
                      canResend ? "hover:underline" : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    Resend OTP
                  </a>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!watchvalue || watchvalue.length < 6}
                  className="w-full bg-white text-black font-medium py-2 rounded-lg disabled:opacity-50"
                >
                  Continue
                </Button>
              </form>
            </Form>
          </FormProvider>
        </div>
      ) : (
        // Forget Component
        <Forget />
      )}
    </div>
  );
}
