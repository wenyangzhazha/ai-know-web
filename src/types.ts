export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface KnowledgeBase {
  id: number
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

export type DocumentStatus = 'UPLOADED' | 'PARSING' | 'CHUNKING' | 'EMBEDDING' | 'READY' | 'FAILED'

export interface KnowledgeDocument {
  id: number
  knowledgeBaseId: number
  title: string
  fileName: string
  fileType: string
  fileSize: number
  filePath: string | null
  status: DocumentStatus
  chunkCount: number
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatSession {
  id: number
  knowledgeBaseId: number
  title: string | null
  createdAt: string
  updatedAt: string
}

export interface ChatMessage {
  id: number
  sessionId: number
  role: 'user' | 'assistant'
  content: string
  sources: string | null
  createdAt: string
}

export interface SourceInfo {
  documentId: number
  documentTitle: string
  content: string
  score: number
}

export interface ChatResult {
  sessionId: number
  answer: string
  sources: SourceInfo[]
}
