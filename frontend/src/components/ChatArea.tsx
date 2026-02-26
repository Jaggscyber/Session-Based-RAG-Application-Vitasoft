import React, { useState } from 'react';
import type { ChatMessage } from '../types';

interface ChatAreaProps {
    sessionId: string;
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    threshold: number;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ sessionId, messages, setMessages, threshold }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const newUserMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input };
        setMessages(prev => [...prev, newUserMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch('http://localhost:3000/api/ask', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'x-session-id': sessionId 
                },
                body: JSON.stringify({ question: input, threshold }) 
            });
            const data = await res.json();

            // FIXED: Handle backend errors properly
            if (!res.ok) {
                const errorMsg: ChatMessage = { 
                    id: crypto.randomUUID(), 
                    role: 'assistant', 
                    content: data.error || "An error occurred communicating with the server." 
                };
                setMessages(prev => [...prev, errorMsg]);
                setIsLoading(false);
                return;
            }

            const sources = data.sources ? data.sources.map((src: string, idx: number) => ({
                text: src,
                score: data.scores[idx]
            })) : [];

            const newAiMsg: ChatMessage = { 
                id: crypto.randomUUID(), 
                role: 'assistant', 
                content: data.answer,
                sources: sources
            };
            setMessages(prev => [...prev, newAiMsg]);
        } catch (error) {
            console.error("Chat error:", error);
            const fallbackMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: "Failed to connect to the backend." };
            setMessages(prev => [...prev, fallbackMsg]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-white">
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center flex-col text-gray-400">
                        <span className="text-4xl mb-4">🤖</span>
                        <h3 className="text-xl">How can I help you today?</h3>
                        <p className="text-sm">Upload a document to the left to get started.</p>
                    </div>
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-3xl rounded-lg p-5 ${msg.role === 'user' ? 'bg-blue-50 text-blue-900 border border-blue-100' : 'bg-gray-50 text-gray-800 border border-gray-200'}`}>
                                <p className="leading-relaxed">{msg.content}</p>
                                
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Sources Referenced</p>
                                        <div className="space-y-2">
                                            {msg.sources.map((src, idx) => (
                                                <div key={idx} className="bg-white p-3 rounded border border-gray-100 shadow-sm text-sm">
                                                    <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-medium mb-1">
                                                        {(src.score * 100).toFixed(1)}% Match
                                                    </span>
                                                    <p className="text-gray-600 line-clamp-3">{src.text}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                            <div className="h-4 bg-gray-200 rounded w-48"></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 bg-white border-t border-gray-100">
                <div className="max-w-4xl mx-auto relative flex items-center">
                    <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask a question about your documents..."
                        className="w-full bg-gray-50 border border-gray-300 rounded-full py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    />
                    <button 
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="absolute right-2 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};