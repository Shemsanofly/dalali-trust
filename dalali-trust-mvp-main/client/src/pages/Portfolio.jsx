import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, BarChart3, Wallet, TrendingUp, Gift, Store, MapPin, KeyRound, Phone, Smartphone, Copy, CheckCircle2, Zap, Ticket, Clock, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';
import { formatMoneyInput, parseMoneyValue } from '../utils/formatMoney';

export default function Portfolio() {
    const { user, token } = useAuth();
    const { t } = useLanguage();
    const [investments, setInvestments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [withdrawOpen, setWithdrawOpen] = useState(false);
    const [withdrawAmt, setWithdrawAmt] = useState('');
    const [withdrawMsg, setWithdrawMsg] = useState(null);
    const [withdrawing, setWithdrawing] = useState(false);

    const [voiceVerificationKey, setVoiceVerificationKey] = useState(null);
    const [voiceStatus, setVoiceStatus] = useState('idle');
    const [topUpOpen, setTopUpOpen] = useState(false);
    const [topUpAmt, setTopUpAmt] = useState('');
    const [topUpMsg, setTopUpMsg] = useState(null);
    const [toppingUp, setToppingUp] = useState(false);
    const [topUpCN, setTopUpCN] = useState(null);  // { controlNumber, amountTZS, expiresAt }
    const [copied, setCopied] = useState(false);
    const [airtimeTxns, setAirtimeTxns] = useState([]);
    const [showAirtime, setShowAirtime] = useState(true);

    useEffect(() => {
        if (!token) { setLoading(false); return; }
        apiFetch('/api/invest/my-investments', {
            headers: { Authorization: `Bearer ${token}` },
        }).then(({ ok, data }) => {
            setInvestments(ok && Array.isArray(data) ? data : []);
            setLoading(false);
        });
        // Fetch airtime transaction history
        apiFetch('/api/auth/ledger', {
            headers: { Authorization: `Bearer ${token}` },
        }).then(({ ok, data }) => {
            if (ok && Array.isArray(data.transactions)) {
                setAirtimeTxns(data.transactions.filter(t => t.type === 'airtime'));
            }
        });
    }, [token]);

    const fmt = (pesa) => `TSh ${(pesa / 100).toLocaleString()}`;

    useEffect(() => {
        let interval;
        if (voiceVerificationKey && voiceStatus === 'pending') {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/voice/2fa-status/${encodeURIComponent(voiceVerificationKey)}`);
                    const data = await res.json();
                    if (data.status === 'verified') {
                        setVoiceStatus('verified');
                        setWithdrawMsg({ type: 'success', text: 'Voice PIN verified! Processing withdrawal...' });
                        executeWithdrawal(voiceVerificationKey);
                    } else if (data.status === 'expired') {
                        setVoiceStatus('error');
                        setWithdrawMsg({ type: 'error', text: 'Verification expired or wrong PIN entered.' });
                        setWithdrawing(false);
                    }
                } catch (err) {
                    console.error('Polling error', err);
                }
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [voiceVerificationKey, voiceStatus]);

    const executeWithdrawal = async (vKey = null) => {
        setWithdrawing(true);
        try {
            const res = await fetch('/api/auth/withdraw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    amountTZS: parseMoneyValue(withdrawAmt),
                    verificationKey: vKey,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setWithdrawMsg({ type: 'success', text: data.message });
                setVoiceStatus('idle');
                setVoiceVerificationKey(null);
                setWithdrawAmt('');
                // Note: user.walletBalance will update on next AuthContext refresh
            } else {
                setWithdrawMsg({ type: 'error', text: data.error || 'Withdrawal failed.' });
            }
        } catch {
            setWithdrawMsg({ type: 'error', text: 'Network error.' });
        }
        setWithdrawing(false);
    };

    const handleWithdraw = async () => {
        const amtTZS = parseMoneyValue(withdrawAmt);
        if (!amtTZS || amtTZS < 100) {
            setWithdrawMsg({ type: 'error', text: 'Minimum withdrawal is TSh 100.' });
            return;
        }
        const amtPesa = Math.round(amtTZS * 100);
        if (amtPesa > (user?.walletBalance || 0)) {
            setWithdrawMsg({ type: 'error', text: 'Insufficient wallet balance.' });
            return;
        }

        setWithdrawing(true);

        // If > 500,000 TZS, trigger voice 2FA
        if (amtTZS > 500000) {
            try {
                const res = await fetch('/api/voice/initiate-2fa', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ userId: user.id || user._id, amountPesa: amtPesa }),
                });
                const data = await res.json();
                if (data.success) {
                    setVoiceVerificationKey(data.verificationKey);
                    setVoiceStatus('pending');
                    setWithdrawMsg({
                        type: 'info',
                        text: (
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1 font-bold">
                                    <KeyRound className="w-4 h-4" />
                                    Waiting for Voice Verification...
                                </div>
                                <div className="text-xs">
                                    You will receive a phone call shortly. Please answer and enter your security PIN to authorize this large withdrawal.
                                </div>
                                {data.testPin && (
                                    <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded text-amber-800 dark:text-amber-200 mt-2">
                                        Test Mode PIN: <strong>{data.testPin}</strong>
                                    </div>
                                )}
                            </div>
                        ),
                    });
                } else {
                    setWithdrawMsg({ type: 'error', text: data.error || 'Could not start voice verification.' });
                    setWithdrawing(false);
                }
            } catch {
                setWithdrawMsg({ type: 'error', text: 'Network error during voice verification.' });
                setWithdrawing(false);
            }
        } else {
            // Direct withdrawal (< 500K TZS)
            executeWithdrawal();
        }
    };


    const handleGenerateCN = async () => {
        const raw = parseMoneyValue(topUpAmt);
        if (!raw || raw < 100) { setTopUpMsg({ type: 'error', text: 'Minimum top-up is TSh 100.' }); return; }
        setToppingUp(true); setTopUpMsg(null); setTopUpCN(null);
        const { ok, data } = await apiFetch('/api/auth/topup-control-number', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ amountTZS: raw }),
        });
        if (ok && data.success) {
            setTopUpCN(data);
        } else {
            setTopUpMsg({ type: 'error', text: data.error || 'Failed to generate control number.' });
        }
        setToppingUp(false);
    };

    if (!user) {
        return (
            <div className="pt-28 pb-16 px-4 sm:px-6 text-center animate-fade-up">
                <div className="max-w-md mx-auto card-base p-8">
                    <Lock className="w-16 h-16 text-slate-300 dark:text-slate-600 mb-4 mx-auto" />
                    <h2 className="text-2xl font-bold mb-3">{t('auth_req_title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">
                        {t('auth_req_sub')}
                    </p>
                    <Link to="/login" className="btn-primary">{t('auth_login_btn')}</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-24 pb-16 px-4 sm:px-6 animate-fade-up">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                    <h1 className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-invest-500" /> {t('port_title')}
                    </h1>
                    {user?.phoneNumber && (
                        <a
                            href={`tel:${user.phoneNumber}`}
                            className="btn-outline flex items-center gap-2 text-sm py-2 px-4 shadow-sm border-slate-200 dark:border-navy-700 bg-white dark:bg-navy-800 hover:bg-slate-50 dark:hover:bg-navy-700 transition-colors"
                        >
                            <Phone className="w-4 h-4 text-invest-500" />
                            {user.phoneNumber}
                        </a>
                    )}
                </div>

                {/* Wallet overview cards */}
                <div className="grid sm:grid-cols-3 gap-4 mb-8">
                    <div className="card-base p-5 relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-invest-100 dark:bg-invest-900/20 opacity-50" />
                        <div className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Wallet className="w-3 h-3" /> {t('port_wallet')}</div>
                        <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                            {fmt(user.walletBalance || 0)}
                        </div>
                        <div className="flex gap-3 mt-3">
                            <button
                                onClick={() => { setWithdrawOpen(true); setWithdrawMsg(null); }}
                                className="text-xs font-semibold text-invest-600 dark:text-invest-400 hover:underline cursor-pointer"
                            >
                                {t('port_withdraw_btn')}
                            </button>
                            <span className="text-slate-300 dark:text-navy-700">|</span>
                            <button
                                onClick={() => { setTopUpOpen(true); setTopUpMsg(null); }}
                                className="text-xs font-semibold text-gold-600 dark:text-gold-400 hover:underline cursor-pointer flex items-center gap-1"
                            >
                                <Zap className="w-3 h-3" /> Top Up
                            </button>
                        </div>
                    </div>
                    <div className="card-base p-5 relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gold-100 dark:bg-gold-900/20 opacity-50" />
                        <div className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {t('port_invested')}</div>
                        <div className="text-2xl font-extrabold text-invest-600 dark:text-invest-400">
                            {fmt(user.totalInvested || 0)}
                        </div>
                    </div>
                    <div className="card-base p-5 relative overflow-hidden">
                        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gold-100 dark:bg-gold-900/20 opacity-50" />
                        <div className="text-xs text-slate-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Gift className="w-3 h-3" /> {t('port_divs')}</div>
                        <div className="text-2xl font-extrabold text-gold-600 dark:text-gold-400">
                            {fmt(user.totalDividends || 0)}
                        </div>
                    </div>
                </div>

                {/* 🎁 Airtime Bonuses section */}
                {airtimeTxns.length > 0 && showAirtime && (
                    <div className="mb-8">
                        <h2 className="text-xl font-bold mb-4 flex items-center justify-between">
                            <span className="flex items-center gap-2"><Smartphone className="w-5 h-5 text-purple-500" /> Airtime Bonuses</span>
                            <button onClick={() => setShowAirtime(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors" title="Dismiss">
                                <X className="w-4 h-4" />
                            </button>
                        </h2>
                        <div className="space-y-3">
                            {airtimeTxns.map((tx, i) => (
                                <div key={i} className="card-base p-4 flex items-center gap-4 border-l-4 border-purple-400 dark:border-purple-600">
                                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                                        <Smartphone className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-slate-900 dark:text-white text-sm">{tx.description || 'Airtime Bonus'}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {new Date(tx.createdAt).toLocaleString('en-TZ', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <div className={`text-base font-bold ${tx.status === 'completed' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400'}`}>
                                            +TSh {((tx.amount || 0) / 100).toLocaleString()}
                                        </div>
                                        <div className={`text-xs font-semibold mt-0.5 capitalize ${tx.status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                            {tx.status}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Investments list */}
                <h2 className="text-xl font-bold mb-4">{t('port_props')}</h2>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block w-8 h-8 border-4 border-invest-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : investments.length === 0 ? (
                    <div className="card-base p-8 text-center">
                        <p className="text-slate-400 mb-4">{t('port_empty')}</p>
                        <Link to="/marketplace" className="btn-primary">{t('port_browse')}</Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {investments.map((inv) => {
                            const prop = inv.propertyId;
                            const funded = prop ? Math.min(Math.round((prop.currentFunding / prop.targetFunding) * 100), 100) : 0;
                            const currentValue = inv.sharesOwned * (prop?.sharePrice || 0);
                            return (
                                <Link
                                    key={inv._id}
                                    to={`/property/${prop?.propertyId}`}
                                    className="card-base p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:shadow-lg transition-shadow block no-underline"
                                >
                                    {/* Property thumbnail */}
                                    <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-navy-800">
                                        <img
                                            src={prop?.images?.[0] || prop?.imageUrl || '/assets/property-1.png'}
                                            alt={prop?.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-900 dark:text-white truncate">{prop?.name}</h3>
                                            <span className={prop?.status === 'funding' ? 'badge-funding' : prop?.status === 'active' ? 'badge-active' : 'badge-closed'}>
                                                {prop?.status}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {prop?.location}
                                        </p>
                                        {/* Funding bar */}
                                        <div className="w-full h-1.5 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-gradient-to-r from-invest-400 to-invest-600 transition-all duration-500"
                                                style={{ width: `${funded}%` }}
                                            />
                                        </div>
                                        <div className="flex gap-4 mt-1 text-xs text-slate-400">
                                            <span>{funded}% {t('mkt_funded')}</span>
                                        </div>
                                    </div>

                                    {/* Investment details */}
                                    <div className="text-right shrink-0 space-y-1">
                                        <div className="text-lg font-extrabold text-invest-600 dark:text-invest-400">
                                            {inv.sharesOwned} <span className="text-xs font-normal text-slate-400">shares owned</span>
                                        </div>
                                        <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                            {fmt(currentValue)} <span className="text-xs text-slate-400">value</span>
                                        </div>
                                        <div className="text-xs text-gold-600 dark:text-gold-400 font-semibold">
                                            {prop?.monthlyROI}% / mo ROI
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {investments.length > 0 && (
                    <div className="mt-8 flex gap-4 justify-center">
                        <Link to="/marketplace" className="btn-outline flex items-center gap-2"><Store className="w-4 h-4" /> Invest in More Properties</Link>
                    </div>
                )}
            </div>

            {/* Withdrawal modal */}
            {withdrawOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 py-8">
                    <div className="card-base p-6 max-w-md w-full shadow-2xl my-auto">
                        <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-white">{t('port_withdraw_title')}</h3>
                        <p className="text-sm text-slate-400 mb-4">
                            {t('port_balance')} <span className="font-bold text-slate-600 dark:text-slate-200">{fmt(user.walletBalance || 0)}</span>
                        </p>

                        {withdrawMsg && (
                            <div className={`mb-4 p-3 rounded-xl text-sm ${withdrawMsg.type === 'success' ? 'bg-invest-50 dark:bg-invest-900/20 text-invest-700 dark:text-invest-400 border border-invest-200 dark:border-invest-800'
                                : withdrawMsg.type === 'info' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                                    : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                                }`}>
                                {withdrawMsg.text}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('port_amt')}</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    min="100"
                                    value={withdrawAmt}
                                    onChange={(e) => setWithdrawAmt(formatMoneyInput(e.target.value))}
                                    placeholder="e.g. 50,000"
                                    className="input-base mt-1"
                                />
                                {parseFloat(withdrawAmt) > 500000 && (
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                                        <KeyRound className="w-3 h-3" /> {t('port_voice_req')}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        setWithdrawOpen(false);
                                        setWithdrawAmt('');
                                        setWithdrawMsg(null);
                                        setVoiceStatus('idle');
                                        setVoiceVerificationKey(null);
                                    }}
                                    className="btn-outline flex-1"
                                    disabled={voiceStatus === 'pending' || withdrawing}
                                >
                                    {t('mkt_cancel')}
                                </button>
                                <button
                                    onClick={handleWithdraw}
                                    className="btn-primary flex-1"
                                    disabled={voiceStatus === 'pending' || withdrawing || !withdrawAmt}
                                >
                                    {voiceStatus === 'pending' ? (
                                        <div className="flex items-center gap-2">
                                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Waiting Check
                                        </div>
                                    ) : withdrawing ? (
                                        t('port_processing')
                                    ) : (
                                        t('port_withdraw_submit')
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top-Up Modal — Control Number flow */}
            {topUpOpen && (
                <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 py-8">
                    <div className="card-base p-6 max-w-md w-full shadow-2xl my-auto">
                        <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-white flex items-center gap-2">
                            <Zap className="w-5 h-5 text-gold-500" /> Top Up Wallet
                        </h3>

                        {!topUpCN ? (
                            <>
                                <p className="text-sm text-slate-400 mb-4">Enter an amount — we'll generate a control number you use to pay via USSD.</p>

                                {topUpMsg && (
                                    <div className={`p-3 mb-4 rounded-xl text-sm font-bold ${topUpMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                                        {topUpMsg.text}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-slate-600 dark:text-slate-300">Amount (TZS)</label>
                                        <input
                                            type="text"
                                            inputMode="numeric"
                                            placeholder="e.g. 10,000"
                                            value={topUpAmt}
                                            onChange={(e) => setTopUpAmt(formatMoneyInput(e.target.value))}
                                            className="input-base mt-1"
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={() => { setTopUpOpen(false); setTopUpAmt(''); setTopUpMsg(null); setTopUpCN(null); setCopied(false); }} className="btn-outline flex-1" disabled={toppingUp}>Cancel</button>
                                        <button onClick={handleGenerateCN} className="btn-primary flex-1" disabled={toppingUp || !topUpAmt}>
                                            {toppingUp ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Generating...
                                                </div>
                                            ) : (<span className="flex items-center gap-1.5"><Ticket className="w-4 h-4" /> Generate Control Number</span>)}
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Control number success screen */
                            <>
                                <p className="text-sm text-slate-400 mb-4">Control number generated! Pay via USSD to credit your wallet.</p>
                                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-2xl p-5 mb-4 text-center">
                                    <div className="text-xs text-purple-500 uppercase tracking-widest mb-2">Your Control Number</div>
                                    <div className="text-3xl font-black text-purple-700 dark:text-purple-300 tracking-widest mb-1">{topUpCN.controlNumber}</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-3">Amount: <strong className="text-slate-700 dark:text-slate-200">TSh {topUpCN.amountTZS?.toLocaleString()}</strong></div>
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(topUpCN.controlNumber); setCopied(true); setTimeout(() => setCopied(false), 2500); }}
                                        className={`flex items-center gap-2 mx-auto px-4 py-2 rounded-xl text-sm font-semibold transition-all ${copied ? 'bg-emerald-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}
                                    >
                                        {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Number</>}
                                    </button>
                                </div>

                                <div className="bg-slate-50 dark:bg-navy-800 rounded-xl p-4 mb-4 text-sm space-y-1.5">
                                    <p className="font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                        <Smartphone className="w-4 h-4 text-slate-500" /> How to pay via USSD:
                                    </p>
                                    <p className="text-slate-500 dark:text-slate-400">1. Dial <strong>*384*123#</strong> on your phone</p>
                                    <p className="text-slate-500 dark:text-slate-400">2. Choose language → Select <strong>Option 6</strong></p>
                                    <p className="text-slate-500 dark:text-slate-400">3. Enter control number: <strong className="text-purple-600 dark:text-purple-400">{topUpCN.controlNumber}</strong></p>
                                    <p className="text-slate-500 dark:text-slate-400">4. Confirm amount, enter any <strong>4-digit PIN</strong></p>
                                    <p className="text-slate-500 dark:text-slate-400">5. <CheckCircle2 className="w-3 h-3 inline text-emerald-500 mr-0.5" /> Wallet updates automatically!</p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1"><Clock className="w-3 h-3" /> Expires in 30 minutes. Also sent to your phone via SMS.</p>
                                </div>

                                <button onClick={() => { setTopUpOpen(false); setTopUpAmt(''); setTopUpMsg(null); setTopUpCN(null); setCopied(false); }} className="btn-outline w-full">Done</button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
