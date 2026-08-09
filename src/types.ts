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

export type KnowledgeItemType = 'QUESTION' | 'DOCUMENT'

export type KnowledgeItemStatus = DocumentStatus

export interface KnowledgeItem {
  id: number
  knowledgeBaseId: number
  itemType: KnowledgeItemType
  title: string
  content: string
  category: string
  source: string
  sourceUrl: string
  tags: string
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  filePath: string | null
  status: KnowledgeItemStatus
  chunkCount: number
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export interface KnowledgeItemRequest {
  knowledgeBaseId: number
  type: KnowledgeItemType
  title: string
  content?: string
  category?: string
  source?: string
  sourceUrl?: string
  tags?: string[]
}

export interface PageResult<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

export interface FacetItem {
  value: string
  count: number
}

export interface KnowledgeFacets {
  categories: FacetItem[]
  sources: FacetItem[]
}

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
  itemId: number
  itemType: KnowledgeItemType
  itemTitle: string
  content: string
  score: number
}

export interface ChatResult {
  sessionId: number
  answer: string
  sources: SourceInfo[]
}
