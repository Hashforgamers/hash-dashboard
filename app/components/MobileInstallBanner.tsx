"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { ANDROID_APK_URL } from "@/src/config/env";

type MobilePlatform = "android" | "ios" | "other";

const DISMISS_KEY = "hfg_mobile_install_banner_dismissed_v1";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function detectMobilePlatform(): MobilePlatform {
  if (typeof window === "undefined") return "other";
  const ua = window.navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (ua.includes("Mac") && "ontouchend" in document);
  if (isAndroid) return "android";
  if (isIOS) return "ios";
  return "other";
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  const byMedia = window.matchMedia?.("(display-mode: standalone)")?.matches;
  const byNavigator = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return Boolean(byMedia || byNavigator);
}

export function MobileInstallBanner() {
  const [platform, setPlatform] = useState<MobilePlatform>("other");
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [showAndroidPwaHelp, setShowAndroidPwaHelp] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(DISMISS_KEY) === "1";
    const detected = detectMobilePlatform();
    const canShow = detected !== "other" && !isStandaloneMode() && !dismissed;
    setPlatform(detected);
    setVisible(canShow);

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt as EventListener);
    };
  }, []);

  const canDownloadApk = useMemo(
    () => platform === "android" && Boolean(String(ANDROID_APK_URL || "").trim()),
    [platform]
  );

  const installWebApp = async () => {
    if (platform === "ios") {
      setShowIosHelp((prev) => !prev);
      return;
    }
    if (platform !== "android") return;
    if (!installPromptEvent) {
      setShowAndroidPwaHelp((prev) => !prev);
      return;
    }
    try {
      await installPromptEvent.prompt();
      await installPromptEvent.userChoice.catch(() => null);
    } finally {
      setInstallPromptEvent(null);
      setShowAndroidPwaHelp(false);
    }
  };

  if (!visible || platform === "other") return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // no-op
    }
  };

  return (
    <div className="fixed inset-x-2 bottom-2 z-[90] rounded-xl border border-white/15 bg-slate-950/95 p-3 text-white shadow-2xl backdrop-blur md:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="rounded-lg border border-white/15 bg-white/10 p-1.5">
            <Smartphone className="h-4 w-4 text-emerald-300" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold">Install Hash Dashboard</p>
            <p className="text-xs text-slate-300">
              {platform === "android"
                ? "Get faster access from your home screen."
                : "Install this web app on iPhone for app-like access."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-md p-1 text-slate-300 hover:bg-white/10 hover:text-white"
          aria-label="Close install banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        {platform === "android" ? (
          <>
            <button
              type="button"
              onClick={installWebApp}
              className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30"
            >
              Install Web App
            </button>
            {canDownloadApk ? (
              <a
                href={ANDROID_APK_URL}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30"
              >
                <Download className="h-3.5 w-3.5" />
                Download APK
              </a>
            ) : (
              <span className="rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-200">
                APK link not configured
              </span>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={installWebApp}
            className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/30"
          >
            Install Web App
          </button>
        )}
      </div>

      {platform === "ios" && showIosHelp && (
        <div className="mt-2 rounded-lg border border-white/15 bg-white/5 p-2 text-xs text-slate-200">
          In Safari tap <strong>Share</strong>, then <strong>Add to Home Screen</strong>.
        </div>
      )}
      {platform === "android" && showAndroidPwaHelp && (
        <div className="mt-2 rounded-lg border border-white/15 bg-white/5 p-2 text-xs text-slate-200">
          In Chrome tap <strong>menu</strong> then <strong>Add to Home screen</strong> or <strong>Install app</strong>.
        </div>
      )}
    </div>
  );
}
