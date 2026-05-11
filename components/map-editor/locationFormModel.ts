/**
 * LocationForm Model
 * Pure validation and payload building logic extracted from LocationForm component.
 * No React dependencies - fully testable.
 */

import {
  parseLocationSpecialPropertiesText,
  validateLocationDescription,
  validateLocationDetailField,
  validateLocationImageUrl,
  validateLocationLore,
  validateLocationName,
  validateLocationSpecialPropertiesText,
  type LocationValidationResult,
} from '@/lib/domain/location/validation'
import type { Location, CreateLocationInput, UpdateLocationInput, LocationDifficulty } from '@/lib/types/map'

// ============================================================================
// Types
// ============================================================================

export interface LocationFormErrors {
  name?: string
  description?: string
  imageUrl?: string
  lore?: string
  region?: string
  terrain?: string
  specialPropertiesText?: string
  locationId?: string
}

export interface LocationFormState {
  name: string
  description: string
  imageUrl: string
  lore: string
  region: string
  terrain: string
  difficulty: '' | LocationDifficulty
  specialPropertiesText: string
  selectedLocationId: string
  coordinates: { x: number; y: number }
}

export type LocationFormSubmit =
  | { kind: 'create_new'; input: CreateLocationInput }
  | { kind: 'move_existing'; locationId: string; input: Pick<UpdateLocationInput, 'coordinates'> }
  | { kind: 'edit_existing'; locationId: string; input: UpdateLocationInput }

export const CREATE_NEW_VALUE = '__new__'

// ============================================================================
// Validation
// ============================================================================

function errorMessage(result: LocationValidationResult): string | undefined {
  return result.valid ? undefined : result.error
}

/**
 * Validate name field
 */
function validateName(name: string): string | undefined {
  return errorMessage(validateLocationName(name, { emptyMessage: 'Name is required' }))
}

/**
 * Validate description field
 */
function validateDescription(description: string): string | undefined {
  return errorMessage(validateLocationDescription(description))
}

function validateImageUrl(imageUrl: string): string | undefined {
  return errorMessage(validateLocationImageUrl(imageUrl))
}

function validateLore(lore: string): string | undefined {
  return errorMessage(validateLocationLore(lore))
}

function validateDetail(label: 'Region' | 'Terrain', value: string): string | undefined {
  return errorMessage(validateLocationDetailField(label, value))
}

export function parseSpecialProperties(text: string): string[] {
  return parseLocationSpecialPropertiesText(text)
}

function validateSpecialProperties(text: string): string | undefined {
  return errorMessage(validateLocationSpecialPropertiesText(text))
}

/**
 * Validate location ID for move_existing flow
 */
function validateLocationId(
  selectedLocationId: string,
  locations: Location[]
): string | undefined {
  if (!selectedLocationId) {
    return 'Please choose a location to move'
  }
  if (!locations.some((loc) => loc.id === selectedLocationId)) {
    return 'Selected location not found'
  }
  return undefined
}

function validateDetails(state: LocationFormState, errors: LocationFormErrors): void {
  const descError = validateDescription(state.description)
  if (descError) errors.description = descError

  const imageUrlError = validateImageUrl(state.imageUrl)
  if (imageUrlError) errors.imageUrl = imageUrlError

  const loreError = validateLore(state.lore)
  if (loreError) errors.lore = loreError

  const regionError = validateDetail('Region', state.region)
  if (regionError) errors.region = regionError

  const terrainError = validateDetail('Terrain', state.terrain)
  if (terrainError) errors.terrain = terrainError

  const specialError = validateSpecialProperties(state.specialPropertiesText)
  if (specialError) errors.specialPropertiesText = specialError
}

/**
 * Pure validation for create mode
 */
function validateCreateMode(
  state: LocationFormState,
  locations: Location[]
): LocationFormErrors {
  const errors: LocationFormErrors = {}

  if (state.selectedLocationId === CREATE_NEW_VALUE) {
    // Creating new location
    const nameError = validateName(state.name)
    if (nameError) errors.name = nameError

    validateDetails(state, errors)
  } else {
    // Moving existing location
    const idError = validateLocationId(state.selectedLocationId, locations)
    if (idError) errors.locationId = idError
  }

  return errors
}

/**
 * Pure validation for edit mode
 */
function validateEditMode(state: LocationFormState): LocationFormErrors {
  const errors: LocationFormErrors = {}

  const nameError = validateName(state.name)
  if (nameError) errors.name = nameError

  validateDetails(state, errors)

  return errors
}

/**
 * Validate location form based on mode
 * Returns empty object if valid, otherwise contains error messages
 */
export function validateLocationForm(
  mode: 'create' | 'edit',
  state: LocationFormState,
  locations: Location[]
): LocationFormErrors {
  return mode === 'create'
    ? validateCreateMode(state, locations)
    : validateEditMode(state)
}

/**
 * Check if validation passed (no errors)
 */
export function isValidForm(errors: LocationFormErrors): boolean {
  return Object.keys(errors).length === 0
}

// ============================================================================
// Payload Building
// ============================================================================

function optionalText(value: string): string | undefined {
  return value.trim() || undefined
}

