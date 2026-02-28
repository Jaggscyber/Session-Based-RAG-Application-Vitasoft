import React, { useRef, useState } from 'react';
import { ProgressBar } from './ProgressBar';
import type { ChatSession } from '../App';

interface SidebarProps {
    userName?: string;
    activeSessionId: string;
    sessions: ChatSession[];
    uploadedFiles: {name: string, chunks?: number}[];
    uploadStatus: 'idle' | 'processing' | 'success' | 'error';
    statusMessage: string;
    uploadFile: (file: File) => Promise<void>;
    threshold: number; setThreshold: (val: number) => void;
    chunkSize: number; setChunkSize: (val: number) => void;
    topK: number; setTopK: (val: number) => void;
    maxTokens: number; setMaxTokens: (val: number) => void;
    onRemoveFile: (fileName: string) => void;
    onLoadSession: (id: string) => void;
    onDeleteSession: (id: string, e: React.MouseEvent) => void;
    onNewChat: () => void;
    onLogout: () => void;
    isOpen: boolean;
    setIsOpen: (val: boolean) => void;
}

const timeAgo = (date: number) => {
    const seconds = Math.floor((Date.now() - date) / 1000);
    if (seconds < 60) return "Just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
};


export const Sidebar: React.FC<SidebarProps> = ({ 
    userName, activeSessionId, sessions, uploadedFiles, uploadStatus, statusMessage, uploadFile,
    threshold, setThreshold, chunkSize, setChunkSize, topK, setTopK, maxTokens, setMaxTokens,
    onRemoveFile, onLoadSession, onDeleteSession, onNewChat, onLogout, isOpen, setIsOpen
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-gray-900/50 z-40 md:hidden" onClick={() => setIsOpen(false)} />
            )}

            <div className={`fixed inset-y-0 left-0 z-50 w-[360px] bg-gray-50 border-r border-gray-200 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col h-full shadow-lg md:shadow-none`}>
                
                <div className="shrink-0 p-5 bg-white border-b border-gray-200 flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                            {userName ? userName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="truncate">
                            <h2 className="text-sm font-bold text-gray-800 truncate">{userName || 'User'}</h2>
                            <p className="text-xs text-gray-500">Document Chat AI</p>
                        </div>
                    </div>
                    <button onClick={onLogout} title="Logout" className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto min-h-0 p-5 custom-scrollbar space-y-6">
                    
                    <div className="space-y-3">
                        <button onClick={() => fileInputRef.current?.click()} className="w-full bg-blue-600 text-white hover:bg-blue-700 py-3 px-4 rounded-lg flex items-center justify-center transition-colors font-bold shadow-sm">
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                            Upload Document
                        </button>
                        <input type="file" ref={fileInputRef} accept=".pdf,.txt" className="hidden" onChange={(e) => { e.target.files && uploadFile(e.target.files[0]); e.target.value = ''; }} />
                        
                        <button onClick={onNewChat} className="w-full py-2.5 border-2 border-gray-200 text-gray-600 rounded-lg hover:border-gray-300 hover:bg-gray-100 transition-colors text-sm font-bold">
                            + Start New Session
                        </button>
                    </div>

                    {uploadStatus !== 'idle' && (
                        <div>
                            <ProgressBar status={uploadStatus} />
                            <p className={`text-xs font-semibold text-center mt-2 ${uploadStatus === 'error' ? 'text-red-600' : 'text-blue-600'}`}>{statusMessage}</p>
                        </div>
                    )}

                    {uploadedFiles.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Active Files</p>
                            <div className="space-y-2">
                                {uploadedFiles.map((file, idx) => (
                                    <div key={idx} className="space-y-1">
                                        
                                        <div 
                                            onClick={() => setSelectedFile(prev => prev === file.name ? null : file.name)}
                                            className={`flex justify-between items-center bg-white p-2.5 rounded-lg border text-sm shadow-sm hover:bg-gray-50 cursor-pointer transition-colors ${selectedFile === file.name ? 'border-blue-300' : 'border-gray-200'}`}
                                        >
                                            <span className="truncate text-gray-700 font-medium text-xs flex items-center">
                                                <svg className="w-4 h-4 mr-2 text-gray-400 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"></path></svg>
                                                {file.name}
                                            </span>
                                            
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onRemoveFile(file.name); }} 
                                                className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                            </button>
                                        </div>

                                        {selectedFile === file.name && (
                                            <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-3 text-xs text-blue-900 shadow-inner relative ml-2 mr-2">
                                                <div className="absolute -top-1.5 left-4 w-3 h-3 bg-blue-50/80 border-l border-t border-blue-100 transform rotate-45"></div>
                                                <div className="relative z-10 space-y-1.5">
                                                    <p className="flex justify-between items-center">
                                                        <span className="font-bold text-blue-800/70">Status:</span> 
                                                        <span className="text-green-600 font-bold flex items-center bg-green-100 px-2 py-0.5 rounded-full">
                                                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span> Success
                                                        </span>
                                                    </p>
                                                    <p className="flex justify-between items-center">
                                                        <span className="font-bold text-blue-800/70">Chunks Processed:</span> 
                                                        <span className="font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-100">{file.chunks || 0}</span>
                                                    </p>
                                                    <div className="pt-2 mt-2 border-t border-blue-200/50">
                                                        <p className="font-bold text-blue-800/70 mb-1">Session ID:</p>
                                                        <p className="font-mono text-[9px] break-all bg-white p-1.5 rounded text-gray-500 border border-blue-100 shadow-sm">{activeSessionId}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {sessions.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Recent Chats</p>
                            <div className="space-y-2">
                                {sessions.map(session => {
                                    const isActive = activeSessionId === session.sessionId;
                                    return (
                                        <button 
                                            key={session.sessionId} onClick={() => onLoadSession(session.sessionId)} 
                                            className={`w-full text-left p-3 rounded-lg text-sm border transition-all relative group overflow-hidden ${isActive ? 'bg-blue-50 border-blue-600 border-l-4 shadow-sm' : 'bg-white border-transparent hover:border-gray-200 shadow-sm'}`}
                                        >
                                            <div className="pr-6">
                                                <p className={`font-semibold truncate mb-1 ${isActive ? 'text-blue-900' : 'text-gray-700'}`}>{session.title}</p>
                                                <p className="text-[10px] text-gray-500 font-medium">{timeAgo(session.updatedAt)}</p>
                                            </div>
                                            
                                            <div 
                                                onClick={(e) => onDeleteSession(session.sessionId, e)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Delete Chat"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="shrink-0 bg-white border-t border-gray-200 p-5 z-20">
                    <details className="group">
                        <summary className="cursor-pointer text-xs font-bold text-gray-500 uppercase flex justify-between items-center hover:text-gray-800 transition-colors list-none">
                            <span>Advanced Settings</span>
                            <svg className="w-4 h-4 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                            </svg>
                        </summary>
                        <div className="mt-4 space-y-4">
                            <div>
                                <label className="text-xs text-gray-600 flex justify-between mb-1" htmlFor="threshold-slider">
                                    <span>Similarity Threshold</span> <span className="font-bold">{threshold}</span>
                                </label>
                                {/* Changed from accent-blue-600 to accent-red-600 */}
                                <input id="threshold-slider" aria-label="Similarity Threshold" type="range" min="0.3" max="0.99" step="0.01" value={threshold} onChange={(e) => setThreshold(parseFloat(e.target.value))} className="w-full accent-red-600" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 flex justify-between mb-1" htmlFor="chunk-slider">
                                    <span>Chunk Size (chars)</span> <span className="font-bold">{chunkSize}</span>
                                </label>
                                {/* Changed from accent-blue-600 to accent-red-600 */}
                                <input id="chunk-slider" aria-label="Chunk Size" type="range" min="500" max="2000" step="100" value={chunkSize} onChange={(e) => setChunkSize(parseInt(e.target.value))} className="w-full accent-red-600" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 flex justify-between mb-1" htmlFor="topk-slider">
                                    <span>Top K Sources</span> <span className="font-bold">{topK}</span>
                                </label>
                                {/* Changed from accent-blue-600 to accent-red-600 */}
                                <input id="topk-slider" aria-label="Top K Sources" type="range" min="1" max="6" step="1" value={topK} onChange={(e) => setTopK(parseInt(e.target.value))} className="w-full accent-red-600" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-600 flex justify-between mb-1" htmlFor="token-slider">
                                    <span>Max Output Tokens</span> <span className="font-bold">{maxTokens}</span>
                                </label>
                                {/* Changed from accent-blue-600 to accent-red-600 */}
                                <input id="token-slider" aria-label="Max Tokens" type="range" min="100" max="2000" step="100" value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value))} className="w-full accent-red-600" />
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </>
    );
};