// utils/dateHelpers.ts
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0]
}

export const formatDateDisplay = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-GB')
}

export const getNext3Days = (): string[] => {
  return Array.from({ length: 3 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    return formatDate(date)
  })
}

export const formatDateForAPI = (date: string): string => {
  return date.replace(/-/g, '')
}

export const getCurrentISTTime = (): Date => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
}

export const isTimeInRange = (current: Date, start: Date, end: Date): boolean => {
  return current >= start && current < end
}
