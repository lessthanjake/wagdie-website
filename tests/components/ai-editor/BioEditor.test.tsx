/**
 * Unit tests for BioEditor Component
 * T028 [P1] [US1] BioEditor tests
 *
 * Test Coverage:
 * - Renders with initial bio values
 * - Ensures at least one bio entry exists
 * - Handles onChange correctly
 * - Respects disabled state
 * - Respects readOnly state
 * - Shows required field indicator
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BioEditor } from '@/components/characters/ai-editor/editors/BioEditor'

// Mock the ArrayFieldEditor since we're testing BioEditor logic
jest.mock('@/components/characters/ai-editor/shared', () => ({
  ArrayFieldEditor: jest.fn(({ label, value, onChange, disabled, readOnly, helpText }) => (
    <div data-testid="array-field-editor">
      <span data-testid="label">{label}</span>
      <span data-testid="value-count">{value.length}</span>
      <span data-testid="disabled">{disabled ? 'true' : 'false'}</span>
      <span data-testid="readonly">{readOnly ? 'true' : 'false'}</span>
      <span data-testid="help-text">{helpText}</span>
      <button
        data-testid="trigger-change-empty"
        onClick={() => onChange([])}
      >
        Clear All
      </button>
      <button
        data-testid="trigger-change-add"
        onClick={() => onChange([...value, 'new entry'])}
      >
        Add Entry
      </button>
    </div>
  )),
}))

describe('BioEditor', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with initial bio values', () => {
      render(
        <BioEditor
          value={['Bio entry 1', 'Bio entry 2']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('array-field-editor')).toBeInTheDocument()
      expect(screen.getByTestId('label')).toHaveTextContent('Bio')
      expect(screen.getByTestId('value-count')).toHaveTextContent('2')
    })

    it('should normalize empty array to have at least one entry', () => {
      render(
        <BioEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      // Even with empty array, should show 1 entry (empty string)
      expect(screen.getByTestId('value-count')).toHaveTextContent('1')
    })

    it('should show required field indicator', () => {
      render(
        <BioEditor
          value={['Bio entry']}
          onChange={mockOnChange}
        />
      )

      // There are multiple elements with "required" text - check for the specific message
      const helpText = screen.getByTestId('help-text')
      expect(helpText.textContent).toMatch(/required/i)
    })

    it('should show help text about bio functionality', () => {
      render(
        <BioEditor
          value={['Bio entry']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('help-text')).toHaveTextContent(/biographical snippets/i)
    })
  })

  describe('state props', () => {
    it('should pass disabled prop to ArrayFieldEditor', () => {
      render(
        <BioEditor
          value={['Bio entry']}
          onChange={mockOnChange}
          disabled={true}
        />
      )

      expect(screen.getByTestId('disabled')).toHaveTextContent('true')
    })

    it('should pass readOnly prop to ArrayFieldEditor', () => {
      render(
        <BioEditor
          value={['Bio entry']}
          onChange={mockOnChange}
          readOnly={true}
        />
      )

      expect(screen.getByTestId('readonly')).toHaveTextContent('true')
    })

    it('should default disabled to false', () => {
      render(
        <BioEditor
          value={['Bio entry']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('disabled')).toHaveTextContent('false')
    })

    it('should default readOnly to false', () => {
      render(
        <BioEditor
          value={['Bio entry']}
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
        <BioEditor
          value={['Bio entry']}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByTestId('trigger-change-add'))

      expect(mockOnChange).toHaveBeenCalledWith(['Bio entry', 'new entry'])
    })

    it('should ensure at least one entry when all are removed', async () => {
      const user = userEvent.setup()

      render(
        <BioEditor
          value={['Bio entry']}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByTestId('trigger-change-empty'))

      // Should call onChange with [''] to maintain at least one entry
      expect(mockOnChange).toHaveBeenCalledWith([''])
    })
  })

  describe('memoization', () => {
    it('should be wrapped in React.memo', () => {
      // BioEditor is exported as memo component
      expect(BioEditor.$$typeof).toBeDefined()
    })
  })
})
