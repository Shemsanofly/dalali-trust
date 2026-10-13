import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, ShieldAlert, CheckCircle2, Clock, Smartphone, Flag } from 'lucide-react';

const DEMO_IDS = [
    { id: 'DLT-20260601-0001', label: 'Kariakoo' },
    { id: 'DLT-20260601-0002', label: 'Kinondoni' },
    { id: 'DLT-20260601-0003', label: 'Mikocheni' },
    { id: 'DLT-20260601-0004', label: 'Scam', scam: true },
];

export default function Lookup() {
    const { token, user } = useAuth();
    const [query, setQuery] = useState('');
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [flagMsg, setFlagMsg] = useState('');

    const search = async (id) => {
        const searchId = (id || query).trim().toUpperCase();
        if (!searchId) return;
        setError(''); setProperty(null); setFlagMsg(''); setLoading(true);
        try {
            const res = await fetch(`/api/properties/${encodeURIComponent(searchId)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setProperty(data); setQuery(searchId);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    const flagProperty = async () => {
        if (!property) return; setFlagMsg('');
        try {
            const res = await fetch(`/api/properties/${property.propertyId}/flag`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ reason: 'Flagged from web dashboard' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setFlagMsg('Property flagged for admin review.'); search(property.propertyId);
        } catch (err) { setFlagMsg(`Error: ${err.message}`); }
    };

    return (
        <div className="pt-24 pb-12 px-4">
            <div className="max-w-2xl mx-auto">

                {/* Header */}
                <div className="text-center mb-10">
                    <p className="text-xs font-bold uppercase tracking-widest text-gold-600 dark:text-gold-400 mb-3">Property Verification</p>
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Verify Any <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-600">Property ID</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-3 text-sm max-w-sm mx-auto">Enter a Property ID to check its verification status instantly.</p>
                </div>

                {/* Search bar */}
                <div className="flex gap-2 p-2 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 shadow-sm mb-3 focus-within:ring-2 focus-within:ring-gold-500/50 focus-within:border-gold-500 transition-all">
                    <input
                        type="text" value={query} onChange={e => setQuery(e.target.value)}
                        placeholder="DLT-20260601-0001"
                        onKeyDown={e => e.key === 'Enter' && search()}
                        className="flex-1 px-4 py-2 bg-transparent text-slate-900 dark:text-white font-mono font-semibold text-sm focus:outline-none placeholder-slate-400 dark:placeholder-slate-600" />
                    <button onClick={() => search()} disabled={loading} className="btn-primary px-6 py-2">
                        {loading
                            ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            : <><Search className="w-4 h-4" /> Search</>}
                    </button>
                </div>

                {/* Demo IDs */}
                <div className="flex flex-wrap items-center gap-2 mb-6">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Demo:</span>
                    {DEMO_IDS.map(d => (
                        <button key={d.id} onClick={() => { setQuery(d.id); search(d.id); }}
                            className={`px-3 py-1 rounded-full text-xs font-mono font-semibold border transition-colors flex items-center gap-1 ${d.scam
                                ? 'border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
                                : 'border-slate-200 dark:border-navy-700 text-slate-500 dark:text-slate-400 hover:border-gold-400 dark:hover:border-gold-600 hover:text-gold-600'
                                }`}>
                            {d.scam && <ShieldAlert className="w-3 h-3" />}
                            {d.id.slice(-4)} · {d.label}
                        </button>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div className="text-sm text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/50 rounded-xl px-4 py-3 mb-4 text-center">{error}</div>
                )}

                {/* Result */}
                {property && (
                    <div className="card-base overflow-hidden animate-fade-up mb-6">
                        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 dark:border-navy-800">
                            <div>
                                <p className="font-mono font-bold text-gold-600 dark:text-gold-400 text-lg">{property.propertyId}</p>
                                <p className="text-sm text-slate-500 mt-0.5">{property.location}</p>
                            </div>
                            <StatusBadge status={property.status} />
                        </div>
                        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-4 px-6 py-5">
                            <InfoRow label="Landlord" value={property.landlordId?.fullName || 'N/A'} />
                            <InfoRow label="Room Type" value={property.roomType} />
                            <InfoRow label="Monthly Rent" value={`TSh ${(property.rentMonthly || 0).toLocaleString()}/mo`} />
                            <InfoRow label="Address" value={property.address || '—'} />
                            {property.flaggedBy?.length > 0 && (
                                <InfoRow label="Reports" value={<span className="flex items-center gap-1"><Flag className="w-3 h-3" /> {property.flaggedBy.length} flag{property.flaggedBy.length > 1 ? 's' : ''}</span>} danger />
                            )}
                        </div>
                        {property.status !== 'scam' && user && (
                            <div className="px-6 pb-5">
                                <button className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 hover:bg-rose-100 transition-colors"
                                    onClick={flagProperty}>
                                    <Flag className="w-3.5 h-3.5" /> Flag as Suspicious
                                </button>
                                {flagMsg && <p className={`mt-2 text-xs font-medium ${flagMsg.includes('Error') ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>{flagMsg}</p>}
                            </div>
                        )}
                    </div>
                )}

                {/* USSD Guide */}
                <div className="bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-2xl p-6 flex gap-4 items-start shadow-sm">
                    <div className="w-12 h-12 rounded-full bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center shrink-0">
                        <Smartphone className="w-6 h-6 text-gold-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">No smartphone? Use USSD</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            Dial <span className="font-mono font-semibold text-gold-600 dark:text-gold-400 px-1 py-0.5 rounded bg-gold-50 dark:bg-gold-500/10">*384*XYZ#</span> from any phone. Select "Verify Property" and enter the ID. Works on all networks, no data needed.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}

function StatusBadge({ status }) {
    if (status === 'verified') return <span className="badge-verified"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</span>;
    if (status === 'scam') return <span className="badge-scam"><ShieldAlert className="w-3.5 h-3.5" /> Scam</span>;
    return <span className="badge-pending"><Clock className="w-3.5 h-3.5" /> Pending</span>;
}

function InfoRow({ label, value, danger }) {
    return (
        <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
            <div className={`text-sm font-semibold ${danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{value}</div>
        </div>
    );
}
