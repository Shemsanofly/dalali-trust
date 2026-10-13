import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Store, Smartphone, Wallet, TrendingUp, ShieldCheck, Users, Banknote, ArrowRight, Zap, CheckCircle2, Gift } from 'lucide-react';
import InteractiveBackground from '../components/InteractiveBackground';

export default function Home() {
    const { user } = useAuth();
    const { t } = useLanguage();

    return (
        <div className="animate-fade-up">
            {/* 1. Hero Section */}
            <section className="relative pt-28 pb-16 lg:pt-36 lg:pb-32 px-4 sm:px-6 overflow-hidden">
                <InteractiveBackground />
                <div className="relative z-10 max-w-5xl mx-auto text-center">
                    <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight tracking-tight mb-6 text-slate-900 dark:text-white drop-shadow-sm">
                        {t('home_hero_title_1')}
                        <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-invest-600 to-gold-500">{t('home_hero_title_2')}</span>
                    </h1>

                    <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed font-medium">
                        {t('home_hero_subtitle')} <strong className="text-invest-600 dark:text-invest-400">TSh 10,000</strong>.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/marketplace" className="btn-primary text-base sm:text-lg !px-8 !py-4 shadow-xl shadow-invest-500/20 hover:shadow-invest-500/40 transition-shadow">
                            <Store className="w-5 h-5 mr-2 inline" /> {t('home_hero_btn_browse')}
                        </Link>
                        {!user && (
                            <Link to="/signup" className="btn-outline bg-white/50 dark:bg-navy-900/50 backdrop-blur-md text-base sm:text-lg !px-8 !py-4 transition-colors">
                                {t('nav_create_account')}
                            </Link>
                        )}
                    </div>
                </div>
            </section>

            {/* 2. Stats Section (Floating overlapping element) */}
            <section className="px-4 sm:px-6 -mt-10 relative z-20">
                <div className="max-w-6xl mx-auto bg-white/80 dark:bg-navy-900/80 backdrop-blur-xl border border-slate-200 dark:border-navy-800 rounded-[2rem] p-8 shadow-2xl shadow-navy-900/10 dark:shadow-black/50 grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-100 dark:divide-navy-800/50">
                    {[
                        { value: t('home_stat_1_val'), label: t('home_stat_1_lbl') },
                        { value: t('home_stat_2_val'), label: t('home_stat_2_lbl') },
                        { value: t('home_stat_3_val'), label: t('home_stat_3_lbl') },
                        { value: t('home_stat_4_val'), label: t('home_stat_4_lbl') },
                    ].map(({ value, label }, i) => (
                        <div key={label} className={i % 2 === 0 && i !== 0 ? "" : i === 0 ? "border-l-0" : "border-l-0 md:border-l"}>
                            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white mb-2">{value}</div>
                            <div className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 3. The Problem & Solution */}
            <section className="py-24 sm:py-32 px-4 sm:px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
                        <div className="order-2 lg:order-1 relative group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-invest-500/20 to-gold-500/20 blur-3xl rounded-full opacity-50 transition-opacity group-hover:opacity-100 duration-700" />
                            <div className="relative rounded-3xl overflow-hidden border border-slate-200/50 dark:border-navy-800 shadow-2xl transition-transform duration-700 ease-out group-hover:scale-[1.02]">
                                <img src="/commercial_property.png" alt="Premium Commercial Real Estate Property" className="w-full h-auto object-cover aspect-square sm:aspect-video lg:aspect-[4/5]" />
                                <div className="absolute bottom-6 left-6 right-6 bg-white/95 dark:bg-navy-900/95 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/50 dark:border-navy-700 shadow-xl transition-transform duration-500 hover:-translate-y-2">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Store className="w-4 h-4 text-invest-500" /> {t('home_sol_card_tenant')}
                                        </div>
                                        <div className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-md">
                                            11% ROI
                                        </div>
                                    </div>
                                    <div className="w-full h-2.5 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-invest-400 to-invest-600 w-[75%] rounded-full relative">
                                            <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                                        </div>
                                    </div>
                                    <div className="flex justify-between mt-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                        <span>{t('home_sol_card_funded')}</span>
                                        <span>{t('home_sol_card_shares')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="order-1 lg:order-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold-50 dark:bg-gold-500/10 text-gold-600 dark:text-gold-400 text-[10px] font-bold uppercase tracking-widest mb-6 border border-gold-200 dark:border-gold-500/20">
                                <ShieldCheck className="w-4 h-4" /> {t('home_sol_badge')}
                            </div>
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 leading-[1.15] tracking-tight">
                                {t('home_sol_title_1')}<br />{t('home_sol_title_2')}
                            </h2>
                            <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
                                {t('home_sol_desc')}
                            </p>
                            <ul className="space-y-6 sm:space-y-8">
                                {[
                                    { icon: <CheckCircle2 className="w-6 h-6 text-emerald-500" />, title: t('home_sol_li_1_title'), desc: t('home_sol_li_1_desc') },
                                    { icon: <Users className="w-6 h-6 text-blue-500" />, title: t('home_sol_li_2_title'), desc: t('home_sol_li_2_desc') },
                                    { icon: <Banknote className="w-6 h-6 text-gold-500" />, title: t('home_sol_li_3_title'), desc: t('home_sol_li_3_desc') },
                                ].map((item, i) => (
                                    <li key={i} className="flex gap-5 items-start group">
                                        <div className="p-3 rounded-2xl bg-white dark:bg-navy-800 border-2 border-slate-100 dark:border-navy-700 shadow-sm group-hover:scale-110 group-hover:-rotate-3 group-hover:border-invest-500 transition-all duration-300">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-1 tracking-tight">{item.title}</h4>
                                            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* 4. How It Works (Upgraded Cards) */}
            <section className="py-24 sm:py-32 px-4 sm:px-6 bg-slate-50 dark:bg-navy-950/50 border-y border-slate-200 dark:border-navy-900 overflow-hidden relative">
                <div className="absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-slate-200 dark:via-navy-800 to-transparent hidden md:block" />
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight">
                            {t('home_hiw_title')} <span className="text-invest-500">{t('home_hiw_title_span')}</span>
                        </h2>
                        <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 leading-relaxed">{t('home_hiw_desc')}</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
                        {[
                            {
                                icon: <Smartphone className="w-8 h-8 text-invest-600 dark:text-invest-400" />,
                                color: 'bg-invest-50 dark:bg-invest-900/40 border-invest-200 dark:border-invest-800',
                                title: t('home_hiw_1_title'),
                                desc: t('home_hiw_1_desc'),
                            },
                            {
                                icon: <Wallet className="w-8 h-8 text-gold-600 dark:text-gold-400" />,
                                color: 'bg-gold-50 dark:bg-gold-900/40 border-gold-200 dark:border-gold-800',
                                title: t('home_hiw_2_title'),
                                desc: t('home_hiw_2_desc'),
                            },
                            {
                                icon: <TrendingUp className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />,
                                color: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800',
                                title: t('home_hiw_3_title'),
                                desc: t('home_hiw_3_desc'),
                            },
                        ].map((item, i) => (
                            <div key={item.title} className="card-base p-8 sm:p-10 hover:shadow-2xl hover:shadow-invest-500/10 hover:-translate-y-3 transition-all duration-500 group bg-white dark:bg-navy-900 relative">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border-2 mb-8 group-hover:scale-110 transition-transform duration-500 ${item.color}`}>
                                    {item.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white tracking-tight">{item.title}</h3>
                                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. Omnichannel Access (Mobile + USSD) */}
            <section className="py-24 sm:py-32 px-4 sm:px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-gradient-to-br from-slate-100 via-white to-slate-50 dark:from-navy-900 dark:via-slate-900 dark:to-black rounded-[3rem] p-8 sm:p-12 lg:p-16 xl:p-20 relative overflow-hidden shadow-2xl items-center grid lg:grid-cols-[1.5fr_1fr] gap-12 lg:gap-20 border border-slate-200 dark:border-slate-800 group">
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-[600px] h-[600px] bg-gold-500/10 rounded-full blur-[100px] pointer-events-none transition-transform duration-1000 group-hover:scale-110" />
                        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-[600px] h-[600px] bg-invest-500/10 rounded-full blur-[100px] pointer-events-none transition-transform duration-1000 group-hover:-translate-y-10 group-hover:scale-110" />

                        <div className="relative z-10 order-2 lg:order-1">
                            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-6 text-slate-900 dark:text-white leading-tight tracking-tight">
                                {t('home_ussd_title_1')}<br />
                                {t('home_ussd_title_2')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-600">USSD</span>.
                            </h2>
                            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-10 leading-relaxed max-w-xl">
                                {t('home_ussd_desc')}
                            </p>

                            <div className="bg-slate-500/5 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-sm max-w-md shadow-2xl transition-transform duration-500 hover:-translate-y-1">
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-3 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> {t('home_ussd_try')}
                                </p>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                                    <div className="bg-invest-500/20 text-invest-600 dark:text-invest-400 px-6 py-3 rounded-xl font-mono text-2xl sm:text-3xl font-bold tracking-widest border border-invest-500/30 shadow-inner">
                                        *384*44#
                                    </div>
                                    <div className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t('home_ussd_check')}</span>
                                        <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> {t('home_ussd_topup')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Phone Mockup visual representation */}
                        <div className="relative z-10 flex justify-center lg:justify-end order-1 lg:order-2">
                            <div className="w-[280px] h-[580px] sm:w-[320px] sm:h-[640px] bg-slate-950 rounded-[3rem] border-[12px] border-slate-800 shadow-2xl relative overflow-hidden flex flex-col p-5 transition-transform duration-700 ease-out hover:scale-[1.03]">
                                {/* Top notch */}
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-slate-800 rounded-b-2xl shadow-inner z-20" />

                                {/* Inner Screen glow */}
                                <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 to-transparent pointer-events-none" />

                                <div className="flex-1 mt-8 text-emerald-400 font-mono text-xs sm:text-sm leading-relaxed relative z-10 flex flex-col">
                                    <p className="mb-6 font-bold text-emerald-300 text-lg">{t('home_ussd_screen_1')}</p>
                                    <div className="space-y-4 flex-1">
                                        <p className="hover:bg-emerald-900/40 cursor-pointer p-2 rounded transition-colors">{t('home_ussd_screen_2')}</p>
                                        <p className="hover:bg-emerald-900/40 cursor-pointer p-2 rounded transition-colors">{t('home_ussd_screen_3')}</p>
                                        <p className="hover:bg-emerald-900/40 cursor-pointer p-2 rounded transition-colors">{t('home_ussd_screen_4')}</p>
                                        <p className="hover:bg-emerald-900/40 cursor-pointer p-2 rounded transition-colors">{t('home_ussd_screen_5')}</p>
                                    </div>
                                    <div className="h-14 border border-emerald-900/50 rounded-xl flex items-center px-4 bg-emerald-950/40 text-emerald-600 font-bold backdrop-blur-sm shadow-inner mt-4">
                                        {t('home_ussd_screen_reply')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* NEW: Dedicated Airtime Promo Section */}
            <section className="py-20 px-4 sm:px-6 bg-gradient-to-br from-emerald-500 to-emerald-700 dark:from-emerald-900 dark:to-emerald-950 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagonal-waves.png')] opacity-10" />
                <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="text-center md:text-left text-white">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 text-emerald-50 text-[10px] font-bold uppercase tracking-widest mb-4 border border-white/30 backdrop-blur-sm">
                            <Smartphone className="w-4 h-4" /> Africa's Talking Promo
                        </div>
                        <h2 className="text-3xl sm:text-5xl font-extrabold mb-4 tracking-tight">
                            Claim Your <span className="text-emerald-200">TSh 1,000</span> Airtime
                        </h2>
                        <p className="text-emerald-100 text-lg sm:text-xl max-w-2xl leading-relaxed mb-6">
                            Create your free SahaShares account right now and we'll instantly send a TSh 1,000 airtime voucher straight to your phone. Connect, browse, and start investing on us.
                        </p>
                        <Link to="/signup" className="inline-flex items-center bg-white text-emerald-900 font-extrabold shadow-xl shadow-black/20 hover:bg-emerald-50 hover:-translate-y-1 transition-all duration-300 text-base sm:text-lg px-8 py-4 rounded-2xl mt-2">
                            Claim 1,000 TZS Now <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                        </Link>
                    </div>
                    {/* Visual Voucher Mockup */}
                    <div className="shrink-0 relative group">
                        <div className="absolute inset-0 bg-white/20 blur-2xl rounded-full scale-150 transition-transform group-hover:scale-110 duration-700" />
                        <div className="bg-white dark:bg-navy-900 border-2 border-emerald-200 dark:border-emerald-800 rounded-[2rem] p-6 sm:p-8 shadow-2xl relative z-10 w-72 sm:w-80 transition-transform duration-500 hover:-translate-y-2">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                                    <Smartphone className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-xl">
                                    <Gift className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs">Insta-Credit</h4>
                                <div className="flex items-baseline gap-1 py-1">
                                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white">1,000</span>
                                    <span className="text-lg font-bold text-slate-500">TZS</span>
                                </div>
                                <p className="text-emerald-600 dark:text-emerald-400 font-medium text-sm">Dispatched via Africa's Talking</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6. Closing CTA */}
            <section className="py-24 sm:py-32 px-4 sm:px-6 text-center">
                <div className="max-w-4xl mx-auto layout-hero">
                    <div className="w-20 h-20 rounded-full bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center mx-auto mb-8 border border-gold-200 dark:border-gold-500/20">
                        <Zap className="w-10 h-10 text-gold-500" />
                    </div>
                    <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight leading-tight">
                        {t('home_cta_title_1')}<br className="hidden sm:block" /> {t('home_cta_title_2')}
                    </h2>
                    <p className="text-xl text-slate-500 dark:text-slate-400 mb-12 leading-relaxed max-w-2xl mx-auto">
                        {t('home_cta_desc')}
                    </p>

                    <Link to={user ? "/portfolio" : "/signup"} className="btn-primary text-lg sm:text-xl !px-10 !py-6 sm:!py-5 shadow-2xl shadow-invest-500/20 hover:-translate-y-1 hover:shadow-invest-500/40 transition-all duration-300 rounded-[1.5rem] inline-flex items-center">
                        {user ? 'Go to Portfolio' : t('home_cta_btn')} <ArrowRight className="w-6 h-6 ml-2 transition-transform group-hover:translate-x-1" />
                    </Link>
                    <p className="mt-8 text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">
                        {t('home_cta_sub')}
                    </p>
                </div>
            </section>
        </div>
    );
}
