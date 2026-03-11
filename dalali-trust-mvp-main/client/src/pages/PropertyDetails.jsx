import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { MapPin, Phone, Mail, Instagram, CheckCircle2, Wallet, Info, ShieldCheck, ShieldAlert, Video, View, X, Lock, AlertTriangle } from 'lucide-react';
import { apiFetch } from '../utils/api';
import InvestSuccessModal from '../components/InvestSuccessModal';

export default function PropertyDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, token, refreshUser } = useAuth();
    const { t } = useLanguage();

    const [prop, setProp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeImage, setActiveImage] = useState(0);

    const [buyModal, setBuyModal] = useState(false);
    const [shares, setShares] = useState(1);
    const [buying, setBuying] = useState(false);
    const [msg, setMsg] = useState(null);
    const [successData, setSuccessData] = useState(null);


    useEffect(() => {
        apiFetch(`/api/properties/${id}`)
            .then(({ ok, data }) => {
                if (ok && data?._id) { setProp(data); setLoading(false); }
                else navigate('/marketplace');
            });
    }, [id, navigate]);

    if (loading) {
        return (
            <div className="pt-24 pb-16 px-4 text-center animate-fade-up">
                <div className="inline-block w-8 h-8 border-4 border-invest-500 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-slate-500 dark:text-slate-400">Loading Property Details...</p>
            </div>
        );
    }

    if (!prop) return null;

    const fmt = (pesa) => `TSh ${(pesa / 100).toLocaleString()}`;
    // ✅ FIXED: Active properties with 0 currentFunding (set manually) should show 100% funded
    const pct = prop.status === 'active' && prop.currentFunding === 0
        ? 100
        : Math.min(Math.round((prop.currentFunding / prop.targetFunding) * 100), 100);

    const images = (prop.images && prop.images.length > 0) ? prop.images : [prop.imageUrl || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80'];

    const handleBuy = async () => {
        if (!token) {
            setBuyModal(false);
            setShares(1);
            setMsg({ type: 'error', text: t('auth_req_title') });
            return;
        }
        setBuying(true);
        const { ok, data } = await apiFetch('/api/invest/deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
                transactionId: `WEB-${Date.now()}`,
                phoneNumber: user.phoneNumber,
                amount: (prop.sharePrice * shares) / 100,
                propertyId: prop.propertyId,
                shares,
            }),
        });
        if (ok && data.success) {
            await refreshUser();
            const newWalletBalanceTZS = data.walletBalance ? data.walletBalance / 100 : null;
            setSuccessData({
                propertyName: prop.name,
                shares,
                amountTZS: (prop.sharePrice * shares) / 100,
                newWalletBalanceTZS,
            });
            const { ok: ok2, data: refreshed } = await apiFetch(`/api/properties/${id}`);
            if (ok2 && refreshed?._id) setProp(refreshed);
        } else {
            setMsg({ type: 'error', text: data.error || 'Investment failed. Please check your balance.' });
        }
        setBuying(false);
        setBuyModal(false);
        setShares(1);
    };



    const getMapUrl = () => {
        if (prop.mapUrl && prop.mapUrl.startsWith('https://') && !prop.mapUrl.includes('pb=...')) {
            return prop.mapUrl;
        }
        if (prop.location) {
            return `https://maps.google.com/maps?q=${encodeURIComponent(prop.location)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
        }
        return '';
    };

    return (
        <>
            <div className="pt-24 pb-16 px-4 animate-fade-up">
                <div className="max-w-6xl mx-auto space-y-8">

                    {msg && (
                        <div className={`p-4 rounded-xl text-sm font-medium ${msg.type === 'success'
                            ? 'bg-invest-50 text-invest-700 border border-invest-200 dark:bg-invest-900/20 dark:text-invest-400 dark:border-invest-800'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
                            }`}>
                            {msg.text}
                            <button onClick={() => setMsg(null)} className="float-right font-bold cursor-pointer">×</button>
                        </div>
                    )}

                    {/* Header Information */}
                    <div>
                        <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-3">
                            {prop.name}
                        </h1>
                        <p className="text-lg text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-gold-500" /> {prop.location}
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left Column: Gallery, Amenities, Map, Contacts */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Gallery */}
                            <div className="rounded-3xl overflow-hidden shadow-lg bg-slate-100 dark:bg-navy-800">
                                <div className="aspect-video w-full bg-slate-200 dark:bg-navy-700 relative">
                                    <img
                                        src={images[activeImage]}
                                        alt="Property"
                                        className="w-full h-full object-cover transition-opacity duration-300"
                                    />
                                </div>
                                {images.length > 1 && (
                                    <div className="flex gap-2 p-4 overflow-x-auto bg-slate-50 dark:bg-navy-900/50">
                                        {images.map((img, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => setActiveImage(idx)}
                                                className={`relative w-24 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-all ${activeImage === idx ? 'border-invest-500 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                            >
                                                <img src={img} className="w-full h-full object-cover" alt={`Thumb ${idx}`} />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">About Property</h2>
                                <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg">
                                    {prop.description}
                                </p>
                            </div>

                            {/* Video Section */}
                            {prop.videoUrl && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                                        <Video className="w-6 h-6 text-invest-500" /> Property Video
                                    </h2>
                                    <div className="w-full aspect-video rounded-3xl overflow-hidden shadow-md bg-slate-900">
                                        {prop.videoUrl.includes('youtube.com') || prop.videoUrl.includes('youtu.be') ? (
                                            <iframe
                                                src={prop.videoUrl.replace('watch?v=', 'embed/')}
                                                width="100%" height="100%"
                                                allow="autoplay; encrypted-media"
                                                allowFullScreen
                                                className="w-full h-full"
                                            />
                                        ) : (
                                            <video src={prop.videoUrl} controls className="w-full h-full object-contain" />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 360° Virtual Tour */}
                            {prop.tourUrl && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white flex items-center gap-2">
                                        <View className="w-6 h-6 text-gold-500" /> 360° Virtual Tour
                                    </h2>
                                    <div className="w-full h-[400px] rounded-3xl overflow-hidden shadow-md">
                                        <iframe
                                            src={prop.tourUrl}
                                            width="100%" height="100%"
                                            style={{ border: 0 }}
                                            allowFullScreen
                                            loading="lazy"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Amenities */}
                            {prop.amenities && prop.amenities.length > 0 && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Amenities & Features</h2>
                                    <div className="flex flex-wrap gap-3">
                                        {prop.amenities.map((am, i) => (
                                            <div key={i} className="flex items-center gap-2 bg-invest-50 dark:bg-navy-800 text-invest-700 dark:text-invest-300 px-4 py-2 rounded-xl text-sm font-semibold">
                                                <CheckCircle2 className="w-4 h-4 text-invest-500" /> {am}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Location Map */}
                            {(prop.mapUrl || prop.location) && getMapUrl() && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Location Map</h2>
                                    <div className="w-full h-[400px] rounded-3xl overflow-hidden shadow-md">
                                        <iframe
                                            src={getMapUrl()}
                                            width="100%"
                                            height="100%"
                                            style={{ border: 0 }}
                                            allowFullScreen=""
                                            loading="lazy"
                                            referrerPolicy="no-referrer-when-downgrade"
                                        ></iframe>
                                    </div>
                                </div>
                            )}

                            {/* Contacts */}
                            {prop.contacts && Object.keys(prop.contacts).some(k => prop.contacts[k]) && (
                                <div>
                                    <h2 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">Contact Property Manager</h2>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {prop.contacts.phone && (
                                            <a
                                                href={`tel:${prop.contacts.phone}`}
                                                className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-100 dark:border-navy-700 col-span-1 sm:col-span-2 hover:bg-slate-100 dark:hover:bg-navy-700 transition-colors group"
                                            >
                                                <div className="p-3 rounded-full bg-slate-200 dark:bg-navy-700 group-hover:bg-invest-100 dark:group-hover:bg-invest-900/40 transition-colors">
                                                    <Phone className="w-5 h-5 text-slate-700 dark:text-slate-300 group-hover:text-invest-600 dark:group-hover:text-invest-400 transition-colors" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-slate-500">Landlord Phone</div>
                                                    <div className="font-bold text-slate-900 dark:text-white text-lg tracking-wide">{prop.contacts.phone}</div>
                                                    <div className="text-xs text-invest-600 dark:text-invest-400 font-medium">Tap to call</div>
                                                </div>
                                            </a>
                                        )}
                                        {prop.contacts.whatsapp && (
                                            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                                                <div className="p-3 rounded-full bg-emerald-200 dark:bg-emerald-900/50"><Phone className="w-5 h-5 text-emerald-700 dark:text-emerald-400" /></div>
                                                <div>
                                                    <div className="text-xs text-emerald-600 dark:text-emerald-500">WhatsApp</div>
                                                    <div className="font-bold text-emerald-900 dark:text-emerald-400">{prop.contacts.whatsapp}</div>
                                                </div>
                                            </div>
                                        )}
                                        {prop.contacts.email && (
                                            <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-100 dark:border-navy-700">
                                                <div className="p-3 rounded-full bg-slate-200 dark:bg-navy-700"><Mail className="w-5 h-5 text-slate-700 dark:text-slate-300" /></div>
                                                <div>
                                                    <div className="text-xs text-slate-500">Email</div>
                                                    <div className="font-bold text-slate-900 dark:text-white">{prop.contacts.email}</div>
                                                </div>
                                            </div>
                                        )}
                                        {prop.contacts.instagram && (
                                            <div className="flex items-center gap-3 p-4 rounded-xl bg-pink-50 dark:bg-pink-900/10 border border-pink-100 dark:border-pink-900/30">
                                                <div className="p-3 rounded-full bg-pink-200 dark:bg-pink-900/50"><Instagram className="w-5 h-5 text-pink-700 dark:text-pink-400" /></div>
                                                <div>
                                                    <div className="text-xs text-pink-600 dark:text-pink-500">Instagram</div>
                                                    <div className="font-bold text-pink-900 dark:text-pink-400">{prop.contacts.instagram}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Investment Widget */}
                        <div className="lg:col-span-1">
                            <div className="sticky top-28 card-base p-6 border-t-4 border-t-invest-500 shadow-2xl">
                                <div className="mb-6 pb-6 border-b border-slate-100 dark:border-navy-700">
                                    <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Target Funding</div>
                                    <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
                                        {fmt(prop.targetFunding)}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400 mb-2 font-medium">
                                        <span>{pct}% Funded</span>
                                        <span>
                                            {prop.status === 'active' || prop.status === 'closed'
                                                ? (prop.status === 'active'
                                                    ? <><CheckCircle2 className="w-3.5 h-3.5 inline mr-0.5 text-emerald-500" /> Fully Funded</>
                                                    : <><Lock className="w-3.5 h-3.5 inline mr-0.5" /> Closed</>)
                                                : `${prop.availableShares} Shares Available`}
                                        </span>
                                    </div>
                                    <div className="w-full h-3 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full bg-gradient-to-r ${prop.status === 'active' ? 'from-emerald-400 to-emerald-600' : 'from-invest-400 to-invest-600'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-8">
                                    <div className="bg-slate-50 dark:bg-navy-800/50 p-4 rounded-2xl text-center">
                                        <div className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-1 flex items-center justify-center gap-1">
                                            Share Price
                                            <span title="Share price = Target Funding ÷ Total Shares. Set by property owner at listing.">
                                                <Info className="w-3 h-3 text-slate-400 cursor-help" />
                                            </span>
                                        </div>
                                        <div className="text-lg font-extrabold text-slate-900 dark:text-white">{fmt(prop.sharePrice)}</div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-navy-800/50 p-4 rounded-2xl text-center">
                                        <div className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-1">Expected ROI</div>
                                        <div className="text-lg font-extrabold text-invest-600 dark:text-invest-400">{prop.monthlyROI}% / mo</div>
                                    </div>
                                </div>

                                {/* Legal Status */}
                                {prop.titleDeedStatus && (
                                    <div className={`mb-4 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${prop.titleDeedStatus === 'clean'
                                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                        }`}>
                                        {prop.titleDeedStatus === 'clean'
                                            ? <ShieldCheck className="w-4 h-4" />
                                            : <ShieldAlert className="w-4 h-4" />}
                                        Title Deed: {prop.titleDeedStatus.charAt(0).toUpperCase() + prop.titleDeedStatus.slice(1)}
                                        {prop.hasDispute && <span className="flex items-center gap-0.5"><AlertTriangle className="w-3 h-3 text-amber-500" /> Dispute on Record</span>}
                                    </div>
                                )}

                                {prop.status === 'funding' ? (
                                    <button onClick={() => setBuyModal(true)} className="btn-primary w-full py-4 text-lg shadow-xl shadow-invest-500/20">
                                        <Wallet className="w-5 h-5 mr-3 inline" /> Invest Now
                                    </button>
                                ) : (
                                    <div className="p-4 rounded-xl bg-slate-100 dark:bg-navy-800 text-center font-bold text-slate-500">
                                        <CheckCircle2 className="w-6 h-6 mx-auto mb-2 opacity-50" />
                                        Property Fully Funded
                                    </div>
                                )}

                                <div className="mt-4 text-center text-xs text-slate-400">
                                    Property ID: <span className="font-mono bg-slate-100 dark:bg-navy-800 px-1 py-0.5 rounded">{prop.propertyId}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Buy Modal */}
                {buyModal && (
                    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 py-8">
                        <div className="card-base p-8 max-w-md w-full shadow-2xl my-auto">
                            <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Confirm Investment</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{prop.name}</p>

                            <div className="space-y-6">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Number of Shares</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={prop.availableShares}
                                        value={shares}
                                        onChange={(e) => setShares(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="input-base mt-2 text-lg font-bold"
                                    />
                                    <p className="text-xs text-slate-400 mt-2">{prop.availableShares} available</p>
                                </div>

                                <div className="bg-invest-50 dark:bg-invest-900/20 rounded-2xl p-5 border border-invest-200 dark:border-invest-800">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-500">Price per Share</span>
                                        <span className="font-bold">{fmt(prop.sharePrice)}</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-500">Shares Selected</span>
                                        <span className="font-bold">× {shares}</span>
                                    </div>
                                    <hr className="border-invest-200 dark:border-invest-800 my-3" />
                                    <div className="flex justify-between text-lg">
                                        <span className="font-bold text-invest-800 dark:text-invest-300">Total Investment</span>
                                        <span className="font-extrabold text-invest-700 dark:text-invest-400">{fmt(prop.sharePrice * shares)}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button onClick={() => { setBuyModal(false); setShares(1); }} className="btn-outline flex-1 py-3" disabled={buying}>
                                        Cancel
                                    </button>
                                    <button onClick={handleBuy} className="btn-primary flex-1 py-3" disabled={buying}>
                                        {buying ? 'Processing...' : 'Confirm'}
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