function nullableUpdateText(value: string): string | null {
  return value.trim() || null
}

function nullableExistingText(value: string | null | undefined): string | null {
  return value?.trim() || null
}

function specialPropertiesText(values: string[] | undefined): string {
  return values?.join('\n') ?? ''
}

export function buildLocationFormState(
  location: Location | undefined,
  coordinates: { x: number; y: number },
  selectedLocationId: string = CREATE_NEW_VALUE
): LocationFormState {
  return {
    name: location?.name ?? '',
    description: location?.description ?? '',
    imageUrl: location?.image_url ?? '',
    lore: location?.lore ?? '',
    region: location?.metadata?.properties?.region ?? '',
    terrain: location?.metadata?.properties?.terrain ?? '',
    difficulty: location?.metadata?.properties?.difficulty ?? '',
    specialPropertiesText: specialPropertiesText(location?.metadata?.special_properties),
    selectedLocationId,
    coordinates,
  }
}

/**
 * Extract coordinates from location metadata (handles both formats)
 */
function getLocationCoordinates(
  location: Location
): { x: number; y: number } | undefined {
  const meta = location.metadata
  if (meta?.coordinates) {
    return meta.coordinates
  }
  if (meta?.center && meta.center.length === 2) {
    return { x: meta.center[0], y: meta.center[1] }
  }
  return undefined
}

/**
 * Build update payload for edit mode (only changed fields)
 */
function buildEditUpdates(
  state: LocationFormState,
  location: Location
): UpdateLocationInput {
  const updates: UpdateLocationInput = {}

  const trimmedName = state.name.trim()
  if (trimmedName !== location.name) {
    updates.name = trimmedName
  }

  const trimmedDesc = nullableUpdateText(state.description)
  const existingDesc = nullableExistingText(location.description)
  if (trimmedDesc !== existingDesc) {
    updates.description = trimmedDesc
  }

  const trimmedImageUrl = nullableUpdateText(state.imageUrl)
  const existingImageUrl = nullableExistingText(location.image_url)
  if (trimmedImageUrl !== existingImageUrl) {
    updates.image_url = trimmedImageUrl
  }

  const trimmedLore = nullableUpdateText(state.lore)
  const existingLore = nullableExistingText(location.lore)
  if (trimmedLore !== existingLore) {
    updates.lore = trimmedLore
  }

  const trimmedRegion = nullableUpdateText(state.region)
  const existingRegion = nullableExistingText(location.metadata?.properties?.region)
  if (trimmedRegion !== existingRegion) {
    updates.region = trimmedRegion
  }

  const trimmedTerrain = nullableUpdateText(state.terrain)
  const existingTerrain = nullableExistingText(location.metadata?.properties?.terrain)
  if (trimmedTerrain !== existingTerrain) {
    updates.terrain = trimmedTerrain
  }

  const nextDifficulty = state.difficulty || null
  const existingDifficulty = location.metadata?.properties?.difficulty ?? null
  if (nextDifficulty !== existingDifficulty) {
    updates.difficulty = nextDifficulty
  }

  const nextSpecialProperties = parseSpecialProperties(state.specialPropertiesText)
  const existingSpecialProperties = location.metadata?.special_properties ?? []
  if (nextSpecialProperties.join('\n') !== existingSpecialProperties.join('\n')) {
    updates.special_properties = nextSpecialProperties
  }

  const existingCoords = getLocationCoordinates(location)
  if (
    existingCoords?.x !== state.coordinates.x ||
    existingCoords?.y !== state.coordinates.y
  ) {
    updates.coordinates = state.coordinates
  }

  return updates
}

/**
 * Build submit payload for create_new flow
 */
function buildCreateNewPayload(state: LocationFormState): LocationFormSubmit {
  return {
    kind: 'create_new',
    input: {
      name: state.name.trim(),
      description: optionalText(state.description),
      image_url: optionalText(state.imageUrl),
      lore: optionalText(state.lore),
      region: optionalText(state.region),
      terrain: optionalText(state.terrain),
      difficulty: state.difficulty || undefined,
      special_properties: parseSpecialProperties(state.specialPropertiesText),
      coordinates: state.coordinates,
    },
  }
}

/**
 * Build submit payload for move_existing flow
 */
function buildMoveExistingPayload(state: LocationFormState): LocationFormSubmit {
  return {
    kind: 'move_existing',
    locationId: state.selectedLocationId,
    input: {
      coordinates: state.coordinates,
    },
  }
}

/**
 * Build the form submission payload based on mode
 * Returns null if no changes in edit mode
 */
export function buildLocationFormSubmit(
  mode: 'create' | 'edit',
  state: LocationFormState,
  location?: Location
): LocationFormSubmit | null {
  if (mode === 'create') {
    return state.selectedLocationId === CREATE_NEW_VALUE
      ? buildCreateNewPayload(state)
      : buildMoveExistingPayload(state)
  }

  // Edit mode - requires existing location
  if (!location) {
    return null
  }

  const updates = buildEditUpdates(state, location)

  // Return null if no changes
  if (Object.keys(updates).length === 0) {
    return null
  }

  return {
    kind: 'edit_existing',
    locationId: location.id,
    input: updates,
  }
}
