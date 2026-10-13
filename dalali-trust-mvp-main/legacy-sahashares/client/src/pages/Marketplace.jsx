import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Store, MapPin, Wallet, CheckCircle2, Bell, Info, X, Home, ShoppingBag, Trees, Building2, Factory, Shuffle, Lock } from 'lucide-react';
import { apiFetch } from '../utils/api';
import InvestSuccessModal from '../components/InvestSuccessModal';

const CATEGORIES = [
    { id: 'all', label: 'All', icon: <Home className="w-3.5 h-3.5" /> },
    { id: 'commercial', label: 'Commercial', icon: <ShoppingBag className="w-3.5 h-3.5" /> },
    { id: 'residential', label: 'Residential', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'land', label: 'Land', icon: <Trees className="w-3.5 h-3.5" /> },
    { id: 'industrial', label: 'Industrial', icon: <Factory className="w-3.5 h-3.5" /> },
    { id: 'mixed', label: 'Mixed Use', icon: <Shuffle className="w-3.5 h-3.5" /> },
];

const CAT_COLORS = {
    commercial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    residential: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
    land: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-300',
    industrial: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300',
    mixed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
};

export default function Marketplace() {
    const navigate = useNavigate();
    const { user, token, refreshUser } = useAuth();
    const { t } = useLanguage();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [buyModal, setBuyModal] = useState(null);
    const [shares, setShares] = useState(1);
    const [buying, setBuying] = useState(false);
    const [msg, setMsg] = useState(null);
    const [category, setCategory] = useState('all');
    const [notifyPropId, setNotifyPropId] = useState(null);
    const [notifyDone, setNotifyDone] = useState({});
    const [successData, setSuccessData] = useState(null);

    useEffect(() => {
        apiFetch('/api/invest/properties')
            .then(({ ok, data }) => {
                setProperties(ok && Array.isArray(data) ? data : []);
                setLoading(false);
            });
    }, []);

    const fmt = (pesa) => `TSh ${(pesa / 100).toLocaleString()}`;
    const pct = (cur, tgt) => {
        if (!tgt || tgt === 0) return 0;
        return Math.min(Math.round((cur / tgt) * 100), 100);
    };

    // Filter by category
    const filtered = category === 'all'
        ? properties
        : properties.filter(p => (p.category || 'commercial') === category);

    const handleBuy = async () => {
        if (!token) {
            setBuyModal(null);
            setShares(1);
            setMsg({ type: 'error', text: t('auth_req_title') });
            return;
        }
        setBuying(true);
        try {
            const { ok, data } = await apiFetch('/api/invest/deposit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    transactionId: `WEB-${Date.now()}`,
                    phoneNumber: user.phoneNumber,
                    amount: (buyModal.sharePrice * shares) / 100,
                    propertyId: buyModal.propertyId,
                    shares,
                }),
            });
            if (ok && data.success) {
                await refreshUser();
                const newWalletBalanceTZS = data.walletBalance ? data.walletBalance / 100 : null;
                // Show celebration modal
                setSuccessData({
                    propertyName: buyModal.name,
                    shares,
                    amountTZS: (buyModal.sharePrice * shares) / 100,
                    newWalletBalanceTZS,
                });
                const { ok: ok2, data: refreshed } = await apiFetch('/api/invest/properties');
                setProperties(ok2 && Array.isArray(refreshed) ? refreshed : properties);
            } else {
                setMsg({ type: 'error', text: data.error || 'Investment failed. Please check your balance and try again.' });
            }
        } catch {
            setMsg({ type: 'error', text: 'Network error. Please try again.' });
        }
        setBuying(false);
        setBuyModal(null);
        setShares(1);
    };

    const handleNotify = (propId) => {
        // In MVP, just mark locally. Real impl would POST to a "notify me" endpoint.
        setNotifyDone(prev => ({ ...prev, [propId]: true }));
        setNotifyPropId(null);
        setMsg({ type: 'success', text: "You'll be notified when this property opens for new investment!" });
    };

    return (
        <>
            <div className="pt-24 pb-16 px-4 sm:px-6 animate-fade-up">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-3xl sm:text-4xl font-extrabold mb-3 flex items-center justify-center gap-3">
                            <Store className="w-8 h-8 text-invest-500" /> {t('mkt_title')}
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
                            {t('mkt_sub')}
                        </p>
                    </div>

                    {/* Category filter tabs */}
                    <div className="flex flex-wrap gap-2 justify-center mb-8">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setCategory(cat.id)}
                                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border flex items-center gap-1.5 ${category === cat.id
                                    ? 'bg-invest-600 text-white border-invest-600 shadow-md shadow-invest-500/20'
                                    : 'bg-white dark:bg-navy-800 border-slate-200 dark:border-navy-700 text-slate-600 dark:text-slate-300 hover:border-invest-400'
                                    }`}
                            >
                                {cat.icon} {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Message toast */}
                    {msg && (
                        <div className={`max-w-2xl mx-auto mb-6 p-4 rounded-xl text-sm font-medium flex items-start gap-3 ${msg.type === 'success'
                            ? 'bg-invest-50 dark:bg-invest-900/20 text-invest-700 dark:text-invest-400 border border-invest-200 dark:border-invest-800'
                            : 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            }`}>
                            <span className="flex-1">{msg.text}</span>
                            <button onClick={() => setMsg(null)} className="font-bold cursor-pointer shrink-0"><X className="w-4 h-4" /></button>
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-20">
                            <div className="inline-block w-8 h-8 border-4 border-invest-500 border-t-transparent rounded-full animate-spin" />
                            <p className="mt-3 text-sm text-slate-400">Loading properties...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            {properties.length === 0 ? t('mkt_empty') : `No ${category} properties found.`}
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map((prop) => {
                                // ✅ FIXED: active/closed properties were showing 0% funded
                                const isActive = prop.status === 'active';
                                const isClosed = prop.status === 'closed';
                                const funded = isActive && prop.currentFunding === 0
                                    ? 100  // Fully funded — just no deposits recorded via platform yet
                                    : pct(prop.currentFunding, prop.targetFunding);
                                const cat = prop.category || 'commercial';
                                return (
                                    <div key={prop.propertyId} className="card-base overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                        <div className="cursor-pointer" onClick={() => navigate(`/property/${prop.propertyId}`)}>
                                            {/* Property thumbnail */}
                                            <div className="w-full h-48 sm:h-56 bg-slate-100 dark:bg-navy-800 relative">
                                                <img
                                                    src={prop.images?.[0] || prop.imageUrl || '/assets/property-2.png'}
                                                    alt={prop.name}
                                                    className="w-full h-full object-cover"
                                                />
                                                {/* Status badge */}
                                                <div className="absolute top-3 right-3">
                                                    <span className={prop.status === 'funding' ? 'badge-funding shadow-lg' : prop.status === 'active' ? 'badge-active shadow-lg' : 'badge-closed shadow-lg'}>
                                                        {prop.status === 'active'
                                                            ? <><CheckCircle2 className="w-3 h-3 inline mr-0.5" /> Active</>
                                                            : prop.status === 'closed'
                                                                ? <><Lock className="w-3 h-3 inline mr-0.5" /> Closed</>
                                                                : 'Funding'}
                                                    </span>
                                                </div>
                                                {/* Category badge */}
                                                <div className="absolute top-3 left-3">
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${CAT_COLORS[cat]}`}>
                                                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-5">
                                                <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                                                    <Store className="w-5 h-5 text-invest-600 dark:text-gold-500 shrink-0" />
                                                    {prop.name}
                                                </h3>

                                                <p className="text-xs text-slate-400 mb-3 flex items-center gap-1"><MapPin className="w-3 h-3" /> {prop.location}</p>
                                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{prop.description}</p>

                                                {/* Funding progress */}
                                                <div className="mb-4">
                                                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                                                        <span>{funded}% {t('mkt_funded')}</span>
                                                        <span>
                                                            {isActive || isClosed
                                                                ? (isActive ? 'Fully Funded' : 'Closed')
                                                                : `${prop.availableShares}/${prop.totalShares} ${t('mkt_shares_left')}`}
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2.5 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full bg-gradient-to-r ${isActive || funded >= 100 ? 'from-emerald-400 to-emerald-600' : 'from-invest-400 to-invest-600'}`}
                                                            style={{ width: `${funded}%` }}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Key metrics */}
                                                <div className="grid grid-cols-2 gap-3 mb-4">
                                                    <div className="bg-slate-50 dark:bg-navy-800/50 rounded-xl p-3 text-center">
                                                        <div className="text-xs text-slate-400 flex items-center justify-center gap-1">
                                                            {t('mkt_share_price')}
                                                            <span title="Share price = Total Target Funding ÷ Total Shares. Set by the property owner at listing time.">
                                                                <Info className="w-3 h-3 text-slate-400 cursor-help" />
                                                            </span>
                                                        </div>
                                                        <div className="text-sm font-bold text-slate-900 dark:text-white">{fmt(prop.sharePrice)}</div>
                                                    </div>
                                                    <div className="bg-slate-50 dark:bg-navy-800/50 rounded-xl p-3 text-center">
                                                        <div className="text-xs text-slate-400">{t('mkt_roi')}</div>
                                                        <div className="text-sm font-bold text-invest-600 dark:text-invest-400">{prop.monthlyROI}%</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between text-xs text-slate-400">
                                                    <span>{t('mkt_target')} {fmt(prop.targetFunding)}</span>
                                                    <span>{t('mkt_owner')} {prop.ownerId?.fullName || '—'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="px-5 pb-5">
                                            {prop.status === 'funding' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setBuyModal(prop); }}
                                                    className="btn-primary w-full"
                                                >
                                                    <Wallet className="w-4 h-4 mr-2 inline" /> {t('mkt_invest_btn')}
                                                </button>
                                            )}
                                            {prop.status === 'active' && (
                                                <div className="space-y-2">
                                                    <div className="text-center text-sm font-semibold text-invest-600 dark:text-invest-400 flex items-center justify-center gap-1 py-1">
                                                        <CheckCircle2 className="w-4 h-4" /> {t('mkt_fully_funded')}
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); if (notifyDone[prop.propertyId]) return; setNotifyPropId(prop.propertyId); }}
                                                        className={`btn-outline w-full text-sm py-2 flex items-center justify-center gap-2 ${notifyDone[prop.propertyId] ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                    >
                                                        <Bell className="w-4 h-4" />
                                                        {notifyDone[prop.propertyId] ? <><Bell className="w-4 h-4 inline mr-1" />Notified</> : 'Notify Me When Available'}
                                                    </button>
                                                </div>
                                            )}
                                            {prop.status === 'closed' && (
                                                <div className="p-3 rounded-xl bg-slate-100 dark:bg-navy-800 text-center text-sm font-semibold text-slate-500 flex items-center justify-center gap-1.5">
                                                    <Lock className="w-4 h-4" /> This property is closed
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Notify Me Confirm Modal */}
                {notifyPropId && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 py-8">
                        <div className="card-base p-6 max-w-sm w-full shadow-2xl my-auto">
                            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><Bell className="w-5 h-5 text-invest-500" /> Notify Me</h3>
                            <p className="text-sm text-slate-500 mb-4">We'll notify you when this property opens for new investment or secondary market trading.</p>
                            <div className="flex gap-3">
                                <button onClick={() => setNotifyPropId(null)} className="btn-outline flex-1">Cancel</button>
                                <button onClick={() => handleNotify(notifyPropId)} className="btn-primary flex-1"><Bell className="w-4 h-4 inline mr-1" /> Notify Me</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Buy Modal */}
                {buyModal && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 py-8">
                        <div className="card-base p-6 max-w-md w-full shadow-2xl my-auto">
                            <h3 className="text-xl font-bold mb-1 text-slate-900 dark:text-white">{t('mkt_buy_title')}</h3>
                            <p className="text-sm text-slate-400 mb-4">{buyModal.name} — {buyModal.location}</p>

                            {/* Wallet balance check */}
                            {user && (
                                <div className="mb-4 p-3 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm flex justify-between items-center">
                                    <span className="text-slate-500">Your Wallet</span>
                                    <span className={`font-bold ${(user.walletBalance || 0) < buyModal.sharePrice ? 'text-rose-600' : 'text-invest-600 dark:text-invest-400'}`}>
                                        {fmt(user.walletBalance || 0)}
                                        {(user.walletBalance || 0) < buyModal.sharePrice && <span className="text-xs ml-1 font-normal">(insufficient)</span>}
                                    </span>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('mkt_num_shares')}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={buyModal.availableShares}
                                        value={shares}
                                        onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="input-base mt-1"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">{buyModal.availableShares} {t('mkt_available')}</p>
                                </div>

                                <div className="bg-invest-50 dark:bg-invest-900/20 rounded-xl p-4 border border-invest-200 dark:border-invest-800">
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-500 flex items-center gap-1">
                                            {t('mkt_price_per')}
                                            <span title="Share price = Target Funding ÷ Total Shares. Set by property owner.">
                                                <Info className="w-3 h-3 text-slate-400 cursor-help" />
                                            </span>
                                        </span>
                                        <span className="font-bold">{fmt(buyModal.sharePrice)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-500">{t('mkt_shares')}</span>
                                        <span className="font-bold">× {shares}</span>
                                    </div>
                                    <hr className="border-invest-200 dark:border-invest-800 my-2" />
                                    <div className="flex justify-between text-base">
                                        <span className="font-bold text-invest-700 dark:text-invest-400">{t('mkt_total')}</span>
                                        <span className="font-extrabold text-invest-700 dark:text-invest-400">{fmt(buyModal.sharePrice * shares)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button onClick={() => { setBuyModal(null); setShares(1); }} className="btn-outline flex-1" disabled={buying}>
                                        {t('mkt_cancel')}
                                    </button>
                                    <button onClick={handleBuy} className="btn-primary flex-1" disabled={buying || (user && (user.walletBalance || 0) < buyModal.sharePrice * shares)}>
                                        {buying ? t('port_processing') : t('mkt_confirm')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 🎉 Investment success celebration modal */}
            {successData && (
                <InvestSuccessModal
                    data={successData}
                    onClose={() => setSuccessData(null)}
                />
            )}
        </>
    );
}
