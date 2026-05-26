import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Grid, List, SortAsc, FileText, RefreshCw } from 'lucide-react';
import api from '../api/axiosInstance.js';
import CategorySidebar from '../components/CategorySidebar.jsx';
import DocumentCard from '../components/DocumentCard.jsx';
import UploadModal from '../components/UploadModal.jsx';

export default function Wallet() {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [viewMode, setViewMode] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [error, setError] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [docsRes, catsRes] = await Promise.all([
        api.get('/documents', { params: { sort } }),
        api.get('/categories'),
      ]);
      setDocuments(docsRes.data);
      setCategories(catsRes.data);
    } catch {
      setError('حدث خطأ أثناء تحميل البيانات. حاول مجدداً.');
    } finally {
      setLoading(false);
    }
  }, [sort]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredDocs = useMemo(() => {
    let docs = [...documents];

    if (activeCategory !== 'all') {
      docs = docs.filter((d) => d.category_id === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter((d) => d.original_name.toLowerCase().includes(q));
    }

    return docs;
  }, [documents, activeCategory, searchQuery]);

  function handleDocDeleted(id) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  function handleDocUploaded(doc) {
    setDocuments((prev) => [doc, ...prev]);
    setShowUpload(false);
  }

  function handleCategoryCreated(cat) {
    setCategories((prev) => [...prev, cat]);
  }

  function handleCategoryDeleted(id) {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (activeCategory === id) setActiveCategory('all');
    // Refetch docs as some may have been reassigned
    api.get('/documents', { params: { sort } }).then((r) => setDocuments(r.data)).catch(() => {});
  }

  const activeCount = filteredDocs.length;

  return (
    <div className="min-h-screen bg-cream pt-16 flex" dir="rtl">
      {/* Sidebar */}
      <CategorySidebar
        categories={categories}
        activeCategory={activeCategory}
        onCategorySelect={setActiveCategory}
        onCategoryCreated={handleCategoryCreated}
        onCategoryDeleted={handleCategoryDeleted}
        onUploadClick={() => setShowUpload(true)}
      />

      {/* Main content */}
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto min-h-0">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="font-amiri text-3xl text-navy mb-1">محفظتي</h1>
          <p className="text-slate/60 text-sm">
            {loading ? 'جارٍ التحميل...' : `${activeCount} وثيقة`}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن وثيقة..."
              className="input-field pr-9 py-2.5 text-sm"
            />
          </div>

          {/* Sort */}
          <div className="relative">
            <SortAsc size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate/40" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input-field pr-8 py-2.5 text-sm cursor-pointer appearance-none min-w-[130px]"
            >
              <option value="newest">الأحدث أولاً</option>
              <option value="oldest">الأقدم أولاً</option>
              <option value="name">الاسم (أ-ي)</option>
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 transition-colors ${viewMode === 'grid' ? 'bg-navy text-gold' : 'text-slate hover:bg-cream'}`}
            >
              <Grid size={15} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 transition-colors ${viewMode === 'list' ? 'bg-navy text-gold' : 'text-slate hover:bg-cream'}`}
            >
              <List size={15} />
            </button>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchAll}
            className="p-2.5 bg-white border border-gray-200 rounded-lg text-slate hover:bg-cream hover:text-navy transition-colors"
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-danger rounded-lg px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className={`grid gap-4 ${viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse border-r-4 border-gray-100">
                <div className="w-12 h-12 bg-gray-200 rounded-xl mb-3" />
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-3 bg-gray-100 rounded w-2/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredDocs.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 bg-navy/10 rounded-full flex items-center justify-center mb-5">
              <FileText size={36} className="text-navy/40" />
            </div>
            <h3 className="font-amiri text-2xl text-navy mb-2">
              {searchQuery ? 'لا توجد نتائج' : 'لا توجد وثائق بعد'}
            </h3>
            <p className="text-slate/60 text-sm max-w-xs mb-6">
              {searchQuery
                ? `لا توجد وثائق تطابق "${searchQuery}"`
                : 'ارفع أولى وثائقك وابدأ تنظيم ملفاتك الرسمية'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setShowUpload(true)}
                className="btn-primary text-sm"
              >
                رفع وثيقة جديدة
              </button>
            )}
          </motion.div>
        )}

        {/* Documents grid/list */}
        {!loading && filteredDocs.length > 0 && (
          <AnimatePresence mode="popLayout">
            <motion.div
              layout
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
                  : 'flex flex-col gap-3'
              }
            >
              {filteredDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onDelete={handleDocDeleted}
                  viewMode={viewMode}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Upload modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            categories={categories}
            onClose={() => setShowUpload(false)}
            onUploaded={handleDocUploaded}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
