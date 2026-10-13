import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiFetch } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('dt_token'));
    const [loading, setLoading] = useState(true);

    // Check existing token on mount
    useEffect(() => {
        if (!token) { setLoading(false); return; }
        apiFetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
            .then(({ ok, data }) => {
                if (ok && data.user) setUser(data.user);
                else { localStorage.removeItem('dt_token'); setToken(null); setUser(null); }
                setLoading(false);
            });
    }, [token]);

    /** Re-fetches the current user from the server, updating wallet/stats in-place. */
    const refreshUser = useCallback(async () => {
        if (!token) return;
        const { ok, data } = await apiFetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (ok && data.user) setUser(data.user);
    }, [token]);

    const saveAuth = (data) => {
        localStorage.setItem('dt_token', data.token);
        setToken(data.token);
        setUser(data.user);
    };

    const logout = () => {
        localStorage.removeItem('dt_token');
        setToken(null);
        setUser(null);
    };

    const isAdmin = user?.role === 'admin';

    return (
        <AuthContext.Provider value={{ user, token, loading, isAdmin, saveAuth, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}
