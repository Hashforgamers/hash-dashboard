type Slot = {
    id: string;
    startTime: string;
    endTime: string;
    userId: string;
    gameId: string;
    // Add other fields if needed
  };
  
  export function mergeConsecutiveSlots(slots: Slot[]): Slot[][] {
    if (!slots || slots.length === 0) return [];
  
    // Sort slots by startTime
    const sorted = [...slots].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  
    const merged: Slot[][] = [];
    let currentGroup: Slot[] = [sorted[0]];
  
    for (let i = 1; i < sorted.length; i++) {
      const prev = currentGroup[currentGroup.length - 1];
      const curr = sorted[i];
  
      const prevEnd = new Date(prev.endTime).getTime();
      const currStart = new Date(curr.startTime).getTime();
  
      // Check if current slot starts right after previous slot ends
      if (
        curr.userId === prev.userId &&
        curr.gameId === prev.gameId &&
        currStart === prevEnd
      ) {
        currentGroup.push(curr);
      } else {
        merged.push(currentGroup);
        currentGroup = [curr];
      }
    }
  
    merged.push(currentGroup);
    return merged;
  }
  
  export type Booking = {
    id: string;
    userName: string;
    system: string;
    startTime: string; // ISO string
    endTime: string;   // ISO string
  };
  
  export function mergeConsecutiveBookings(bookings: Booking[]) {
    const sorted = [...bookings].sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  
    const merged: Booking[] = [];
  
    for (const booking of sorted) {
      const last = merged[merged.length - 1];
  
      if (
        last &&
        last.userName === booking.userName &&
        last.system === booking.system &&
        last.endTime === booking.startTime // consecutive
      ) {
        last.endTime = booking.endTime; // extend the end time
      } else {
        merged.push({ ...booking });
      }
    }
  
    return merged;
  }