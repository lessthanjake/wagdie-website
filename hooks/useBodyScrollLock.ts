'use client'

import { useEffect } from 'react';

let lockCount = 0;
let previousOverflow: string | null = null;

function acquireBodyScrollLock() {
  if (typeof document === 'undefined') return;

  if (lockCount === 0) {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  lockCount += 1;
}

function releaseBodyScrollLock() {
  if (typeof document === 'undefined') return;

  lockCount = Math.max(0, lockCount - 1);

  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow ?? '';
    previousOverflow = null;
  }
}

export function useBodyScrollLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    acquireBodyScrollLock();
    return releaseBodyScrollLock;
  }, [enabled]);
}
