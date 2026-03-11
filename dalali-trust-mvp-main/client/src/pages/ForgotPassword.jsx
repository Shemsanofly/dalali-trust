import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Field, ErrorBox, Spinner } from './Login';
import { ShieldAlert, KeyRound } from 'lucide-react';

export default function ForgotPassword() {
    const { saveAuth } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNP] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const refs = useRef([]);

    const handleRequest = async (e) => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: phone }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStep(2);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    const onOtpChange = (i, val) => {
        const next = [...otp]; next[i] = val.slice(-1); setOtp(next);
        if (val && i < 5) refs.current[i + 1]?.focus();
    };

    const handleReset = async (e) => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: phone, otp: otp.join(''), newPassword }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            saveAuth(data); navigate('/');
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 pt-24 pb-12 animate-fade-up">
            <div className="w-full max-w-sm">
                <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-navy-950/50">
                    {step === 1 ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 rounded-full bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
                                    <ShieldAlert className="w-8 h-8 text-gold-500" />
                                </div>
                                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('auth_reset_title')}</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('auth_reset_sub')}</p>
                            </div>
                            <form onSubmit={handleRequest} className="space-y-4">
                                {error && <ErrorBox msg={error} />}
                                <Field label={t('auth_phone')}>
                                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+255712345678" required className="input-base" />
                                </Field>
                                <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                                    {loading ? <Spinner /> : t('auth_reset_btn')}
                                </button>
                                <p className="text-center text-sm text-slate-500 pt-1">
                                    <Link to="/login" className="text-gold-600 dark:text-gold-400 font-semibold hover:underline">← {t('auth_login_btn')}</Link>
                                </p>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 rounded-full bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
                                    <KeyRound className="w-8 h-8 text-gold-500" />
                                </div>
                                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">{t('auth_new_pw_title')}</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('auth_new_pw_sub')} <strong>{phone}</strong></p>
                            </div>
                            <form onSubmit={handleReset} className="space-y-5">
                                {error && <ErrorBox msg={error} />}
                                <div className="flex gap-2 justify-center">
                                    {otp.map((d, i) => (
                                        <input key={i} ref={el => refs.current[i] = el} type="text" inputMode="numeric" maxLength={1} value={d}
                                            onChange={e => onOtpChange(i, e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus(); }}
                                            className="w-11 h-14 text-center text-xl font-bold rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors" />
                                    ))}
                                </div>
                                <Field label={t('auth_new_pw_title')}>
                                    <input type="password" value={newPassword} onChange={e => setNP(e.target.value)} placeholder="••••••••" required minLength={6} className="input-base" />
                                </Field>
                                <button type="submit" disabled={loading || otp.join('').length !== 6} className="btn-primary w-full">
                                    {loading ? <Spinner /> : t('auth_reset_submit')}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
