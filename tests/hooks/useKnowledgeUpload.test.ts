/**
 * Unit tests for useKnowledgeUpload Hook
 * T050 [P3] [US5] useKnowledgeUpload tests
 *
 * Test Coverage:
 * - Initial state
 * - Upload document success
 * - Upload document failure
 * - Delete document success
 * - Delete document failure
 * - Loading states
 * - Error handling and clearing
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { useKnowledgeUpload } from '@/hooks/useKnowledgeUpload'

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('useKnowledgeUpload', () => {
  const tokenId = 'token-123'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('initial state', () => {
    it('should have empty documents initially', () => {
      const { result } = renderHook(() => useKnowledgeUpload(tokenId))

      expect(result.current.documents).toEqual([])
      expect(result.current.isUploading).toBe(false)
      expect(result.current.isDeleting).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('setDocuments', () => {
    it('should set documents for initialization', () => {
      const { result } = renderHook(() => useKnowledgeUpload(tokenId))

      const docs = [
        { id: 'doc-1', path: 'file1.txt', content: 'content1' },
        { id: 'doc-2', path: 'file2.md', content: 'content2' },
      ]

      act(() => {
        result.current.setDocuments(docs)
      })

      expect(result.current.documents).toEqual(docs)
    })
  })

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      const mockResponse = {
        id: 'new-doc-id',
        path: 'uploaded.txt',
        size: 1024,
        uploadedAt: '2025-01-01T12:00:00Z',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const { result } = renderHook(() => useKnowledgeUpload(tokenId))

      const file = new File(['test content'], 'uploaded.txt', { type: 'text/plain' })

      let uploadResult: ReturnType<typeof result.current.uploadDocument> | null = null

      await act(async () => {
        uploadResult = result.current.uploadDocument(file)
      })

      await waitFor(() => {
        expect(result.current.isUploading).toBe(false)
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/eliza/characters/${tokenId}/knowledge`,
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        })
      )

      // Check FormData was passed
      const fetchCall = mockFetch.mock.calls[0]
      expect(fetchCall[1].body).toBeInstanceOf(FormData)

      // Document should be added to list
      expect(result.current.documents).toContainEqual(mockResponse)
      expect(result.current.error).toBeNull()
    })

    it('should set isUploading during upload', async () => {
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useKnowledgeUpload(tokenId))

      const file = new File(['test'], 'test.txt', { type: 'text/plain' })

      act(() => {
        result.current.uploadDocument(file)
      })

      // Should be uploading
      expect(result.current.isUploading).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ id: 'doc-1', path: 'test.txt' }),
        })
      })

      await waitFor(() => {
        expect(result.current.isUploading).toBe(false)
      })
    })

    it('should handle upload failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'File too large' }),
      })

      const { result } = renderHook(() => useKnowledgeUpload(tokenId))

      const file = new File(['test'], 'test.txt', { type: 'text/plain' })

      await act(async () => {
        const uploadResult = await result.current.uploadDocument(file)
        expect(uploadResult).toBeNull()
      })

      expect(result.current.error).toBe('File too large')
      expect(result.current.documents).toEqual([])
    })

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useKnowledgeUpload(tokenId))

      const file = new File(['test'], 'test.txt', { type: 'text/plain' })

      await act(async () => {
        const uploadResult = await result.current.uploadDocument(file)
        expect(uploadResult).toBeNull()
      })

      expect(result.current.error).toBe('Network error')
    })
  })

  describe('deleteDocument', () => {
    it('should delete document successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })

      const { result } = renderHook(() => useKnowledgeUpload(tokenId))

      // Initialize with documents
      act(() => {
        result.current.setDocuments([
          { id: 'doc-1', path: 'file1.txt', content: 'content1' },
          { id: 'doc-2', path: 'file2.txt', content: 'content2' },
        ])
      })

      await act(async () => {
        const deleteResult = await result.current.deleteDocument('doc-1')
        expect(deleteResult).toBe(true)
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/eliza/characters/${tokenId}/knowledge/doc-1`,
        expect.objectContaining({
          method: 'DELETE',
          credentials: 'include',
        })
      )

      // Document should be removed from list
      expect(result.current.documents).toHaveLength(1)
      expect(result.current.documents[0].id).toBe('doc-2')
      expect(result.current.error).toBeNull()
    })

    it('should set isDeleting during deletion', async () => {
      let resolvePromise: (value: unknown) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockFetch.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useKnowledgeUpload(tokenId))

      act(() => {
        result.current.setDocuments([{ id: 'doc-1', path: 'file1.txt', content: 'content1' }])
      })

      act(() => {
        result.current.deleteDocument('doc-1')
      })

      // Should be deleting
      expect(result.current.isDeleting).toBe(true)

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
      })

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false)
      })
    })

    it('should handle delete failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Document not found' }),
      })

      const { result } = renderHook(() => useKnowledgeUpload(tokenId))

      act(() => {
        result.current.setDocuments([{ id: 'doc-1', path: 'file1.txt', content: 'content1' }])
      })

      await act(async () => {
        const deleteResult = await result.current.deleteDocument('doc-1')
        expect(deleteResult).toBe(false)
      })

      expect(result.current.error).toBe('Document not found')
      // Document should still be in list
      expect(result.current.documents).toHaveLength(1)
    })
  })

  describe('clearError', () => {
    it('should clear error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ message: 'Some error' }),
      })

      const { result } = renderHook(() => useKnowledgeUpload(tokenId))

      const file = new File(['test'], 'test.txt', { type: 'text/plain' })

      await act(async () => {
        await result.current.uploadDocument(file)
      })

      expect(result.current.error).toBe('Some error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })
  })

  describe('tokenId dependency', () => {
    it('should use correct tokenId in API calls', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ id: 'doc-1', path: 'test.txt' }),
      })

      const customTokenId = 'custom-token-456'
      const { result } = renderHook(() => useKnowledgeUpload(customTokenId))

      const file = new File(['test'], 'test.txt', { type: 'text/plain' })

      await act(async () => {
        await result.current.uploadDocument(file)
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `/api/eliza/characters/${customTokenId}/knowledge`,
        expect.anything()
      )
    })
  })
})
