import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, User, Globe, PlusCircle, Home, Store, Briefcase, Building2, LogOut, LogIn, BarChart2, Wallet, ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar() {
    const { user, logout } = useAuth();
    const { dark, toggle } = useTheme();
    const { lang, toggleLang, t } = useLanguage();
    const location = useLocation();
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Scroll listener for sticky styling
    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', h, { passive: true });
        return () => window.removeEventListener('scroll', h);
    }, []);

    // Close menus on route change
    useEffect(() => {
        setMobileOpen(false);
        setDropdownOpen(false);
    }, [location]);

    // Close desktop dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Primary Links (Always visible on Desktop)
    const mainNav = [
        { to: '/', label: t('nav_home') || 'Home', icon: Home },
        { to: '/marketplace', label: t('nav_marketplace') || 'Marketplace', icon: Store },
        ...(user ? [{ to: '/portfolio', label: t('nav_portfolio') || 'Portfolio', icon: Briefcase }] : [])
    ];

    // Secondary / Dropdown Links
    const dropNav = [
        ...(user ? [{ to: '/my-properties', label: t('nav_my_properties') || 'My Properties', icon: Building2 }] : []),
        { to: '/analytics', label: 'Analytics', icon: BarChart2 },
        { to: '/verify', label: t('nav_list_prop') || 'List a Property', icon: PlusCircle },
    ];

    const formatBalance = (pesa) => `TSh ${Math.floor((pesa || 0) / 100).toLocaleString()}`;

    return (
        <header
            className={`fixed z-50 transition-all duration-500 ease-out left-0 right-0 mx-auto ${scrolled
                ? 'top-3 w-[calc(100%-1.5rem)] md:w-[calc(100%-3rem)] max-w-7xl bg-white/40 dark:bg-navy-950/50 backdrop-blur-xl shadow-2xl shadow-invest-500/10 border border-white/60 dark:border-white/10 rounded-3xl'
                : 'top-0 w-full bg-transparent border-transparent'
                }`}
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 h-16">

                {/* Logo & Main Nav container (Left Side) */}
                <div className="flex items-center gap-8">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <img src="/logo.svg" alt="SahaShares Logo" className="h-8 w-auto" />
                        <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white hidden sm:block">
                            Saha<span className="text-invest-500">Shares</span>
                        </span>
                    </Link>

                    {/* Desktop Main Nav */}
                    <nav className="hidden lg:flex items-center gap-1">
                        {mainNav.map((n) => {
                            const Icon = n.icon;
                            const isActive = location.pathname === n.to;
                            return (
                                <Link
                                    key={n.to}
                                    to={n.to}
                                    className={`text-sm font-bold transition-all flex items-center gap-2 px-3 py-2 rounded-xl ${isActive
                                        ? 'bg-slate-100 dark:bg-navy-800 text-invest-600 dark:text-invest-400'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-navy-800/50 hover:text-invest-500'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {n.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Right Side (Wallet & Controls) */}
                <div className="flex items-center gap-2 sm:gap-4">

                    {/* Persistent Wallet Balance (Visible if logged in) */}
                    {user && (
                        <Link
                            to="/account"
                            className="flex items-center gap-1.5 sm:gap-2 bg-invest-50 dark:bg-invest-900/40 text-invest-700 dark:text-invest-300 px-2 sm:px-3 py-1.5 rounded-xl border border-invest-200/60 dark:border-invest-800 hover:bg-invest-100 dark:hover:bg-invest-800 transition-colors"
                        >
                            <Wallet className="w-4 h-4 shrink-0" />
                            <span className="font-extrabold text-sm tracking-tight">{formatBalance(user.walletBalance)}</span>
                        </Link>
                    )}

                    {/* Mobile Hamburger Trigger */}
                    <button
                        className="lg:hidden p-2 ml-1 rounded-xl hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-700 dark:text-slate-300 transition-colors"
                        onClick={() => setMobileOpen(!mobileOpen)}
                    >
                        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>

                    {/* Desktop Controls */}
                    <div className="hidden lg:flex items-center gap-3">
                        {!user && (
                            <>
                                <button onClick={toggleLang} className="flex items-center gap-1 p-2 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors" title={t('nav_lang_toggle')}>
                                    <Globe className="w-4 h-4 text-slate-400" /> {lang}
                                </button>
                                <button onClick={toggle} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-navy-800 transition-colors" title={t('nav_theme_toggle')}>
                                    {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                </button>
                            </>
                        )}

                        {user ? (
                            /* User Dropdown */
                            <div className="relative" ref={dropdownRef}>
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center gap-2 bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-700 pl-1 pr-3 py-1 rounded-full hover:border-invest-300 dark:hover:border-invest-600 transition-colors shadow-sm"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-400 to-invest-500 flex items-center justify-center text-sm font-extrabold text-white shadow-inner">
                                        {user.fullName?.[0]?.toUpperCase() || '?'}
                                    </div>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {user.fullName?.split(' ')[0]}
                                    </span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown Menu */}
                                {dropdownOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-navy-900 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-slate-100 dark:border-navy-800 py-2 animate-fade-in-up origin-top-right">
                                        <div className="px-4 py-2 border-b border-slate-100 dark:border-navy-800 mb-2">
                                            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Signed in as</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.email}</p>
                                        </div>

                                        <Link to="/account" className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
                                            <User className="w-4 h-4 text-slate-400" /> {t('nav_account') || 'Account Settings'}
                                        </Link>

                                        {dropNav.map((n) => {
                                            const Icon = n.icon;
                                            return (
                                                <Link key={n.to} to={n.to} className="flex items-center gap-3 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
                                                    <Icon className="w-4 h-4 text-slate-400" /> {n.label}
                                                </Link>
                                            )
                                        })}

                                        <div className="h-px bg-slate-100 dark:bg-navy-800 my-2" />

                                        <button onClick={toggleLang} className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
                                            <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-slate-400" /> {t('nav_lang_toggle') || 'Language'}</div>
                                            <span className="text-xs bg-slate-100 dark:bg-navy-800 px-2 py-0.5 rounded-md text-slate-500 font-bold uppercase">{lang}</span>
                                        </button>

                                        <button onClick={toggle} className="w-full flex items-center justify-between px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-800 transition-colors">
                                            <div className="flex items-center gap-3">
                                                {dark ? <Moon className="w-4 h-4 text-slate-400" /> : <Sun className="w-4 h-4 text-slate-400" />} {t('nav_theme_toggle') || 'Theme'}
                                            </div>
                                            <span className="text-xs bg-slate-100 dark:bg-navy-800 px-2 py-0.5 rounded-md text-slate-500 font-bold">{dark ? 'Dark' : 'Light'}</span>
                                        </button>

                                        <div className="h-px bg-slate-100 dark:bg-navy-800 my-2" />

                                        <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                            <LogOut className="w-4 h-4" /> {t('nav_logout')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link to="/login" className="btn-primary text-sm px-5 py-2 flex items-center gap-2 shadow-md shadow-invest-500/20">
                                <LogIn className="w-4 h-4" /> {t('nav_signin')}
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Dropdown Menu (Hamburger) */}
            <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${mobileOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="bg-white/95 dark:bg-navy-950/95 backdrop-blur-2xl border-t border-slate-100 dark:border-navy-800 px-4 py-4 space-y-1 shadow-2xl pb-6">
                    {/* Main Nav in Mobile */}
                    {[...mainNav, ...dropNav].map((n) => {
                        const Icon = n.icon;
                        const isActive = location.pathname === n.to;
                        return (
                            <Link
                                key={n.to}
                                to={n.to}
                                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-colors ${isActive
                                    ? 'bg-invest-50 dark:bg-invest-900/30 text-invest-600 dark:text-invest-400'
                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-navy-900'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-invest-500' : 'text-slate-400'}`} />
                                {n.label}
                            </Link>
                        );
                    })}

                    <div className="h-px bg-slate-100 dark:bg-navy-800 my-3 ml-3 mr-3" />

                    {/* Mobile Settings & Auth */}
                    <div className="grid grid-cols-2 gap-2 px-3">
                        <button onClick={toggleLang} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-800 text-sm font-bold text-slate-700 dark:text-slate-200">
                            <Globe className="w-5 h-5 text-slate-400" />
                            <span className="uppercase">{lang}</span>
                        </button>
                        <button onClick={toggle} className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-800 text-sm font-bold text-slate-700 dark:text-slate-200">
                            {dark ? <Moon className="w-5 h-5 text-slate-400" /> : <Sun className="w-5 h-5 text-slate-400" />}
                            <span>{dark ? 'Dark' : 'Light'}</span>
                        </button>
                    </div>

                    <div className="px-3 pt-3">
                        {user ? (
                            <div className="flex gap-2">
                                <Link to="/account" className="flex-1 btn-outline justify-center !py-2.5 text-sm flex items-center gap-2">
                                    <User className="w-4 h-4" /> Account
                                </Link>
                                <button onClick={logout} className="flex-1 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 border border-red-100 dark:border-red-900/50 rounded-xl font-bold justify-center !py-2.5 text-sm flex items-center gap-2 hover:bg-red-100 transition-colors">
                                    <LogOut className="w-4 h-4" /> Logout
                                </button>
                            </div>
                        ) : (
                            <Link to="/login" className="w-full btn-primary justify-center !py-3 flex items-center gap-2 text-sm shadow-lg shadow-invest-500/20">
                                <LogIn className="w-5 h-5" /> {t('nav_signin')}
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}