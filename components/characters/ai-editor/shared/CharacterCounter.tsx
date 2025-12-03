/**
 * CharacterCounter Component
 * Displays character count with visual feedback for approaching/exceeding limits
 */

import { memo } from 'react'

interface CharacterCounterProps {
  /** Current character count */
  current: number
  /** Maximum allowed characters */
  max: number
  /** Show warning when this percentage of max is reached (default: 80) */
  warningThreshold?: number
  /** Additional CSS classes */
  className?: string
}

function CharacterCounterComponent({
  current,
  max,
  warningThreshold = 80,
  className = '',
}: CharacterCounterProps) {
  const percentage = (current / max) * 100
  const isOverLimit = current > max
  const isWarning = percentage >= warningThreshold && !isOverLimit

  const colorClass = isOverLimit
    ? 'text-red-400'
    : isWarning
      ? 'text-amber-400'
      : 'text-neutral-500'

  return (
    <span
      className={`text-xs tabular-nums ${colorClass} ${className}`}
      role="status"
      aria-live="polite"
      aria-label={`${current} of ${max} characters${isOverLimit ? ', limit exceeded' : ''}`}
    >
      {current} / {max}
    </span>
  )
}

export const CharacterCounter = memo(CharacterCounterComponent)
