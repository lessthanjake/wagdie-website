'use client'

/* eslint-disable @next/next/no-img-element */

/**
 * LocationForm Component
 * Form for creating or editing locations
 */

import { useState, useEffect, useCallback } from 'react'
import { Select } from '@/components/ui'
import type { Location, LocationDifficulty } from '@/lib/types/map'
import {
  validateLocationForm,
  buildLocationFormSubmit,
  buildLocationFormState,
  isValidForm,
  CREATE_NEW_VALUE,
  type LocationFormSubmit,
  type LocationFormErrors,
} from './locationFormModel'

// Re-export for external consumers
export type { LocationFormSubmit } from './locationFormModel'

interface LocationFormProps {
  mode: 'create' | 'edit'
  location?: Location
  locations?: Location[]
  coordinates: { x: number; y: number }
  onSave: (data: LocationFormSubmit) => Promise<void>
  onCancel: () => void
  onDelete?: () => void
  isSubmitting: boolean
}

function isPreviewableImageUrl(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.startsWith('/') || /^https?:\/\//i.test(trimmed)
}

export function LocationForm({
  mode,
  location,
  locations = [],
  coordinates,
  onSave,
  onCancel,
  onDelete,
  isSubmitting,
}: LocationFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [lore, setLore] = useState('')
  const [region, setRegion] = useState('')
  const [terrain, setTerrain] = useState('')
  const [difficulty, setDifficulty] = useState<'' | LocationDifficulty>('')
  const [specialPropertiesText, setSpecialPropertiesText] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState<string>(CREATE_NEW_VALUE)
  const [errors, setErrors] = useState<LocationFormErrors>({})

  const isCreateNew = mode === 'create' && selectedLocationId === CREATE_NEW_VALUE
  const isMoveExisting = mode === 'create' && selectedLocationId !== CREATE_NEW_VALUE

  const selectedLocation = isMoveExisting
    ? locations.find((loc) => loc.id === selectedLocationId)
    : undefined

  // Initialize form with location data in edit mode
  useEffect(() => {
    const initial = buildLocationFormState(mode === 'edit' ? location : undefined, { x: 0, y: 0 })
    setName(initial.name)
    setDescription(initial.description)
    setImageUrl(initial.imageUrl)
    setLore(initial.lore)
    setRegion(initial.region)
    setTerrain(initial.terrain)
    setDifficulty(initial.difficulty)
    setSpecialPropertiesText(initial.specialPropertiesText)
    setSelectedLocationId(CREATE_NEW_VALUE)
    setErrors({})
  }, [mode, location])

  const getFormState = useCallback(() => ({
    name,
    description,
    imageUrl,
    lore,
    region,
    terrain,
    difficulty,
    specialPropertiesText,
    selectedLocationId,
    coordinates,
  }), [
    name,
    description,
    imageUrl,
    lore,
    region,
    terrain,
    difficulty,
    specialPropertiesText,
    selectedLocationId,
    coordinates,
  ])

  const validate = useCallback(() => {
    const newErrors = validateLocationForm(mode, getFormState(), locations)
    setErrors(newErrors)
    return isValidForm(newErrors)
  }, [mode, getFormState, locations])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    try {
      const payload = buildLocationFormSubmit(mode, getFormState(), location)

      if (payload) {
        await onSave(payload)
      } else {
        // No changes in edit mode
        onCancel()
      }
    } catch {
      // Error handled by parent
    }
  }

  const handleCancelClick = () => {
    setSelectedLocationId(CREATE_NEW_VALUE)
    setErrors({})
    onCancel()
  }

  const createModeOptions = [
    { value: CREATE_NEW_VALUE, label: 'Create new location' },
    ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
  ]

  const difficultyOptions = [
    { value: '', label: 'No difficulty' },
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
  ]

  const showDetailsFields = mode === 'edit' || isCreateNew

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-soul-shadow border-l border-soul-accent/30 overflow-y-auto">
      <h2 className="font-display text-xl text-soul-accent mb-4">
        {mode === 'create' ? 'New Location' : 'Edit Location'}
      </h2>

      {/* Coordinates display */}
      <div className="mb-4 p-3 bg-abyss rounded border border-soul-accent/20">
        <label className="block text-sm text-soul-mist mb-1">Coordinates</label>
        <div className="font-mono text-soul-bone">
          X: {Math.round(coordinates.x)}, Y: {Math.round(coordinates.y)}
        </div>
      </div>

      {/* Create mode: choose create new vs move existing */}
      {mode === 'create' && (
        <div className="mb-4">
          <Select
            label="Action"
            value={selectedLocationId}
            onChange={(e) => {
              setSelectedLocationId(e.target.value)
              setErrors((prev) => ({ ...prev, locationId: undefined }))
            }}
            disabled={isSubmitting}
            options={createModeOptions}
          />
          {errors.locationId && (
            <p className="mt-1 text-sm text-soul-ember">
              {errors.locationId}
            </p>
          )}

          {isMoveExisting && (
            <div className="mt-3 p-3 bg-abyss rounded border border-soul-accent/20">
              <p className="text-sm text-soul-mist">
                {selectedLocation
                  ? `Moving "${selectedLocation.name}" to the coordinates above.`
                  : 'Moving selected location to the coordinates above.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Location information fields (create_new + edit only) */}
      {showDetailsFields && (
        <>
          {/* Name field */}
          <div className="mb-4">
            <label htmlFor="location-name" className="block text-sm text-soul-mist mb-1">
              Name <span className="text-soul-ember">*</span>
            </label>
            <input
              id="location-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              className={`
                w-full px-3 py-2 bg-abyss border rounded font-display
                text-soul-bone placeholder-soul-mist/50
                focus:outline-none focus:border-soul-accent
                disabled:opacity-50 disabled:cursor-not-allowed
                ${errors.name ? 'border-soul-ember' : 'border-soul-accent/40'}
              `}
              placeholder="Enter location name"
              aria-describedby={errors.name ? 'name-error' : undefined}
              aria-invalid={!!errors.name}
            />
            {errors.name && (
              <p id="name-error" className="mt-1 text-sm text-soul-ember">
                {errors.name}
              </p>
            )}
          </div>

          {/* Description field */}
          <div className="mb-4">
            <label htmlFor="location-description" className="block text-sm text-soul-mist mb-1">
              Description
            </label>
            <textarea
              id="location-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              className={`
                w-full px-3 py-2 bg-abyss border rounded
                text-soul-bone placeholder-soul-mist/50
                focus:outline-none focus:border-soul-accent
                disabled:opacity-50 disabled:cursor-not-allowed resize-none
                ${errors.description ? 'border-soul-ember' : 'border-soul-accent/40'}
              `}
              placeholder="Enter location description (optional)"
              aria-describedby={errors.description ? 'description-error' : undefined}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p id="description-error" className="mt-1 text-sm text-soul-ember">
                {errors.description}
              </p>
            )}
            <p className="mt-1 text-xs text-soul-mist/60">
              {description.length}/2000 characters
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="location-image-url" className="block text-sm text-soul-mist mb-1">
              Image URL
            </label>
            <input
              id="location-image-url"
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              disabled={isSubmitting}
              className={`
                w-full px-3 py-2 bg-abyss border rounded
                text-soul-bone placeholder-soul-mist/50
                focus:outline-none focus:border-soul-accent
                disabled:opacity-50 disabled:cursor-not-allowed
                ${errors.imageUrl ? 'border-soul-ember' : 'border-soul-accent/40'}
              `}
              placeholder="/images/locations/abyss.png or https://..."
              aria-describedby={errors.imageUrl ? 'image-url-error' : undefined}
              aria-invalid={!!errors.imageUrl}
            />
            {errors.imageUrl && (
              <p id="image-url-error" className="mt-1 text-sm text-soul-ember">
                {errors.imageUrl}
              </p>
            )}
            {imageUrl && isPreviewableImageUrl(imageUrl) && !errors.imageUrl && (
              <div className="mt-2 rounded border border-soul-accent/20 overflow-hidden bg-abyss">
                <img
                  src={imageUrl.trim()}
                  alt="Location preview"
                  className="w-full max-h-36 object-cover"
                />
              </div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="location-lore" className="block text-sm text-soul-mist mb-1">
              Lore
            </label>
            <textarea
              id="location-lore"
              value={lore}
              onChange={(e) => setLore(e.target.value)}
              disabled={isSubmitting}
              rows={5}
              className={`
                w-full px-3 py-2 bg-abyss border rounded
                text-soul-bone placeholder-soul-mist/50
                focus:outline-none focus:border-soul-accent
                disabled:opacity-50 disabled:cursor-not-allowed resize-none
                ${errors.lore ? 'border-soul-ember' : 'border-soul-accent/40'}
              `}
              placeholder="Extended public lore or location notes (optional)"
              aria-describedby={errors.lore ? 'lore-error' : undefined}
              aria-invalid={!!errors.lore}
            />
            {errors.lore && (
              <p id="lore-error" className="mt-1 text-sm text-soul-ember">
                {errors.lore}
              </p>
            )}
            <p className="mt-1 text-xs text-soul-mist/60">
              {lore.length}/5000 characters
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label htmlFor="location-region" className="block text-sm text-soul-mist mb-1">
                Region
              </label>
              <input
                id="location-region"
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 bg-abyss border rounded text-soul-bone placeholder-soul-mist/50 focus:outline-none focus:border-soul-accent disabled:opacity-50 disabled:cursor-not-allowed ${errors.region ? 'border-soul-ember' : 'border-soul-accent/40'}`}
                placeholder="E.g. Northern Wastes"
              />
              {errors.region && <p className="mt-1 text-sm text-soul-ember">{errors.region}</p>}
            </div>

            <div>
              <label htmlFor="location-terrain" className="block text-sm text-soul-mist mb-1">
                Terrain
              </label>
              <input
                id="location-terrain"
                type="text"
                value={terrain}
                onChange={(e) => setTerrain(e.target.value)}
                disabled={isSubmitting}
                className={`w-full px-3 py-2 bg-abyss border rounded text-soul-bone placeholder-soul-mist/50 focus:outline-none focus:border-soul-accent disabled:opacity-50 disabled:cursor-not-allowed ${errors.terrain ? 'border-soul-ember' : 'border-soul-accent/40'}`}
                placeholder="E.g. Ash plains"
              />
              {errors.terrain && <p className="mt-1 text-sm text-soul-ember">{errors.terrain}</p>}
            </div>
          </div>

          <div className="mb-4">
            <Select
              label="Difficulty"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as '' | LocationDifficulty)}
              disabled={isSubmitting}
              options={difficultyOptions}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="location-special-properties" className="block text-sm text-soul-mist mb-1">
              Special Properties
            </label>
            <textarea
              id="location-special-properties"
              value={specialPropertiesText}
              onChange={(e) => setSpecialPropertiesText(e.target.value)}
              disabled={isSubmitting}
              rows={3}
              className={`
                w-full px-3 py-2 bg-abyss border rounded
                text-soul-bone placeholder-soul-mist/50
                focus:outline-none focus:border-soul-accent
                disabled:opacity-50 disabled:cursor-not-allowed resize-none
                ${errors.specialPropertiesText ? 'border-soul-ember' : 'border-soul-accent/40'}
              `}
              placeholder="Cursed ground, hidden crypts"
            />
            {errors.specialPropertiesText && (
              <p className="mt-1 text-sm text-soul-ember">
                {errors.specialPropertiesText}
              </p>
            )}
            <p className="mt-1 text-xs text-soul-mist/60">
              Separate with commas or new lines.
            </p>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="
            flex-1 px-4 py-2 bg-soul-accent text-abyss font-display rounded
            hover:bg-soul-accent/80 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          {isSubmitting ? 'Saving...' : (mode === 'create' && isMoveExisting ? 'Move' : 'Save')}
        </button>
        <button
          type="button"
          onClick={handleCancelClick}
          disabled={isSubmitting}
          className="
            px-4 py-2 bg-abyss text-soul-bone font-display rounded
            border border-soul-accent/60 hover:bg-soul-accent/20 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          Cancel
        </button>
      </div>

      {/* Delete button (edit mode only) */}
      {mode === 'edit' && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={isSubmitting}
          className="
            w-full mt-3 px-4 py-2 bg-transparent text-soul-ember font-display rounded
            border border-soul-ember/60 hover:bg-soul-ember/20 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
        >
          Delete Location
        </button>
      )}
    </form>
  )
}
