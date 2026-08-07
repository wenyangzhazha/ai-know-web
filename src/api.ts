import type {
  ApiResponse,
  ChatMessage,
  ChatResult,
  ChatSession,
  KnowledgeBase,
  KnowledgeDocument,
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

export function listDocuments(knowledgeBaseId: number) {
  return request<KnowledgeDocument[]>(`/documents?knowledgeBaseId=${knowledgeBaseId}`)
}

export function uploadDocument(knowledgeBaseId: number, file: File) {
  const form = new FormData()
  form.append('knowledgeBaseId', String(knowledgeBaseId))
  form.append('file', file)
  return request<KnowledgeDocument>('/documents/upload', { method: 'POST', body: form })
}

export function deleteDocument(id: number) {
  return request<void>(`/documents/${id}`, { method: 'DELETE' })
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
