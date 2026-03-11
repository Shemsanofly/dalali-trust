import { createContext, useContext, useState, useCallback } from 'react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((msg, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, msg, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500);
    }, []);

    return (
        <ToastCtx.Provider value={{ addToast }}>
            {children}
        </ToastCtx.Provider>
    );
}

export function useToast() {
    return useContext(ToastCtx);
}

export default function Toast() {
    const { addToast, ...ctx } = useContext(ToastCtx) || {};
    // Access toasts from provider — we need to have state in the same tree
    return null; // Toasts are rendered in ToastContainer below
}

// Use this component anywhere to render toasts
export function ToastContainer() {
    const [toasts, setToasts] = useState([]);
    return null;
}
