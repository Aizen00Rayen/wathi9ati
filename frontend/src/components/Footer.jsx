import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-navy text-cream/80 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Column 1: Brand */}
          <div>
            <h3 className="font-amiri text-2xl text-gold mb-3">وثيقتي</h3>
            <p className="text-sm leading-relaxed text-cream/70">
              وثيقتك الرقمية في أمان تام — احتفظ بوثائقك الرسمية في مكان واحد آمن وسهل الوصول.
            </p>
          </div>

          {/* Column 2: Quick links */}
          <div>
            <h4 className="font-semibold text-cream mb-4">روابط سريعة</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="hover:text-gold transition-colors">الرئيسية</Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-gold transition-colors">تواصل معنا</Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-gold transition-colors">تسجيل الدخول</Link>
              </li>
              <li>
                <Link to="/register" className="hover:text-gold transition-colors">إنشاء حساب</Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div>
            <h4 className="font-semibold text-cream mb-4">تواصل معنا</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2">
                <Mail size={14} className="text-gold shrink-0" />
                <a href="mailto:contact@wathi9ati.space" className="hover:text-gold transition-colors">
                  contact@wathi9ati.space
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone size={14} className="text-gold shrink-0" />
                <a href="tel:0657732216" className="hover:text-gold transition-colors">
                  0657732216
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 mt-10 pt-6 text-center text-xs text-cream/50">
          © {new Date().getFullYear()} وثيقتي — جميع الحقوق محفوظة
        </div>
      </div>
    </footer>
  );
}
