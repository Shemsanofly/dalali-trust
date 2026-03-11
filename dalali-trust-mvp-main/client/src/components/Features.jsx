import { Link } from 'react-router-dom';
import { ShieldCheck, ScanFace, Smartphone, Wallet } from 'lucide-react';

const FEATURES = [
    {
        icon: <ScanFace className="w-7 h-7" />,
        title: 'AI Document Verification',
        desc: "Upload NIDA card and title deed — our AI extracts names and confirms ownership match in seconds.",
        link: '/verify',
        cta: 'Register Property',
        accent: 'gold'
    },
    {
        icon: <Smartphone className="w-7 h-7" />,
        title: 'USSD Property Check',
        desc: 'Dial *384*XYZ# from any phone. No smartphone, no data plan needed. Verify any Property ID instantly.',
        link: '/lookup',
        cta: 'Try Lookup',
        accent: 'emerald'
    },
    {
        icon: <Wallet className="w-7 h-7" />,
        title: 'Secure Micro-Payments',
        desc: "Pay TSh 1,000 via mobile money to safely unlock the verified landlord's direct contact. No middlemen.",
        link: '/lookup',
        cta: 'Learn More',
        accent: 'sky'
    },
    {
        icon: <ShieldCheck className="w-7 h-7" />,
        title: 'Community Scam Reports',
        desc: 'Flag fraudulent listings and earn TSh 500 airtime when confirmed. The community protects itself.',
        link: '/lookup',
        cta: 'Report Scam',
        accent: 'rose'
    },
];

const accentMap = {
    gold: 'group-hover:from-gold-400 group-hover:text-gold-600 dark:group-hover:text-gold-400',
    emerald: 'group-hover:from-emerald-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
    sky: 'group-hover:from-sky-400 group-hover:text-sky-600 dark:group-hover:text-sky-400',
    rose: 'group-hover:from-rose-400 group-hover:text-rose-600 dark:group-hover:text-rose-400',
};

const iconMap = {
    gold: 'text-gold-500 bg-gold-50 dark:bg-gold-500/10 border-gold-100 dark:border-gold-500/20 group-hover:bg-gold-500 group-hover:text-white',
    emerald: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white',
    sky: 'text-sky-500 bg-sky-50 dark:bg-sky-500/10 border-sky-100 dark:border-sky-500/20 group-hover:bg-sky-500 group-hover:text-white',
    rose: 'text-rose-500 bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 group-hover:bg-rose-500 group-hover:text-white',
}

export default function Features() {
    return (
        <section className="py-24 bg-white dark:bg-navy-950">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <p className="text-xs font-bold uppercase tracking-widest text-gold-600 dark:text-gold-400 mb-3">Platform Features</p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Everything for <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-600">Safe Renting</span>
                    </h2>
                    <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                        State-of-the-art verification tools built for the Tanzanian market.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
                    {FEATURES.map((f, i) => (
                        <div key={i}
                            className="group relative p-8 rounded-[2rem] border border-slate-200 dark:border-navy-800 bg-slate-50 dark:bg-navy-900 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 overflow-hidden z-10">

                            {/* Glowing background gradient on hover */}
                            <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br from-transparent to-current transition-opacity duration-500 -z-10 ${accentMap[f.accent]}`} />

                            <div className="flex flex-col sm:flex-row gap-6 items-start">
                                {/* Icon Box */}
                                <div className={`shrink-0 w-16 h-16 rounded-2xl border flex items-center justify-center transition-all duration-300 ${iconMap[f.accent]}`}>
                                    {f.icon}
                                </div>

                                {/* Content */}
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{f.title}</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">{f.desc}</p>
                                    <Link to={f.link}
                                        className={`inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 dark:text-slate-500 transition-colors duration-200 ${accentMap[f.accent]}`}>
                                        {f.cta}
                                        <span className="group-hover:translate-x-1 transition-transform duration-200">→</span>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
