/**
 * Unit tests for LoreEditor Component
 * T029 [P1] [US1] LoreEditor tests
 *
 * Test Coverage:
 * - Renders with initial lore values
 * - Handles empty lore array
 * - Passes correct props to ArrayFieldEditor
 * - Respects disabled state
 * - Respects readOnly state
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoreEditor } from '@/components/characters/ai-editor/editors/LoreEditor'

// Mock the ArrayFieldEditor
jest.mock('@/components/characters/ai-editor/shared', () => ({
  ArrayFieldEditor: jest.fn(({ label, value, onChange, disabled, readOnly, maxItems, maxCharsPerItem, helpText }) => (
    <div data-testid="array-field-editor">
      <span data-testid="label">{label}</span>
      <span data-testid="value-count">{value.length}</span>
      <span data-testid="disabled">{disabled ? 'true' : 'false'}</span>
      <span data-testid="readonly">{readOnly ? 'true' : 'false'}</span>
      <span data-testid="max-items">{maxItems}</span>
      <span data-testid="max-chars">{maxCharsPerItem}</span>
      <span data-testid="help-text">{helpText}</span>
      <button
        data-testid="trigger-change"
        onClick={() => onChange([...value, 'new lore'])}
      >
        Add Lore
      </button>
    </div>
  )),
}))

describe('LoreEditor', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with initial lore values', () => {
      render(
        <LoreEditor
          value={['Lore entry 1', 'Lore entry 2']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('array-field-editor')).toBeInTheDocument()
      expect(screen.getByTestId('label')).toHaveTextContent('Lore')
      expect(screen.getByTestId('value-count')).toHaveTextContent('2')
    })

    it('should render with empty array', () => {
      render(
        <LoreEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('value-count')).toHaveTextContent('0')
    })

    it('should show help text about lore functionality', () => {
      render(
        <LoreEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('help-text')).toHaveTextContent(/background information/i)
    })

    it('should pass correct maxItems limit', () => {
      render(
        <LoreEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      // FIELD_LIMITS.maxLoreEntries = 20
      expect(screen.getByTestId('max-items')).toHaveTextContent('20')
    })

    it('should pass correct maxCharsPerItem limit', () => {
      render(
        <LoreEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      // FIELD_LIMITS.lore = 500
      expect(screen.getByTestId('max-chars')).toHaveTextContent('500')
    })
  })

  describe('state props', () => {
    it('should pass disabled prop', () => {
      render(
        <LoreEditor
          value={[]}
          onChange={mockOnChange}
          disabled={true}
        />
      )

      expect(screen.getByTestId('disabled')).toHaveTextContent('true')
    })

    it('should pass readOnly prop', () => {
      render(
        <LoreEditor
          value={[]}
          onChange={mockOnChange}
          readOnly={true}
        />
      )

      expect(screen.getByTestId('readonly')).toHaveTextContent('true')
    })

    it('should default disabled to false', () => {
      render(
        <LoreEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('disabled')).toHaveTextContent('false')
    })

    it('should default readOnly to false', () => {
      render(
        <LoreEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('readonly')).toHaveTextContent('false')
    })
  })

  describe('onChange handling', () => {
    it('should call onChange when entries change', async () => {
      const user = userEvent.setup()

      render(
        <LoreEditor
          value={['Lore entry']}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByTestId('trigger-change'))

      expect(mockOnChange).toHaveBeenCalledWith(['Lore entry', 'new lore'])
    })

    it('should allow empty array (lore is optional)', async () => {
      const user = userEvent.setup()

      // Unlike BioEditor, LoreEditor allows empty arrays
      render(
        <LoreEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByTestId('trigger-change'))

      expect(mockOnChange).toHaveBeenCalledWith(['new lore'])
    })
  })

  describe('memoization', () => {
    it('should be wrapped in React.memo', () => {
      expect(LoreEditor.$$typeof).toBeDefined()
    })
  })
})
