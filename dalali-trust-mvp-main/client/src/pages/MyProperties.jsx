import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Store, Building2, PlusCircle, ChevronDown, ChevronUp, Users, Edit3, Save, MapPin, Instagram, Phone, Mail, Camera, Loader2, CheckCircle2, Video, View, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const fmt = (pesa) => `TSh ${((pesa || 0) / 100).toLocaleString()}`;

export default function MyProperties() {
    const { user, token } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchListings = () => {
        setLoading(true);
        fetch('/api/properties/my-listings', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((d) => { if (d.success && d.properties) setListings(d.properties); })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (!token) { navigate('/login'); return; }
        fetchListings();
    }, [token, navigate]);

    if (!user) return null;

    return (
        <div className="pt-24 pb-16 px-4 animate-fade-up">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-extrabold flex items-center gap-3 text-slate-900 dark:text-white">
                        <Building2 className="w-8 h-8 text-gold-500" /> {t('acc_listings')}
                    </h1>
                    <Link to="/verify" className="btn-primary flex py-2 px-4 items-center gap-2">
                        <PlusCircle className="w-4 h-4" /> {t('nav_list_prop')}
                    </Link>
                </div>

                <div className="card-base p-6 border-t-4 border-t-gold-500">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="h-20 rounded-xl bg-slate-100 dark:bg-navy-800 animate-pulse" />
                            ))}
                        </div>
                    ) : listings.length === 0 ? (
                        <div className="text-center py-12">
                            <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-navy-700 mb-4" />
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t('acc_no_listings')}</h3>
                            <p className="text-slate-500 mb-6 w-full max-w-md mx-auto">You have not listed any commercial properties on SahaShares yet. Register one today to start raising capital.</p>
                            <Link to="/verify" className="btn-primary">{t('nav_list_prop')}</Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {listings.map((prop) => (
                                <PropertyManagerCard key={prop.propertyId} prop={prop} token={token} onUpdate={fetchListings} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function PropertyManagerCard({ prop, token, onUpdate }) {
    const [tab, setTab] = useState(null); // 'edit' or 'investors'
    const [investors, setInvestors] = useState([]);
    const [loadingInv, setLoadingInv] = useState(false);

    // Edit Form State
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState(null);
    const [form, setForm] = useState({
        name: prop.name || '',
        description: prop.description || '',
        mapUrl: prop.mapUrl || '',
        videoUrl: prop.videoUrl || '',
        tourUrl: prop.tourUrl || '',
        category: prop.category || 'commercial',
        amenities: prop.amenities ? prop.amenities.join(', ') : '',
        phone: prop.contacts?.phone || '',
        whatsapp: prop.contacts?.whatsapp || '',
        email: prop.contacts?.email || '',
        instagram: prop.contacts?.instagram || ''
    });
    const [newImages, setNewImages] = useState([]);

    const toggleTab = (t) => {
        if (tab === t) {
            setTab(null);
        } else {
            setTab(t);
            if (t === 'investors' && investors.length === 0) fetchInvestors();
        }
    };

    const fetchInvestors = async () => {
        setLoadingInv(true);
        try {
            const res = await fetch(`/api/properties/${prop.propertyId}/investors`, { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) {
                setInvestors(data.investors);
            }
        } catch (err) {
            console.error('Failed to load investors');
        } finally {
            setLoadingInv(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMsg(null);
        const fd = new FormData();
        fd.append('name', form.name);
        fd.append('description', form.description);
        fd.append('mapUrl', form.mapUrl);
        fd.append('videoUrl', form.videoUrl);
        fd.append('tourUrl', form.tourUrl);
        fd.append('category', form.category);
        fd.append('amenities', JSON.stringify(form.amenities.split(',').map(s => s.trim()).filter(Boolean)));
        fd.append('contacts', JSON.stringify({
            phone: form.phone, whatsapp: form.whatsapp, email: form.email, instagram: form.instagram
        }));

        if (newImages && newImages.length > 0) {
            Array.from(newImages).forEach(f => fd.append('newImages', f));
        }

        try {
            const res = await fetch(`/api/properties/${prop.propertyId}`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}` },
                body: fd
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ type: 'success', text: 'Property updated successfully!' });
                setNewImages([]);
                onUpdate(); // refresh top level listings
                setTimeout(() => setMsg(null), 3000);
            } else {
                setMsg({ type: 'error', text: data.error || 'Failed to update.' });
            }
        } catch (err) {
            setMsg({ type: 'error', text: 'Network error.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 shadow-sm overflow-hidden transition-all">
            {/* Header / Summary */}
            <div className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-slate-50 dark:hover:bg-navy-800/50 transition-colors ${tab ? 'bg-slate-50 dark:bg-navy-800/80 border-b border-slate-200 dark:border-navy-800' : ''}`}>
                <div className="mb-4 sm:mb-0">
                    <div className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-1">
                        <Store className="w-5 h-5 text-gold-500" /> {prop.name}
                    </div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                        <span className="font-mono text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-navy-700 px-2 py-0.5 rounded mr-2">{prop.propertyId}</span>
                        {prop.location}
                    </div>
                    <div className="flex gap-3 flex-wrap text-xs font-semibold">
                        <span className="text-invest-600 dark:text-invest-400">{prop.totalShares} Shares</span>
                        <span className="text-gold-600 dark:text-gold-400">{prop.monthlyROI}% ROI</span>
                        <span className={`capitalize ${prop.status === 'funding' ? 'text-emerald-600' : 'text-slate-500'}`}>{prop.status} Phase</span>
                        {prop.category && <span className="capitalize bg-slate-100 dark:bg-navy-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{prop.category}</span>}
                    </div>
                </div>
                <div className="text-left sm:text-right flex flex-col sm:items-end gap-3 border-t sm:border-t-0 border-slate-200 dark:border-navy-700 pt-4 sm:pt-0">
                    <div>
                        <div className="text-sm text-slate-500 mb-0.5 mt-[-4px]">Target Funding</div>
                        <div className="text-xl font-extrabold text-slate-900 dark:text-white">{fmt(prop.targetFunding)}</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => toggleTab('edit')} className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors border ${tab === 'edit' ? 'bg-invest-500 text-white border-invest-500 hover:bg-invest-600' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-navy-700 hover:bg-slate-100 dark:hover:bg-navy-700'}`}>
                            <Edit3 className="w-4 h-4" /> Edit
                        </button>
                        <button onClick={() => toggleTab('investors')} className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1.5 transition-colors border ${tab === 'investors' ? 'bg-indigo-500 text-white border-indigo-500 hover:bg-indigo-600' : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-navy-700 hover:bg-slate-100 dark:hover:bg-navy-700'}`}>
                            <Users className="w-4 h-4" /> Investors
                        </button>
                    </div>
                </div>
            </div>

            {/* Expandable Tabs area */}
            <div className={`transition-all duration-300 ease-in-out ${tab ? 'max-h-[2000px] opacity-100 border-t border-slate-200 dark:border-navy-800' : 'max-h-0 opacity-0 overflow-hidden'}`}>

                {/* Edit Tab */}
                {tab === 'edit' && (
                    <div className="p-6 bg-slate-50/50 dark:bg-navy-900/50">
                        {msg && (
                            <div className={`p-3 mb-4 rounded-xl text-sm font-bold flex items-center gap-2 ${msg.type === 'success' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                                {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : null} {msg.text}
                            </div>
                        )}
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-navy-700">Property Details</h4>
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Property Name</label><input type="text" className="input-base" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Description</label><textarea rows="3" className="input-base" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Google Maps Embed URL</label><input type="text" className="input-base" placeholder="https://www.google.com/maps/embed?pb=..." value={form.mapUrl} onChange={e => setForm({ ...form, mapUrl: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block">Amenities (comma separated)</label><input type="text" className="input-base" placeholder="24/7 Security, Paved Access" value={form.amenities} onChange={e => setForm({ ...form, amenities: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block flex items-center gap-1"><Video className="w-3 h-3" /> Video URL (YouTube or MP4)</label><input type="url" className="input-base" placeholder="https://youtube.com/watch?v=..." value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block flex items-center gap-1"><View className="w-3 h-3" /> 360° Tour URL (Matterport, Google, etc.)</label><input type="url" className="input-base" placeholder="https://my.matterport.com/show/?m=..." value={form.tourUrl} onChange={e => setForm({ ...form, tourUrl: e.target.value })} /></div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block flex items-center gap-1"><Tag className="w-3 h-3" /> Category</label>
                                    <select className="input-base" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        <option value="commercial">Commercial</option>
                                        <option value="residential">Residential</option>
                                        <option value="land">Land</option>
                                        <option value="industrial">Industrial</option>
                                        <option value="mixed">Mixed Use</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 mb-1 block flex items-center gap-1"><Camera className="w-3 h-3" /> Add Additional Photos</label>
                                    <input type="file" multiple accept="image/*" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-invest-50 file:text-invest-700 hover:file:bg-invest-100 dark:file:bg-invest-500/20 dark:file:text-invest-300 dark:hover:file:bg-invest-500/30" onChange={e => setNewImages(e.target.files)} />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-200 dark:border-navy-700">Contact / Manager Details</h4>
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> Phone Number</label><input type="text" className="input-base" placeholder="+255..." value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-emerald-600 mb-1 block flex items-center gap-1"><Phone className="w-3 h-3" /> WhatsApp Number</label><input type="text" className="input-base border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500/20" placeholder="+255..." value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-slate-500 mb-1 block flex items-center gap-1"><Mail className="w-3 h-3" /> Email Address</label><input type="email" className="input-base" placeholder="info@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                                <div><label className="text-xs font-bold text-pink-600 mb-1 block flex items-center gap-1"><Instagram className="w-3 h-3" /> Instagram Handle</label><input type="text" className="input-base border-pink-200 focus:border-pink-500 focus:ring-pink-500/20" placeholder="@username" value={form.instagram} onChange={e => setForm({ ...form, instagram: e.target.value })} /></div>
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <button onClick={handleSave} disabled={saving} className="btn-primary w-full sm:w-auto px-8 flex items-center justify-center gap-2 shadow-xl shadow-invest-500/20">
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Save Changes
                            </button>
                        </div>
                    </div>
                )}

                {/* Investors Tab */}
                {tab === 'investors' && (
                    <div className="p-6 bg-slate-50/50 dark:bg-navy-900/50">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-navy-700">
                            <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Users className="w-5 h-5 text-indigo-500" /> Shareholder Register (Ledger)</h4>
                        </div>

                        {loadingInv ? (
                            <div className="py-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>
                        ) : investors.length === 0 ? (
                            <div className="py-8 text-center text-slate-500 border border-dashed border-slate-200 dark:border-navy-700 rounded-xl bg-white dark:bg-transparent">
                                No investors backing this property yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-extrabold tracking-wider">
                                            <th className="px-4 py-3 rounded-tl-xl rounded-bl-xl">Investor</th>
                                            <th className="px-4 py-3">Phone / ID</th>
                                            <th className="px-4 py-3 text-right">Shares Owned</th>
                                            <th className="px-4 py-3 text-right rounded-tr-xl rounded-br-xl">Amount Invested</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-navy-800">
                                        {investors.map((inv, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-navy-800/30 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{inv.name}</td>
                                                <td className="px-4 py-3 text-slate-500">{inv.phone}</td>
                                                <td className="px-4 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">{inv.shares}</td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-white">{fmt(inv.amountInvested)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
