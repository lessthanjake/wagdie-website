/**
 * Unit tests for StyleEditor Component
 * T039 [P2] [US3] StyleEditor tests
 *
 * Test Coverage:
 * - Renders with initial style values
 * - Has three sections: all, chat, post
 * - Handles onChange for each section
 * - Respects disabled state
 * - Respects readOnly state
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StyleEditor } from '@/components/characters/ai-editor/editors/StyleEditor'
import type { StyleConfig } from '@/types/eliza'

// Track calls to ArrayFieldEditor
const mockArrayFieldEditor = jest.fn()

// Mock the ArrayFieldEditor
jest.mock('@/components/characters/ai-editor/shared', () => ({
  ArrayFieldEditor: jest.fn((props) => {
    mockArrayFieldEditor(props)
    return (
      <div data-testid={`array-field-${props.label.toLowerCase().replace(/[^a-z]/g, '-')}`}>
        <span data-testid={`label-${props.label.toLowerCase().replace(/[^a-z]/g, '-')}`}>{props.label}</span>
        <span data-testid={`value-count-${props.label.toLowerCase().replace(/[^a-z]/g, '-')}`}>
          {props.value.length}
        </span>
        <button
          data-testid={`trigger-change-${props.label.toLowerCase().replace(/[^a-z]/g, '-')}`}
          onClick={() => props.onChange([...props.value, 'new rule'])}
        >
          Add Rule
        </button>
      </div>
    )
  }),
}))

describe('StyleEditor', () => {
  const mockOnChange = jest.fn()

  const defaultStyle: StyleConfig = {
    all: ['Be concise'],
    chat: ['Ask follow-up questions'],
    post: ['Use hashtags'],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render all three style sections', () => {
      render(
        <StyleEditor
          value={defaultStyle}
          onChange={mockOnChange}
        />
      )

      // Check for all three sections
      expect(screen.getByTestId('array-field-all--universal-rules-')).toBeInTheDocument()
      expect(screen.getByTestId('array-field-chat--conversation-rules-')).toBeInTheDocument()
      expect(screen.getByTestId('array-field-post--social-media-rules-')).toBeInTheDocument()
    })

    it('should render section header', () => {
      render(
        <StyleEditor
          value={defaultStyle}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByText('Communication Style')).toBeInTheDocument()
    })

    it('should render with initial style values', () => {
      render(
        <StyleEditor
          value={defaultStyle}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('value-count-all--universal-rules-')).toHaveTextContent('1')
      expect(screen.getByTestId('value-count-chat--conversation-rules-')).toHaveTextContent('1')
      expect(screen.getByTestId('value-count-post--social-media-rules-')).toHaveTextContent('1')
    })

    it('should handle empty/undefined style arrays', () => {
      render(
        <StyleEditor
          value={{}}
          onChange={mockOnChange}
        />
      )

      expect(screen.getByTestId('value-count-all--universal-rules-')).toHaveTextContent('0')
      expect(screen.getByTestId('value-count-chat--conversation-rules-')).toHaveTextContent('0')
      expect(screen.getByTestId('value-count-post--social-media-rules-')).toHaveTextContent('0')
    })
  })

  describe('onChange handling', () => {
    it('should call onChange with updated all rules', async () => {
      const user = userEvent.setup()

      render(
        <StyleEditor
          value={defaultStyle}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByTestId('trigger-change-all--universal-rules-'))

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultStyle,
        all: ['Be concise', 'new rule'],
      })
    })

    it('should call onChange with updated chat rules', async () => {
      const user = userEvent.setup()

      render(
        <StyleEditor
          value={defaultStyle}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByTestId('trigger-change-chat--conversation-rules-'))

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultStyle,
        chat: ['Ask follow-up questions', 'new rule'],
      })
    })

    it('should call onChange with updated post rules', async () => {
      const user = userEvent.setup()

      render(
        <StyleEditor
          value={defaultStyle}
          onChange={mockOnChange}
        />
      )

      await user.click(screen.getByTestId('trigger-change-post--social-media-rules-'))

      expect(mockOnChange).toHaveBeenCalledWith({
        ...defaultStyle,
        post: ['Use hashtags', 'new rule'],
      })
    })
  })

  describe('state props', () => {
    it('should pass disabled prop to all ArrayFieldEditors', () => {
      render(
        <StyleEditor
          value={defaultStyle}
          onChange={mockOnChange}
          disabled={true}
        />
      )

      // Check that ArrayFieldEditor was called 3 times with disabled=true
      const disabledCalls = mockArrayFieldEditor.mock.calls.filter(
        (call) => call[0].disabled === true
      )
      expect(disabledCalls.length).toBe(3)
    })

    it('should pass readOnly prop to all ArrayFieldEditors', () => {
      render(
        <StyleEditor
          value={defaultStyle}
          onChange={mockOnChange}
          readOnly={true}
        />
      )

      const readOnlyCalls = mockArrayFieldEditor.mock.calls.filter(
        (call) => call[0].readOnly === true
      )
      expect(readOnlyCalls.length).toBe(3)
    })
  })

  describe('memoization', () => {
    it('should be wrapped in React.memo', () => {
      expect(StyleEditor.$$typeof).toBeDefined()
    })
  })
})
