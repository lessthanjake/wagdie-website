/**
 * Unit tests for AdjectivesEditor Component
 * T035 [P1] [US2] AdjectivesEditor tests
 *
 * Test Coverage:
 * - Renders with initial adjective values
 * - Uses input type (chip style) not textarea
 * - Passes correct limits for adjectives
 * - Respects disabled state
 * - Respects readOnly state
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdjectivesEditor } from '@/components/characters/ai-editor/editors/AdjectivesEditor'

// Mock the ArrayFieldEditor
jest.mock('@/components/characters/ai-editor/shared', () => ({
  ArrayFieldEditor: jest.fn(({ label, value, onChange, disabled, readOnly, maxItems, maxCharsPerItem, inputType, showIndices }) => (
    <div data-testid="array-field-editor">
      <span data-testid="label">{label}</span>
      <span data-testid="value-count">{value.length}</span>
      <span data-testid="disabled">{disabled ? 'true' : 'false'}</span>
      <span data-testid="readonly">{readOnly ? 'true' : 'false'}</span>
      <span data-testid="max-items">{maxItems}</span>
      <span data-testid="max-chars">{maxCharsPerItem}</span>
      <span data-testid="input-type">{inputType}</span>
      <span data-testid="show-indices">{showIndices ? 'true' : 'false'}</span>
      <button
        data-testid="trigger-change"
        onClick={() => onChange([...value, 'new adjective'])}
      >
        Add Adjective
      </button>
    </div>
  )),
}))

describe('AdjectivesEditor', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with initial adjective values', () => {
      render(
        <AdjectivesEditor
          value={['Brave', 'Mysterious', 'Ancient']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('array-field-editor')).toBeInTheDocument()
      expect(screen.getByTestId('label')).toHaveTextContent('Adjectives')
      expect(screen.getByTestId('value-count')).toHaveTextContent('3')
    })

    it('should render with empty array', () => {
      render(
        <AdjectivesEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('value-count')).toHaveTextContent('0')
    })

    it('should use input type for chip-style display', () => {
      render(
        <AdjectivesEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('input-type')).toHaveTextContent('input')
    })

    it('should not show indices', () => {
      render(
        <AdjectivesEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('show-indices')).toHaveTextContent('false')
    })

    it('should pass correct maxItems limit', () => {
      render(
        <AdjectivesEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      // FIELD_LIMITS.maxAdjectives = 20
      expect(screen.getByTestId('max-items')).toHaveTextContent('20')
    })

    it('should pass correct maxCharsPerItem limit', () => {
      render(
        <AdjectivesEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      // FIELD_LIMITS.adjective = 30
      expect(screen.getByTestId('max-chars')).toHaveTextContent('30')
    })
  })

  describe('state props', () => {
    it('should pass disabled prop', () => {
      render(
        <AdjectivesEditor
          value={[]}
          onChange={mockOnChange}
          disabled={true}
        />
      )

      expect(screen.getByTestId('disabled')).toHaveTextContent('true')
    })

    it('should pass readOnly prop', () => {
      render(
        <AdjectivesEditor
          value={[]}
          onChange={mockOnChange}
          readOnly={true}
        />
      )

      expect(screen.getByTestId('readonly')).toHaveTextContent('true')
    })
  })

  describe('onChange handling', () => {
    it('should call onChange when adjectives change', async () => {
      const user = userEvent.setup()

      render(
        <AdjectivesEditor
          value={['Brave']}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByTestId('trigger-change'))

      expect(mockOnChange).toHaveBeenCalledWith(['Brave', 'new adjective'])
    })
  })

  describe('memoization', () => {
    it('should be wrapped in React.memo', () => {
      expect(AdjectivesEditor.$$typeof).toBeDefined()
    })
  })
})
