import { Star, StarHalf } from 'lucide-react'

interface StarRatingProps {
  rating: number
}

export function StarRating({ rating }: StarRatingProps) {
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5

  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => {
        if (i < fullStars) {
          return <Star key={i} className="w-12 h-12 fill-amber-400 text-amber-400" />
        } else if (i === fullStars && hasHalfStar) {
          return <StarHalf key={i} className="w-6 h-6 fill-amber-400 text-amber-400" />
        } else {
          return <Star key={i} className="w-6 h-6 text-zinc-300" />
        }
      })}
    </div>
  )
}

