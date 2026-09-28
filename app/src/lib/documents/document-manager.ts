/**
 * NEXUS Finance — Ephemeral Document Manager
 * ==========================================
 * Strict Privacy & Zero-Retention Policy:
 * 1. Financial statement photos and PDFs are processed strictly IN-MEMORY.
 * 2. Original documents are NEVER permanently written to disk or public buckets.
 * 3. In-memory buffers are immediately dereferenced and garbage-collected.
 * 4. In case of any error during parsing or confirmation, buffers are instantly cleared.
 */

import type { DocumentMimeType } from '@/types/document-intelligence'

const ALLOWED_MIME_TYPES: Set<string> = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'application/pdf',
])

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB

export interface ValidatedDocumentBuffer {
  buffer: Buffer
  mimeType: DocumentMimeType
  size: number
  filename: string
}

export class EphemeralDocumentManager {
  /**
   * Validates and encapsulates an uploaded file into an ephemeral memory structure.
   */
  public static validateUpload(
    fileBuffer: Buffer,
    mimeType: string,
    filename: string
  ): ValidatedDocumentBuffer {
    if (!fileBuffer || fileBuffer.length === 0) {
      throw new Error('El archivo subido está vacío.')
    }

    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(
        `El archivo excede el tamaño máximo permitido de 15MB (${(fileBuffer.length / (1024 * 1024)).toFixed(1)}MB recibido).`
      )
    }

    const normalizedMime = mimeType.toLowerCase().trim()
    if (!ALLOWED_MIME_TYPES.has(normalizedMime)) {
      // Check extension fallback
      const ext = filename.toLowerCase().split('.').pop()
      let resolvedMime: DocumentMimeType | null = null

      if (ext === 'pdf') resolvedMime = 'application/pdf'
      else if (ext === 'jpg' || ext === 'jpeg') resolvedMime = 'image/jpeg'
      else if (ext === 'png') resolvedMime = 'image/png'
      else if (ext === 'webp') resolvedMime = 'image/webp'

      if (!resolvedMime) {
        throw new Error(
          `Formato de archivo no soportado (${mimeType}). Formatos aceptados: JPG, PNG, WEBP, PDF.`
        )
      }
      return {
        buffer: fileBuffer,
        mimeType: resolvedMime,
        size: fileBuffer.length,
        filename,
      }
    }

    return {
      buffer: fileBuffer,
      mimeType: normalizedMime as DocumentMimeType,
      size: fileBuffer.length,
      filename,
    }
  }

  /**
   * Explicit ephemeral release guarantee.
   */
  public static release(doc: Partial<ValidatedDocumentBuffer> | null | undefined): void {
    if (doc && doc.buffer) {
      // Fill buffer with zeros before dereferencing to prevent memory scrapers
      try {
        doc.buffer.fill(0)
      } catch {
        // Ignore if buffer is read-only
      }
      doc.buffer = undefined
    }
  }
}

export const DocumentManager = EphemeralDocumentManager
