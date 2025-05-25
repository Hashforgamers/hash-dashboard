export interface Booking {
  slotId: string;
  username: string;
  consoleType: string;
  consoleNumber: string;
  startTime: string;
  endTime: string;
  date: string;
  game_id: string;
  slot_price?: number;
  userId?: string;
  bookings?: Booking[];
}

// Function to check if two slots are consecutive
const areConsecutiveSlots = (slot1: Booking, slot2: Booking): boolean => {
  return (
    slot1.username === slot2.username &&
    slot1.consoleType === slot2.consoleType &&
    slot1.consoleNumber === slot2.consoleNumber &&
    slot1.date === slot2.date
  );
};

// Function to merge consecutive slots
export const mergeConsecutiveSlots = (slots: Booking[]): Booking[] => {
  if (!slots || slots.length === 0) return [];
  
  // Create a deep copy to avoid mutating the original
  const slotsCopy = JSON.parse(JSON.stringify(slots));
  
  // Sort by username, consoleType, consoleNumber, date, and startTime
  slotsCopy.sort((a: Booking, b: Booking) => {
    if (a.username !== b.username) return a.username.localeCompare(b.username);
    if (a.consoleType !== b.consoleType) return a.consoleType.localeCompare(b.consoleType);
    if (a.consoleNumber !== b.consoleNumber) return a.consoleNumber.localeCompare(b.consoleNumber);
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    
    // Parse start times for comparison
    const aTime = parseTimeString(a.startTime);
    const bTime = parseTimeString(b.startTime);
    return aTime - bTime;
  });
  
  // Merge consecutive slots
  const mergedSlots: Booking[] = [];
  let currentMerged: Booking | null = null;
  
  for (const slot of slotsCopy) {
    if (!currentMerged) {
      currentMerged = { ...slot };
    } else if (areConsecutiveSlots(currentMerged, slot)) {
      // Update end time if the current slot ends later
      const currentEndTime = parseTimeString(currentMerged.endTime);
      const slotEndTime = parseTimeString(slot.endTime);
      
      if (slotEndTime > currentEndTime) {
        currentMerged.endTime = slot.endTime;
      }
    } else {
      mergedSlots.push(currentMerged);
      currentMerged = { ...slot };
    }
  }
  
  if (currentMerged) {
    mergedSlots.push(currentMerged);
  }
  
  return mergedSlots;
};

// Function to merge consecutive bookings (groups by user and console)
export const mergeConsecutiveBookings = (bookings: Booking[]): Booking[] => {
  if (!bookings || bookings.length === 0) return [];
  
  // Create a deep copy to avoid mutating the original
  const bookingsCopy = JSON.parse(JSON.stringify(bookings));
  
  // Group bookings by user, console type, console number, and date
  const groupedBookings: Record<string, Booking[]> = {};
  
  for (const booking of bookingsCopy) {
    const key = `${booking.username}_${booking.consoleType}_${booking.consoleNumber}_${booking.date}`;
    if (!groupedBookings[key]) {
      groupedBookings[key] = [];
    }
    groupedBookings[key].push(booking);
  }
  
  // Create merged booking objects for each group
  const result: Booking[] = [];
  
  for (const key in groupedBookings) {
    const group = groupedBookings[key];
    
    // Sort by start time
    group.sort((a, b) => parseTimeString(a.startTime) - parseTimeString(b.startTime));
    
    // Take the first booking as the base
    const mergedBooking: Booking = {
      ...group[0],
      bookings: group
    };
    
    // Set the end time to the latest end time in the group
    const latestEndTime = group.reduce((latest, booking) => {
      const endTime = parseTimeString(booking.endTime);
      return endTime > latest ? endTime : latest;
    }, parseTimeString(group[0].endTime));
    
    const latestEndTimeBooking = group.find(
      b => parseTimeString(b.endTime) === latestEndTime
    );
    
    if (latestEndTimeBooking) {
      mergedBooking.endTime = latestEndTimeBooking.endTime;
    }
    
    result.push(mergedBooking);
  }
  
  return result;
};

// Helper function to parse time strings (e.g., "10:00 AM") to minutes since midnight
function parseTimeString(timeString: string): number {
  if (!timeString) return 0;
  
  const [time, modifier] = timeString.trim().split(" ");
  let [hours, minutes] = time.split(":").map(Number);
  
  if (modifier === "PM" && hours < 12) {
    hours += 12;
  }
  if (modifier === "AM" && hours === 12) {
    hours = 0;
  }
  
  return hours * 60 + minutes;
}