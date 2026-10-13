import { FileText, KeyRound, Smartphone } from 'lucide-react';

const STEPS = [
    {
        icon: <FileText className="w-8 h-8 text-gold-500" />,
        num: '01',
        title: 'Upload Documents',
        desc: 'NIDA card and title deed verified by AI — names must match to register a property securely.'
    },
    {
        icon: <KeyRound className="w-8 h-8 text-slate-700 dark:text-slate-300 group-hover:text-gold-500 transition-colors" />,
        num: '02',
        title: 'Receive Unique ID',
        desc: 'A tamper-proof Property ID is generated. The landlord is verified and the listing goes live.'
    },
    {
        icon: <Smartphone className="w-8 h-8 text-slate-700 dark:text-slate-300 group-hover:text-gold-500 transition-colors" />,
        num: '03',
        title: 'Tenant Verifies Instantly',
        desc: 'Dial *384*XYZ# on any phone — even basic ones with no internet. Instantly check any listing.'
    },
];

export default function HowItWorks() {
    return (
        <section className="py-24 bg-slate-50 dark:bg-navy-900 border-y border-slate-200 dark:border-navy-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-16">
                    <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-50 dark:bg-gold-900/20 text-gold-700 dark:text-gold-400 text-xs font-bold uppercase tracking-widest border border-gold-200 dark:border-gold-800/30 mb-6">
                        Mechanism of Trust
                    </p>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                        Three Steps to <span className="text-transparent bg-clip-text bg-gradient-to-r from-gold-400 to-gold-600">Secure Renting</span>
                    </h2>
                    <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
                        No apps to download. No smartphones required. A system designed to protect both landlords and tenants seamlessly.
                    </p>
                </div>

                {/* Cards */}
                <div className="grid md:grid-cols-3 gap-8 relative z-10">
                    {/* Connecting line behind cards (desktop only) */}
                    <div className="hidden md:block absolute top-[5.5rem] left-[10%] right-[10%] h-px bg-slate-200 dark:bg-navy-800 -z-10" />

                    {STEPS.map((step, i) => (
                        <div key={i}
                            className="group relative p-8 rounded-3xl border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-950 shadow-sm hover:shadow-xl hover:shadow-gold-500/5 hover:-translate-y-1 transition-all duration-300"
                            style={{ animationDelay: `${i * 0.15}s` }}>

                            {/* Step number watermark */}
                            <span className="absolute top-6 right-6 font-mono text-4xl font-extrabold text-slate-100 dark:text-navy-900 select-none group-hover:text-gold-50 dark:group-hover:text-gold-900/10 transition-colors">
                                {step.num}
                            </span>

                            <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-navy-900 border border-slate-100 dark:border-navy-800 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                                {step.icon}
                            </div>

                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 relative z-10">{step.title}</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed relative z-10">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
