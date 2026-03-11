import { Link } from 'react-router-dom';
import { Store, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-white dark:bg-navy-950 border-t border-slate-200 dark:border-navy-800 pt-16 pb-8 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 md:gap-8 mb-12">
                    {/* Brand */}
                    <div className="col-span-1 md:col-span-1">
                        <Link to="/" className="flex items-center gap-2 mb-4 group inline-flex">
                            <div className="bg-gradient-to-br from-invest-500 to-gold-500 p-2 rounded-xl text-white shadow-lg overflow-hidden relative">
                                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
                                <Store className="w-5 h-5 relative z-10" />
                            </div>
                            <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Saha<span className="text-transparent bg-clip-text bg-gradient-to-r from-invest-600 to-gold-500">Shares</span></span>
                        </Link>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                            Empowering Tanzanian youth through verified, fractional commercial real estate investment. Start owning your future today.
                        </p>
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-full w-fit mb-4">
                            <ShieldCheck className="w-4 h-4" /> 100% Verified Properties
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-widest text-sm">Platform</h4>
                        <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                            <li><Link to="/marketplace" className="hover:text-invest-600 dark:hover:text-invest-400 transition-colors">Marketplace</Link></li>
                            <li><Link to="/portfolio" className="hover:text-invest-600 dark:hover:text-invest-400 transition-colors">My Portfolio</Link></li>
                            <li><Link to="/verify" className="hover:text-invest-600 dark:hover:text-invest-400 transition-colors">Verify Property</Link></li>
                            <li><Link to="/" className="hover:text-invest-600 dark:hover:text-invest-400 transition-colors">How it Works</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-widest text-sm">Support</h4>
                        <ul className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                            <li><Link to="/help" className="hover:text-invest-600 dark:hover:text-invest-400 transition-colors">Help Center</Link></li>
                            <li><Link to="/ussd-instructions" className="hover:text-invest-600 dark:hover:text-invest-400 transition-colors">USSD Instructions</Link></li>
                            <li><Link to="/terms" className="hover:text-invest-600 dark:hover:text-invest-400 transition-colors">Terms of Service</Link></li>
                            <li><Link to="/privacy" className="hover:text-invest-600 dark:hover:text-invest-400 transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h4 className="font-bold text-slate-900 dark:text-white mb-4 uppercase tracking-widest text-sm">Contact Us</h4>
                        <ul className="space-y-4 text-sm text-slate-500 dark:text-slate-400">
                            <li className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                                <span>Mikocheni B, Dar es Salaam<br />Tanzania</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-slate-400 shrink-0" />
                                <span>+255 700 000 000</span>
                            </li>
                            <li className="flex items-center gap-3">
                                <Mail className="w-5 h-5 text-slate-400 shrink-0" />
                                <span>hello@SahaShares.co.tz</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-200 dark:border-navy-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-slate-400 dark:text-slate-500 text-center md:text-left">
                        © {new Date().getFullYear()} SahaShares. All rights reserved.
                    </p>
                    <div className="flex gap-4">
                        {/* Placeholder for social icons if needed */}
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-navy-800 flex items-center justify-center text-slate-400 hover:text-invest-600 dark:hover:text-white transition-colors cursor-pointer">
                            <span className="sr-only">Twitter</span>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" /></svg>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
