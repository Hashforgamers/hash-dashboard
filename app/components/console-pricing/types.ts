import React from "react";

export interface ConsoleType {
  type: string;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  iconColor: string;
  description: string;
}

export interface PricingState {
  [key: string]: {
    value: number;
    isValid: boolean;
    hasChanged: boolean;
  };
}

export interface PricingOffer {
  id: number;
  vendor_id: number;
  available_game_id: number;
  console_type: string;
  default_price: number;
  offered_price: number;
  discount_percentage: number;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  offer_name: string;
  offer_description: string | null;
  is_active: boolean;
  is_currently_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailableGame {
  id: number;
  game_name: string;
  single_slot_price: number;
}

export interface ControllerTier {
  id: string;
  quantity: number;
  total_price: number;
}

export interface ControllerPricingRule {
  base_price: number;
  tiers: ControllerTier[];
}

export type SquadPricingState = Record<string, Record<string, number>>;

export interface VendorTaxProfile {
  vendor_id: number;
  gst_registered: boolean;
  gst_enabled: boolean;
  gst_rate: number;
  tax_inclusive: boolean;
  gstin?: string;
  legal_name?: string;
  state_code?: string;
  place_of_supply_state_code?: string;
}

export interface MonthlyCreditAccount {
  id: number;
  vendor_id: number;
  user_id: number;
  credit_limit: number;
  outstanding_amount: number;
  billing_cycle_day: number;
  grace_days: number;
  is_active: boolean;
  notes?: string;
}

export interface VendorUser {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

export interface MonthlyCreditLedgerEntry {
  id: number;
  entry_type: string;
  amount: number;
  description?: string;
  booked_date?: string | null;
  due_date?: string | null;
  created_at?: string | null;
}

export type ControllerPricingState = Record<string, ControllerPricingRule>;

export type PricingTab = "default" | "offers" | "controllers" | "squad" | "gst" | "credit";

export interface OfferFormState {
  available_game_id: string;
  offered_price: string;
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  offer_name: string;
  offer_description: string;
}

export interface CreditFormState {
  user_id: string;
  credit_limit: string;
  billing_cycle_day: string;
  grace_days: string;
  is_active: boolean;
  notes: string;
}
