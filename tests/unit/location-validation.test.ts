import {
  locationValidationLimits,
  normalizeLocationSpecialProperties,
  parseLocationSpecialPropertiesText,
  validateLocationDescription,
  validateLocationDifficulty,
  validateLocationDetailField,
  validateLocationImageUrl,
  validateLocationLore,
  validateLocationName,
  validateLocationSpecialProperties,
  validateLocationSpecialPropertiesText,
} from '@/lib/domain/location/validation'

describe('location validation domain rules', () => {
  it('validates location names with caller-controlled empty-name copy', () => {
    expect(validateLocationName('The Abyss')).toEqual({ valid: true })
    expect(validateLocationName(undefined)).toEqual({ valid: false, error: 'Name is required' })
    expect(validateLocationName('   ')).toEqual({ valid: false, error: 'Name cannot be empty' })
    expect(validateLocationName('   ', { emptyMessage: 'Name is required' })).toEqual({
      valid: false,
      error: 'Name is required',
    })
    expect(validateLocationName('x'.repeat(locationValidationLimits.nameMaxLength + 1))).toEqual({
      valid: false,
      error: `Name cannot exceed ${locationValidationLimits.nameMaxLength} characters`,
    })
  })

  it('validates URL shape and max length', () => {
    expect(validateLocationImageUrl('/images/location.png')).toEqual({ valid: true })
    expect(validateLocationImageUrl('https://example.com/location.png')).toEqual({ valid: true })
    expect(validateLocationImageUrl('ftp://example.com/location.png')).toEqual({
      valid: false,
      error: 'Image URL must be root-relative or start with http:// or https://',
    })
    expect(validateLocationImageUrl(`/${'x'.repeat(locationValidationLimits.imageUrlMaxLength)}`)).toEqual({
      valid: false,
      error: `Image URL cannot exceed ${locationValidationLimits.imageUrlMaxLength} characters`,
    })
  })

  it('validates text limits for description, lore, region, and terrain', () => {
    expect(validateLocationDescription('x'.repeat(locationValidationLimits.descriptionMaxLength + 1))).toEqual({
      valid: false,
      error: `Description cannot exceed ${locationValidationLimits.descriptionMaxLength} characters`,
    })
    expect(validateLocationLore('x'.repeat(locationValidationLimits.loreMaxLength + 1))).toEqual({
      valid: false,
      error: `Lore cannot exceed ${locationValidationLimits.loreMaxLength} characters`,
    })
    expect(validateLocationDetailField('Region', 'x'.repeat(locationValidationLimits.detailMaxLength + 1))).toEqual({
      valid: false,
      error: `Region cannot exceed ${locationValidationLimits.detailMaxLength} characters`,
    })
    expect(validateLocationDetailField('Terrain', 123)).toEqual({
      valid: false,
      error: 'Terrain must be a string',
    })
  })

  it('validates difficulty enum values', () => {
    expect(validateLocationDifficulty('easy')).toEqual({ valid: true })
    expect(validateLocationDifficulty(null)).toEqual({ valid: true })
    expect(validateLocationDifficulty('brutal')).toEqual({
      valid: false,
      error: 'Difficulty must be easy, medium, or hard',
    })
  })

  it('parses text special properties with trimming and case-insensitive dedupe', () => {
    expect(parseLocationSpecialPropertiesText(' Cursed, Hidden\ncursed ,, Ancient ')).toEqual([
      'Cursed',
      'Hidden',
      'Ancient',
    ])
  })

  it('validates special property count and item length', () => {
    const tooManyText = Array.from({ length: locationValidationLimits.specialPropertiesMaxCount + 1 }, (_, index) => `Prop ${index}`).join('\n')
    expect(validateLocationSpecialPropertiesText(tooManyText)).toEqual({
      valid: false,
      error: `Special properties cannot exceed ${locationValidationLimits.specialPropertiesMaxCount} entries`,
    })

    expect(validateLocationSpecialPropertiesText('x'.repeat(locationValidationLimits.specialPropertyMaxLength + 1))).toEqual({
      valid: false,
      error: `Special properties cannot exceed ${locationValidationLimits.specialPropertyMaxLength} characters each`,
    })

    expect(validateLocationSpecialProperties('not-an-array')).toEqual({
      valid: false,
      error: 'Special properties must be an array',
    })
  })

  it('preserves legacy array validation behavior for non-string special properties', () => {
    expect(validateLocationSpecialProperties([123, ' Cursed '])).toEqual({ valid: true })
  })

  it('normalizes special properties for persistence', () => {
    expect(normalizeLocationSpecialProperties([' Cursed ', '', 'cursed', 'Hidden'])).toEqual([
      'Cursed',
      'Hidden',
    ])
    expect(normalizeLocationSpecialProperties([123, ' Cursed '] as never)).toEqual(['Cursed'])
    expect(normalizeLocationSpecialProperties(undefined)).toBeUndefined()
  })
})
