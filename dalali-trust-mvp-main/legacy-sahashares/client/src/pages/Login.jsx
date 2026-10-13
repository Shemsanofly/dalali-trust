import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
    const { saveAuth } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone, password }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            saveAuth(data);
            navigate('/portfolio');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 pt-24 pb-12 animate-fade-up">
            <div className="w-full max-w-sm">
                <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-navy-950/50">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 rounded-full bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
                            <KeyRound className="w-8 h-8 text-gold-500" />
                        </div>
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('auth_welcome')}</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('auth_login_sub')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && <ErrorBox msg={error} />}

                        <Field label={t('auth_phone')}>
                            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                                placeholder="+255712345678" required
                                className="input-base" />
                        </Field>

                        <Field label={t('auth_pw')}>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••" required
                                className="input-base" />
                        </Field>

                        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                            {loading ? <Spinner /> : t('auth_login_btn')}
                        </button>

                        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 pt-1">
                            <Link to="/forgot-password" className="hover:text-gold-600 dark:hover:text-gold-400 font-medium transition-colors">{t('auth_forgot')}</Link>
                            <span>·</span>
                            <Link to="/signup" className="hover:text-gold-600 dark:hover:text-gold-400 font-medium transition-colors">{t('auth_create')}</Link>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

/* ── Shared sub-components ── */
export function Field({ label, children }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</label>
            {children}
        </div>
    );
}

export function ErrorBox({ msg }) {
    return (
        <div className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl px-4 py-3 text-center">
            {msg}
        </div>
    );
}

export function SuccessBox({ msg }) {
    return (
        <div className="text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl px-4 py-3 text-center">
            {msg}
        </div>
    );
}

export function Spinner() {
    return <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />;
}
