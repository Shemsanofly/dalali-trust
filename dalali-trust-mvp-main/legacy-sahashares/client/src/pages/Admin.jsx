import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, CreditCard, Lock, Ban } from 'lucide-react';

export default function Admin() {
    const { user, isAdmin, token, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [queue, setQueue] = useState([]);
    const [txns, setTxns] = useState([]);
    const [loading, setLoading] = useState(true);

    // Auth guards
    if (!authLoading && !user) return <Guard icon={<Lock className="w-8 h-8 text-gold-500" />} title="Login Required" desc="You need to log in first." action={() => navigate('/login')} actionLabel="Log In" />;
    if (!authLoading && !isAdmin) return <Guard icon={<Ban className="w-8 h-8 text-rose-500" />} title="Admin Only" desc="This dashboard is restricted to admin accounts." action={() => navigate('/')} actionLabel="Back to Home" />;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [qRes, tRes] = await Promise.all([
                    fetch('/api/properties', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
                    fetch('/api/properties/transactions/recent', { headers: token ? { Authorization: `Bearer ${token}` } : {} }),
                ]);
                setQueue(Array.isArray(await qRes.json()) ? await qRes.clone().json() : []);
                setTxns(Array.isArray(await tRes.json()) ? await tRes.clone().json() : []);
            } catch (e) { console.warn('Admin fetch error:', e); }
            finally { setLoading(false); }
        };
        fetchData();
        const iv = setInterval(fetchData, 15000);
        return () => clearInterval(iv);
    }, [token]);

    const confirmScam = async (propertyId) => {
        try {
            const res = await fetch('/api/airtime/reward', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ propertyId }),
            });
            const data = await res.json();
            alert(data.message || 'Scam confirmed and reporters rewarded!');
        } catch (e) { alert('Error: ' + e.message); }
    };

    const ago = (date) => {
        const m = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
        if (m < 1) return 'just now';
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
    };

    const mask = (p) => p ? p.slice(0, 6) + '****' + p.slice(-2) : '—';

    return (
        <div className="pt-24 pb-10 px-4">
            <div className="max-w-5xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                    <div>
                        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Admin Dashboard</h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage flagged properties and monitor transactions</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
                        <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">Auto-refresh 15s</span>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">

                    {/* Scam Queue */}
                    <div className="card-base overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-navy-800">
                            <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-rose-500" /> Scam Queue
                            </h2>
                            <span className="text-xs font-mono font-semibold text-slate-500">{queue.length} flagged</span>
                        </div>
                        {loading ? (
                            <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-slate-200 dark:border-navy-700 border-t-gold-500 rounded-full animate-spin" /></div>
                        ) : queue.length === 0 ? (
                            <div className="py-12 text-center text-sm font-semibold text-slate-400">All clear. No flagged properties.</div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-navy-800 max-h-96 overflow-y-auto">
                                {queue.map(p => (
                                    <div key={p.propertyId || p._id} className="px-6 py-5 hover:bg-slate-50 dark:hover:bg-navy-900/50 transition-colors">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-mono font-bold text-gold-600 dark:text-gold-400 text-sm bg-gold-50 dark:bg-gold-500/10 px-2 py-1 rounded">{p.propertyId}</span>
                                            <span className="badge-scam"><ShieldAlert className="w-3 h-3" /> {p.flaggedBy?.length || 0} Flags</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{p.location}</p>
                                        <button
                                            onClick={() => confirmScam(p.propertyId)}
                                            className="text-xs font-bold px-4 py-2 rounded-lg bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:shadow-rose-500/40 hover:-translate-y-0.5 transition-all">
                                            Confirm & Reward Reporters
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Transactions */}
                    <div className="card-base overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-navy-800">
                            <h2 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-sky-500" /> Transactions
                            </h2>
                            <span className="text-xs font-mono font-semibold text-slate-500">{txns.length} recent</span>
                        </div>
                        {txns.length === 0 ? (
                            <div className="py-12 text-center text-sm font-semibold text-slate-400">No transactions yet…</div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-navy-800 max-h-96 overflow-y-auto">
                                {txns.map(t => (
                                    <div key={t._id} className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-navy-900/50 transition-colors">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">{mask(t.phoneNumber)}</span>
                                            <span className={t.status === 'Success' ? 'badge-verified' : 'badge-pending'}>
                                                {t.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold tracking-widest uppercase text-gold-600 dark:text-gold-500">{t.propertyId}</span>
                                            <span className="text-[10px] font-bold text-slate-400">{ago(t.createdAt)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}

function Guard({ icon, title, desc, action, actionLabel }) {
    return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 pt-24 pb-12">
            <div className="text-center bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-3xl p-10 max-w-sm w-full shadow-xl shadow-slate-200/50 dark:shadow-navy-950/50">
                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-navy-800 flex items-center justify-center mx-auto mb-4">
                    {icon}
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">{title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{desc}</p>
                <button className="btn-primary w-full" onClick={action}>{actionLabel}</button>
            </div>
        </div>
    );
}
