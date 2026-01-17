// services/api/slotService.ts
import { cacheService } from './cacheService'
import { BOOKING_URL } from '../../../../../src/config/env'
import type { ConsoleType, SlotData, ConsoleFilter } from '../../types/booking.types'

class SlotService {
  private baseURL = BOOKING_URL

  async fetchConsoles(vendorId: number): Promise<ConsoleType[]> {
    const cacheKey = `consoles_${vendorId}`
    const cached = cacheService.get<ConsoleType[]>(cacheKey)
    
    if (cached) {
      console.log('✅ Using cached consoles')
      return cached
    }

    try {
      const response = await fetch(`${this.baseURL}/api/getAllConsole/vendor/${vendorId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch consoles: ${response.status}`)
      }
      
      const data = await response.json()
      const consoles = this.transformConsoleData(data.games || [])
      
      cacheService.set(cacheKey, consoles, 300000)
      console.log('✅ Consoles fetched and cached:', consoles)
      
      return consoles
    } catch (error) {
      console.error('❌ Error fetching consoles:', error)
      throw error
    }
  }

  async fetchSlotsBatch(
    vendorId: number, 
    gameIds: number[], 
    dates: string[]
  ): Promise<SlotData> {
    const cacheKey = `slots_${vendorId}_${gameIds.join(',')}_${dates.join(',')}`
    const cached = cacheService.get<SlotData>(cacheKey)
    
    if (cached) {
      console.log('✅ Using cached slots')
      return cached
    }

    try {
      const formattedDates = dates.map(d => d.replace(/-/g, ''))
      
      const response = await fetch(`${this.baseURL}/api/getSlotsBatch/vendor/${vendorId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          game_ids: gameIds.length > 0 ? gameIds : [],
          dates: formattedDates 
        })
      })

      if (!response.ok) {
        throw new Error(`Batch fetch failed: ${response.status}`)
      }

      const data = await response.json()
      cacheService.set(cacheKey, data, 300000)
      console.log('✅ Slots fetched and cached')
      
      return data
    } catch (error) {
      console.error('❌ Error fetching slots:', error)
      throw error
    }
  }

  private transformConsoleData(games: any[]): ConsoleType[] {
    const templates: Array<{ type: ConsoleFilter; name: string }> = [
      { type: 'PC', name: 'PC Gaming' },
      { type: 'PS5', name: 'PlayStation 5' },
      { type: 'Xbox', name: 'Xbox Series' },
      { type: 'VR', name: 'VR Gaming' }
    ]

    return templates
      .map(template => {
        const match = games.find(g => 
          g.console_name?.toLowerCase().includes(template.type.toLowerCase())
        )
        
        if (!match) return null
        
        return {
          id: match.id,
          type: template.type,
          name: template.name,
          price: match.console_price
        }
      })
      .filter((item): item is ConsoleType => item !== null)
  }
}

export const slotService = new SlotService()
