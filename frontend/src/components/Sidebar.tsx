import React, { useState } from 'react';

interface SidebarProps {
    sessionId: string;
    threshold: number;
    setThreshold: (val: number) => void;
    onClearChat: () => void;
    onResetSession: () => void;
    onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    sessionId, threshold, setThreshold, onClearChat, onResetSession, onLogout 
}) => {
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [uploadData, setUploadData] = useState<{chunks: number} | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Strict Frontend Validation
        if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
            setUploadStatus('error');
            setStatusMessage('Invalid file. Only .pdf and .txt supported.');
            return;
        }

        setUploadStatus('processing');
        setStatusMessage('Reading and chunking document...');

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('http://localhost:3000/api/upload', {
                method: 'POST',
                headers: { 'x-session-id': sessionId },
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            
            setUploadStatus('success');
            setStatusMessage('Document successfully processed!');
            setUploadData({ chunks: data.chunksCreated });
            
        } catch (error) {
            setUploadStatus('error');
            setStatusMessage('Failed to upload document.');
        }
    };

    return (
        <div className="w-72 bg-gray-900 text-gray-100 flex flex-col h-full p-4">
            <h2 className="text-xl font-bold mb-6 text-white">Docu-Chat AI</h2>
            
            <div className="mb-6 relative">
                <input 
                    type="file" 
                    accept=".pdf,.txt" 
                    onChange={handleFileUpload} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="Upload Document"
                />
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center justify-center transition-colors">
                    <span className="mr-2">📄</span> Upload Document
                </button>
            </div>

            {/* Improved Progress & Status UI */}
            {uploadStatus === 'processing' && (
                <div className="w-full bg-gray-700 rounded-full h-2 mb-4 overflow-hidden">
                    <div className="bg-blue-500 h-2 rounded-full animate-pulse w-full"></div>
                </div>
            )}
            
            {(uploadStatus !== 'idle') && (
                <div className={`p-3 rounded text-sm mb-6 border ${uploadStatus === 'error' ? 'bg-red-900/30 border-red-800' : 'bg-gray-800 border-gray-700'}`}>
                    <p className={`font-semibold ${uploadStatus === 'success' ? 'text-green-400' : uploadStatus === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                        {statusMessage}
                    </p>
                    {uploadStatus === 'success' && uploadData && (
                        <p className="text-gray-300 mt-1">Chunks Appended: {uploadData.chunks}</p>
                    )}
                    <p className="truncate text-xs text-gray-500 mt-2">Session: {sessionId.slice(0,8)}...</p>
                </div>
            )}

            <div className="flex-1"></div> {/* Spacer */}

            {/* Bottom Controls */}
            <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                <div>
                    <label className="text-xs text-gray-400 block mb-2">Similarity Threshold: {threshold}</label>
                    <input 
                        type="range" min="0.5" max="0.99" step="0.01" 
                        value={threshold} 
                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        className="w-full accent-blue-500"
                    />
                </div>
                
                <button onClick={onClearChat} className="w-full py-2 bg-gray-800 border border-gray-600 rounded hover:bg-gray-700 transition-colors text-sm">
                    Clear Chat (Keep Files)
                </button>
                <button onClick={onResetSession} className="w-full py-2 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors text-sm">
                    Reset Entire Session
                </button>
                <button onClick={onLogout} className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm text-left pl-2">
                    ← Logout
                </button>
            </div>
        </div>
    );
};