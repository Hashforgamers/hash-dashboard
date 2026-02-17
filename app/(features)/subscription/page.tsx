"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { subscriptionApi } from "@/lib/api";
import { openRazorpay, createRazorpayOptions, RazorpayResponse } from "@/lib/razorpay";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Loader2, Sparkles, Crown, Zap, ArrowLeft, RefreshCw, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DashboardLayout } from "@/app/(layout)/dashboard-layout";
// Import DashboardContent agar aapko background mein dashboard dikhana hai
import { DashboardContent } from "@/app/components/dashboard-content";

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

export default function SubscriptionPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const { vendorId, refreshStatus } = useSubscription();
  const router = useRouter();

  useEffect(() => {
    const selectedCafe = localStorage.getItem("selectedCafe");
    if (!selectedCafe) {
      toast.error("Please select a cafe first");
      router.push("/select-cafe");
      return;
    }
  }, [router]);

  useEffect(() => {
    if (vendorId) loadData();
  }, [vendorId]);

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
    setProcessing(pkg.code);
    try {
      const action = currentSubscription ? "renew" : "new";
      const orderResponse = await subscriptionApi.createOrder(vendorId, pkg.code, action);
      if (!orderResponse.success) throw new Error(orderResponse.error);

      const options = createRazorpayOptions(
        orderResponse.order_id,
        orderResponse.amount,
        pkg.name,
        orderResponse.key_id,
        async (response: RazorpayResponse) => {
          const verifyResponse = await subscriptionApi.verifyPayment(vendorId!, {
            ...response,
            package_code: pkg.code,
            action,
          });
          if (verifyResponse.success) {
            toast.success("Subscription activated! 🎉");
            await refreshStatus();
            router.push("/dashboard");
          }
        },
        () => setProcessing(null)
      );
      await openRazorpay(options);
    } catch (error: any) {
      toast.error(error.message || "Payment failed");
      setProcessing(null);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      {/* Container ko relative rakhna zaroori hai stack karne ke liye */}
      <div className="relative min-h-[calc(100vh-100px)] w-full overflow-hidden rounded-xl">
        
        {/* 1. BACKGROUND LAYER: Isme Dashboard ka content blur dikhega */}
        <div className="absolute inset-0 z-0 pointer-events-none filter blur-[6px] opacity-40 scale-[1.02]">
          <DashboardContent activeTab="gaming-cafe" setActiveTab={() => {}} />
        </div>

        {/* 2. OVERLAY LAYER: Dark/Light tint layer jo text readability badhayegi */}
        <div className="absolute inset-0 z-10 bg-background/40 backdrop-blur-[2px]" />

        {/* 3. CONTENT LAYER: Aapka Subscription UI */}
        <div className="relative z-20 p-4 md:p-8 space-y-8 overflow-y-auto h-full">
          {/* Header Section */}
          <div className="text-center space-y-4 py-6">
            <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex justify-center mb-2">
              <div className="p-3 bg-primary/20 rounded-2xl shadow-xl">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
            </motion.div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight drop-shadow-sm">Upgrade Your Cafe</h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto font-medium">Choose the plan that fits your business scale.</p>
          </div>

          {/* Current Subscription Indicator (Optional Blur Card) */}
          {currentSubscription && (
            <div className="max-w-2xl mx-auto bg-card/60 backdrop-blur-md border border-primary/20 p-4 rounded-xl flex justify-between items-center shadow-sm">
               <div>
                 <span className="text-[10px] font-bold uppercase text-primary">Current Plan</span>
                 <h3 className="font-bold text-lg">{currentSubscription.package?.name}</h3>
               </div>
               <div className="text-right">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Units</span>
                 <p className="font-black text-xl">{currentSubscription.pc_limit}</p>
               </div>
            </div>
          )}

          {/* Packages Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {packages.map((pkg, index) => (
              <motion.div key={pkg.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }}>
                <Card className={`h-full flex flex-col border-2 transition-all duration-300 hover:shadow-2xl bg-card/80 backdrop-blur-md ${pkg.code === currentSubscription?.package?.code ? "border-primary shadow-lg shadow-primary/10" : "border-border/50 hover:border-primary/50"}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {pkg.name}
                      {pkg.code === "grow" && <Crown className="w-5 h-5 text-yellow-500" />}
                    </CardTitle>
                    <CardDescription className="min-h-[40px]">{pkg.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-6">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black">₹{pkg.price}</span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <FeatureItem text={`Up to ${pkg.pc_limit} Devices`} />
                      <FeatureItem text="Live Booking View" />
                      <FeatureItem text="Revenue Analytics" />
                    </div>
                    <Button
                      onClick={() => handleSubscribe(pkg)}
                      disabled={processing !== null || pkg.code === currentSubscription?.package?.code}
                      className="w-full mt-auto font-bold shadow-md"
                      variant={pkg.code === "grow" ? "default" : "secondary"}
                    >
                      {processing === pkg.code ? <Loader2 className="w-4 h-4 animate-spin" /> : pkg.code === currentSubscription?.package?.code ? "Active Plan" : "Subscribe Now"}
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
      <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
      <span className="text-foreground/80 font-medium">{text}</span>
    </div>
  );
}