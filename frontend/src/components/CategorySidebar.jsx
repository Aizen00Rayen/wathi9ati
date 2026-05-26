import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Folder, FolderOpen, Trash2, LogOut, Upload, X, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import api from '../api/axiosInstance.js';

export default function CategorySidebar({
  categories,
  activeCategory,
  onCategorySelect,
  onCategoryCreated,
  onCategoryDeleted,
  onUploadClick,
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function getInitials(name) {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2) || 'U';
  }

  async function handleCreateCategory() {
    if (!newName.trim()) { setError('أدخل اسم الفئة'); return; }
    if (newName.trim().length > 80) { setError('الاسم طويل جداً'); return; }
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/categories', { name: newName.trim() });
      onCategoryCreated(data);
      setNewName('');
      setAdding(false);
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCategory(id, e) {
    e.stopPropagation();
    if (!window.confirm('هل تريد حذف هذه الفئة؟ سيتم نقل الوثائق إلى "أخرى".')) return;
    try {
      await api.delete(`/categories/${id}`);
      onCategoryDeleted(id);
    } catch {
      alert('حدث خطأ أثناء الحذف');
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <aside className="w-64 shrink-0 bg-white border-l border-gray-100 min-h-screen flex flex-col shadow-sm">
      {/* User info */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 bg-navy rounded-full flex items-center justify-center border-2 border-gold shrink-0">
            <span className="text-gold font-bold text-sm">{getInitials(user?.name)}</span>
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-navy truncate text-sm">{user?.name}</p>
            <p className="text-xs text-slate/60 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onUploadClick}
          className="w-full btn-primary text-sm py-2.5 flex items-center justify-center gap-2"
        >
          <Upload size={15} />
          رفع وثيقة جديدة
        </button>
      </div>

      {/* Categories */}
      <div className="flex-1 p-4 overflow-y-auto">
        <h3 className="text-xs font-semibold text-slate/50 uppercase tracking-wider mb-3">
          الفئات
        </h3>

        {/* All documents */}
        <button
          onClick={() => onCategorySelect('all')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
            activeCategory === 'all'
              ? 'bg-navy text-gold font-semibold'
              : 'text-slate hover:bg-cream'
          }`}
        >
          <FolderOpen size={15} />
          جميع الوثائق
        </button>

        {/* User categories */}
        <div className="space-y-0.5">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                activeCategory === cat.id
                  ? 'bg-navy text-gold font-semibold'
                  : 'text-slate hover:bg-cream'
              }`}
              onClick={() => onCategorySelect(cat.id)}
            >
              <Folder size={14} className="shrink-0" />
              <span className="flex-1 truncate">{cat.name}</span>
              <button
                onClick={(e) => handleDeleteCategory(cat.id, e)}
                className={`opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:text-danger ${
                  activeCategory === cat.id ? 'text-gold/60 hover:text-red-300' : 'text-slate/40'
                }`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Add category */}
        {adding ? (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(''); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateCategory();
                if (e.key === 'Escape') { setAdding(false); setNewName(''); setError(''); }
              }}
              placeholder="اسم الفئة..."
              className="input-field text-sm py-2"
              autoFocus
              disabled={saving}
              maxLength={80}
            />
            {error && <p className="text-danger text-xs">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleCreateCategory}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1 bg-success text-white py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
              >
                <Check size={12} /> حفظ
              </button>
              <button
                onClick={() => { setAdding(false); setNewName(''); setError(''); }}
                className="flex-1 flex items-center justify-center gap-1 bg-gray-100 text-slate py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors"
              >
                <X size={12} /> إلغاء
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gold hover:bg-gold/10 transition-colors mt-2"
          >
            <Plus size={14} />
            إضافة فئة
          </button>
        )}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-red-50 transition-colors"
        >
          <LogOut size={14} />
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}
