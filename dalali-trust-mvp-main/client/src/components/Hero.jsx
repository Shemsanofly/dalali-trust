import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, Smartphone } from 'lucide-react';

export default function Hero() {
    const { user } = useAuth();

    return (
        <section className="relative pt-24 lg:pt-32 pb-16 overflow-hidden">
            {/* Ambient Background Glows */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold-500/10 dark:bg-gold-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 -z-10" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-navy-500/10 dark:bg-navy-500/20 rounded-full blur-3xl pointer-events-none translate-y-1/4 -z-10" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

                    {/* Left Column: Copy & CTAs */}
                    <div className="max-w-2xl animate-fade-up z-10">

                        {/* Trust Badge */}
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8
                            bg-white/80 dark:bg-navy-900/80 backdrop-blur-md
                            border border-slate-200 dark:border-navy-800
                            shadow-sm">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" />
                            <span className="text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-widest">
                                #1 Anti-Scam Platform in TZ
                            </span>
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 text-slate-900 dark:text-white">
                            Verify Before<br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-600">You Pay.</span>
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                            Tanzania's trusted platform for verified rentals. Eliminate fake brokers,
                            verify landlords securely, and connect directly — from any device.
                        </p>
                        <p className="text-base font-medium text-gold-600 dark:text-gold-500 italic mb-10">
                            "Imiliki na Wekeza kwa Usalama. SahaShares."
                        </p>

                        {/* CTAs */}
                        <div className="flex flex-wrap items-center gap-4 mb-12">
                            {user ? (
                                <>
                                    <Link to="/verify" className="btn-primary px-8">
                                        Register Property
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <Link to="/lookup" className="btn-outline px-8">
                                        Verify ID
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link to="/signup" className="btn-primary px-8">
                                        Get Started Free
                                        <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <Link to="/lookup" className="btn-outline px-8">
                                        Verify a Property
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Stats Row */}
                        <div className="flex items-center gap-8 sm:gap-12 pt-8 border-t border-slate-200 dark:border-navy-800">
                            <Stat num="3,200+" label="Verified Properties" />
                            <Stat num="89" label="Scams Blocked" />
                        </div>
                    </div>

                    {/* Right Column: Imagery */}
                    <div className="relative lg:h-[600px] flex items-center justify-center animate-fade-up" style={{ animationDelay: '0.2s' }}>
                        {/* Main High-End Image */}
                        <div className="relative w-full max-w-lg mx-auto rounded-[2rem] overflow-hidden shadow-2xl shadow-navy-900/20 dark:shadow-black/40 border border-slate-200/50 dark:border-navy-800">
                            <img
                                src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                                alt="Modern luxury home exterior"
                                className="w-full h-auto object-cover aspect-[4/5] lg:aspect-auto lg:h-[600px]"
                            />
                            {/* Subtle overlay to ensure text/UI stands out if overlapping */}
                            <div className="absolute inset-0 bg-gradient-to-t from-navy-900/60 via-transparent to-transparent mix-blend-multiply" />
                        </div>

                        {/* Floating UI Elements matching the web3/fintech vibe */}
                        <div className="absolute bottom-8 -left-6 lg:-left-12 bg-white/90 dark:bg-navy-900/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-xl flex items-center gap-4 animate-bounce" style={{ animationDuration: '4s' }}>
                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-0.5">Status</p>
                                <p className="text-sm font-extrabold text-slate-900 dark:text-white">Landlord Verified</p>
                            </div>
                        </div>

                        <div className="absolute top-12 -right-4 lg:-right-8 bg-white/90 dark:bg-navy-900/90 backdrop-blur-xl p-3 rounded-2xl border border-slate-200 dark:border-navy-800 shadow-xl flex items-center gap-3 animate-bounce" style={{ animationDuration: '5s', animationDelay: '1s' }}>
                            <div className="w-10 h-10 rounded-full bg-gold-100 dark:bg-gold-900/30 flex items-center justify-center">
                                <Smartphone className="w-5 h-5 text-gold-600 dark:text-gold-400" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white">USSD Ready</p>
                                <p className="text-[10px] text-slate-500 font-mono">*384*XYZ#</p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </section>
    );
}

function Stat({ num, label }) {
    return (
        <div>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-1">
                {num}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                {label}
            </div>
        </div>
    );
}
