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
  SourceInfo,
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

export function listDocuments(knowledgeBaseId: number, page = 0, size = 20) {
  return request<PageResult<KnowledgeItem>>(
    `/knowledge-items?knowledgeBaseId=${knowledgeBaseId}&type=DOCUMENT&size=${size}&page=${page}`,
  )
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

export function getKnowledgeItem(id: number) {
  return request<KnowledgeItem>(`/knowledge-items/${id}`)
}

export function renameChatSession(sessionId: number, title: string) {
  return request<ChatSession>(`/chat/sessions/${sessionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
}

export function deleteChatSession(sessionId: number) {
  return request<void>(`/chat/sessions/${sessionId}`, { method: 'DELETE' })
}

export function submitFeedback(messageId: number, rating: string, comment?: string) {
  return request<{ id: number }>(`/chat/messages/${messageId}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating, comment }),
  })
}

export async function streamChat(
  payload: {
    knowledgeBaseId: number
    message: string
    sessionId?: number | null
    category?: string
    source?: string
    topK?: number
    scoreThreshold?: number
  },
  handlers: {
    onMeta?: (sessionId: number) => void
    onDelta: (content: string) => void
    onSources: (sources: SourceInfo[]) => void
    onCitations?: (citations: SourceInfo[]) => void
    onDone: (sessionId: number, answer: string) => void
  },
): Promise<void> {
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok || !response.body) {
    let body: ApiResponse<unknown> | null = null
    try {
      body = (await response.json()) as ApiResponse<unknown>
    } catch {
      // Some reverse proxies return non-JSON error pages.
    }
    throw new Error(body?.message || `请求失败 (${response.status})`)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let boundary: number
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const chunk = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      let eventName = ''
      for (const line of chunk.split('\n')) {
        if (line.startsWith('event: ')) {
          eventName = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6)) as Record<string, unknown>
          if (eventName === 'meta') {
            handlers.onMeta?.(data.sessionId as number)
          } else if (eventName === 'delta') {
            handlers.onDelta(String(data.content ?? ''))
          } else if (eventName === 'sources') {
            handlers.onSources(data as unknown as SourceInfo[])
          } else if (eventName === 'citations') {
            handlers.onCitations?.(data as unknown as SourceInfo[])
          } else if (eventName === 'done') {
            handlers.onDone(data.sessionId as number, String(data.answer ?? ''))
            return
          } else if (eventName === 'error') {
            throw new Error(String(data.message ?? '流式响应失败'))
          }
          eventName = ''
        }
      }
    }
  }
  throw new Error('流式响应意外中断')
}
