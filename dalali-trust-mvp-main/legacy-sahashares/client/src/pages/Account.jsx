import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, ClipboardList, Wallet, ScrollText, Store, KeyRound, LogOut, Building2, Copy, CheckCircle2, Ticket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';
import { formatMoneyInput, parseMoneyValue } from '../utils/formatMoney';

const fmt = (pesa) => `TSh ${((pesa || 0) / 100).toLocaleString()}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short', year: 'numeric' });

function Section({ title, icon, children }) {
    return (
        <div className="card-base p-6 mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-5 pb-3 border-b border-slate-100 dark:border-navy-800 flex items-center gap-2">
                {icon}
                {title}
            </h2>
            {children}
        </div>
    );
}

function StatusBadge({ type, text }) {
    const styles = {
        success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
        error: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800',
        info: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    };
    return <div className={`p-3 rounded-xl text-sm font-medium mb-4 ${styles[type]}`}>{text}</div>;
}

export default function Account() {
    const { user, token, saveAuth, logout } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();

    // Profile state
    const [profile, setProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

    // Transactions state
    const [transactions, setTransactions] = useState([]);
    const [loadingTx, setLoadingTx] = useState(true);

    // Top-up state
    const [topupAmt, setTopupAmt] = useState('');
    const [topupLoading, setTopupLoading] = useState(false);
    const [topupMsg, setTopupMsg] = useState(null);
    const [topupCN, setTopupCN] = useState(null);
    const [cnCopied, setCnCopied] = useState(false);

    // Change password state
    const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
    const [pwLoading, setPwLoading] = useState(false);
    const [pwMsg, setPwMsg] = useState(null);

    const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        // Load fresh profile from DB
        fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((d) => { if (d.user) setProfile(d.user); })
            .finally(() => setLoadingProfile(false));

        // Load transactions
        fetch('/api/auth/transactions', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((d) => { if (d.investments) setTransactions(d.investments); })
            .finally(() => setLoadingTx(false));
    }, [token, navigate]);

    const handleGenerateCN = async () => {
        const raw = parseMoneyValue(topupAmt);
        if (!raw || raw < 100) { setTopupMsg({ type: 'error', text: 'Minimum top-up is TSh 100.' }); return; }
        setTopupLoading(true); setTopupMsg(null); setTopupCN(null);
        const { ok, data } = await apiFetch('/api/auth/topup-control-number', {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ amountTZS: raw }),
        });
        if (ok && data.success) {
            setTopupCN(data);
        } else {
            setTopupMsg({ type: 'error', text: data.error || 'Failed to generate control number.' });
        }
        setTopupLoading(false);
    };

    const handleChangePassword = async () => {
        if (!pwForm.current || !pwForm.next) { setPwMsg({ type: 'error', text: 'All fields required.' }); return; }
        if (pwForm.next.length < 6) { setPwMsg({ type: 'error', text: 'New password must be at least 6 characters.' }); return; }
        if (pwForm.next !== pwForm.confirm) { setPwMsg({ type: 'error', text: 'New passwords do not match.' }); return; }
        setPwLoading(true); setPwMsg(null);
        try {
            const res = await fetch('/api/auth/change-password', {
                method: 'POST', headers: authHeaders,
                body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPwMsg({ type: 'success', text: 'Password updated successfully.' });
            setPwForm({ current: '', next: '', confirm: '' });
        } catch (err) {
            setPwMsg({ type: 'error', text: err.message });
        } finally {
            setPwLoading(false);
        }
    };

    if (!user) return null;

    const displayProfile = profile || user;

    return (
        <div className="pt-24 pb-16 px-4 sm:px-6 animate-fade-up">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-3xl font-extrabold mb-8 flex items-center gap-3">
                    <User className="w-8 h-8 text-gold-500" /> {t('acc_title')}
                </h1>

                {/* ── Profile ─────────────────────────────────────── */}
                <Section title={t('acc_profile')} icon={<ClipboardList className="w-5 h-5 text-slate-400" />}>
                    {loadingProfile ? (
                        <div className="flex items-center gap-3 animate-pulse">
                            <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-navy-800" />
                            <div className="space-y-2 flex-1">
                                <div className="h-4 bg-slate-200 dark:bg-navy-800 rounded w-40" />
                                <div className="h-3 bg-slate-100 dark:bg-navy-700 rounded w-28" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 to-invest-500 flex items-center justify-center text-2xl font-extrabold text-white shrink-0">
                                {displayProfile.fullName?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                                <div className="text-xl font-bold text-slate-900 dark:text-white">{displayProfile.fullName}</div>
                                <div className="text-sm text-slate-400">{displayProfile.phoneNumber}</div>
                                <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-invest-100 dark:bg-invest-900/30 text-invest-700 dark:text-invest-400 capitalize">
                                    {displayProfile.role || 'investor'}
                                </span>
                            </div>
                        </div>
                    )}
                    {profile?.createdAt && (
                        <p className="text-xs text-slate-400 mt-4">{t('acc_member')} {fmtDate(profile.createdAt)}</p>
                    )}
                </Section>

                {/* ── Wallet ──────────────────────────────────────── */}
                <Section title={t('acc_wallet')} icon={<Wallet className="w-5 h-5 text-slate-400" />}>
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[
                            { label: t('port_balance'), value: fmt(displayProfile.walletBalance), color: 'text-slate-900 dark:text-white' },
                            { label: t('port_invested'), value: fmt(displayProfile.totalInvested), color: 'text-invest-600 dark:text-invest-400' },
                            { label: t('port_divs'), value: fmt(displayProfile.totalDividends), color: 'text-gold-600 dark:text-gold-400' },
                        ].map((s) => (
                            <div key={s.label} className="bg-slate-50 dark:bg-navy-800/60 rounded-xl p-3 text-center">
                                <div className="text-xs text-slate-400 mb-1">{s.label}</div>
                                <div className={`text-sm font-extrabold ${s.color}`}>{s.value}</div>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-slate-100 dark:border-navy-800 pt-5">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{t('acc_topup_title')}</p>
                        {topupMsg && <StatusBadge type={topupMsg.type} text={topupMsg.text} />}

                        {!topupCN ? (
                            <>
                                <div className="flex gap-3">
                                    <div className="relative flex-1">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">TSh</span>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            min="100"
                                            value={topupAmt}
                                            onChange={(e) => setTopupAmt(formatMoneyInput(e.target.value))}
                                            placeholder="e.g. 10,000"
                                            className="input-base pl-10 w-full"
                                        />
                                    </div>
                                    <button
                                        onClick={handleGenerateCN}
                                        disabled={topupLoading || !topupAmt}
                                        className="btn-primary whitespace-nowrap"
                                    >
                                        {topupLoading ? t('port_processing') : <span className="flex items-center gap-1.5"><Ticket className="w-4 h-4" /> Get Control No.</span>}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-2">{t('acc_min_max')}</p>
                            </>
                        ) : (
                            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-2xl p-4 text-center">
                                <div className="text-xs text-purple-500 uppercase tracking-widest mb-1">Control Number</div>
                                <div className="text-2xl font-black text-purple-700 dark:text-purple-300 tracking-wider mb-1">{topupCN.controlNumber}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-3">TSh {topupCN.amountTZS?.toLocaleString()} &nbsp;·&nbsp; Valid 30 min &nbsp;·&nbsp; Sent via SMS</div>
                                <button
                                    onClick={() => { navigator.clipboard.writeText(topupCN.controlNumber); setCnCopied(true); setTimeout(() => setCnCopied(false), 2500); }}
                                    className={`flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-xl text-xs font-semibold mb-3 transition-all ${cnCopied ? 'bg-emerald-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                                >
                                    {cnCopied ? <><CheckCircle2 className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                                </button>
                                <div className="text-xs text-left text-slate-500 dark:text-slate-400 space-y-0.5 bg-white/60 dark:bg-navy-900/40 rounded-xl p-3">
                                    <p>1. Dial <strong>*384*123#</strong></p>
                                    <p>2. Language → <strong>Option 6</strong></p>
                                    <p>3. Enter <strong className="text-purple-600 dark:text-purple-400">{topupCN.controlNumber}</strong></p>
                                    <p>4. Enter any <strong>4-digit PIN</strong> to confirm</p>
                                </div>
                                <button onClick={() => { setTopupCN(null); setTopupAmt(''); }} className="mt-3 text-xs text-slate-400 hover:text-slate-600 underline">Generate new number</button>
                            </div>
                        )}
                    </div>
                </Section>

                {/* ── Transaction History ──────────────────────────── */}
                <Section title={t('acc_history')} icon={<ScrollText className="w-5 h-5 text-slate-400" />}>
                    {loadingTx ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-navy-800 animate-pulse" />
                            ))}
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-slate-400 mb-4">{t('acc_no_history')}</p>
                            <Link to="/marketplace" className="btn-primary text-sm">{t('port_browse')}</Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {transactions.map((tx) => (
                                <div key={tx._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-navy-800/50 hover:bg-slate-100 dark:hover:bg-navy-700/50 transition-colors">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                            <Store className="w-4 h-4 text-slate-400" /> {tx.propertyId?.name || 'Property'}
                                        </div>
                                        <div className="text-xs text-slate-400">
                                            {tx.sharesOwned} shares · {tx.propertyId?.location || ''} · {fmtDate(tx.purchasedAt || tx.createdAt)}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-invest-600 dark:text-invest-400">{fmt(tx.amountInvested)}</div>
                                        {tx.dividendsEarned > 0 && (
                                            <div className="text-xs text-gold-500">+{fmt(tx.dividendsEarned)} divs</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>

                {/* ── Change Password ──────────────────────────────── */}
                <Section title={t('acc_pw_title')} icon={<KeyRound className="w-5 h-5 text-slate-400" />}>
                    {pwMsg && <StatusBadge type={pwMsg.type} text={pwMsg.text} />}
                    <div className="space-y-3">
                        {[
                            { key: 'current', label: t('acc_pw_cur'), placeholder: '••••••••' },
                            { key: 'next', label: t('acc_pw_new'), placeholder: 'Min 6 characters' },
                            { key: 'confirm', label: t('acc_pw_confirm'), placeholder: 'Re-enter new password' },
                        ].map(({ key, label, placeholder }) => (
                            <div key={key}>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</label>
                                <input
                                    type="password"
                                    value={pwForm[key]}
                                    onChange={(e) => setPwForm((f) => ({ ...f, [key]: e.target.value }))}
                                    placeholder={placeholder}
                                    className="input-base mt-1"
                                />
                            </div>
                        ))}
                        <button onClick={handleChangePassword} disabled={pwLoading} className="btn-primary w-full mt-2">
                            {pwLoading ? t('port_processing') : t('acc_pw_submit')}
                        </button>
                    </div>
                </Section>

                {/* ── Danger Zone ──────────────────────────────────── */}
                <div className="card-base p-6 border-rose-200 dark:border-rose-900/40">
                    <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-3">{t('acc_danger')}</h2>
                    <button
                        onClick={() => { logout(); navigate('/'); }}
                        className="btn-outline text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 w-full sm:w-auto"
                    >
                        <LogOut className="w-4 h-4 mr-2 inline whitespace-nowrap" /> {t('acc_signout')}
                    </button>
                </div>
            </div>
        </div>
    );
}
