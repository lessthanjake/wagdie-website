/**
 * Unit tests for TopicsEditor Component
 * T034 [P1] [US2] TopicsEditor tests
 *
 * Test Coverage:
 * - Renders with initial topic values
 * - Uses input type (chip style) not textarea
 * - Passes correct limits for topics
 * - Respects disabled state
 * - Respects readOnly state
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TopicsEditor } from '@/components/characters/ai-editor/editors/TopicsEditor'

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
        onClick={() => onChange([...value, 'new topic'])}
      >
        Add Topic
      </button>
    </div>
  )),
}))

describe('TopicsEditor', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with initial topic values', () => {
      render(
        <TopicsEditor
          value={['Gaming', 'Philosophy', 'Art']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('array-field-editor')).toBeInTheDocument()
      expect(screen.getByTestId('label')).toHaveTextContent('Topics')
      expect(screen.getByTestId('value-count')).toHaveTextContent('3')
    })

    it('should render with empty array', () => {
      render(
        <TopicsEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('value-count')).toHaveTextContent('0')
    })

    it('should use input type for chip-style display', () => {
      render(
        <TopicsEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('input-type')).toHaveTextContent('input')
    })

    it('should not show indices (chips do not need numbering)', () => {
      render(
        <TopicsEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('show-indices')).toHaveTextContent('false')
    })

    it('should pass correct maxItems limit', () => {
      render(
        <TopicsEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      // FIELD_LIMITS.maxTopics = 30
      expect(screen.getByTestId('max-items')).toHaveTextContent('30')
    })

    it('should pass correct maxCharsPerItem limit', () => {
      render(
        <TopicsEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      // FIELD_LIMITS.topic = 50
      expect(screen.getByTestId('max-chars')).toHaveTextContent('50')
    })
  })

  describe('state props', () => {
    it('should pass disabled prop', () => {
      render(
        <TopicsEditor
          value={[]}
          onChange={mockOnChange}
          disabled={true}
        />
      )

      expect(screen.getByTestId('disabled')).toHaveTextContent('true')
    })

    it('should pass readOnly prop', () => {
      render(
        <TopicsEditor
          value={[]}
          onChange={mockOnChange}
          readOnly={true}
        />
      )

      expect(screen.getByTestId('readonly')).toHaveTextContent('true')
    })
  })

  describe('onChange handling', () => {
    it('should call onChange when topics change', async () => {
      const user = userEvent.setup()

      render(
        <TopicsEditor
          value={['Gaming']}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByTestId('trigger-change'))

      expect(mockOnChange).toHaveBeenCalledWith(['Gaming', 'new topic'])
    })
  })

  describe('memoization', () => {
    it('should be wrapped in React.memo', () => {
      expect(TopicsEditor.$$typeof).toBeDefined()
    })
  })
})
