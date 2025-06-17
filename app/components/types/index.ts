import { DivideIcon as LucideIcon } from 'lucide-react';

export interface ConsoleType {
  type: string;
  icon: LucideIcon;
  color: string;
  iconColor: string;
  description: string;
  name: string;
  id: number | null;
  price: number | null;
}

export interface Slot {
  slot_id: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface BookingFormData {
  consoleType: string;
  name: string;
  email: string;
  phone: string;
  bookedDate: string;
  slotId: string[];
  paymentType: string;
}