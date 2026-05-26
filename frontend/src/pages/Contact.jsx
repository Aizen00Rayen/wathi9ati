import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Mail, Phone, Clock, MapPin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../api/axiosInstance.js';

const schema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل').max(100),
  email: z.string().email('البريد الإلكتروني غير صالح'),
  subject: z.string().min(3, 'الموضوع مطلوب').max(200),
  message: z.string().min(20, 'الرسالة يجب أن تكون 20 حرفاً على الأقل').max(2000),
});

const CONTACT_INFO = [
  {
    icon: Mail,
    label: 'البريد الإلكتروني',
    value: 'contact@wathi9ati.site',
    href: 'mailto:contact@wathi9ati.site',
  },
  {
    icon: Phone,
    label: 'الهاتف',
    value: '0657732216',
    href: 'tel:0657732216',
  },
  {
    icon: Clock,
    label: 'ساعات العمل',
    value: 'الأحد – الخميس، 9ص – 5م',
  },
  {
    icon: MapPin,
    label: 'الموقع',
    value: 'الجزائر',
  },
];

export default function Contact() {
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  async function onSubmit(data) {
    setLoading(true);
    setServerError('');
    try {
      await api.post('/contact', data);
      setSuccess(true);
      reset();
    } catch (err) {
      const msgs = err.response?.data?.errors;
      if (msgs?.length) {
        setServerError(msgs.map((e) => e.msg).join(' — '));
      } else {
        setServerError(err.response?.data?.message || 'حدث خطأ. حاول مجدداً.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="section-title mb-3">تواصل معنا</h1>
          <p className="text-slate/60 max-w-md mx-auto">
            هل لديك سؤال أو اقتراح؟ نحن هنا لمساعدتك
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Contact info card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-2 bg-navy rounded-2xl p-7 text-cream h-fit"
          >
            <h2 className="font-amiri text-2xl text-gold mb-2">معلومات التواصل</h2>
            <p className="text-cream/60 text-sm mb-8">
              يسعدنا الرد على استفساراتك في أقرب وقت ممكن
            </p>

            <div className="space-y-6">
              {CONTACT_INFO.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-9 h-9 bg-gold/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon size={16} className="text-gold" />
                  </div>
                  <div>
                    <p className="text-cream/50 text-xs mb-0.5">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="text-cream hover:text-gold transition-colors text-sm font-medium">
                        {item.value}
                      </a>
                    ) : (
                      <p className="text-cream text-sm font-medium">{item.value}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Decorative dots */}
            <div className="mt-10 flex gap-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-gold' : 'bg-white/20'}`}
                />
              ))}
            </div>
          </motion.div>

          {/* Contact form */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3 bg-white rounded-2xl shadow-card p-7 border-r-4 border-gold"
          >
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-10 text-center"
              >
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-success" />
                </div>
                <h3 className="font-amiri text-2xl text-navy mb-2">تم الإرسال بنجاح!</h3>
                <p className="text-slate/60 text-sm mb-6 max-w-xs">
                  شكراً لتواصلك معنا. سنرد على رسالتك في أقرب وقت ممكن.
                </p>
                <button
                  onClick={() => setSuccess(false)}
                  className="btn-primary text-sm"
                >
                  إرسال رسالة أخرى
                </button>
              </motion.div>
            ) : (
              <>
                <h2 className="font-amiri text-2xl text-navy mb-6">أرسل رسالتك</h2>

                {serverError && (
                  <div className="bg-red-50 border border-red-200 text-danger rounded-lg px-4 py-3 mb-5 flex items-center gap-2 text-sm">
                    <AlertCircle size={15} />
                    {serverError}
                  </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">الاسم الكامل <span className="text-danger">*</span></label>
                      <input
                        {...register('name')}
                        className="input-field"
                        placeholder="أحمد بن علي"
                        disabled={loading}
                      />
                      {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                      <label className="label">البريد الإلكتروني <span className="text-danger">*</span></label>
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
                  </div>

                  <div>
                    <label className="label">الموضوع <span className="text-danger">*</span></label>
                    <input
                      {...register('subject')}
                      className="input-field"
                      placeholder="موضوع رسالتك..."
                      disabled={loading}
                    />
                    {errors.subject && <p className="text-danger text-xs mt-1">{errors.subject.message}</p>}
                  </div>

                  <div>
                    <label className="label">الرسالة <span className="text-danger">*</span></label>
                    <textarea
                      {...register('message')}
                      rows={5}
                      className="input-field resize-none"
                      placeholder="اكتب رسالتك هنا... (20 حرفاً على الأقل)"
                      disabled={loading}
                    />
                    {errors.message && <p className="text-danger text-xs mt-1">{errors.message.message}</p>}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-primary py-3.5 flex items-center justify-center gap-2 text-base"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send size={18} />
                        إرسال الرسالة
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
