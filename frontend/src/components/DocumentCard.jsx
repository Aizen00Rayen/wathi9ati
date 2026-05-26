import React, { useState } from 'react';
import { FileText, Download, Trash2, Tag, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axiosInstance.js';

const CATEGORY_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-orange-100 text-orange-800',
  'bg-pink-100 text-pink-800',
  'bg-teal-100 text-teal-800',
];

function getCategoryColor(name) {
  if (!name) return 'bg-gray-100 text-gray-600';
  const idx = name.charCodeAt(0) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[idx];
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(dateStr) {
  try {
    return new Date(dateStr).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function DocumentCard({ doc, onDelete, viewMode = 'grid' }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const response = await api.get(`/documents/${doc.id}/download`, {
        responseType: 'blob',
      });
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.original_name}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('حدث خطأ أثناء التحميل');
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/documents/${doc.id}`);
      onDelete(doc.id);
    } catch {
      alert('حدث خطأ أثناء الحذف');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  if (viewMode === 'list') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="card flex items-center justify-between gap-4 py-3"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 bg-navy/10 rounded-lg flex items-center justify-center shrink-0">
            <FileText size={20} className="text-navy" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-navy truncate">{doc.original_name}</p>
            <div className="flex items-center gap-3 text-xs text-slate/70 mt-0.5">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getCategoryColor(doc.category_name)}`}>
                {doc.category_name || 'بدون فئة'}
              </span>
              <span>{formatDate(doc.uploaded_at)}</span>
              <span>{formatFileSize(doc.file_size)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 bg-navy text-gold px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors disabled:opacity-60"
          >
            <Download size={14} />
            {downloading ? '...' : 'تحميل'}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 bg-red-50 text-danger px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <Trash2 size={14} />
            حذف
          </button>
        </div>
        <DeleteModal
          open={confirmDelete}
          name={doc.original_name}
          deleting={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 16 }}
      className="card flex flex-col gap-3 relative"
    >
      {/* PDF icon */}
      <div className="w-12 h-12 bg-navy/10 rounded-xl flex items-center justify-center">
        <FileText size={24} className="text-navy" />
      </div>

      {/* Name */}
      <h3 className="font-semibold text-navy leading-snug line-clamp-2">{doc.original_name}</h3>

      {/* Category */}
      <span className={`self-start inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getCategoryColor(doc.category_name)}`}>
        <Tag size={10} />
        {doc.category_name || 'بدون فئة'}
      </span>

      {/* Meta */}
      <div className="text-xs text-slate/60 flex items-center gap-3 flex-wrap">
        <span className="flex items-center gap-1">
          <Calendar size={11} />
          {formatDate(doc.uploaded_at)}
        </span>
        <span>{formatFileSize(doc.file_size)}</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-navy text-gold py-2 rounded-lg text-sm font-medium hover:bg-navy-light transition-colors disabled:opacity-60"
        >
          <Download size={14} />
          {downloading ? 'جارٍ...' : 'تحميل'}
        </button>
        <button
          onClick={() => setConfirmDelete(true)}
          className="flex items-center justify-center gap-1.5 bg-red-50 text-danger px-3 py-2 rounded-lg text-sm hover:bg-red-100 transition-colors"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <DeleteModal
        open={confirmDelete}
        name={doc.original_name}
        deleting={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </motion.div>
  );
}

function DeleteModal({ open, name, deleting, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full z-10"
      >
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 size={22} className="text-danger" />
        </div>
        <h3 className="font-amiri text-xl text-navy text-center mb-2">تأكيد الحذف</h3>
        <p className="text-slate text-sm text-center mb-6">
          هل أنت متأكد من حذف الوثيقة <strong>"{name}"</strong>؟ لا يمكن التراجع عن هذا الإجراء.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 btn-ghost py-2.5 text-sm"
            disabled={deleting}
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 btn-danger py-2.5 text-sm"
          >
            {deleting ? 'جارٍ الحذف...' : 'نعم، احذف'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
