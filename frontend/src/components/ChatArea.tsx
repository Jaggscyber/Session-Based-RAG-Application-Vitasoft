import React, { useState, useRef } from 'react';
import type { ChatMessage, ApiResponse } from '../types';

interface ChatAreaProps {
    sessionId: string;
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    uploadedFiles: {name: string, chunks?: number}[];
    uploadFile: (file: File) => Promise<void>;
    threshold: number;
    topK: number; 
    onOpenSidebar: () => void;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ sessionId, messages, setMessages, uploadedFiles, uploadFile, threshold, topK, onOpenSidebar }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const hasFiles = uploadedFiles.length > 0;

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            uploadFile(e.dataTransfer.files[0]);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading || !hasFiles) return;

        const newUserMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: input };
        setMessages(prev => [...prev, newUserMsg]);
        setInput('');
        setIsLoading(true);

        try {
            const res = await fetch(`${API_URL}/api/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-session-id': sessionId },
                body: JSON.stringify({ question: input, threshold, topK }) 
            });
            const data = await res.json() as ApiResponse;

            if (!res.ok || data.error) {
                const errorMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: data.error || 'Server error' };
                setMessages(prev => [...prev, errorMsg]);
                setIsLoading(false);
                return;
            }

            const sources = data.sources ? data.sources.map((src, idx) => ({ text: src, score: data.scores[idx] })) : [];
            const newAiMsg: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: data.answer, sources };
            setMessages(prev => [...prev, newAiMsg]);
        } catch (error) {
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: "Server connection failed." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-white relative">
            
            <div className="md:hidden flex items-center p-4 border-b border-gray-200 bg-white">
                <button onClick={onOpenSidebar} className="p-2 mr-3 text-gray-600 hover:bg-gray-100 rounded-md">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                </button>
                <h1 className="text-lg font-bold text-blue-600">Document-Chat AI</h1>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                {messages.length === 0 ? (
                    hasFiles ? (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500 animate-fade-in">
                            <div className="bg-green-100 p-4 rounded-full mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">Documents Ready</h3>
                            <p className="max-w-md text-sm">Your files have been successfully processed and embedded. Ask a question below to search through them.</p>
                        </div>
                    ) : (
                        <div 
                            onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                            className={`h-full flex flex-col items-center justify-center p-8 text-center transition-colors ${isDragging ? 'bg-blue-50 border-blue-400' : 'bg-white border-gray-200'} border-2 border-dashed rounded-2xl m-4`}
                        >
                            <div className="bg-blue-100 p-4 rounded-full mb-4">
                                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-800 mb-2">Upload a Document to Begin</h3>
                            <p className="text-gray-500 max-w-md mb-6">Drag and drop your PDF or TXT files here, and start asking questions instantly.</p>
                            <button onClick={() => fileInputRef.current?.click()} className="bg-white border-2 border-gray-300 text-gray-700 font-bold py-2.5 px-6 rounded-lg hover:border-gray-400 hover:bg-gray-50 transition-colors">
                                Or browse files
                            </button>
                            <input type="file" ref={fileInputRef} accept=".pdf,.txt" className="hidden" onChange={(e) => { e.target.files && uploadFile(e.target.files[0]); e.target.value = ''; }} />
                        </div>
                    )
                ) : (
                    messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-3xl rounded-2xl p-5 ${msg.role === 'user' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 text-gray-800 border border-gray-200 shadow-sm'}`}>
                                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                
                                {msg.sources && msg.sources.length > 0 && (
                                    <div className="mt-4">
                                        <details className="group">
                                            <summary className="flex items-center cursor-pointer text-xs font-bold text-blue-600 uppercase tracking-wide bg-blue-100 p-2 rounded hover:bg-blue-200 transition-colors list-none">
                                                <svg className="w-4 h-4 mr-2 transform group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                                                View {msg.sources.length} Retrieved Sources
                                            </summary>
                                            <div className="mt-3 space-y-2 pl-2 border-l-2 border-blue-200">
                                                {msg.sources.map((src, idx) => (
                                                    <div key={idx} className="bg-white p-3 rounded border border-gray-100 shadow-sm text-sm">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="inline-block bg-green-100 text-green-800 text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wider">Similarity: {(src.score * 100).toFixed(1)}%</span>
                                                        </div>
                                                        <p className="text-gray-600 text-xs leading-relaxed italic">"{src.text}"</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </details>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 animate-pulse flex space-x-2">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 md:p-6 bg-white border-t border-gray-100">
                <div className="max-w-4xl mx-auto relative flex items-center group">
                    <input 
                        type="text" value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        disabled={!hasFiles}
                        placeholder={hasFiles ? "Ask a question about your documents..." : "Upload a document first to ask questions"}
                        className="w-full bg-gray-50 border border-gray-300 rounded-full py-4 pl-6 pr-16 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
                    />
                    <button 
                        onClick={handleSend} disabled={!input.trim() || isLoading || !hasFiles}
                        className="absolute right-2 bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:bg-gray-300 disabled:opacity-50 transition-colors shadow-sm flex items-center justify-center"
                    >
                        <svg className="w-5 h-5 ml-1 transform rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};