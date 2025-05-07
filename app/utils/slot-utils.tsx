type Slot = {
  id: string;
  startTime: string;
  endTime: string;
  userId: string;
  gameId: string;
  // Add other fields if needed
};

type Booking = {
  id: string;
  userName: string;
  system: string;
  startTime: string;
  endTime: string;
};

/**
 * Groups consecutive Slot entries by userId + gameId + adjacent times
 */
export function mergeConsecutiveSlots(slots: Slot[]): Slot[][] {
  if (!slots.length) return [];

  const sorted = [...slots].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const merged: Slot[][] = [];
  let group: Slot[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const prev = group[group.length - 1];
    const curr = sorted[i];

    const prevEnd = new Date(prev.endTime).getTime();
    const currStart = new Date(curr.startTime).getTime();

    if (
      curr.userId === prev.userId &&
      curr.gameId === prev.gameId &&
      prevEnd === currStart
    ) {
      group.push(curr);
    } else {
      merged.push(group);
      group = [curr];
    }
  }

  merged.push(group);
  return merged;
}

/**
 * Merges consecutive Booking entries by userName + system + adjacent times
 */
export function mergeConsecutiveBookings(bookings: Booking[]): Booking[] {
  if (!bookings.length) return [];

  const sorted = [...bookings].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  const merged: Booking[] = [];

  for (const booking of sorted) {
    const last = merged[merged.length - 1];

    if (
      last &&
      last.userName === booking.userName &&
      last.system === booking.system &&
      last.endTime === booking.startTime
    ) {
      last.endTime = booking.endTime;
    } else {
      merged.push({ ...booking });
    }
  }

  return merged;
}
