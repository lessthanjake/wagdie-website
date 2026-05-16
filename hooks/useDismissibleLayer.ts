'use client'

import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

interface UseDismissibleLayerOptions {
  enabled: boolean
  onDismiss: () => void
  dismissOnOutsideMouseDown?: boolean
  dismissOnEscape?: boolean
}

export function useDismissibleLayer<T extends HTMLElement>(
  ref: RefObject<T | null>,
  {
    enabled,
    onDismiss,
    dismissOnOutsideMouseDown = true,
    dismissOnEscape = true
  }: UseDismissibleLayerOptions
): void {
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    if (!enabled) return

    const handleMouseDown = (event: MouseEvent) => {
      const element = ref.current

      if (element && !element.contains(event.target as Node)) {
        onDismissRef.current()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onDismissRef.current()
      }
    }

    if (dismissOnOutsideMouseDown) {
      document.addEventListener('mousedown', handleMouseDown)
    }

    if (dismissOnEscape) {
      document.addEventListener('keydown', handleKeyDown)
    }

    return () => {
      if (dismissOnOutsideMouseDown) {
        document.removeEventListener('mousedown', handleMouseDown)
      }

      if (dismissOnEscape) {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }
  }, [dismissOnEscape, dismissOnOutsideMouseDown, enabled, ref])
}
