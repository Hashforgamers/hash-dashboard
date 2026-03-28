"use client";

import { useEffect } from "react";
import { useSocket } from "./SocketContext";
import { useDashboardData } from "./DashboardDataContext";

type SocketPayload = {
  vendorId?: number;
  vendor_id?: number;
  action?: string;
  module?: string;
};

const TERMINAL_BOOKING_STATUSES = ["cancelled", "canceled", "rejected", "completed", "discarded", "no_show"];

const MODULE_EVENT_MAP: Record<string, string> = {
  booking: "booking",
  booking_updated: "booking",
  booking_queue_updated: "booking",
  booking_slots_updated: "booking",
  booking_payment_update: "booking",
  upcoming_booking: "booking",
  current_slot: "booking",
  booking_admin: "booking",
  pay_at_cafe_accepted: "booking",
  pay_at_cafe_rejected: "booking",
  extras_updated: "extras",
  pricing_updated: "pricing",
  passes_updated: "passes",
  reviews_updated: "reviews",
  tournaments_updated: "tournaments",
  gamers_credit_updated: "gamers_credit",
  store_updated: "store",
};

export function DashboardDataBus() {
  const { socket, isConnected, joinVendor } = useSocket();
  const { vendorId, landingData, consoles, setLandingData, setConsoles, bumpModuleVersion } = useDashboardData();

  useEffect(() => {
    if (!socket || !vendorId || !isConnected) return;
    joinVendor(vendorId);

    const handleModuleEvent = (event: string) => (payload: SocketPayload) => {
      const eventVendor = Number(payload?.vendorId ?? payload?.vendor_id);
      if (eventVendor && eventVendor !== vendorId) return;
      const moduleKey = MODULE_EVENT_MAP[event];
      if (moduleKey) {
        const versionKey =
          moduleKey === "store"
            ? "store"
            : moduleKey === "booking"
              ? `booking:${vendorId}`
              : `${moduleKey}:${vendorId}`;
        bumpModuleVersion(versionKey);
      }
    };

    const handlers: Array<[string, (payload: SocketPayload) => void]> = Object.keys(MODULE_EVENT_MAP).map(
      (event) => [event, handleModuleEvent(event)]
    );

    handlers.forEach(([event, handler]) => socket.on(event, handler));

    return () => {
      handlers.forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [socket, vendorId, isConnected, joinVendor, bumpModuleVersion]);

  useEffect(() => {
    if (!socket || !vendorId || !isConnected) return;
    joinVendor(vendorId);

    function handleUpcomingBooking(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      if (eventVendorId && eventVendorId !== vendorId) return;
      if (!landingData) return;

      const status = String(data?.status || "").toLowerCase();
      if (status !== "confirmed") return;

      const next = Array.isArray(landingData.upcomingBookings)
        ? [...landingData.upcomingBookings]
        : [];
      if (!next.some((b: any) => b?.bookingId === data.bookingId)) {
        next.unshift(data);
        setLandingData({ ...landingData, upcomingBookings: next });
      }
    }

    function handleCurrentSlot(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      if (eventVendorId && eventVendorId !== vendorId) return;
      if (!landingData) return;

      const currentSlots = Array.isArray(landingData.currentSlots) ? [...landingData.currentSlots] : [];
      const exists = currentSlots.some(
        (slot: any) => slot?.bookId === data?.bookId || slot?.bookingId === data?.bookId
      );
      if (!exists) {
        currentSlots.unshift(data);
      }

      const upcoming = Array.isArray(landingData.upcomingBookings) ? landingData.upcomingBookings : [];
      const filteredUpcoming = upcoming.filter(
        (b: any) => Number(b?.bookingId) !== Number(data?.bookId)
      );

      setLandingData({
        ...landingData,
        currentSlots,
        upcomingBookings: filteredUpcoming,
      });
    }

    function handleBookingUpdate(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      if (eventVendorId && eventVendorId !== vendorId) return;
      if (!landingData) return;

      const status = String(data?.status || "").toLowerCase();
      const upcoming = Array.isArray(landingData.upcomingBookings) ? [...landingData.upcomingBookings] : [];
      const nextUpcoming = upcoming
        .map((booking: any) => (booking?.bookingId === data.bookingId ? { ...booking, ...data } : booking))
        .filter((booking: any) => {
          const s = String(booking?.status || "").toLowerCase();
          return !TERMINAL_BOOKING_STATUSES.includes(s);
        });

      if ((status === "confirmed" || status === "paid") && !nextUpcoming.some((b: any) => b?.bookingId === data.bookingId)) {
        nextUpcoming.unshift(data);
      }

      setLandingData({
        ...landingData,
        upcomingBookings: nextUpcoming,
      });
    }

    function handleConsoleAvailability(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      if (eventVendorId && eventVendorId !== vendorId) return;
      if (!Array.isArray(consoles) || consoles.length === 0) return;
      const consoleId = Number(data?.console_id ?? data?.consoleId);
      if (!consoleId) return;
      const isAvailable = Boolean(data?.is_available);

      const updated = consoles.map((c: any) => {
        if (Number(c?.id) !== consoleId) return c;
        const occupancyState = isAvailable ? "free" : "occupied";
        return {
          ...c,
          status: isAvailable,
          occupancyState,
          statusLabel: isAvailable ? "Free" : "Occupied",
        };
      });

      setConsoles(updated);
    }

    socket.on("upcoming_booking", handleUpcomingBooking);
    socket.on("current_slot", handleCurrentSlot);
    socket.on("booking", handleBookingUpdate);
    socket.on("console_availability", handleConsoleAvailability);

    return () => {
      socket.off("upcoming_booking", handleUpcomingBooking);
      socket.off("current_slot", handleCurrentSlot);
      socket.off("booking", handleBookingUpdate);
      socket.off("console_availability", handleConsoleAvailability);
    };
  }, [socket, vendorId, isConnected, joinVendor, landingData, consoles, setLandingData, setConsoles]);

  return null;
}
