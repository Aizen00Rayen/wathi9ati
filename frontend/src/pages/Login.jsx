import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, FileText, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const schema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
  remember: z.boolean().optional(),
});

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/wallet', { replace: true });
  }, [user, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data) {
    setLoading(true);
    setServerError('');
    try {
      await login(data.email, data.password);
      navigate('/wallet');
    } catch (err) {
      const msg = err.response?.data?.message || 'حدث خطأ. حاول مجدداً.';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex pt-16">
      {/* Left decorative panel */}
      <div className="hidden lg:flex w-1/2 bg-navy relative overflow-hidden items-center justify-center">
        {/* Geometric bg */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="geo2" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <polygon points="40,5 75,25 75,55 40,75 5,55 5,25" fill="none" stroke="#C9A84C" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#geo2)" />
          </svg>
        </div>

        <div className="relative z-10 text-center px-8 max-w-md">
          <h1 className="font-amiri text-5xl text-gold mb-6">وثيقتي</h1>
          <blockquote className="font-amiri text-2xl text-cream/80 leading-relaxed mb-8">
            "وثائقك الرسمية، آمنة ومرتّبة، في متناول يدك دائماً"
          </blockquote>

          {/* Decorative floating doc cards */}
          <div className="flex justify-center gap-4 mt-8">
            {['بطاقة التعريف', 'جواز السفر', 'عقد الميلاد'].map((label, i) => (
              <motion.div
                key={i}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3 + i * 0.7, repeat: Infinity, ease: 'easeInOut' }}
                className="bg-white/10 border border-white/20 rounded-xl p-3 text-center"
              >
                <div className="w-8 h-10 bg-red-400/60 rounded mx-auto mb-1.5 flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold">PDF</span>
                </div>
                <p className="text-cream/60 text-[9px]">{label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: form */}
      <div className="flex-1 bg-cream flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-navy rounded-2xl mb-4 shadow-gold">
              <LogIn size={24} className="text-gold" />
            </div>
            <h2 className="font-amiri text-3xl text-navy mb-2">تسجيل الدخول</h2>
            <p className="text-slate/60 text-sm">أهلاً بعودتك إلى محفظتك الرقمية</p>
          </div>

          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 text-danger rounded-lg px-4 py-3 mb-5 flex items-center gap-2 text-sm"
            >
              <AlertCircle size={16} />
              {serverError}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">البريد الإلكتروني</label>
              <input
                {...register('email')}
                type="email"
                className="input-field"
                placeholder="example@email.com"
                dir="ltr"
                disabled={loading}
              />
              {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">كلمة المرور</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="input-field pl-10"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate/40 hover:text-slate transition-colors"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex items-center gap-2">
              <input
                {...register('remember')}
                type="checkbox"
                id="remember"
                className="w-4 h-4 accent-gold"
              />
              <label htmlFor="remember" className="text-sm text-slate cursor-pointer">تذكرني</label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 text-base flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  تسجيل الدخول
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate/60 mt-6">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="text-gold hover:underline font-medium">
              سجّل الآن
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
