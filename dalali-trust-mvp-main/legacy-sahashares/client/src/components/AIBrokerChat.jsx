import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bot, BarChart3, Store, MessageSquare, AlertTriangle, Send, Settings } from 'lucide-react';

export default function AIBrokerChat() {
    const { user, token } = useAuth();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [sending, setSending] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const chatEnd = useRef(null);

    useEffect(() => {
        chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || sending) return;
        const text = input.trim();
        setInput('');

        const userMsg = { role: 'user', content: text, ts: Date.now() };
        setMessages((prev) => [...prev, userMsg]);
        setSending(true);

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    userId: user?.id,
                    sessionId,
                    channel: 'web',
                }),
            });
            const data = await res.json();

            if (data.sessionId && !sessionId) setSessionId(data.sessionId);

            // Add tool call cards if any
            if (data.toolCalls?.length) {
                data.toolCalls.forEach((tc) => {
                    setMessages((prev) => [
                        ...prev,
                        {
                            role: 'system',
                            type: 'tool',
                            toolName: tc.name,
                            content: formatToolResult(tc.name, tc.result),
                            ts: Date.now(),
                        },
                    ]);
                });
            }

            // Add AI reply
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: data.reply || data.error || 'No response.', ts: Date.now() },
            ]);
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Network error. Please try again.', ts: Date.now() },
            ]);
        }
        setSending(false);
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const toolIcons = {
        queryPortfolio: <BarChart3 className="w-3.5 h-3.5" />,
        listAvailableProperties: <Store className="w-3.5 h-3.5" />,
        getPropertyDetails: <MessageSquare className="w-3.5 h-3.5" />,
        getTransactionHistory: <BarChart3 className="w-3.5 h-3.5" />,
    };

    function formatToolResult(name, result) {
        if (!result) return 'No data returned.';
        if (result.error) return `Error: ${result.error}`;
        if (name === 'queryPortfolio') return `Fetched portfolio: ${result.investments?.length || 0} investments`;
        if (name === 'listAvailableProperties') return `Found ${Array.isArray(result) ? result.length : 0} properties`;
        if (name === 'getPropertyDetails') return `Property: ${result.name || 'N/A'}`;
        if (name === 'getTransactionHistory') return `${Array.isArray(result) ? result.length : 0} recent transactions`;
        return JSON.stringify(result).substring(0, 100);
    }

    // Lightweight inline markdown renderer — no external deps
    function renderMarkdown(text) {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            // Bullet points
            if (line.match(/^[-*] /)) {
                return (
                    <div key={i} className="flex gap-1.5 items-start">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-invest-500 shrink-0" />
                        <span>{renderInline(line.replace(/^[-*] /, ''))}</span>
                    </div>
                );
            }
            // Empty line
            if (!line.trim()) return <div key={i} className="h-1" />;
            // Normal line
            return <p key={i} className="leading-relaxed">{renderInline(line)}</p>;
        });
    }

    function renderInline(text) {
        // Split on **bold** pattern
        const parts = text.split(/(\*\*[^*]+\*\*)/);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
            }
            return part;
        });
    }

    return (
        <>
            {/* Floating toggle button */}
            <button
                onClick={() => setOpen(!open)}
                className="fixed bottom-6 right-6 z-[90] w-14 h-14 rounded-full bg-gradient-to-br from-invest-500 to-invest-700 text-white shadow-2xl shadow-invest-500/30 hover:shadow-invest-500/50 hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer"
                title="AI Broker"
            >
                {open ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                ) : (
                    <Bot className="w-6 h-6" />
                )}
            </button>

            {/* Chat panel */}
            {open && (
                <div className="fixed bottom-24 right-6 z-[90] w-[380px] max-w-[calc(100vw-2rem)] h-[520px] flex flex-col rounded-2xl shadow-2xl border border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-invest-600 to-invest-700 px-4 py-3 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">SahaShares Broker</div>
                            <div className="text-xs text-invest-100 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot" />
                                Online — Ask me anything
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {messages.length === 0 && (
                            <div className="text-center py-8">
                                <div className="flex justify-center mb-3"><Store className="w-10 h-10 text-invest-400 dark:text-invest-500" /></div>
                                <p className="text-sm text-slate-400 dark:text-slate-500 mb-4">
                                    Hi! I'm your SahaShares AI Broker. Ask me about properties, your portfolio, or available investments.
                                </p>
                                {user && (
                                    <div className="space-y-2">
                                        {['Show me available properties', 'What\'s my portfolio?', 'Tell me about Kariakoo'].map((q) => (
                                            <button
                                                key={q}
                                                onClick={() => { setInput(q); }}
                                                className="block w-full text-xs text-left px-3 py-2 rounded-lg bg-slate-50 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-invest-50 dark:hover:bg-invest-900/20 hover:text-invest-600 transition-colors cursor-pointer"
                                            >
                                                <MessageSquare className="w-3 h-3 inline mr-1" />{q}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'system' && msg.type === 'tool' ? (
                                    /* System/Transaction card */
                                    <div className="max-w-[85%] px-3 py-2 rounded-xl bg-gold-50 dark:bg-gold-900/20 border border-gold-200 dark:border-gold-800/50 my-1">
                                        <div className="text-xs font-bold text-gold-700 dark:text-gold-400 flex items-center gap-1.5">
                                            <span>{toolIcons[msg.toolName] || <Settings className="w-3.5 h-3.5" />}</span>
                                            {msg.toolName}
                                        </div>
                                        <div className="text-xs text-gold-600 dark:text-gold-500 mt-0.5">{msg.content}</div>
                                    </div>
                                ) : msg.role === 'user' ? (
                                    <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-md bg-invest-600 text-white text-sm my-1">
                                        {msg.content}
                                    </div>
                                ) : (
                                    <div className="max-w-[85%] my-1">
                                        <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-slate-100 dark:bg-navy-800 text-slate-800 dark:text-slate-200 text-sm space-y-1">
                                            {renderMarkdown(msg.content.split('|||')[0].trim())}
                                        </div>
                                        {msg.content.includes('|||') && (
                                            <div className="mt-2 space-y-1.5 flex flex-col items-start px-2">
                                                {msg.content.split('|||').slice(1).map((q, qIdx) => q.trim() ? (
                                                    <button
                                                        key={qIdx}
                                                        onClick={() => { setInput(q.trim()); }}
                                                        className="text-left text-xs px-3 py-1.5 rounded-lg bg-invest-50 dark:bg-invest-900/30 text-invest-700 dark:text-invest-300 border border-invest-200 dark:border-invest-800 hover:bg-invest-100 dark:hover:bg-invest-800 transition-colors w-auto inline-block cursor-pointer"
                                                    >
                                                        <span className="inline-flex items-center gap-1">✦ {q.trim()}</span>
                                                    </button>
                                                ) : null)}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}

                        {sending && (
                            <div className="flex justify-start my-1">
                                <div className="px-4 py-2.5 rounded-2xl rounded-bl-md bg-slate-100 dark:bg-navy-800">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={chatEnd} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-slate-200 dark:border-navy-800 bg-white dark:bg-navy-900">
                        {!user ? (
                            <p className="text-xs text-center text-slate-400 py-2">Please sign in to chat with the AI Broker.</p>
                        ) : (
                            <div className="flex gap-2">
                                <input
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKey}
                                    placeholder="Ask about properties, portfolio..."
                                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-200 dark:border-navy-700 text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-invest-500/50"
                                    disabled={sending}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={sending || !input.trim()}
                                    className="px-3 py-2 rounded-xl bg-invest-600 text-white font-bold text-sm hover:bg-invest-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
