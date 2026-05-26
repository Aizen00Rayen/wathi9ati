import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Folder, Download, ChevronDown, FileText } from 'lucide-react';

const FEATURES = [
  {
    icon: Shield,
    title: 'خصوصية تامة',
    desc: 'فقط أنت من يصل إلى وثائقك. تشفير كامل وبروتوكولات أمان متقدمة تحمي معلوماتك الشخصية.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Folder,
    title: 'تصنيف ذكي',
    desc: 'نظّم وثائقك في فئات مخصصة تناسب احتياجاتك — هوية، سكن، تعليم، عمل وأكثر.',
    color: 'text-gold',
    bg: 'bg-amber-50',
  },
  {
    icon: Download,
    title: 'تحميل فوري',
    desc: 'حمّل أي وثيقة في أي وقت ومن أي مكان بضغطة واحدة، بدون انتظار.',
    color: 'text-green-600',
    bg: 'bg-green-50',
  },
];

const DOC_TYPES = [
  'بطاقة التعريف الوطنية',
  'عقد الميلاد',
  'شهادة الإقامة',
  'جواز السفر',
  'الدبلومات والشهادات',
  'عقود العمل',
  'وثائق السكن',
  'الوثائق البنكية',
  'شهادات طبية',
  'وغيرها...',
];

// Background geometric SVG pattern
function GeometricPattern() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-5"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="geo" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <polygon
            points="30,5 55,20 55,40 30,55 5,40 5,20"
            fill="none"
            stroke="#C9A84C"
            strokeWidth="1"
          />
          <circle cx="30" cy="30" r="3" fill="#C9A84C" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#geo)" />
    </svg>
  );
}

// Floating PDF card component
function FloatingCard({ style, animClass, label }) {
  return (
    <div
      className={`absolute ${animClass} ${style}`}
    >
      <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 flex items-center gap-2 shadow-lg">
        <div className="w-8 h-10 bg-red-400/80 rounded-sm flex items-center justify-center">
          <span className="text-white text-xs font-bold">PDF</span>
        </div>
        <div className="text-cream/80 text-xs">
          <p className="font-medium">{label}</p>
          <p className="text-cream/50 text-[10px]">وثيقة آمنة</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const featuresRef = useRef(null);

  return (
    <div className="overflow-x-hidden">
      {/* ─── HERO ─── */}
      <section className="relative min-h-screen bg-navy flex items-center justify-center overflow-hidden">
        <GeometricPattern />

        {/* Radial gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-navy-dark opacity-90" />

        {/* Floating PDF cards */}
        <FloatingCard
          style="top-32 right-16 hidden lg:block"
          animClass="animate-float"
          label="بطاقة التعريف"
        />
        <FloatingCard
          style="top-40 left-20 hidden lg:block"
          animClass="animate-float2"
          label="جواز السفر"
        />
        <FloatingCard
          style="bottom-32 right-24 hidden lg:block"
          animClass="animate-float3"
          label="عقد الميلاد"
        />

        {/* Content */}
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 bg-gold/20 border border-gold/30 text-gold px-4 py-1.5 rounded-full text-sm mb-6">
              <Shield size={14} />
              محفظتك الرقمية الآمنة
            </div>

            <h1 className="font-amiri text-5xl sm:text-6xl lg:text-7xl text-cream font-bold mb-6 leading-tight text-shadow">
              وثيقتك الرقمية،
              <br />
              <span className="text-gold">في أمان تام</span>
            </h1>

            <p className="text-cream/70 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
              احتفظ بوثائقك الرسمية الهامة في مكان واحد، آمن وسهل الوصول في أي وقت ومن أي مكان
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register" className="btn-primary text-base px-8 py-3.5">
                ابدأ الآن — مجاناً
              </Link>
              <button
                onClick={() => featuresRef.current?.scrollIntoView({ behavior: 'smooth' })}
                className="btn-ghost text-base px-8 py-3.5 flex items-center gap-2"
              >
                تعرف أكثر
                <ChevronDown size={16} />
              </button>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gold/60"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ChevronDown size={28} />
        </motion.div>
      </section>

      {/* ─── FEATURES ─── */}
      <section ref={featuresRef} className="py-20 bg-cream">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="section-title mb-4">لماذا وثيقتي؟</h2>
            <p className="text-slate/70 max-w-xl mx-auto">
              نوفر لك تجربة آمنة وسلسة لإدارة وثائقك الرسمية الجزائرية
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="card text-center group"
              >
                <div className={`w-14 h-14 ${f.bg} rounded-2xl flex items-center justify-center mx-auto mb-5 group-hover:scale-110 transition-transform`}>
                  <f.icon size={26} className={f.color} />
                </div>
                <h3 className="font-amiri text-xl text-navy mb-3">{f.title}</h3>
                <p className="text-slate/70 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SUPPORTED DOCS ─── */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="section-title mb-4">أنواع الوثائق المدعومة</h2>
          <p className="text-slate/60 mb-10">
            احتفظ بجميع وثائقك الرسمية في مكان واحد
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {DOC_TYPES.map((type, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="bg-cream border border-gold/30 text-navy px-4 py-2 rounded-full text-sm font-medium hover:bg-gold/10 hover:border-gold transition-colors cursor-default"
              >
                {type}
              </motion.span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="py-20 bg-cream">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="section-title mb-4">كيف يعمل؟</h2>
          <p className="text-slate/60 mb-14">ثلاث خطوات بسيطة للبدء</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '١', title: 'أنشئ حساباً', desc: 'سجّل مجاناً ببريدك الإلكتروني وكلمة مرور آمنة' },
              { step: '٢', title: 'ارفع وثائقك', desc: 'ارفع ملفات PDF وصنّفها في فئات مخصصة' },
              { step: '٣', title: 'وصول فوري', desc: 'ادخل إلى وثائقك وحمّلها في أي وقت من أي جهاز' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="w-14 h-14 bg-navy rounded-full flex items-center justify-center mb-4 shadow-gold">
                  <span className="font-amiri text-gold text-xl font-bold">{item.step}</span>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute mt-7 mr-36 w-24 border-t-2 border-dashed border-gold/30" />
                )}
                <h3 className="font-amiri text-xl text-navy mb-2">{item.title}</h3>
                <p className="text-slate/60 text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section className="py-16 bg-navy relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <GeometricPattern />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="font-amiri text-4xl text-gold mb-4">
              ابدأ اليوم، مجاناً تماماً
            </h2>
            <p className="text-cream/70 text-lg mb-8">
              انضم إلى آلاف الجزائريين الذين يحفظون وثائقهم بأمان
            </p>
            <Link to="/register" className="btn-ghost text-lg px-10 py-4">
              سجّل مجاناً الآن
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
