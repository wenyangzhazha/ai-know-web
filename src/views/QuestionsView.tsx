import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, ListChecks, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import {
  createKnowledgeItem,
  deleteKnowledgeItem,
  listKnowledgeFacets,
  listKnowledgeItems,
  updateKnowledgeItem,
} from '../api'
import type { FacetItem, KnowledgeBase, KnowledgeItem, KnowledgeItemRequest } from '../types'
import { Button, EmptyState, ErrorBanner, IconButton, Modal, Spinner } from '../ui'

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max)}...`
}

function parseTags(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown
    return Array.isArray(parsed) ? parsed.filter((tag): tag is string => typeof tag === 'string') : []
  } catch {
    return value
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
  }
}

function splitTags(value: string): string[] {
  return value
    .split(/[,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export default function QuestionsView({ knowledgeBase }: { knowledgeBase: KnowledgeBase }) {
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [facets, setFacets] = useState<{ categories: FacetItem[]; sources: FacetItem[] }>({
    categories: [],
    sources: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [appliedKeyword, setAppliedKeyword] = useState('')
  const [category, setCategory] = useState('')
  const [source, setSource] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null)
  const [itemToDelete, setItemToDelete] = useState<KnowledgeItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formSource, setFormSource] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [tagsText, setTagsText] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listKnowledgeItems({
        knowledgeBaseId: knowledgeBase.id,
        type: 'QUESTION',
        keyword: appliedKeyword || undefined,
        category: category || undefined,
        source: source || undefined,
        page,
        size: 20,
      })
      setItems(data.content)
      setTotalPages(data.totalPages)
      setTotalElements(data.totalElements)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载题库失败')
    } finally {
      setLoading(false)
    }
  }, [knowledgeBase.id, appliedKeyword, category, source, page])

  const loadFacets = useCallback(async () => {
    try {
      const data = await listKnowledgeFacets(knowledgeBase.id, 'QUESTION')
      setFacets(data)
    } catch {
      // Facet loading is best-effort; the list still renders.
    }
  }, [knowledgeBase.id])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void loadFacets()
  }, [loadFacets])

  const resetForm = () => {
    setTitle('')
    setContent('')
    setFormCategory('')
    setFormSource('')
    setSourceUrl('')
    setTagsText('')
    setFormError(null)
  }

  const openCreate = () => {
    setEditingItem(null)
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (item: KnowledgeItem) => {
    setEditingItem(item)
    setTitle(item.title)
    setContent(item.content)
    setFormCategory(item.category)
    setFormSource(item.source)
    setSourceUrl(item.sourceUrl)
    setTagsText(parseTags(item.tags).join(', '))
    setFormError(null)
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      setFormError('题目和答案不能为空')
      return
    }
    const payload: KnowledgeItemRequest = {
      knowledgeBaseId: knowledgeBase.id,
      type: 'QUESTION',
      title: title.trim(),
      content: content.trim(),
      category: formCategory.trim() || undefined,
      source: formSource.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      tags: splitTags(tagsText),
    }
    setSaving(true)
    setFormError(null)
    try {
      if (editingItem) {
        await updateKnowledgeItem(editingItem.id, payload)
      } else {
        await createKnowledgeItem(payload)
      }
      setModalOpen(false)
      await load()
      await loadFacets()
    } catch (e) {
      setFormError(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!itemToDelete) return
    try {
      await deleteKnowledgeItem(itemToDelete.id)
      setItemToDelete(null)
      await load()
      await loadFacets()
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
      setItemToDelete(null)
    }
  }

  return (
    <div className="questions-view">
      <div className="view-toolbar">
        <h2>
          题库管理
          <span className="count">{totalElements} 条题目</span>
        </h2>
        <Button variant="primary" onClick={openCreate}>
          <Plus size={16} />
          新增题目
        </Button>
      </div>

      <form
        className="filter-bar"
        onSubmit={(event) => {
          event.preventDefault()
          setPage(0)
          setAppliedKeyword(keyword.trim())
        }}
      >
        <div className="search-box">
          <Search size={16} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索题目或答案"
          />
        </div>
        <select
          value={category}
          onChange={(event) => {
            setPage(0)
            setCategory(event.target.value)
          }}
        >
          <option value="">全部分类</option>
          {facets.categories.map((item) => (
            <option key={item.value} value={item.value}>
              {item.value} ({item.count})
            </option>
          ))}
        </select>
        <select
          value={source}
          onChange={(event) => {
            setPage(0)
            setSource(event.target.value)
          }}
        >
          <option value="">全部来源</option>
          {facets.sources.map((item) => (
            <option key={item.value} value={item.value}>
              {item.value} ({item.count})
            </option>
          ))}
        </select>
        <Button type="submit" variant="primary">
          <Search size={16} />
          搜索
        </Button>
      </form>

      {error && (
        <div className="view-inline-error">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {loading ? (
        <div className="view-loading">
          <Spinner size={20} />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ListChecks size={28} />}
          title="暂无题目"
          description="搜索条件没有匹配结果，或知识库还没有初始化题目。"
          action={
            <Button variant="primary" onClick={openCreate}>
              <Plus size={16} />
              新增题目
            </Button>
          }
        />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>题目</th>
                <th>分类</th>
                <th>来源</th>
                <th>分块</th>
                <th>更新时间</th>
                <th aria-label="操作" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div className="question-cell">
                      <strong>{item.title}</strong>
                      <span>{truncate(item.content, 140)}</span>
                    </div>
                  </td>
                  <td>
                    <span className="category-chip">{item.category || '-'}</span>
                  </td>
                  <td>
                    <span className="source-chip">{item.source || '-'}</span>
                  </td>
                  <td>{item.chunkCount}</td>
                  <td>{formatDate(item.updatedAt)}</td>
                  <td>
                    <div className="row-actions">
                      <IconButton label="编辑题目" onClick={() => openEdit(item)}>
                        <Pencil size={16} />
                      </IconButton>
                      <IconButton label="删除题目" onClick={() => setItemToDelete(item)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="pagination">
          <span>共 {totalElements} 条</span>
          <div className="pagination-actions">
            <Button size="sm" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))}>
              <ChevronLeft size={14} />
              上一页
            </Button>
            <span>
              {page + 1} / {Math.max(1, totalPages)}
            </span>
            <Button
              size="sm"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              下一页
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      )}

      {modalOpen && (
        <Modal title={editingItem ? '编辑题目' : '新增题目'} onClose={() => setModalOpen(false)}>
          <div className="form">
            <label>
              分类
              <input
                value={formCategory}
                onChange={(event) => setFormCategory(event.target.value)}
                list="question-categories"
                placeholder="例如：Java 基础"
              />
            </label>
            <datalist id="question-categories">
              {facets.categories.map((item) => (
                <option key={item.value} value={item.value} />
              ))}
            </datalist>
            <label>
              题目
              <input
                autoFocus
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="请输入面试题"
              />
            </label>
            <label>
              答案
              <textarea
                rows={8}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="请输入参考答案"
              />
            </label>
            <label>
              来源
              <input
                value={formSource}
                onChange={(event) => setFormSource(event.target.value)}
                list="question-sources"
                placeholder="例如：JavaGuide"
              />
            </label>
            <datalist id="question-sources">
              {facets.sources.map((item) => (
                <option key={item.value} value={item.value} />
              ))}
            </datalist>
            <label>
              来源链接
              <input
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="可选"
              />
            </label>
            <label>
              标签
              <input
                value={tagsText}
                onChange={(event) => setTagsText(event.target.value)}
                placeholder="多个标签用逗号分隔"
              />
            </label>
            {formError && <ErrorBanner message={formError} onDismiss={() => setFormError(null)} />}
            <div className="modal-actions">
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              <Button variant="primary" disabled={saving} onClick={() => void handleSubmit()}>
                {saving && <Spinner size={16} />}
                {editingItem ? '保存' : '新增'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {itemToDelete && (
        <Modal title="删除题目" onClose={() => setItemToDelete(null)}>
          <p className="modal-copy">
            删除“{itemToDelete.title}”会同时移除对应分块与向量数据，且无法恢复。
          </p>
          <div className="modal-actions">
            <Button onClick={() => setItemToDelete(null)}>取消</Button>
            <Button variant="danger" onClick={() => void handleDelete()}>
              <Trash2 size={16} />
              删除
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
