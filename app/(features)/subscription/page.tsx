"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscriptionApi } from "@/lib/api";
import {
  openRazorpay,
  createRazorpayOptions,
  RazorpayResponse,
} from "@/lib/razorpay";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Check,
  Loader2,
  Sparkles,
  Crown,
  Zap,
  ArrowLeft,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DashboardLayout } from "@/app/(layout)/dashboard-layout";

interface Package {
  id: number;
  code: string;
  name: string;
  pc_limit: number;
  price: number;
  original_price: number;
  is_free: boolean;
  description: string;
  features: any;
}

interface FailedPayment {
  paymentId: string;
  orderId: string;
  signature: string;
  packageCode: string;
  packageName: string;
  amount: number;
}

export default function SubscriptionPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [failedPayment, setFailedPayment] = useState<FailedPayment | null>(null);
  const [pollingOrderId, setPollingOrderId] = useState<string | null>(null);
  const [pollingPackage, setPollingPackage] = useState<{
    code: string;
    name: string;
    action: string;
  } | null>(null);

  const { vendorId, refreshStatus } = useSubscription();
  const router = useRouter();

  // Initial Logic: Check cafe selection
  useEffect(() => {
    const selectedCafe = localStorage.getItem("selectedCafe");
    if (!selectedCafe) {
      toast.error("Please select a cafe first");
      router.push("/select-cafe");
      return;
    }
    if (selectedCafe === "master") {
      toast.info("Master analytics doesn't require subscription");
      router.push("/master");
      return;
    }
  }, [router]);

  // Data Loading
  useEffect(() => {
    if (!vendorId) return;
    loadData();
  }, [vendorId]);

  // Payment Polling
  useEffect(() => {
    if (!pollingOrderId || !pollingPackage || !vendorId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/api/vendors/${vendorId}/subscription/check-payment/${pollingOrderId}`
        );
        const data = await response.json();

        if (data.paid && data.payment_id) {
          clearInterval(pollInterval);
          setPollingOrderId(null);
          toast.success("Payment detected! Activating...");

          const activateResponse = await subscriptionApi.verifyPayment(vendorId, {
            razorpay_order_id: pollingOrderId,
            razorpay_payment_id: data.payment_id,
            razorpay_signature: "polled_payment",
            package_code: pollingPackage.code,
            action: pollingPackage.action as "new" | "renew",
          });

          if (activateResponse.success) {
            toast.success("Subscription activated! 🎉");
            await refreshStatus();
            setTimeout(() => router.push("/dashboard"), 2000);
          }
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [pollingOrderId, pollingPackage, vendorId, refreshStatus, router]);

  async function loadData() {
    try {
      setLoading(true);
      const packagesResponse = await subscriptionApi.getPackages();
      setPackages(packagesResponse.packages || []);

      try {
        const subResponse = await subscriptionApi.getSubscription(vendorId!);
        if (subResponse.status !== "none") setCurrentSubscription(subResponse);
      } catch (e) {}
    } catch (error) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe(pkg: Package) {
    if (!vendorId) return;
    if (pkg.is_free || pkg.price === 0) {
      toast.info("Contact support for free activation");
      return;
    }

    setProcessing(pkg.code);
    try {
      const action = currentSubscription ? "renew" : "new";
      const orderResponse = await subscriptionApi.createOrder(vendorId, pkg.code, action);

      if (!orderResponse.success) throw new Error(orderResponse.error);

      setPollingOrderId(orderResponse.order_id);
      setPollingPackage({ code: pkg.code, name: pkg.name, action });

      const options = createRazorpayOptions(
        orderResponse.order_id,
        orderResponse.amount,
        pkg.name,
        orderResponse.key_id,
        async (response: RazorpayResponse) => {
          setPollingOrderId(null);
          await verifyAndActivate(response, pkg.code, pkg.name, orderResponse.amount, action);
        },
        () => setProcessing(null)
      );
      await openRazorpay(options);
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
      setProcessing(null);
    }
  }

  async function verifyAndActivate(
    res: RazorpayResponse,
    code: string,
    name: string,
    amt: number,
    act: "new" | "renew"
  ) {
    try {
      const verifyResponse = await subscriptionApi.verifyPayment(vendorId!, {
        ...res,
        package_code: code,
        action: act,
      });
      if (verifyResponse.success) {
        toast.success("Subscription activated! 🎉");
        await refreshStatus();
        setTimeout(() => router.push("/dashboard"), 2000);
      } else {
        throw new Error(verifyResponse.error);
      }
    } catch (error: any) {
      setFailedPayment({
        paymentId: res.razorpay_payment_id,
        orderId: res.razorpay_order_id,
        signature: res.razorpay_signature,
        packageCode: code,
        packageName: name,
        amount: amt,
      });
      toast.error("Verification failed. Please contact support.");
    } finally {
      setProcessing(null);
    }
  }

  if (loading) {
    return (
      // ✅ Show loader inside DashboardLayout so sidebar is visible even during load
      <DashboardLayout>
        <div className="min-h-full flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    // ✅ DashboardLayout wraps everything - sidebar will show correctly
    <DashboardLayout>
      {/*
        ✅ KEY FIX: No more fixed/absolute positioning that escapes layout.
        Use normal document flow with overflow-y-auto on the main content area.
        DashboardLayout's <main> already has overflow-y-auto so this just fills it.
      */}
      <div className="relative min-h-full w-full bg-background">

        {/* Navigation / Back button row */}
        <div className="max-w-7xl mx-auto px-4 pt-6 flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="gap-2 bg-card/50 hover:bg-card"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="rounded-full bg-card/50 shadow-md hover:bg-card"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 pb-20">

          {/* Header Section */}
          <div className="text-center space-y-4 py-6">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex justify-center mb-2"
            >
              <div className="p-3 bg-primary/10 rounded-2xl">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-foreground">
              Upgrade Your Cafe
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Choose the plan that fits your business scale.
            </p>
          </div>

          {/* Payment Polling Alert */}
          <AnimatePresence>
            {pollingOrderId && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Alert className="border-primary bg-primary/5 backdrop-blur-sm max-w-2xl mx-auto">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <AlertTitle className="text-primary">
                    Waiting for Payment Confirmation
                  </AlertTitle>
                  <AlertDescription>
                    We are automatically checking your payment status. Please don't refresh.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current Plan Indicator */}
          {currentSubscription && (
            <div className="max-w-2xl mx-auto bg-card/80 border border-primary/20 p-4 rounded-xl flex justify-between items-center backdrop-blur-sm">
              <div>
                <span className="text-xs font-bold uppercase text-primary">
                  Your Current Plan
                </span>
                <h3 className="text-lg font-bold">
                  {currentSubscription.package?.name}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">PC Limit</span>
                <p className="text-lg font-bold">
                  {currentSubscription.pc_limit} Units
                </p>
              </div>
            </div>
          )}

          {/* Packages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
            {packages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`h-full relative overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl bg-card/90 backdrop-blur-sm border-2 ${
                    pkg.code === currentSubscription?.package?.code
                      ? "border-primary shadow-primary/20"
                      : "border-border/50 hover:border-primary/50"
                  }`}
                >
                  {pkg.code === "grow" && (
                    <div className="absolute top-0 right-0 p-2">
                      <div className="bg-primary text-[10px] font-bold text-white px-2 py-0.5 rounded-bl-lg rounded-tr-sm flex items-center gap-1">
                        <Crown className="w-3 h-3" /> BEST VALUE
                      </div>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="text-xl">{pkg.name}</CardTitle>
                    <CardDescription className="min-h-[40px]">
                      {pkg.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex-1 space-y-6">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black text-foreground">
                          ₹{pkg.price}
                        </span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                      </div>
                      {pkg.original_price > pkg.price && (
                        <p className="text-xs text-muted-foreground line-through decoration-red-500">
                          Regular ₹{pkg.original_price}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <FeatureItem text={`Up to ${pkg.pc_limit} Devices`} />
                      <FeatureItem text="Live Booking View" />
                      <FeatureItem text="Revenue Analytics" />
                      <FeatureItem text="Smart Notifications" />
                    </div>

                    <Button
                      onClick={() => handleSubscribe(pkg)}
                      disabled={
                        processing !== null ||
                        pkg.code === currentSubscription?.package?.code
                      }
                      className="w-full mt-auto font-bold group"
                      variant={pkg.code === "grow" ? "default" : "secondary"}
                    >
                      {processing === pkg.code ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : pkg.code === currentSubscription?.package?.code ? (
                        "Active Plan"
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2 group-hover:fill-current" />
                          Subscribe
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <div className="mt-0.5 p-0.5 rounded-full bg-primary/20">
        <Check className="w-3 h-3 text-primary" />
      </div>
      <span className="text-foreground/80">{text}</span>
    </div>
  );
}
