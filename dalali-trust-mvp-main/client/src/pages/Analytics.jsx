import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart2, Users, Building2, Wallet, TrendingUp, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { apiFetch } from '../utils/api';

const fmt = (tzs) => `TSh ${(tzs || 0).toLocaleString()}`;
const STATUS_COLORS = { Funding: '#22c55e', Active: '#3b82f6', Closed: '#64748b' };
const CAT_COLORS = ['#f59e0b', '#10b981', '#84cc16', '#6366f1', '#a855f7'];

function StatCard({ icon, label, value, sub, color = 'text-slate-900 dark:text-white' }) {
    return (
        <div className="card-base p-5 flex items-start gap-4">
            <div className="w-11 h-11 rounded-2xl bg-invest-50 dark:bg-invest-900/20 flex items-center justify-center shrink-0">
                {icon}
            </div>
            <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-0.5">{label}</p>
                <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
                {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export default function Analytics() {
    const { t } = useLanguage();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        apiFetch('/api/analytics/overview')
            .then(({ ok, data, error }) => {
                if (ok) setData(data);
                else setError(error || 'Could not load analytics data.');
                setLoading(false);
            });
    }, []);

    if (loading) return (
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
                <div className="inline-block w-10 h-10 border-4 border-invest-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-slate-400 text-sm">Loading analytics…</p>
            </div>
        </div>
    );

    if (error || !data) return (
        <div className="pt-24 pb-16 flex items-center justify-center min-h-[60vh]">
            <p className="text-rose-500">{error || 'No data available.'}</p>
        </div>
    );

    const { totals, byCategory, byStatus, topProperties, recentActivity } = data;

    return (
        <div className="pt-24 pb-16 px-4 sm:px-6 animate-fade-up">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <div className="mb-10">
                    <h1 className="text-3xl sm:text-4xl font-extrabold flex items-center gap-3 mb-2">
                        <BarChart2 className="w-8 h-8 text-invest-500" /> Platform Analytics
                    </h1>
                    <p className="text-slate-400 text-sm">Live data from the SahaShares platform.</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <StatCard
                        icon={<Building2 className="w-5 h-5 text-invest-600" />}
                        label="Total Properties" value={totals.properties}
                        sub={`${totals.funding} funding · ${totals.active} active`}
                    />
                    <StatCard
                        icon={<Users className="w-5 h-5 text-blue-600" />}
                        label="Registered Investors" value={totals.users.toLocaleString()}
                        color="text-blue-600 dark:text-blue-400"
                    />
                    <StatCard
                        icon={<Wallet className="w-5 h-5 text-gold-500" />}
                        label="Total Invested" value={fmt(totals.investedTZS)}
                        color="text-gold-600 dark:text-gold-400"
                        sub="across all properties"
                    />
                    <StatCard
                        icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
                        label="Fully Active" value={totals.active}
                        color="text-emerald-600 dark:text-emerald-400"
                        sub="properties live"
                    />
                </div>

                {/* Charts Row 1 */}
                <div className="grid lg:grid-cols-2 gap-6 mb-6">
                    {/* Properties by Category */}
                    <div className="card-base p-6">
                        <h2 className="text-lg font-bold mb-5 text-slate-900 dark:text-white">Properties by Category</h2>
                        <ResponsiveContainer width="100%" height={240}>
                            <BarChart data={byCategory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 12, color: '#f1f5f9', fontSize: 13 }}
                                    cursor={{ fill: 'rgba(249,115,22,0.08)' }}
                                />
                                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                    {byCategory.map((_, i) => (
                                        <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Property Status Pie */}
                    <div className="card-base p-6">
                        <h2 className="text-lg font-bold mb-5 text-slate-900 dark:text-white">Properties by Status</h2>
                        <ResponsiveContainer width="100%" height={240}>
                            <PieChart>
                                <Pie
                                    data={byStatus.filter(s => s.value > 0)}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%" cy="50%"
                                    innerRadius={60}
                                    outerRadius={95}
                                    paddingAngle={3}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    labelLine={false}
                                >
                                    {byStatus.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 12, color: '#f1f5f9', fontSize: 13 }}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Properties by Funding % */}
                <div className="card-base p-6 mb-6">
                    <h2 className="text-lg font-bold mb-5 text-slate-900 dark:text-white">Top Properties — Funding Progress</h2>
                    <div className="space-y-4">
                        {topProperties.map((prop) => (
                            <Link to={`/property/${prop.propertyId}`} key={prop._id} className="block group">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-invest-600 dark:group-hover:text-invest-400 transition-colors">
                                        {prop.name}
                                        <span className="ml-2 text-xs font-normal text-slate-400">{prop.location}</span>
                                    </span>
                                    <span className={`text-sm font-bold ${prop.fundedPct >= 100 ? 'text-emerald-600 dark:text-emerald-400' : 'text-invest-600 dark:text-invest-400'}`}>
                                        {prop.fundedPct}%
                                    </span>
                                </div>
                                <div className="w-full h-2.5 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full transition-all duration-700 ${prop.fundedPct >= 100 ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-invest-400 to-invest-600'}`}
                                        style={{ width: `${prop.fundedPct}%` }}
                                    />
                                </div>
                                <div className="flex justify-between mt-1 text-[11px] text-slate-400">
                                    <span className="capitalize">{prop.category || 'commercial'}</span>
                                    <span>ROI {prop.monthlyROI}%/mo · Target {fmt(prop.targetFunding / 100)}</span>
                                </div>
                            </Link>
                        ))}
                        {topProperties.length === 0 && (
                            <p className="text-slate-400 text-sm text-center py-4">No properties yet.</p>
                        )}
                    </div>
                </div>

                {/* Recent Activity Feed */}
                <div className="card-base p-6">
                    <h2 className="text-lg font-bold mb-5 text-slate-900 dark:text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-slate-400" /> Recent Investment Activity
                    </h2>
                    {recentActivity.length === 0 ? (
                        <p className="text-slate-400 text-sm">No recent activity.</p>
                    ) : (
                        <div className="space-y-2">
                            {recentActivity.map((act, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-navy-800/50">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{act.investor}</p>
                                        <p className="text-xs text-slate-400">{act.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-invest-600 dark:text-invest-400">{fmt(act.amountTZS)}</p>
                                        <p className="text-[11px] text-slate-400">{new Date(act.date).toLocaleDateString('en-TZ', { day: 'numeric', month: 'short' })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
