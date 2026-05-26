import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const schema = z
  .object({
    name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(100),
    email: z.string().email('البريد الإلكتروني غير صالح'),
    password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
    confirmPassword: z.string().min(1, 'تأكيد كلمة المرور مطلوب'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'كلمتا المرور غير متطابقتين',
    path: ['confirmPassword'],
  });

function PasswordStrength({ password }) {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { label: 'ضعيفة جداً', color: 'bg-red-500', width: 'w-1/4' },
    { label: 'ضعيفة', color: 'bg-orange-400', width: 'w-2/4' },
    { label: 'متوسطة', color: 'bg-yellow-400', width: 'w-3/4' },
    { label: 'قوية', color: 'bg-success', width: 'w-full' },
  ];

  const level = levels[Math.max(0, score - 1)] || levels[0];

  return (
    <div className="mt-2 space-y-1">
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all duration-300 ${level.color} ${level.width}`} />
      </div>
      <p className="text-xs text-slate/60">قوة كلمة المرور: <span className="font-medium">{level.label}</span></p>
    </div>
  );
}

export default function Register() {
  const { register: authRegister, user } = useAuth();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/wallet', { replace: true });
  }, [user, navigate]);

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const watchedPassword = useWatch({ control, name: 'password', defaultValue: '' });

  async function onSubmit(data) {
    setLoading(true);
    setServerError('');
    try {
      await authRegister(data.name, data.email, data.password, data.confirmPassword);
      navigate('/wallet');
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors?.length) {
        setServerError(errors.map((e) => e.msg).join(' — '));
      } else {
        setServerError(err.response?.data?.message || 'حدث خطأ. حاول مجدداً.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex pt-16">
      {/* Left: form */}
      <div className="flex-1 bg-cream flex items-center justify-center px-4 py-12 order-2 lg:order-1">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-navy rounded-2xl mb-4 shadow-gold">
              <UserPlus size={24} className="text-gold" />
            </div>
            <h2 className="font-amiri text-3xl text-navy mb-2">إنشاء حساب جديد</h2>
            <p className="text-slate/60 text-sm">انضم إلى وثيقتي وحافظ على وثائقك بأمان</p>
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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <label className="label">الاسم الكامل</label>
              <input
                {...register('name')}
                type="text"
                className="input-field"
                placeholder="أحمد بن علي"
                disabled={loading}
              />
              {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
            </div>

            {/* Email */}
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

            {/* Password */}
            <div>
              <label className="label">كلمة المرور</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPass ? 'text' : 'password'}
                  className="input-field pl-10"
                  placeholder="8 أحرف على الأقل"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate/40 hover:text-slate"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <PasswordStrength password={watchedPassword} />
              {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label className="label">تأكيد كلمة المرور</label>
              <div className="relative">
                <input
                  {...register('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  className="input-field pl-10"
                  placeholder="أعد إدخال كلمة المرور"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate/40 hover:text-slate"
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-danger text-xs mt-1">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3.5 text-base flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} />
                  إنشاء الحساب
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate/60 mt-6">
            لديك حساب بالفعل؟{' '}
            <Link to="/login" className="text-gold hover:underline font-medium">
              سجّل دخولك
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right decorative panel */}
      <div className="hidden lg:flex w-1/2 bg-navy relative overflow-hidden items-center justify-center order-1 lg:order-2">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="geo3" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
                <polygon points="40,5 75,25 75,55 40,75 5,55 5,25" fill="none" stroke="#C9A84C" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#geo3)" />
          </svg>
        </div>

        <div className="relative z-10 text-center px-8 max-w-md">
          <h1 className="font-amiri text-5xl text-gold mb-6">وثيقتي</h1>
          <p className="font-amiri text-2xl text-cream/80 leading-relaxed mb-10">
            ابدأ اليوم وحافظ على وثائقك في مكان آمن ومنظّم
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: '🔒', text: 'تشفير كامل' },
              { icon: '📁', text: 'تصنيف ذكي' },
              { icon: '⬇️', text: 'تحميل فوري' },
              { icon: '🌐', text: 'وصول من أي مكان' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * i }}
                className="bg-white/10 border border-white/20 rounded-xl p-3"
              >
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-cream/70 text-sm">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
