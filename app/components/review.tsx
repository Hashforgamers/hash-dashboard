import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StarRating } from "./star-rating"

export function Review() {
  const totalRating = 4.5
  const totalReviews = 1234

  return (
    <div className="grid gap-4 grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold">{totalRating.toFixed(1)}</div>
          <p className="text-xs text-muted-foreground">Based on {totalReviews} reviews</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Star Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <StarRating rating={totalRating} />
        </CardContent>
      </Card>
    </div>
  )
}

