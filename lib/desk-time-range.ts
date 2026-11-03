type SlotTime = { start_time: string; end_time: string }
const minutes = (time: string) => Number(time.slice(0,2)) * 60 + Number(time.slice(3,5))
const finish = (slot: SlotTime) => {
  const end = minutes(slot.end_time)
  return end + (end <= minutes(slot.start_time) ? 1440 : 0)
}

export function contiguousDeskSlots<T extends SlotTime>(available:T[], start:string):T[] {
  const byStart = new Map(available.map(slot => [slot.start_time.slice(0,5),slot]))
  const chain:T[] = []
  let next = byStart.get(start.slice(0,5))
  while (next) {
    chain.push(next)
    if (finish(next) >= 1440) break
    next = byStart.get(next.end_time.slice(0,5))
  }
  return chain
}

export function coveringDeskSlots<T extends SlotTime>(available:T[], from:string, to:string):T[] {
  if (!from || !to || from === to) return []
  const start = minutes(from)
  const end = minutes(to) + (to < from ? 1440 : 0)
  const first = available.find(slot => minutes(slot.start_time) <= start && start < finish(slot))
  if (!first) return []
  const chain = contiguousDeskSlots(available,first.start_time)
  const last = chain.findIndex(slot => finish(slot) >= end)
  return last < 0 ? [] : chain.slice(0,last+1)
}
