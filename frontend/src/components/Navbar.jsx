import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, FileText, LogOut, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  const navBg = isHome && !scrolled
    ? 'bg-transparent'
    : 'frosted-nav';

  const linkColor = isHome && !scrolled ? 'text-cream hover:text-gold' : 'text-navy hover:text-gold';
  const logoColor = isHome && !scrolled ? 'text-gold' : 'text-gold';

  function getInitials(name) {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() || 'U';
  }

  return (
    <nav
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${navBg}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link
            to="/"
            className={`font-amiri text-2xl font-bold ${logoColor} transition-colors`}
          >
            وثيقتي
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className={`font-medium transition-colors ${linkColor}`}>
              الرئيسية
            </Link>
            <Link to="/contact" className={`font-medium transition-colors ${linkColor}`}>
              تواصل معنا
            </Link>

            {user ? (
              <>
                <Link
                  to="/wallet"
                  className={`flex items-center gap-1.5 font-medium transition-colors ${linkColor}`}
                >
                  <Wallet size={16} />
                  محفظتي
                </Link>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center border-2 border-gold">
                    <span className="text-gold text-xs font-bold">{getInitials(user.name)}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-danger hover:opacity-80 transition-opacity font-medium text-sm"
                  >
                    <LogOut size={15} />
                    خروج
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className={`font-medium transition-colors ${linkColor}`}
                >
                  تسجيل الدخول
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">
                  إنشاء حساب
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className={`md:hidden p-2 rounded-lg ${linkColor}`}
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="قائمة التنقل"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white shadow-lg border-t border-cream-dark">
          <div className="px-4 py-4 flex flex-col gap-4">
            <Link to="/" className="text-navy font-medium hover:text-gold transition-colors">
              الرئيسية
            </Link>
            <Link to="/contact" className="text-navy font-medium hover:text-gold transition-colors">
              تواصل معنا
            </Link>
            {user ? (
              <>
                <Link to="/wallet" className="text-navy font-medium hover:text-gold transition-colors flex items-center gap-2">
                  <Wallet size={16} /> محفظتي
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-danger font-medium flex items-center gap-2 text-right"
                >
                  <LogOut size={16} /> تسجيل الخروج
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-navy font-medium hover:text-gold transition-colors">
                  تسجيل الدخول
                </Link>
                <Link to="/register" className="btn-primary text-sm text-center">
                  إنشاء حساب
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
