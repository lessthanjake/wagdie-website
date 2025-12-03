/**
 * Unit tests for PostExamplesEditor Component
 * T043 [P2] [US4] PostExamplesEditor tests
 *
 * Test Coverage:
 * - Renders with initial post examples
 * - Passes correct limits for posts
 * - Respects disabled state
 * - Respects readOnly state
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PostExamplesEditor } from '@/components/characters/ai-editor/editors/PostExamplesEditor'

// Mock the ArrayFieldEditor
jest.mock('@/components/characters/ai-editor/shared', () => ({
  ArrayFieldEditor: jest.fn(({ label, value, onChange, disabled, readOnly, maxItems, maxCharsPerItem, helpText, showIndices }) => (
    <div data-testid="array-field-editor">
      <span data-testid="label">{label}</span>
      <span data-testid="value-count">{value.length}</span>
      <span data-testid="disabled">{disabled ? 'true' : 'false'}</span>
      <span data-testid="readonly">{readOnly ? 'true' : 'false'}</span>
      <span data-testid="max-items">{maxItems}</span>
      <span data-testid="max-chars">{maxCharsPerItem}</span>
      <span data-testid="show-indices">{showIndices ? 'true' : 'false'}</span>
      <span data-testid="help-text">{helpText}</span>
      <button
        data-testid="trigger-change"
        onClick={() => onChange([...value, 'new post'])}
      >
        Add Post
      </button>
    </div>
  )),
}))

describe('PostExamplesEditor', () => {
  const mockOnChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with initial post examples', () => {
      render(
        <PostExamplesEditor
          value={['Post 1', 'Post 2']}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('array-field-editor')).toBeInTheDocument()
      expect(screen.getByTestId('label')).toHaveTextContent('Post Examples')
      expect(screen.getByTestId('value-count')).toHaveTextContent('2')
    })

    it('should render with empty array', () => {
      render(
        <PostExamplesEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('value-count')).toHaveTextContent('0')
    })

    it('should show help text about post examples', () => {
      render(
        <PostExamplesEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('help-text')).toHaveTextContent(/social media posts/i)
    })

    it('should show indices (numbered list)', () => {
      render(
        <PostExamplesEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('show-indices')).toHaveTextContent('true')
    })

    it('should pass correct maxItems limit', () => {
      render(
        <PostExamplesEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      // FIELD_LIMITS.maxPostExamples = 20
      expect(screen.getByTestId('max-items')).toHaveTextContent('20')
    })

    it('should pass correct maxCharsPerItem limit', () => {
      render(
        <PostExamplesEditor
          value={[]}
          onChange={mockOnChange}
        />
      )

      // FIELD_LIMITS.postExample = 280 (Twitter-like limit)
      expect(screen.getByTestId('max-chars')).toHaveTextContent('280')
    })
  })

  describe('state props', () => {
    it('should pass disabled prop', () => {
      render(
        <PostExamplesEditor
          value={[]}
          onChange={mockOnChange}
          disabled={true}
        />
      )

      expect(screen.getByTestId('disabled')).toHaveTextContent('true')
    })

    it('should pass readOnly prop', () => {
      render(
        <PostExamplesEditor
          value={[]}
          onChange={mockOnChange}
          readOnly={true}
        />
      )

      expect(screen.getByTestId('readonly')).toHaveTextContent('true')
    })
  })

  describe('onChange handling', () => {
    it('should call onChange when posts change', async () => {
      const user = userEvent.setup()

      render(
        <PostExamplesEditor
          value={['Existing post']}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByTestId('trigger-change'))

      expect(mockOnChange).toHaveBeenCalledWith(['Existing post', 'new post'])
    })
  })

  describe('memoization', () => {
    it('should be wrapped in React.memo', () => {
      expect(PostExamplesEditor.$$typeof).toBeDefined()
    })
  })
})
