/**
 * Unit tests for KnowledgeEditor Component
 * T049 [P3] [US5] KnowledgeEditor tests
 *
 * Test Coverage:
 * - Renders with knowledge documents
 * - Shows document count
 * - Handles upload trigger
 * - Handles remove trigger
 * - Respects disabled state
 * - Respects readOnly state
 * - Shows error messages
 * - Validates file types
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { KnowledgeEditor } from '@/components/characters/ai-editor/editors/KnowledgeEditor'
import type { KnowledgeDocument } from '@/types/eliza'

// Mock alert
const mockAlert = jest.fn()
global.alert = mockAlert

describe('KnowledgeEditor', () => {
  const mockOnUpload = jest.fn()
  const mockOnRemove = jest.fn()

  const mockDocuments: KnowledgeDocument[] = [
    {
      id: 'doc-1',
      filename: 'knowledge.txt',
      size: 1024,
      uploadedAt: '2025-01-01T12:00:00Z',
    },
    {
      id: 'doc-2',
      filename: 'lore.md',
      size: 2048,
      uploadedAt: '2025-01-02T12:00:00Z',
    },
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with knowledge documents', () => {
      render(
        <KnowledgeEditor
          documents={mockDocuments}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByText('Knowledge Documents')).toBeInTheDocument()
      expect(screen.getByText('knowledge.txt')).toBeInTheDocument()
      expect(screen.getByText('lore.md')).toBeInTheDocument()
    })

    it('should show document count', () => {
      render(
        <KnowledgeEditor
          documents={mockDocuments}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      // Shows "2 / 5 documents"
      expect(screen.getByText(/2 \/ 5 documents/)).toBeInTheDocument()
    })

    it('should render with empty documents', () => {
      render(
        <KnowledgeEditor
          documents={[]}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByText(/0 \/ 5 documents/)).toBeInTheDocument()
    })

    it('should show upload area when below limit', () => {
      render(
        <KnowledgeEditor
          documents={[]}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByText(/Click to upload/)).toBeInTheDocument()
    })

    it('should hide upload area when at limit', () => {
      const maxDocuments: KnowledgeDocument[] = Array.from({ length: 5 }, (_, i) => ({
        id: `doc-${i}`,
        filename: `file-${i}.txt`,
        size: 100,
        uploadedAt: new Date().toISOString(),
      }))

      render(
        <KnowledgeEditor
          documents={maxDocuments}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.queryByText(/Click to upload/)).not.toBeInTheDocument()
    })

    it('should show uploading state', () => {
      render(
        <KnowledgeEditor
          documents={[]}
          isUploading={true}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByText('Uploading...')).toBeInTheDocument()
    })

    it('should show error message', () => {
      render(
        <KnowledgeEditor
          documents={[]}
          error="Upload failed"
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByText('Upload failed')).toBeInTheDocument()
    })

    it('should show help text about RAG', () => {
      render(
        <KnowledgeEditor
          documents={[]}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      expect(screen.getByText(/retrieval-augmented generation/i)).toBeInTheDocument()
    })
  })

  describe('state props', () => {
    it('should hide upload area when disabled', () => {
      render(
        <KnowledgeEditor
          documents={[]}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
          disabled={true}
        />
      )

      // Upload area should not be shown when disabled
      expect(screen.queryByText(/Click to upload/)).not.toBeInTheDocument()
    })

    it('should hide upload area when readOnly', () => {
      render(
        <KnowledgeEditor
          documents={[]}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
          readOnly={true}
        />
      )

      expect(screen.queryByText(/Click to upload/)).not.toBeInTheDocument()
    })

    it('should hide remove buttons when readOnly', () => {
      render(
        <KnowledgeEditor
          documents={mockDocuments}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
          readOnly={true}
        />
      )

      // Remove buttons should not be present
      expect(screen.queryByRole('button', { name: /Remove/i })).not.toBeInTheDocument()
    })
  })

  describe('document removal', () => {
    it('should call onRemove when remove button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <KnowledgeEditor
          documents={mockDocuments}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      const removeButton = screen.getByRole('button', { name: /Remove knowledge.txt/i })
      await user.click(removeButton)

      expect(mockOnRemove).toHaveBeenCalledWith('doc-1')
    })
  })

  describe('file upload', () => {
    it('should call onUpload with valid .txt file', async () => {
      render(
        <KnowledgeEditor
          documents={[]}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const input = screen.getByLabelText(/Upload knowledge document/i)

      fireEvent.change(input, { target: { files: [file] } })

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(file)
      })
    })

    it('should call onUpload with valid .md file', async () => {
      render(
        <KnowledgeEditor
          documents={[]}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      const file = new File(['# Test'], 'test.md', { type: 'text/markdown' })
      const input = screen.getByLabelText(/Upload knowledge document/i)

      fireEvent.change(input, { target: { files: [file] } })

      await waitFor(() => {
        expect(mockOnUpload).toHaveBeenCalledWith(file)
      })
    })

    it('should reject invalid file types', async () => {
      render(
        <KnowledgeEditor
          documents={[]}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' })
      const input = screen.getByLabelText(/Upload knowledge document/i)

      fireEvent.change(input, { target: { files: [file] } })

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith('Only .txt and .md files are supported')
      })
      expect(mockOnUpload).not.toHaveBeenCalled()
    })

    it('should reject files that are too large', async () => {
      render(
        <KnowledgeEditor
          documents={[]}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      // Create a file larger than 50KB
      const largeContent = 'x'.repeat(60 * 1024)
      const file = new File([largeContent], 'large.txt', { type: 'text/plain' })
      const input = screen.getByLabelText(/Upload knowledge document/i)

      fireEvent.change(input, { target: { files: [file] } })

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('must be under'))
      })
      expect(mockOnUpload).not.toHaveBeenCalled()
    })
  })

  describe('drag and drop', () => {
    it('should have drop zone for file uploads', () => {
      render(
        <KnowledgeEditor
          documents={[]}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      // The drop zone should be present for drag-and-drop file uploads
      const dropZone = screen.getByText(/Click to upload/).closest('div')!
      expect(dropZone).toBeInTheDocument()
    })

    it('should show drag and drop instruction text', () => {
      render(
        <KnowledgeEditor
          documents={[]}
          onUpload={mockOnUpload}
          onRemove={mockOnRemove}
        />
      )

      // Should show drag and drop instruction
      expect(screen.getByText(/drag and drop/i)).toBeInTheDocument()
    })
  })

  describe('memoization', () => {
    it('should be wrapped in React.memo', () => {
      expect(KnowledgeEditor.$$typeof).toBeDefined()
    })
  })
})
