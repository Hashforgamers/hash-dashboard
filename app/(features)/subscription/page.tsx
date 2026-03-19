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
  features: {
    plan_features?: string[];
    quarterly_price_inr?: number;
    yearly_price_inr?: number;
    onboarding_offer?: string;
    [key: string]: any;
  };
}

interface FailedPayment {
  paymentId: string;
  orderId: string;
  signature: string;
  packageCode: string;
  packageName: string;
  amount: number;
  billingCycle: BillingCycle;
}

type BillingCycle = "monthly" | "quarterly" | "yearly";

const CYCLE_LABEL: Record<BillingCycle, string> = {
  monthly: "/mo",
  quarterly: "/qtr",
  yearly: "/yr",
};

function getCyclePrice(pkg: Package, cycle: BillingCycle, pricingDevMode: boolean): number {
  if (pricingDevMode) return Number(pkg.price || 0);
  if (cycle === "quarterly") {
    return Number(pkg.features?.quarterly_price_inr || Number(pkg.price || 0) * 3 || 0);
  }
  if (cycle === "yearly") {
    return Number(pkg.features?.yearly_price_inr || Number(pkg.price || 0) * 12 || 0);
  }
  return Number(pkg.price || 0);
}

export default function SubscriptionPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [pricingDevMode, setPricingDevMode] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>("monthly");
  const [processing, setProcessing] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [failedPayment, setFailedPayment] = useState<FailedPayment | null>(null);
  const [pollingOrderId, setPollingOrderId] = useState<string | null>(null);
  const [pollingPackage, setPollingPackage] = useState<{
    code: string;
    name: string;
    action: string;
    billingCycle: BillingCycle;
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
            billing_cycle: pollingPackage.billingCycle,
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
      setPricingDevMode(Boolean((packagesResponse as any).dev_mode));

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
    const selectedPrice = getCyclePrice(pkg, selectedCycle, pricingDevMode);
    if (selectedPrice <= 0) {
      toast.info("Contact support for free activation");
      return;
    }

    setProcessing(pkg.code);
    try {
      const action = currentSubscription ? "renew" : "new";
      const orderResponse = await subscriptionApi.createOrder(vendorId, pkg.code, action, selectedCycle);

      if (!orderResponse.success) throw new Error(orderResponse.error);

      setPollingOrderId(orderResponse.order_id);
      setPollingPackage({ code: pkg.code, name: pkg.name, action, billingCycle: selectedCycle });

      const options = createRazorpayOptions(
        orderResponse.order_id,
        orderResponse.amount,
        pkg.name,
        orderResponse.key_id,
        async (response: RazorpayResponse) => {
          setPollingOrderId(null);
          await verifyAndActivate(response, pkg.code, pkg.name, orderResponse.amount, action, selectedCycle);
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
    act: "new" | "renew",
    billingCycle: BillingCycle
  ) {
    try {
      const verifyResponse = await subscriptionApi.verifyPayment(vendorId!, {
        ...res,
        package_code: code,
        action: act,
        billing_cycle: billingCycle,
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
        billingCycle,
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
      <div className="relative min-h-full w-full bg-slate-950">

        {/* Navigation / Back button row */}
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between px-3 pt-4 sm:px-4 md:px-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="h-10 gap-2 rounded-lg border border-cyan-500/30 bg-slate-900/55 px-3 text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
            className="h-10 w-10 rounded-lg border border-cyan-500/30 bg-slate-900/55 text-slate-300 shadow-md hover:bg-cyan-500/10 hover:text-cyan-100"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="mx-auto w-full max-w-[1600px] space-y-6 px-3 pb-16 pt-4 sm:px-4 md:space-y-8 md:px-6">

          {/* Header Section */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-center shadow-sm md:p-7">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex justify-center mb-2"
            >
              <div className="rounded-xl border border-cyan-400/35 bg-cyan-500/15 p-3">
                <Sparkles className="h-9 w-9 text-cyan-300 md:h-10 md:w-10" />
              </div>
            </motion.div>
            <h1 className="text-2xl font-semibold uppercase tracking-[0.11em] text-cyan-100 sm:text-3xl md:text-4xl">
              Upgrade Your Cafe
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-slate-300 md:text-base">
              Choose the plan that fits your business scale.
            </p>
          </div>

          {pricingDevMode ? (
            <Alert className="mx-auto max-w-3xl border-amber-500/40 bg-amber-500/10 backdrop-blur-sm">
              <AlertTitle className="text-amber-100">Test Pricing Mode Is On</AlertTitle>
              <AlertDescription className="text-amber-50/90">
                Backend is running with test subscription pricing. Disable `SUBSCRIPTION_DEV_MODE` in dashboard-service env to use super-admin catalog prices.
              </AlertDescription>
            </Alert>
          ) : null}

          {/* Payment Polling Alert */}
          <AnimatePresence>
            {pollingOrderId && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Alert className="mx-auto max-w-2xl border-cyan-500/40 bg-cyan-500/10 backdrop-blur-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-300" />
                  <AlertTitle className="text-cyan-100">
                    Waiting for Payment Confirmation
                  </AlertTitle>
                  <AlertDescription className="text-slate-300">
                    We are automatically checking your payment status. Please don't refresh.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current Plan Indicator */}
          {currentSubscription && (
            <div className="dashboard-module-panel mx-auto flex w-full max-w-3xl flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <span className="label-xs text-muted-foreground">
                  Your Current Plan
                </span>
                <h3 className="text-base font-semibold text-foreground md:text-lg">
                  {currentSubscription.package?.name}
                </h3>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-xs text-muted-foreground">PC Limit</span>
                <p className="text-base font-semibold text-foreground md:text-lg">
                  {currentSubscription.pc_limit} Units
                </p>
              </div>
            </div>
          )}

          {/* Packages Grid */}
          {packages.length === 0 ? (
            <div className="mx-auto max-w-2xl rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center text-amber-100">
              No active subscription packages found.
            </div>
          ) : (
            <>
              <div className="mx-auto flex w-full max-w-3xl items-center justify-center gap-2 rounded-xl border border-cyan-500/20 bg-slate-900/50 p-2">
                {(["monthly", "quarterly", "yearly"] as BillingCycle[]).map((cycle) => (
                  <button
                    key={cycle}
                    type="button"
                    onClick={() => setSelectedCycle(cycle)}
                    className={`rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] transition ${
                      selectedCycle === cycle
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-slate-800/70 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {cycle}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {packages.map((pkg, index) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`dashboard-module-card relative flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                    pkg.code === currentSubscription?.package?.code
                      ? "ring-2 ring-cyan-400/40"
                      : ""
                  }`}
                >
                  {(pkg.code === "grow" || pkg.code === "pro") && (
                    <div className="absolute top-0 right-0 p-2">
                      <div className="flex items-center gap-1 rounded-bl-lg rounded-tr-sm bg-cyan-500 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                        <Crown className="w-3 h-3" /> BEST VALUE
                      </div>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="text-lg font-semibold uppercase tracking-[0.08em] text-foreground">{pkg.name}</CardTitle>
                    <CardDescription className="min-h-[40px] text-sm text-muted-foreground">
                      {pkg.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col space-y-5">
                    <div>
                      {(() => {
                        const cyclePrice = getCyclePrice(pkg, selectedCycle, pricingDevMode);
                        return (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-semibold text-foreground md:text-4xl">
                          ₹{cyclePrice}
                        </span>
                        <span className="text-sm text-slate-300">{CYCLE_LABEL[selectedCycle]}</span>
                      </div>
                        );
                      })()}
                      {(pkg.features?.quarterly_price_inr || pkg.features?.yearly_price_inr) && (
                        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
                          {pkg.features?.quarterly_price_inr ? (
                            <span className="rounded-full border border-cyan-500/30 px-2 py-0.5">
                              Qtr: ₹{Number(pkg.features.quarterly_price_inr).toFixed(0)}
                            </span>
                          ) : null}
                          {pkg.features?.yearly_price_inr ? (
                            <span className="rounded-full border border-cyan-500/30 px-2 py-0.5">
                              Yr: ₹{Number(pkg.features.yearly_price_inr).toFixed(0)}
                            </span>
                          ) : null}
                        </div>
                      )}
                      {!pricingDevMode && selectedCycle === "monthly" && pkg.original_price > pkg.price && (
                        <p className="text-xs text-slate-400 line-through decoration-rose-400">
                          Regular ₹{pkg.original_price}
                        </p>
                      )}
                      {pkg.features?.onboarding_offer ? (
                        <p className="mt-2 text-xs text-emerald-300">
                          {pkg.features.onboarding_offer}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <FeatureItem text={`Up to ${pkg.pc_limit} Devices`} />
                      {(Array.isArray(pkg.features?.plan_features) && pkg.features.plan_features.length
                        ? pkg.features.plan_features
                        : ["Live Booking View", "Revenue Analytics", "Smart Notifications"])
                        .slice(0, 4)
                        .map((feature) => (
                          <FeatureItem key={`${pkg.code}-${feature}`} text={String(feature)} />
                        ))}
                    </div>

                    <Button
                      onClick={() => handleSubscribe(pkg)}
                      disabled={
                        processing !== null ||
                        pkg.code === currentSubscription?.package?.code
                      }
                      className="group mt-auto h-10 w-full rounded-lg font-semibold uppercase tracking-[0.08em] md:h-11"
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
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function FeatureItem({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <div className="mt-0.5 rounded-full bg-cyan-500/20 p-0.5">
        <Check className="h-3 w-3 text-cyan-300" />
      </div>
      <span className="text-slate-200/90">{text}</span>
    </div>
  );
}
