import { Star } from "lucide-react"
import * as React from "react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  value: number
  onChange?: (rating: number) => void
  readonly?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
  className,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null)

  const displayValue = hoverValue !== null ? hoverValue : value
  const starSizeClass = sizeClasses[size]

  const handleMouseEnter = (starNumber: number) => {
    if (!readonly) {
      setHoverValue(starNumber)
    }
  }

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(null)
    }
  }

  const handleClick = (starNumber: number) => {
    if (!readonly && onChange) {
      onChange(starNumber)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, starNumber: number) => {
    if (readonly) return

    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        event.preventDefault()
        if (value < 5 && onChange) {
          onChange(value + 1)
        }
        break
      case "ArrowLeft":
      case "ArrowDown":
        event.preventDefault()
        if (value > 1 && onChange) {
          onChange(value - 1)
        }
        break
      case "Enter":
      case " ":
        event.preventDefault()
        if (onChange) {
          onChange(starNumber)
        }
        break
    }
  }

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role="slider"
      aria-valuemin={1}
      aria-valuemax={5}
      aria-valuenow={value}
      aria-label={`Rating: ${value} out of 5 stars`}
      tabIndex={readonly ? -1 : 0}
    >
      {[1, 2, 3, 4, 5].map((starNumber) => {
        const isFilled = starNumber <= displayValue

        if (readonly) {
          return (
            <Star
              key={starNumber}
              className={cn(
                starSizeClass,
                isFilled ? "fill-yellow-400 text-yellow-400" : "fill-none text-gray-300"
              )}
            />
          )
        }

        return (
          <button
            key={starNumber}
            type="button"
            onMouseEnter={() => handleMouseEnter(starNumber)}
            onMouseLeave={handleMouseLeave}
            onClick={() => handleClick(starNumber)}
            onKeyDown={(e) => handleKeyDown(e, starNumber)}
            className={cn(
              "outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded",
              starSizeClass,
              "transition-colors",
              isFilled
                ? "fill-yellow-400 text-yellow-400 hover:text-yellow-500"
                : "fill-none text-gray-300 hover:text-gray-400"
            )}
            aria-label={`Rate ${starNumber} stars`}
          >
            <Star className={starSizeClass} />
          </button>
        )
      })}
    </div>
  )
}
