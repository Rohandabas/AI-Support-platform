import React, { useEffect, useState, useRef } from 'react';
import { documentsApi } from '../services/api';
import { KBDocument } from '../types';
import './KnowledgeBase.css';

const KnowledgeBase: React.FC = () => {
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reindexing, setReindexing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = async () => {
    try {
      const res = await documentsApi.getAll();
      setDocuments(res.data.data);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load documents' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    // Poll for processing status
    const interval = setInterval(fetchDocuments, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setMessage(null);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        await documentsApi.upload(formData);
        setMessage({ type: 'success', text: `"${file.name}" uploaded and processing started` });
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { message?: string } } };
        setMessage({ type: 'error', text: axiosErr?.response?.data?.message || `Failed to upload ${file.name}` });
      }
    }

    setUploading(false);
    fetchDocuments();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will remove it from the knowledge base.`)) return;
    try {
      await documentsApi.delete(id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
      setMessage({ type: 'success', text: `"${name}" deleted` });
    } catch {
      setMessage({ type: 'error', text: 'Failed to delete document' });
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await documentsApi.reindex();
      setMessage({ type: 'success', text: 'Reindexing started. Documents will be updated shortly.' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to start reindexing' });
    } finally {
      setReindexing(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1048576).toFixed(1)}MB`;
  };

  const statusConfig: Record<string, { label: string; color: string; icon: string }> = {
    pending: { label: 'Pending', color: 'badge-pending', icon: '⏳' },
    processing: { label: 'Processing', color: 'badge-in-progress', icon: '⚙️' },
    indexed: { label: 'Indexed', color: 'badge-resolved', icon: '✅' },
    failed: { label: 'Failed', color: 'badge-urgent', icon: '❌' },
  };

  const fileTypeIcons: Record<string, string> = {
    pdf: '📄',
    docx: '📝',
    txt: '📋',
    md: '📖',
  };

  const indexedCount = documents.filter((d) => d.status === 'indexed').length;
  const totalChunks = documents.reduce((sum, d) => sum + d.chunkCount, 0);

  return (
    <div className="page-container">
      <div className="page-header flex justify-between items-center">
        <div>
          <h1 className="page-title">📚 Knowledge Base</h1>
          <p className="page-subtitle">
            {indexedCount} documents indexed · {totalChunks.toLocaleString()} total chunks in vector database
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-secondary"
            onClick={handleReindex}
            disabled={reindexing}
          >
            {reindexing ? <><div className="spinner" /> Reindexing...</> : '🔄 Re-index All'}
          </button>
          <button
            className="btn btn-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <><div className="spinner" /> Uploading...</> : '⬆️ Upload Document'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            multiple
            hidden
            onChange={(e) => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.type === 'success' ? '✅' : '⚠️'} {message.text}
        </div>
      )}

      {/* Upload Drop Zone */}
      <div
        className="kb-dropzone glass-card"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleUpload(e.dataTransfer.files);
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="kb-dropzone-icon">📂</div>
        <h3>Drop files here or click to upload</h3>
        <p>Supports PDF, DOCX, TXT, Markdown — up to 10MB each</p>
        <div className="kb-dropzone-formats">
          {['PDF', 'DOCX', 'TXT', 'MD'].map((f) => (
            <span key={f} className="kb-format-badge">{f}</span>
          ))}
        </div>
      </div>

      {/* Documents Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="kb-table-header">
          <h3>Documents ({documents.length})</h3>
        </div>

        {loading ? (
          <div style={{ padding: 20 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 52, marginBottom: 8, borderRadius: 8 }} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No documents uploaded yet</h3>
            <p>Upload your first document to start building the knowledge base</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Type</th>
                <th>Size</th>
                <th>Chunks</th>
                <th>Status</th>
                <th>Uploaded</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const status = statusConfig[doc.status] || statusConfig.pending;
                return (
                  <tr key={doc._id}>
                    <td>
                      <div className="kb-doc-name">
                        <span>{fileTypeIcons[doc.fileType] || '📄'}</span>
                        <span>{doc.originalName}</span>
                      </div>
                    </td>
                    <td>
                      <span className="kb-type-badge">{doc.fileType.toUpperCase()}</span>
                    </td>
                    <td>{formatSize(doc.fileSize)}</td>
                    <td>
                      {doc.chunkCount > 0 ? (
                        <span className="kb-chunk-count">{doc.chunkCount}</span>
                      ) : '—'}
                    </td>
                    <td>
                      <span 
                        className={`badge ${status.color}`}
                        title={doc.status === 'failed' && doc.errorMessage ? doc.errorMessage : undefined}
                        style={doc.status === 'failed' && doc.errorMessage ? { cursor: 'help' } : {}}
                      >
                        {status.icon} {status.label}
                        {doc.status === 'processing' && (
                          <span className="kb-processing-dots">...</span>
                        )}
                      </span>
                    </td>
                    <td>
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(doc._id, doc.originalName)}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBase;
