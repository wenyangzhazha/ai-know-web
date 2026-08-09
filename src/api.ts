import type {
  ApiResponse,
  ChatMessage,
  ChatResult,
  ChatSession,
  KnowledgeBase,
  KnowledgeFacets,
  KnowledgeItem,
  KnowledgeItemRequest,
  KnowledgeItemType,
  PageResult,
} from './types'

const API_BASE = import.meta.env.VITE_API_BASE || '/api'

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, init)
  let body: ApiResponse<T> | null = null
  try {
    body = (await response.json()) as ApiResponse<T>
  } catch {
    // Some reverse proxies return non-JSON error pages.
  }
  if (!response.ok || !body || body.code !== 200) {
    throw new Error(body?.message || `请求失败 (${response.status})`)
  }
  return body.data
}

export function listKnowledgeBases() {
  return request<KnowledgeBase[]>('/knowledge-bases')
}

export function createKnowledgeBase(payload: { name: string; description?: string }) {
  return request<KnowledgeBase>('/knowledge-bases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteKnowledgeBase(id: number) {
  return request<void>(`/knowledge-bases/${id}`, { method: 'DELETE' })
}

export async function listDocuments(knowledgeBaseId: number) {
  const page = await request<PageResult<KnowledgeItem>>(
    `/knowledge-items?knowledgeBaseId=${knowledgeBaseId}&type=DOCUMENT&size=100`,
  )
  return page.content
}

export function uploadDocument(knowledgeBaseId: number, file: File) {
  const form = new FormData()
  form.append('knowledgeBaseId', String(knowledgeBaseId))
  form.append('file', file)
  return request<KnowledgeItem>('/knowledge-items/documents', { method: 'POST', body: form })
}

export function deleteDocument(id: number) {
  return request<void>(`/knowledge-items/${id}`, { method: 'DELETE' })
}

export function listKnowledgeItems(params: {
  knowledgeBaseId: number
  type?: KnowledgeItemType
  keyword?: string
  category?: string
  source?: string
  page?: number
  size?: number
}) {
  const query = new URLSearchParams()
  query.set('knowledgeBaseId', String(params.knowledgeBaseId))
  if (params.type) query.set('type', params.type)
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.category) query.set('category', params.category)
  if (params.source) query.set('source', params.source)
  query.set('page', String(params.page ?? 0))
  query.set('size', String(params.size ?? 20))
  return request<PageResult<KnowledgeItem>>(`/knowledge-items?${query.toString()}`)
}

export function listKnowledgeFacets(knowledgeBaseId: number, type: KnowledgeItemType) {
  return request<KnowledgeFacets>(`/knowledge-items/facets?knowledgeBaseId=${knowledgeBaseId}&type=${type}`)
}

export function createKnowledgeItem(payload: KnowledgeItemRequest) {
  return request<KnowledgeItem>('/knowledge-items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateKnowledgeItem(id: number, payload: KnowledgeItemRequest) {
  return request<KnowledgeItem>(`/knowledge-items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteKnowledgeItem(id: number) {
  return request<void>(`/knowledge-items/${id}`, { method: 'DELETE' })
}

export function listChatSessions(knowledgeBaseId: number) {
  return request<ChatSession[]>(`/chat/sessions?knowledgeBaseId=${knowledgeBaseId}`)
}

export function listChatMessages(sessionId: number) {
  return request<ChatMessage[]>(`/chat/sessions/${sessionId}/messages`)
}

export function sendChat(payload: { knowledgeBaseId: number; message: string; sessionId?: number | null }) {
  return request<ChatResult>('/chat/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
