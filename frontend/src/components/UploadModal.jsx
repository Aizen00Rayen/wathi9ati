import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '../api/axiosInstance.js';

const schema = z.object({
  documentName: z.string().min(1, 'اسم الوثيقة مطلوب').max(200),
  categoryId: z.string().optional(),
});

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export default function UploadModal({ categories, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const fileInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  function validateFile(f) {
    if (!f) return 'يرجى اختيار ملف';
    if (f.type !== 'application/pdf') return 'يُسمح فقط بملفات PDF';
    if (f.size > MAX_SIZE) return 'حجم الملف يتجاوز 10 ميغابايت';
    return '';
  }

  function handleFileSelect(f) {
    const err = validateFile(f);
    setFileError(err);
    if (!err) {
      setFile(f);
      // Auto-fill name from filename (without .pdf)
      const name = f.name.replace(/\.pdf$/i, '');
      setValue('documentName', name);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }

  const onSubmit = useCallback(
    async (data) => {
      if (!file) {
        setFileError('يرجى اختيار ملف PDF');
        return;
      }
      setUploading(true);
      setProgress(0);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentName', data.documentName);
      if (data.categoryId) formData.append('categoryId', data.categoryId);

      try {
        const response = await api.post('/documents/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress(e) {
            if (e.total) setProgress(Math.round((e.loaded * 100) / e.total));
          },
        });
        setUploadDone(true);
        setTimeout(() => {
          onUploaded(response.data);
          onClose();
        }, 1200);
      } catch (err) {
        const msg = err.response?.data?.message || 'حدث خطأ أثناء رفع الملف';
        setFileError(msg);
        setUploading(false);
        setProgress(0);
      }
    },
    [file, onUploaded, onClose]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-navy px-6 py-4 flex items-center justify-between">
          <h2 className="font-amiri text-xl text-gold">رفع وثيقة جديدة</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-cream/70 hover:text-cream transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-5">

          {/* Drop zone */}
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-gold bg-gold/5 scale-[1.01]'
                : file
                ? 'border-success bg-green-50'
                : 'border-gray-300 hover:border-gold hover:bg-gold/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files[0])}
              disabled={uploading}
            />

            {uploadDone ? (
              <div className="flex flex-col items-center gap-2 text-success">
                <CheckCircle size={36} />
                <p className="font-semibold">تم الرفع بنجاح!</p>
              </div>
            ) : file ? (
              <div className="flex flex-col items-center gap-2">
                <FileText size={36} className="text-navy" />
                <p className="font-semibold text-navy text-sm truncate max-w-full px-4">{file.name}</p>
                <p className="text-xs text-slate/60">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate/60">
                <Upload size={32} className={dragOver ? 'text-gold' : ''} />
                <p className="font-medium text-sm">
                  اسحب وأفلت ملف PDF هنا، أو{' '}
                  <span className="text-gold underline">اضغط للاختيار</span>
                </p>
                <p className="text-xs">PDF فقط — حجم أقصى 10 ميغابايت</p>
              </div>
            )}
          </div>

          {fileError && (
            <p className="text-danger text-sm flex items-center gap-1.5">
              <AlertCircle size={14} /> {fileError}
            </p>
          )}

          {/* Progress bar */}
          {uploading && !uploadDone && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate/60">
                <span>جارٍ الرفع...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-gold h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: 'linear' }}
                />
              </div>
            </div>
          )}

          {/* Document name */}
          <div>
            <label className="label">اسم الوثيقة <span className="text-danger">*</span></label>
            <input
              {...register('documentName')}
              className="input-field"
              placeholder="مثال: بطاقة التعريف الوطنية 2024"
              disabled={uploading}
            />
            {errors.documentName && (
              <p className="text-danger text-xs mt-1">{errors.documentName.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="label">الفئة</label>
            <select
              {...register('categoryId')}
              className="input-field"
              disabled={uploading}
            >
              <option value="">— اختر فئة —</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={uploading || uploadDone}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <Upload size={16} />
            {uploading ? 'جارٍ الرفع...' : 'رفع الوثيقة'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
