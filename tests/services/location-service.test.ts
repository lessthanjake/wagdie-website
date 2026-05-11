jest.mock('@/lib/repositories/locationRepository', () => ({
  LocationRepository: jest.fn(),
}))

import { LocationService, ValidationError } from '@/lib/services/location-service'
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

function makeRepository() {
  return {
    getAll: jest.fn(),
    getById: jest.fn(),
    getAllIds: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getStakedCharacterCount: jest.fn(),
  }
}

describe('LocationService validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('aggregates create validation errors before persistence', async () => {
    const repository = makeRepository()
    const service = new LocationService(repository as never)

    await expect(service.create({
      name: '',
      description: 123,
      image_url: 'images/location.png',
      lore: 123,
      region: 'x'.repeat(101),
      terrain: 123,
      difficulty: 'brutal',
      special_properties: 'not-an-array',
      coordinates: { x: -1, y: 20 },
    } as never, '0xAdmin')).rejects.toMatchObject({
      name: 'ValidationError',
      details: [
        'Name is required',
        'Description must be a string',
        'Coordinates must be within map bounds (0-1000, 0-1000)',
        'Image URL must be root-relative or start with http:// or https://',
        'Lore must be a string',
        'Region cannot exceed 100 characters',
        'Terrain must be a string',
        'Difficulty must be easy, medium, or hard',
        'Special properties must be an array',
      ],
    })

    expect(repository.getAllIds).not.toHaveBeenCalled()
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('keeps whitespace-only service name behavior distinct from form copy', async () => {
    const repository = makeRepository()
    const service = new LocationService(repository as never)

    try {
      await service.create({
        name: '   ',
        coordinates: { x: 10, y: 20 },
      } as never, '0xAdmin')
      throw new Error('Expected create to reject')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      expect((error as ValidationError).details).toEqual(['Name cannot be empty'])
    }
  })

  it('aggregates update enrichment validation after confirming the location exists', async () => {
    const repository = makeRepository()
    repository.getById.mockResolvedValue(makeLocation())
    const service = new LocationService(repository as never)

    await expect(service.update('loc-1', {
      image_url: 'images/location.png',
      lore: 123,
      difficulty: 'brutal',
      special_properties: Array.from({ length: 21 }, (_, index) => `Prop ${index}`),
    } as never, '0xAdmin')).rejects.toMatchObject({
      name: 'ValidationError',
      details: [
        'Image URL must be root-relative or start with http:// or https://',
        'Lore must be a string',
        'Difficulty must be easy, medium, or hard',
        'Special properties cannot exceed 20 entries',
      ],
    })

    expect(repository.update).not.toHaveBeenCalled()
  })
})
