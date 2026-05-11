import {
  CREATE_NEW_VALUE,
  buildLocationFormSubmit,
  buildLocationFormState,
  parseSpecialProperties,
  validateLocationForm,
  type LocationFormState,
} from '@/components/map-editor/locationFormModel'
import type { Location } from '@/lib/types/map'

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'loc-1',
    name: 'The Abyss',
    description: 'A dark and treacherous realm',
    image_url: null,
    lore: null,
    metadata: {
      bounds: [[0, 0], [50, 50]],
      center: [25, 25],
      coordinates: { x: 25, y: 25 },
    },
    created_at: '2026-05-11T00:00:00.000Z',
    updated_at: '2026-05-11T00:00:00.000Z',
    ...overrides,
  }
}

function makeState(overrides: Partial<LocationFormState> = {}): LocationFormState {
  return {
    name: 'The Abyss',
    description: '',
    imageUrl: '',
    lore: '',
    region: '',
    terrain: '',
    difficulty: '',
    specialPropertiesText: '',
    selectedLocationId: CREATE_NEW_VALUE,
    coordinates: { x: 10, y: 20 },
    ...overrides,
  }
}

describe('locationFormModel', () => {
  it('reuses shared validation messages for create-new rich fields', () => {
    const errors = validateLocationForm('create', makeState({
      name: '   ',
      imageUrl: 'images/location.png',
      region: 'x'.repeat(101),
      specialPropertiesText: 'x'.repeat(81),
    }), [])

    expect(errors).toEqual({
      name: 'Name is required',
      imageUrl: 'Image URL must be root-relative or start with http:// or https://',
      region: 'Region cannot exceed 100 characters',
      specialPropertiesText: 'Special properties cannot exceed 80 characters each',
    })
  })

  it('leaves move-existing validation scoped to selected location only', () => {
    const state = makeState({
      name: '',
      imageUrl: 'not-a-url',
      selectedLocationId: 'loc-2',
    })

    expect(validateLocationForm('create', state, [makeLocation({ id: 'loc-2' })])).toEqual({})
    expect(validateLocationForm('create', { ...state, selectedLocationId: 'missing' }, [makeLocation({ id: 'loc-2' })])).toEqual({
      locationId: 'Selected location not found',
    })
  })

  it('parses special properties exactly as form payloads expect', () => {
    expect(parseSpecialProperties(' Cursed, Hidden\ncursed ,, Ancient ')).toEqual([
      'Cursed',
      'Hidden',
      'Ancient',
    ])
  })

  it('builds create payloads with shared special-property parsing', () => {
    const submit = buildLocationFormSubmit('create', makeState({
      name: ' New Place ',
      specialPropertiesText: 'Cursed, Hidden\nCursed',
    }))

    expect(submit).toEqual({
      kind: 'create_new',
      input: expect.objectContaining({
        name: 'New Place',
        special_properties: ['Cursed', 'Hidden'],
        coordinates: { x: 10, y: 20 },
      }),
    })
  })

  it('validates edit-mode rich fields through shared rules', () => {
    expect(validateLocationForm('edit', makeState({
      imageUrl: 'images/location.png',
      terrain: 'x'.repeat(101),
    }), [])).toEqual({
      imageUrl: 'Image URL must be root-relative or start with http:// or https://',
      terrain: 'Terrain cannot exceed 100 characters',
    })
  })

  it('builds edit payloads with shared special-property parsing', () => {
    const location = makeLocation({
      id: 'loc-edit',
      metadata: {
        bounds: [[0, 0], [50, 50]],
        coordinates: { x: 25, y: 25 },
        center: [25, 25],
        special_properties: ['Cursed'],
      },
    })
    const state = {
      ...buildLocationFormState(location, { x: 25, y: 25 }),
      specialPropertiesText: 'Cursed\nHidden\ncursed',
    }

    expect(buildLocationFormSubmit('edit', state, location)).toEqual({
      kind: 'edit_existing',
      locationId: 'loc-edit',
      input: {
        special_properties: ['Cursed', 'Hidden'],
      },
    })
  })

  it('hydrates form state special properties from location metadata', () => {
    expect(buildLocationFormState(makeLocation({
      metadata: {
        bounds: [[0, 0], [50, 50]],
        special_properties: ['Cursed', 'Hidden'],
      },
    }), { x: 1, y: 2 }).specialPropertiesText).toBe('Cursed\nHidden')
  })
})
