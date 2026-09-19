"use client";

import { useEffect } from "react";
import { useSocket } from "./SocketContext";
import { useDashboardData } from "./DashboardDataContext";

type SocketPayload = {
  vendorId?: number;
  vendor_id?: number;
  action?: string;
  module?: string;
  bookingId?: number;
  booking_id?: number;
  bookId?: number;
  book_id?: number;
};

const TERMINAL_BOOKING_STATUSES = ["cancelled", "canceled", "rejected", "completed", "discarded", "no_show", "verification_failed"];

const MODULE_EVENT_MAP: Record<string, string> = {
  console_availability: "booking",
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
  const { vendorId, setLandingData, setConsoles, bumpModuleVersion, refreshLanding, refreshConsoles } = useDashboardData();
  const resolveBookingId = (payload: any) =>
    Number(payload?.bookingId ?? payload?.booking_id ?? payload?.bookId ?? payload?.book_id ?? 0);

  useEffect(() => {
    if (!socket || !vendorId || !isConnected) return;
    joinVendor(vendorId);

    const dirtyModules = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const flush = () => {
      timer = undefined;
      for (const key of dirtyModules) bumpModuleVersion(key);
      if (dirtyModules.has(`booking:${vendorId}`)) {
        void refreshLanding(true);
        void refreshConsoles(true);
      }
      dirtyModules.clear();
    };
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
        dirtyModules.add(versionKey);
        if (!timer) timer = setTimeout(flush, 150);
      }
    };

    const handlers: Array<[string, (payload: SocketPayload) => void]> = Object.keys(MODULE_EVENT_MAP).map(
      (event) => [event, handleModuleEvent(event)]
    );

    handlers.forEach(([event, handler]) => socket.on(event, handler));

    return () => {
      if (timer) clearTimeout(timer);
      handlers.forEach(([event, handler]) => socket.off(event, handler));
    };
  }, [socket, vendorId, isConnected, joinVendor, bumpModuleVersion, refreshLanding, refreshConsoles]);

  useEffect(() => {
    if (!socket || !vendorId || !isConnected) return;
    joinVendor(vendorId);

    function handleUpcomingBooking(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      if (eventVendorId && eventVendorId !== vendorId) return;
      setLandingData((landingData: any) => {
        if (!landingData) return landingData;
        const incomingBookingId = resolveBookingId(data);
        if (!incomingBookingId) return landingData;

        const status = String(data?.status || "").toLowerCase();
        if (status !== "confirmed") return landingData;

        const next = Array.isArray(landingData.upcomingBookings)
          ? [...landingData.upcomingBookings]
          : [];
        if (!next.some((b: any) => Number(b?.bookingId) === incomingBookingId)) {
          next.unshift({ ...data, bookingId: incomingBookingId });
          return { ...landingData, upcomingBookings: next };
        }
        return landingData;
      });
    }

    function handleCurrentSlot(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      if (eventVendorId && eventVendorId !== vendorId) return;
      setLandingData((landingData: any) => {
        if (!landingData) return landingData;
        const incomingBookingId = resolveBookingId(data);
        if (!incomingBookingId) return landingData;

        const currentSlots = Array.isArray(landingData.currentSlots) ? [...landingData.currentSlots] : [];
        const exists = currentSlots.some(
          (slot: any) => resolveBookingId(slot) === incomingBookingId
        );
        if (!exists) {
          currentSlots.unshift(data);
        }

        const upcoming = Array.isArray(landingData.upcomingBookings) ? landingData.upcomingBookings : [];
        const filteredUpcoming = upcoming.filter(
          (b: any) => Number(b?.bookingId) !== incomingBookingId
        );

        return { ...landingData, currentSlots, upcomingBookings: filteredUpcoming };
      });
    }

    function handleBookingUpdate(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      if (eventVendorId && eventVendorId !== vendorId) return;
      setLandingData((landingData: any) => {
        if (!landingData) return landingData;

        const status = String(data?.status || "").toLowerCase();
        const incomingBookingId = resolveBookingId(data);
        if (!incomingBookingId) return landingData;
        const upcoming = Array.isArray(landingData.upcomingBookings) ? [...landingData.upcomingBookings] : [];
        const nextUpcoming = upcoming
          .map((booking: any) => (Number(booking?.bookingId) === incomingBookingId ? { ...booking, ...data } : booking))
          .filter((booking: any) => {
            const s = String(booking?.status || "").toLowerCase();
            return !TERMINAL_BOOKING_STATUSES.includes(s);
          });

        if ((status === "checked_in" || status === "current") && incomingBookingId > 0) {
          const nextCurrent = Array.isArray(landingData.currentSlots) ? [...landingData.currentSlots] : [];
          if (!nextCurrent.some((slot: any) => resolveBookingId(slot) === incomingBookingId)) {
            nextCurrent.unshift(data);
          }
          return { ...landingData, currentSlots: nextCurrent,
            upcomingBookings: nextUpcoming.filter((b: any) => Number(b?.bookingId) !== incomingBookingId) };
        }

        if ((status === "confirmed" || status === "paid") && incomingBookingId > 0 && !nextUpcoming.some((b: any) => Number(b?.bookingId) === incomingBookingId)) {
          nextUpcoming.unshift(data);
        }

        return { ...landingData, upcomingBookings: nextUpcoming,
          currentSlots: TERMINAL_BOOKING_STATUSES.includes(status)
            ? (landingData.currentSlots || []).filter((slot: any) => resolveBookingId(slot) !== incomingBookingId)
            : landingData.currentSlots };
      });
    }

    function handleConsoleAvailability(data: any) {
      const eventVendorId = Number(data?.vendorId ?? data?.vendor_id);
      if (eventVendorId && eventVendorId !== vendorId) return;

      const consoleId = Number(data?.console_id ?? data?.consoleId);
      if (!consoleId) return;
      const isAvailable = Boolean(data?.is_available);

      setConsoles((consoles) => consoles.map((c: any) => {
        if (Number(c?.id) !== consoleId) return c;
        const occupancyState = isAvailable ? "free" : "occupied";
        return {
          ...c,
          status: isAvailable,
          occupancyState,
          statusLabel: isAvailable ? "Free" : "Occupied",
        };
      }));
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
  }, [socket, vendorId, isConnected, joinVendor, setLandingData, setConsoles]);

  return null;
}
