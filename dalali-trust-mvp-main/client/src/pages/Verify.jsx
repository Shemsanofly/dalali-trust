import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { ErrorBox, Spinner, Field } from './Login';
import { Lock, FileSignature, IdCard, CheckCircle2, XCircle, FileCheck2, ArrowRightLeft, ShieldCheck, MapPin, Copy, Check, Camera } from 'lucide-react';

export default function Verify() {
    const { user, token } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [nidaFile, setNidaFile] = useState(null);
    const [deedFile, setDeedFile] = useState(null);
    const [propertyImage, setPropertyImage] = useState(null);
    const [form, setForm] = useState({ fullName: user?.fullName || '', nidaNumber: '', phoneNumber: user?.phone || user?.phoneNumber || '', propertyName: '', location: '', address: '', rentMonthly: '', roomType: 'bedsitter' });
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = (id) => {
        navigator.clipboard.writeText(id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!user) return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-4 pt-24 pb-12">
            <div className="text-center bg-white dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-3xl p-10 max-w-sm w-full shadow-xl shadow-slate-200/50 dark:shadow-navy-950/50">
                <div className="w-16 h-16 rounded-full bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-8 h-8 text-gold-500" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-2">{t('auth_req_title')}</h2>
                <p className="text-sm text-slate-500 mb-6">{t('auth_req_sub')}</p>
                <button className="btn-primary w-full" onClick={() => navigate('/login')}>{t('auth_login_btn')}</button>
            </div>
        </div>
    );

    const update = (k, v) => setForm({ ...form, [k]: v });

    const handleRentChange = (e) => {
        const raw = e.target.value.replace(/\D/g, '');
        const formatted = raw ? Number(raw).toLocaleString('en-US') : '';
        update('rentMonthly', formatted);
    };

    const handleExtract = async () => {
        setError(''); setLoading(true);
        const fd = new FormData();
        fd.append('nidaImage', nidaFile);
        fd.append('deedImage', deedFile);
        try {
            const res = await fetch('/api/kyc/extract', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setForm({
                ...form,
                fullName: data.extracted.fullName || form.fullName,
                nidaNumber: data.extracted.nidaNumber || form.nidaNumber,
                location: data.extracted.location || form.location,
                address: data.extracted.address || form.address,
            });
            setStep(2);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    const handleSubmit = async () => {
        setError(''); setLoading(true);
        const fd = new FormData();
        fd.append('nidaImage', nidaFile);
        fd.append('deedImage', deedFile);
        fd.append('propertyImage', propertyImage);
        Object.entries(form).forEach(([k, v]) => {
            if (k === 'rentMonthly') {
                fd.append(k, v.replace(/,/g, ''));
            } else {
                fd.append(k, v);
            }
        });
        try {
            const res = await fetch('/api/kyc/verify', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data); setStep(3);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    const STEPS_LABEL = [t('vrf_upload_title'), t('vrf_review_title'), 'Result'];

    return (
        <div className="pt-24 pb-10 px-4">
            <div className="max-w-2xl mx-auto">

                {/* Stepper */}
                <div className="flex items-center justify-center gap-3 mb-10">
                    {STEPS_LABEL.map((label, i) => (
                        <div key={i} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === i + 1 ? 'bg-gold-500 text-white shadow-lg shadow-gold-500/30' :
                                step > i + 1 ? 'bg-emerald-500 text-white' :
                                    'bg-slate-200 dark:bg-navy-800 text-slate-500'
                                }`}>
                                {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                            </div>
                            <span className={`text-xs font-semibold hidden sm:block ${step === i + 1 ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'}`}>{label}</span>
                            {i < 2 && <div className="w-6 h-px bg-slate-200 dark:bg-navy-800" />}
                        </div>
                    ))}
                </div>

                {/* Step 1 — Upload */}
                {step === 1 && (
                    <div className="card-base p-8 animate-fade-up">
                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1">{t('vrf_upload_title')}</h2>
                        <p className="text-sm text-slate-500 mb-6">{t('vrf_upload_sub')}</p>
                        {error && <div className="mb-4"><ErrorBox msg={error} /></div>}
                        <div className="grid sm:grid-cols-2 gap-4 mb-6">
                            <UploadZone label={t('vrf_nida')} hint={t('vrf_nida_hint')} icon={<IdCard className="w-8 h-8 text-slate-400 dark:text-slate-500 group-hover:text-gold-500 transition-colors" />} file={nidaFile} onChange={setNidaFile} />
                            <UploadZone label={t('vrf_deed')} hint={t('vrf_deed_hint')} icon={<FileSignature className="w-8 h-8 text-slate-400 dark:text-slate-500 group-hover:text-gold-500 transition-colors" />} file={deedFile} onChange={setDeedFile} />
                        </div>
                        <button className="btn-primary w-full" disabled={!nidaFile || !deedFile || loading} onClick={handleExtract}>
                            {loading ? <><Spinner /> AI Extracting...</> : t('vrf_cont')}
                        </button>
                    </div>
                )}

                {/* Step 2 — Details */}
                {step === 2 && (
                    <div className="card-base p-8 animate-fade-up border-gold-400/50 shadow-gold-500/10 shadow-2xl">
                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-1 flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> {t('vrf_review_title')}</h2>
                        <p className="text-sm text-slate-500 mb-6">{t('vrf_review_sub')}</p>
                        {error && <div className="mb-4"><ErrorBox msg={error} /></div>}
                        <div className="grid sm:grid-cols-2 gap-4 mb-6 relative">
                            <div className="absolute inset-0 bg-gold-50/30 dark:bg-gold-500/5 pointer-events-none rounded-2xl -m-4 p-4 border border-gold-200/50 dark:border-gold-500/10" />
                            <Field className="z-10" label={t('vrf_name_nida')}>
                                <input className="input-base border-gold-200 focus:border-gold-500 focus:ring-gold-500/20" value={form.fullName} onChange={e => update('fullName', e.target.value)} placeholder="Juma Rashid Mwangi" />
                            </Field>
                            <Field className="z-10" label={t('vrf_nida_no')}>
                                <input className="input-base border-gold-200 focus:border-gold-500 focus:ring-gold-500/20 font-mono text-sm" value={form.nidaNumber} onChange={e => update('nidaNumber', e.target.value)} placeholder="19951234-5678" />
                            </Field>
                            <Field className="z-10" label={t('auth_phone')}>
                                <input type="tel" className="input-base" value={form.phoneNumber} onChange={e => update('phoneNumber', e.target.value)} placeholder="+255712345678" />
                            </Field>
                            <Field className="z-10" label={t('vrf_name_prop') || 'Property Name'}>
                                <input className="input-base border-gold-200 focus:border-gold-500 focus:ring-gold-500/20" value={form.propertyName} onChange={e => update('propertyName', e.target.value)} placeholder="e.g. Mama Halima's Corner Shop" />
                            </Field>
                            <Field className="z-10" label={t('vrf_loc')}>
                                <input className="input-base border-gold-200 focus:border-gold-500 focus:ring-gold-500/20" value={form.location} onChange={e => update('location', e.target.value)} placeholder="Kariakoo, Dar es Salaam" />
                            </Field>
                            <Field className="z-10" label={t('vrf_addr')}>
                                <input className="input-base border-gold-200 focus:border-gold-500 focus:ring-gold-500/20" value={form.address} onChange={e => update('address', e.target.value)} placeholder="Lindi Street, Plot 42" />
                            </Field>
                            <Field className="z-10" label={t('vrf_rent')}>
                                <input type="text" className="input-base" value={form.rentMonthly} onChange={handleRentChange} placeholder="350,000" />
                            </Field>
                            <Field className="z-10" label={t('vrf_room')}>
                                <select className="input-base" value={form.roomType} onChange={e => update('roomType', e.target.value)}>
                                    <option value="bedsitter">Bedsitter</option>
                                    <option value="1BR">1 Bedroom</option>
                                    <option value="2BR">2 Bedrooms</option>
                                    <option value="3BR">3 Bedrooms</option>
                                    <option value="whole-floor">Whole Floor</option>
                                </select>
                            </Field>
                            <div className="col-span-1 sm:col-span-2 mt-2 z-10">
                                <UploadZone label={t('vrf_prop_photo') || 'Property Photo'} hint={t('vrf_prop_photo_hint') || 'Clear photo of the physical property'} icon={<Camera className="w-8 h-8 text-slate-400 dark:text-slate-500 group-hover:text-gold-500 transition-colors" />} file={propertyImage} onChange={setPropertyImage} />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button className="btn-outline" onClick={() => setStep(1)}>{t('auth_back')}</button>
                            <button className="btn-primary flex-1" onClick={handleSubmit} disabled={loading || !propertyImage}>
                                {loading ? <><Spinner /> {t('vrf_registering')}</> : t('vrf_confirm_btn')}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3 — Result */}
                {step === 3 && result && (
                    <div className="card-base p-8 animate-fade-up">
                        {/* Name comparison */}
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-6">
                            <DocBox label={t('vrf_nida_name')} name={result.nidaName} icon={<IdCard className="w-4 h-4 text-slate-400 mb-1 mx-auto" />} />
                            <ArrowRightLeft className="w-6 h-6 text-gold-500 font-light" />
                            <DocBox label={t('vrf_deed_name')} name={result.deedName} icon={<FileSignature className="w-4 h-4 text-slate-400 mb-1 mx-auto" />} />
                        </div>

                        {/* Confidence bar */}
                        <div className="mb-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-slate-500 font-medium">{t('vrf_conf')}</span>
                                <span className="font-bold font-mono text-slate-900 dark:text-white">{result.confidence}%</span>
                            </div>
                            <div className="h-2.5 rounded-full bg-slate-100 dark:bg-navy-800 overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${result.match ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`}
                                    style={{ width: `${result.confidence}%` }} />
                            </div>
                        </div>

                        {/* Status badge */}
                        <div className="flex justify-center mb-6">
                            {result.match
                                ? <span className="badge-verified"><CheckCircle2 className="w-4 h-4" /> {t('vrf_match')}</span>
                                : <span className="badge-scam"><XCircle className="w-4 h-4" /> {t('vrf_no_match')}</span>}
                        </div>

                        {/* Government Land Registry Simulation Data */}
                        {result.success && result.tanzaniaRegistry && (
                            <div className="mb-6 bg-slate-50 dark:bg-navy-900 border border-slate-200 dark:border-navy-800 rounded-2xl p-5 shadow-inner relative overflow-hidden">
                                <div className="absolute top-0 right-0 -mt-4 -mr-4 text-emerald-500/10">
                                    <ShieldCheck className="w-32 h-32" />
                                </div>
                                <div className="relative z-10">
                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-4">
                                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> {t('vrf_registry_cert')}
                                    </p>
                                    <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{t('vrf_reg_plot')}</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">Na. {result.tanzaniaRegistry.plot}, {result.tanzaniaRegistry.block}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{t('vrf_reg_district')}</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                                                <MapPin className="w-3 h-3 text-slate-400" /> {result.tanzaniaRegistry.district}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{t('vrf_reg_deed')}</p>
                                            <p className="text-sm font-mono font-bold text-slate-600 dark:text-slate-300">{result.tanzaniaRegistry.titleRef}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold">{t('vrf_reg_status')}</p>
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                <CheckCircle2 className="w-3 h-3" /> {t('vrf_reg_active')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Property ID */}
                        {result.success && result.propertyId && (
                            <div className="text-center p-6 rounded-2xl bg-gold-50 dark:bg-gold-500/10 border border-gold-200 dark:border-gold-500/20 mb-6">
                                <p className="text-xs font-bold uppercase tracking-widest text-gold-600 dark:text-gold-500 flex items-center justify-center gap-1.5 mb-2">
                                    <FileCheck2 className="w-4 h-4" /> {t('vrf_reg')}
                                </p>
                                <div className="flex items-center justify-center gap-3">
                                    <p className="text-2xl font-extrabold font-mono text-gold-700 dark:text-gold-400">{result.propertyId}</p>
                                    <button
                                        onClick={() => handleCopy(result.propertyId)}
                                        className="p-2 rounded-lg bg-gold-200/50 hover:bg-gold-200 dark:bg-gold-500/20 dark:hover:bg-gold-500/40 text-gold-700 dark:text-gold-400 transition-colors"
                                        title={t('vrf_copy_id')}
                                    >
                                        {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">{t('vrf_share')}</p>
                            </div>
                        )}

                        <div className="flex gap-3 justify-center">
                            <button className="btn-primary" onClick={() => { setStep(1); setResult(null); setNidaFile(null); setDeedFile(null); }}>{t('vrf_reg_another')}</button>
                            <button className="btn-outline" onClick={() => navigate('/my-properties')}>{t('vrf_my_props')}</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function UploadZone({ label, hint, icon, file, onChange }) {
    return (
        <label className={`group relative flex flex-col items-center justify-center text-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 ${file
            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/10'
            : 'border-slate-200 dark:border-navy-700 hover:border-gold-400 dark:hover:border-gold-500 hover:bg-gold-50 dark:hover:bg-gold-500/10'
            }`}>
            <input type="file" accept="image/*,.pdf" className="sr-only" onChange={e => onChange(e.target.files?.[0] || null)} />
            <div className="mb-3">{file ? <CheckCircle2 className="w-8 h-8 text-emerald-500" /> : icon}</div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 break-all">{file ? file.name : label}</p>
            <p className="text-xs text-slate-400 mt-1">{hint}</p>
        </label>
    );
}

function DocBox({ label, name, icon }) {
    return (
        <div className="bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-800 rounded-xl p-4 text-center">
            {icon}
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
            <p className="font-bold text-slate-900 dark:text-white text-sm">{name || '—'}</p>
        </div>
    );
}
