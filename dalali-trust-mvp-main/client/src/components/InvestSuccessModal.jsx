import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Wallet, BarChart3, Store, X } from 'lucide-react';

/**
 * InvestSuccessModal — Full-screen celebration popup shown after a successful investment.
 *
 * Props:
 *  - data: { propertyName, shares, amountTZS, newWalletBalanceTZS, propertyId }
 *  - onClose: () => void
 */
export default function InvestSuccessModal({ data, onClose }) {
    const canvasRef = useRef(null);

    // ── Confetti animation ──────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
        const pieces = Array.from({ length: 120 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * -canvas.height,
            r: Math.random() * 6 + 3,
            d: Math.random() * 4 + 2,
            color: colors[Math.floor(Math.random() * colors.length)],
            tilt: Math.random() * 10 - 10,
            tiltAngle: 0,
            tiltAngleInc: Math.random() * 0.07 + 0.05,
        }));

        let raf;
        let done = false;

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            pieces.forEach(p => {
                p.tiltAngle += p.tiltAngleInc;
                p.y += p.d;
                p.x += Math.sin(p.tiltAngle) * 1.5;
                p.tilt = Math.sin(p.tiltAngle) * 12;

                ctx.beginPath();
                ctx.lineWidth = p.r;
                ctx.strokeStyle = p.color;
                ctx.moveTo(p.x + p.tilt + p.r / 3, p.y);
                ctx.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 5);
                ctx.stroke();
            });

            // Reset pieces that fall off
            pieces.forEach(p => {
                if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
            });

            if (!done) raf = requestAnimationFrame(draw);
        };

        draw();
        const stop = setTimeout(() => { done = true; }, 4000);
        return () => { done = true; cancelAnimationFrame(raf); clearTimeout(stop); };
    }, []);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Confetti canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

            {/* Modal card */}
            <div
                className="relative card-base max-w-md w-full p-8 text-center shadow-2xl animate-fade-up z-10"
                onClick={e => e.stopPropagation()}
            >
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Trophy icon with glow ring */}
                <div className="relative mx-auto mb-5 w-20 h-20">
                    <div className="absolute inset-0 rounded-full bg-emerald-400/20 dark:bg-emerald-400/10 animate-ping" />
                    <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-300/40 dark:shadow-emerald-900/40">
                        <span className="text-4xl">🏆</span>
                    </div>
                </div>

                {/* Headline */}
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mb-1">
                    Hongera! 🎉
                </h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                    You're now a property investor!
                </p>

                {/* Investment summary card */}
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 mb-5 text-left space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 uppercase tracking-wide">Property</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 text-right max-w-[60%]">
                            {data.propertyName}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 uppercase tracking-wide">Shares Bought</span>
                        <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                            {data.shares} share{data.shares > 1 ? 's' : ''}
                        </span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-400 uppercase tracking-wide">Amount Paid</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            TSh {Number(data.amountTZS).toLocaleString()}
                        </span>
                    </div>
                    {data.newWalletBalanceTZS != null && (
                        <div className="flex justify-between items-center border-t border-emerald-100 dark:border-emerald-800 pt-2 mt-1">
                            <span className="text-xs text-slate-400 uppercase tracking-wide flex items-center gap-1">
                                <Wallet className="w-3 h-3" /> New Balance
                            </span>
                            <span className="text-sm font-bold text-invest-600 dark:text-invest-400">
                                TSh {Number(data.newWalletBalanceTZS).toLocaleString()}
                            </span>
                        </div>
                    )}
                </div>

                {/* Motivational message */}
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 italic">
                    "Every share is a step toward financial freedom. Karibu kwenye familia ya SahaShares!"
                </p>

                {/* CTA Buttons */}
                <div className="flex gap-3">
                    <Link
                        to="/portfolio"
                        onClick={onClose}
                        className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
                    >
                        <BarChart3 className="w-4 h-4" /> My Portfolio
                    </Link>
                    <button
                        onClick={onClose}
                        className="btn-outline flex-1 flex items-center justify-center gap-2 text-sm"
                    >
                        <Store className="w-4 h-4" /> Keep Investing
                    </button>
                </div>

                {/* Dividend teaser */}
                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gold-600 dark:text-gold-400 font-medium">
                    <TrendingUp className="w-3.5 h-3.5" />
                    You'll start earning dividends as soon as the property is fully funded.
                </div>
            </div>
        </div>
    );
}
