"use client"
import { Star, Tag } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatRupees, gameGenres, gamePlatforms, platformLabel, priceSummary, type VendorGame } from "./library"
import { platformIcon } from "./platform-icon"
import { GameCover } from "./game-cover"
import styles from "./games.module.css"

/** Portrait cover card: art, platform badges, rating, title and "On 3 stations · from ₹60/hr". */
export function GameCard({ vg, compact, onOpen }: { vg: VendorGame; compact?: boolean; onOpen: () => void }) {
  const { game } = vg
  const platforms = gamePlatforms(vg)
  const price = priceSummary(vg)
  const genre = gameGenres(game)[0]
  const stations = vg.consoles.length
  const maxBadges = compact || price.hasOffer ? 2 : 3
  const rating = Number(game.rawg_rating)
  const stationsText = `${stations} station${stations === 1 ? "" : "s"}`
  return (
    <button type="button" onClick={onOpen} className={cn(styles.card, compact && styles.cardCompact)}
      aria-label={`${game.name}${genre ? `, ${genre}` : ""}. On ${stationsText}${price.from !== null ? `, from ${formatRupees(price.from)} per hour` : ""}${price.hasOffer ? ", offer running" : ""}`}>
      <span className={styles.art}><GameCover name={game.name} src={game.image_url} /></span>
      <span aria-hidden className={styles.scrim} />

      <span className={styles.badges} aria-hidden>
        {platforms.slice(0, maxBadges).map(key => {
          const Icon = platformIcon(key)
          return (
            <span key={key} className={styles.glass} title={platformLabel(key)}>
              <Icon className={styles.badgeIcon} />
              {!compact && platforms.length === 1 && !price.hasOffer && <span>{platformLabel(key)}</span>}
            </span>
          )
        })}
        {platforms.length > maxBadges && <span className={styles.glass}>+{platforms.length - maxBadges}</span>}
      </span>

      <span className={styles.corner} aria-hidden>
        {price.hasOffer && (
          <span className={cn(styles.glass, styles.offerPill)} title={price.bestDiscount ? `Offer: ${Math.round(price.bestDiscount)}% off` : "Offer running"}>
            <Tag className={styles.offerIcon} />
          </span>
        )}
        {Number.isFinite(rating) && rating > 0 && (
          <span className={cn(styles.glass, styles.ratingPill)}><Star className={styles.starIcon} />{rating.toFixed(1)}</span>
        )}
      </span>

      <span className={styles.caption}>
        <span className={styles.title}>{game.name}</span>
        {genre && !compact && <span className={styles.genre}>{genre}</span>}
        <span className={styles.meta}>
          <span className="truncate">{stationsText}</span>
          {price.from !== null && (
            <span className={cn(styles.price, price.hasOffer && styles.priceOffer)}>
              <span>{formatRupees(price.from)}<span className={styles.perHour}>/hr</span></span>
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
