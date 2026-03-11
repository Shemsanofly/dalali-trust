import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Field, ErrorBox, Spinner } from './Login';
import { Home, Smartphone, Gift } from 'lucide-react';

export default function Signup() {
    const { saveAuth } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [form, setForm] = useState({ fullName: '', phoneNumber: '', password: '' });
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const refs = useRef([]);

    const update = (k, v) => setForm({ ...form, [k]: v });

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown((c) => c - 1), 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleSignup = async (e) => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStep(2);
            setCooldown(60);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    const onOtpChange = (i, val) => {
        const next = [...otp]; next[i] = val.slice(-1); setOtp(next);
        if (val && i < 5) refs.current[i + 1]?.focus();
    };
    const onOtpKey = (i, e) => { if (e.key === 'Backspace' && !otp[i] && i > 0) refs.current[i - 1]?.focus(); };

    const handleVerify = async (e) => {
        e.preventDefault(); setError(''); setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: form.phoneNumber, otp: otp.join('') }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            saveAuth(data); navigate('/portfolio');
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    const handleResend = async () => {
        setResending(true); setError('');
        try {
            const res = await fetch('/api/auth/resend-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phoneNumber: form.phoneNumber }) });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setCooldown(60);
            setOtp(['', '', '', '', '', '']);
            setError('');
        } catch (err) { setError(err.message); } finally { setResending(false); }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 pt-24 pb-12 animate-fade-up">
            <div className="w-full max-w-sm">
                <div className="flex gap-2 justify-center mb-8">
                    {[1, 2].map(s => (
                        <div key={s} className={`h-1.5 rounded-full transition-all duration-300 ${s === step ? 'w-10 bg-gold-500' : s < step ? 'w-10 bg-emerald-500' : 'w-5 bg-slate-200 dark:bg-navy-800'}`} />
                    ))}
                </div>

                <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-3xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-navy-950/50">
                    {step === 1 ? (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 rounded-full bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
                                    <Home className="w-8 h-8 text-gold-500" />
                                </div>
                                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('auth_signup_title')}</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-4">{t('auth_signup_sub')}</p>

                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 inline-flex items-center gap-2 mb-2">
                                    <span className="flex w-6 h-6 bg-emerald-100 dark:bg-emerald-800 rounded-full items-center justify-center text-emerald-600 dark:text-emerald-400"><Gift className="w-3.5 h-3.5" /></span>
                                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 text-left leading-tight">
                                        Sign up today and get an instant <br />
                                        <span className="text-emerald-800 dark:text-emerald-300">TSh 1,000 Airtime Bonus!</span>
                                    </p>
                                </div>
                            </div>
                            <form onSubmit={handleSignup} className="space-y-4">
                                {error && <ErrorBox msg={error} />}
                                <Field label={t('auth_name')}>
                                    <input value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="Juma Rashid" required className="input-base" />
                                </Field>
                                <Field label={t('auth_phone')}>
                                    <input type="tel" value={form.phoneNumber} onChange={e => update('phoneNumber', e.target.value)} placeholder="+255712345678" required className="input-base" />
                                </Field>
                                <Field label={t('auth_pw_hint')}>
                                    <input type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="••••••••" required minLength={6} className="input-base" />
                                </Field>
                                <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
                                    {loading ? <Spinner /> : t('auth_send_code')}
                                </button>
                                <p className="text-center text-sm text-slate-500 pt-1">
                                    {t('auth_have_acc')}{' '}
                                    <Link to="/login" className="text-gold-600 dark:text-gold-400 font-semibold hover:underline">{t('auth_login_btn')}</Link>
                                </p>
                            </form>
                        </>
                    ) : (
                        <>
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 rounded-full bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
                                    <Smartphone className="w-8 h-8 text-gold-500" />
                                </div>
                                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{t('auth_verify_title')}</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('auth_verify_sub')} <strong>{form.phoneNumber}</strong></p>
                            </div>
                            <form onSubmit={handleVerify} className="space-y-6">
                                {error && <ErrorBox msg={error} />}
                                <div className="flex gap-2 justify-center">
                                    {otp.map((d, i) => (
                                        <input key={i} ref={el => refs.current[i] = el}
                                            type="text" inputMode="numeric" maxLength={1} value={d}
                                            onChange={e => onOtpChange(i, e.target.value)}
                                            onKeyDown={e => onOtpKey(i, e)}
                                            className="w-11 h-14 text-center text-xl font-bold rounded-xl border border-slate-200 dark:border-navy-700 bg-slate-50 dark:bg-navy-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 transition-colors" />
                                    ))}
                                </div>
                                <button type="submit" disabled={loading || otp.join('').length !== 6} className="btn-primary w-full">
                                    {loading ? <Spinner /> : t('auth_verify_btn')}
                                </button>

                                <div className="text-center">
                                    {cooldown > 0 ? (
                                        <p className="text-sm text-slate-400">
                                            {t('auth_resend_in')} <span className="font-semibold text-gold-500">{cooldown}s</span>
                                        </p>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleResend}
                                            disabled={resending}
                                            className="text-sm font-semibold text-gold-600 dark:text-gold-400 hover:underline disabled:opacity-50 cursor-pointer"
                                        >
                                            {resending ? 'Sending...' : t('auth_resend_btn')}
                                        </button>
                                    )}
                                </div>

                                <button type="button" onClick={() => setStep(1)} className="btn-outline w-full text-sm">{t('auth_back')}</button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
