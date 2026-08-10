import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from 'lucide-react'
import { deleteDocument, listDocuments, uploadDocument } from '../api'
import type { KnowledgeBase, KnowledgeItem, KnowledgeItemStatus } from '../types'
import { Button, EmptyState, ErrorBanner, IconButton, Modal, Spinner } from '../ui'

const PROCESSING_STATUSES: KnowledgeItemStatus[] = ['UPLOADED', 'PARSING', 'CHUNKING', 'EMBEDDING']

const STATUS_META: Record<KnowledgeItemStatus, { label: string; icon: ReactNode; className: string }> = {
  UPLOADED: { label: '待处理', icon: <Clock size={14} />, className: 'status-pending' },
  PARSING: { label: '解析中', icon: <Loader2 size={14} className="spin" />, className: 'status-processing' },
  CHUNKING: { label: '切块中', icon: <Loader2 size={14} className="spin" />, className: 'status-processing' },
  EMBEDDING: { label: '向量化中', icon: <Loader2 size={14} className="spin" />, className: 'status-processing' },
  READY: { label: '就绪', icon: <CheckCircle2 size={14} />, className: 'status-ready' },
  FAILED: { label: '失败', icon: <AlertCircle size={14} />, className: 'status-failed' },
}

function StatusBadge({ status }: { status: KnowledgeItemStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={`status-badge ${meta.className}`}>
      {meta.icon}
      {meta.label}
    </span>
  )
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function DocumentsView({ knowledgeBase }: { knowledgeBase: KnowledgeBase }) {
  const [documents, setDocuments] = useState<KnowledgeItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [totalElements, setTotalElements] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [docToDelete, setDocToDelete] = useState<KnowledgeItem | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const loadDocuments = useCallback(async () => {
    try {
      const data = await listDocuments(knowledgeBase.id, page, 20)
      setDocuments(data.content)
      setTotalPages(data.totalPages)
      setTotalElements(data.totalElements)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载文档失败')
    } finally {
      setLoading(false)
    }
  }, [knowledgeBase.id, page])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    if (!documents.some((doc) => PROCESSING_STATUSES.includes(doc.status))) return
    const timer = window.setInterval(() => void loadDocuments(), 2500)
    return () => window.clearInterval(timer)
  }, [documents, loadDocuments])

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const targets = Array.from(files)
    setUploading(true)
    setError(null)
    try {
      await Promise.all(targets.map((file) => uploadDocument(knowledgeBase.id, file)))
      await loadDocuments()
    } catch (e) {
      setError(e instanceof Error ? e.message : '上传失败')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async () => {
    if (!docToDelete) return
    try {
      await deleteDocument(docToDelete.id)
      setDocuments((prev) => prev.filter((doc) => doc.id !== docToDelete.id))
      if (documents.length === 1 && page > 0) {
        setPage((current) => current - 1)
      } else {
        await loadDocuments()
      }
      setDocToDelete(null)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败')
      setDocToDelete(null)
    }
  }

  const hasProcessing = documents.some((doc) => PROCESSING_STATUSES.includes(doc.status))

  return (
    <div className="documents-view">
      <div className="view-toolbar">
        <h2>
          资料库
          <span className="count">{documents.length} 个文档</span>
        </h2>
        <Button
          variant="primary"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Spinner size={16} /> : <UploadCloud size={16} />}
          上传文档
        </Button>
      </div>

      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          void handleFiles(e.dataTransfer.files)
        }}
      >
        <UploadCloud size={22} />
        <strong>{uploading ? '正在上传...' : '上传文档'}</strong>
        <span>PDF、DOCX、MD、TXT、HTML，最大 50MB</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          accept=".pdf,.docx,.md,.txt,.html"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="view-inline-error">
          <ErrorBanner message={error} onDismiss={() => setError(null)} />
        </div>
      )}

      {loading ? (
        <div className="view-loading">
          <Spinner size={20} />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FileText size={28} />}
          title="暂无文档"
          description="上传文档后，系统会自动解析、切块并生成向量。"
          action={
            <Button variant="primary" onClick={() => inputRef.current?.click()}>
              <UploadCloud size={16} />
              上传文档
            </Button>
          }
        />
      ) : (
        <>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>文档</th>
                  <th>类型</th>
                  <th>大小</th>
                  <th>状态</th>
                  <th>分块</th>
                  <th>更新时间</th>
                  <th aria-label="操作" />
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>
                      <div className="doc-cell">
                        <div className="file-icon">
                          <FileText size={16} />
                        </div>
                        <div>
                          <strong>{doc.title}</strong>
                          <span>{doc.fileName}</span>
                          {doc.status === 'FAILED' && doc.errorMessage && (
                            <span className="doc-error">{doc.errorMessage}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="type-chip">{doc.fileType?.toUpperCase() ?? '-'}</span>
                    </td>
                    <td>{formatBytes(doc.fileSize ?? 0)}</td>
                    <td>
                      <StatusBadge status={doc.status} />
                    </td>
                    <td>{doc.status === 'READY' ? doc.chunkCount : '—'}</td>
                    <td>{formatDate(doc.updatedAt)}</td>
                    <td>
                      <IconButton label="删除文档" onClick={() => setDocToDelete(doc)}>
                        <Trash2 size={16} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && totalElements > 0 && (
            <div className="pagination">
              <span>共 {totalElements} 个</span>
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
        </>
      )}

      {hasProcessing && (
        <div className="processing-hint">
          <Loader2 size={14} className="spin" />
          文档处理中，页面会自动刷新状态
        </div>
      )}

      {docToDelete && (
        <Modal title="删除文档" onClose={() => setDocToDelete(null)}>
          <p className="modal-copy">删除“{docToDelete.title}”会同时移除对应的向量数据，且无法恢复。</p>
          <div className="modal-actions">
            <Button onClick={() => setDocToDelete(null)}>取消</Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 size={16} />
              删除
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
