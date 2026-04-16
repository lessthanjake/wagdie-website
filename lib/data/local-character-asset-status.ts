export const MISSING_LOCAL_CHARACTER_IMAGE_TOKEN_IDS = [] as const

const MISSING_LOCAL_CHARACTER_IMAGE_TOKEN_ID_SET = new Set<number>(MISSING_LOCAL_CHARACTER_IMAGE_TOKEN_IDS)

export function hasLocalCharacterImage(tokenId: number): boolean {
  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 6666) {
    return false
  }

  return !MISSING_LOCAL_CHARACTER_IMAGE_TOKEN_ID_SET.has(tokenId)
}
