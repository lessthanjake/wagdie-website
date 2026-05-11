import type { LocationDifficulty } from '@/lib/types/map'

export const locationValidationLimits = {
  nameMinLength: 1,
  nameMaxLength: 200,
  descriptionMaxLength: 2000,
  imageUrlMaxLength: 2048,
  loreMaxLength: 5000,
  detailMaxLength: 100,
  specialPropertiesMaxCount: 20,
  specialPropertyMaxLength: 80,
} as const

export const validLocationDifficulties: readonly LocationDifficulty[] = ['easy', 'medium', 'hard']

export type LocationValidationResult = {
  valid: boolean
  error?: string
}

type LocationNameValidationOptions = {
  missingMessage?: string
  emptyMessage?: string
}

export function validateLocationName(
  value: unknown,
  options: LocationNameValidationOptions = {}
): LocationValidationResult {
  const missingMessage = options.missingMessage ?? 'Name is required'
  const emptyMessage = options.emptyMessage ?? 'Name cannot be empty'

  if (typeof value !== 'string') {
    return { valid: false, error: missingMessage }
  }

  const trimmed = value.trim()
  if (trimmed.length < locationValidationLimits.nameMinLength) {
    return { valid: false, error: emptyMessage }
  }

  if (trimmed.length > locationValidationLimits.nameMaxLength) {
    return {
      valid: false,
      error: `Name cannot exceed ${locationValidationLimits.nameMaxLength} characters`,
    }
  }

  return { valid: true }
}

export function validateLocationDescription(value: unknown): LocationValidationResult {
  if (value === undefined || value === null) {
    return { valid: true }
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'Description must be a string' }
  }

  if (value.length > locationValidationLimits.descriptionMaxLength) {
    return {
      valid: false,
      error: `Description cannot exceed ${locationValidationLimits.descriptionMaxLength} characters`,
    }
  }

  return { valid: true }
}

export function validateLocationImageUrl(value: unknown): LocationValidationResult {
  if (value === undefined || value === null) {
    return { valid: true }
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'Image URL must be a string' }
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return { valid: true }
  }

  if (trimmed.length > locationValidationLimits.imageUrlMaxLength) {
    return {
      valid: false,
      error: `Image URL cannot exceed ${locationValidationLimits.imageUrlMaxLength} characters`,
    }
  }

  if (!trimmed.startsWith('/') && !/^https?:\/\//i.test(trimmed)) {
    return { valid: false, error: 'Image URL must be root-relative or start with http:// or https://' }
  }

  return { valid: true }
}

export function validateLocationLore(value: unknown): LocationValidationResult {
  if (value === undefined || value === null) {
    return { valid: true }
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'Lore must be a string' }
  }

  if (value.length > locationValidationLimits.loreMaxLength) {
    return {
      valid: false,
      error: `Lore cannot exceed ${locationValidationLimits.loreMaxLength} characters`,
    }
  }

  return { valid: true }
}

export function validateLocationDetailField(
  label: 'Region' | 'Terrain',
  value: unknown
): LocationValidationResult {
  if (value === undefined || value === null) {
    return { valid: true }
  }

  if (typeof value !== 'string') {
    return { valid: false, error: `${label} must be a string` }
  }

  if (value.length > locationValidationLimits.detailMaxLength) {
    return {
      valid: false,
      error: `${label} cannot exceed ${locationValidationLimits.detailMaxLength} characters`,
    }
  }

  return { valid: true }
}

export function validateLocationDifficulty(value: unknown): LocationValidationResult {
  if (value === undefined || value === null) {
    return { valid: true }
  }

  if (!validLocationDifficulties.includes(value as LocationDifficulty)) {
    return { valid: false, error: 'Difficulty must be easy, medium, or hard' }
  }

  return { valid: true }
}

export function parseLocationSpecialPropertiesText(text: string): string[] {
  const seen = new Set<string>()
  const values: string[] = []

  for (const part of text.split(/[\n,]+/)) {
    const trimmed = part.trim()
    if (!trimmed) continue

    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    values.push(trimmed)
  }

  return values
}

export function normalizeLocationSpecialProperties(values: string[] | undefined): string[] | undefined {
  if (values === undefined) return undefined

  const seen = new Set<string>()
  const normalized: string[] = []

  for (const value of values) {
    if (typeof value !== 'string') continue

    const trimmed = value.trim()
    if (!trimmed) continue

    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    normalized.push(trimmed)
  }

  return normalized
}

function validateNormalizedSpecialProperties(values: string[]): LocationValidationResult {
  if (values.length > locationValidationLimits.specialPropertiesMaxCount) {
    return {
      valid: false,
      error: `Special properties cannot exceed ${locationValidationLimits.specialPropertiesMaxCount} entries`,
    }
  }

  if (values.some((value) => value.length > locationValidationLimits.specialPropertyMaxLength)) {
    return {
      valid: false,
      error: `Special properties cannot exceed ${locationValidationLimits.specialPropertyMaxLength} characters each`,
    }
  }

  return { valid: true }
}

export function validateLocationSpecialProperties(values: unknown): LocationValidationResult {
  if (values === undefined) {
    return { valid: true }
  }

  if (!Array.isArray(values)) {
    return { valid: false, error: 'Special properties must be an array' }
  }

  const trimmedValues = values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter(Boolean)

  return validateNormalizedSpecialProperties(trimmedValues)
}

export function validateLocationSpecialPropertiesText(text: string): LocationValidationResult {
  return validateNormalizedSpecialProperties(parseLocationSpecialPropertiesText(text))
}
