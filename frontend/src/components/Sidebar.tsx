import React, { useState } from 'react';
import { ProgressBar } from './ProgressBar';
import type { RecentChat } from '../types';

interface SidebarProps {
    sessionId: string;
    threshold: number;
    setThreshold: (val: number) => void;
    onClearChat: () => void;
    onResetSession: () => void;
    onLogout: () => void;
}

// Defining a local type to track multiple files
interface UploadedFile {
    name: string;
    chunks: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
    sessionId, threshold, setThreshold, onClearChat, onResetSession, onLogout 
}) => {
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

    // Mock recent chats [cite: 58]
    const recentChats: RecentChat[] = [
        { id: '1', title: 'Q4 Financial Report' },
        { id: '2', title: 'Resume Analysis' }
    ];

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf' && file.type !== 'text/plain') {
            setUploadStatus('error');
            setStatusMessage('Invalid file. Only .pdf and .txt supported.');
            return;
        }

        setUploadStatus('processing');
        setStatusMessage(`Processing ${file.name}...`);

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
            setStatusMessage('Document added to session!');
            
            // Append the new file to our list
            setUploadedFiles(prev => [...prev, { name: file.name, chunks: data.chunksCreated }]);
            
        } catch (error) {
            setUploadStatus('error');
            setStatusMessage('Failed to upload document.');
        }
    };

    const handleRemoveFile = (fileNameToRemove: string) => {
        // Visually removes it from the frontend list
        setUploadedFiles(prev => prev.filter(f => f.name !== fileNameToRemove));
        // Note: For a true backend wipe, we would call a DELETE /api/file endpoint here
    };

    const handleFullReset = () => {
        setUploadedFiles([]);
        setUploadStatus('idle');
        onResetSession();
    };

    return (
        <div className="w-72 bg-gray-900 text-gray-100 flex flex-col h-full p-4">
            <h2 className="text-xl font-bold mb-6 text-white">Docu-Chat AI</h2>
            
            <div className="mb-6 relative">
                <input 
                    type="file" accept=".pdf,.txt" onChange={handleFileUpload} 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="Upload Document"
                />
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded flex items-center justify-center transition-colors">
                    <span className="mr-2">📄</span> Upload Document
                </button>
            </div>

            <ProgressBar status={uploadStatus} />
            
            {(uploadStatus !== 'idle') && (
                <div className={`p-3 rounded text-sm mb-4 border ${uploadStatus === 'error' ? 'bg-red-900/30 border-red-800' : 'bg-gray-800 border-gray-700'}`}>
                    <p className={`font-semibold ${uploadStatus === 'success' ? 'text-green-400' : uploadStatus === 'error' ? 'text-red-400' : 'text-blue-400'}`}>
                        {statusMessage}
                    </p>
                    <p className="truncate text-xs text-gray-500 mt-2">Session ID: {sessionId.slice(0,8)}...</p>
                </div>
            )}

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
                <div className="mb-6">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2 tracking-wider">Active Files</p>
                    <div className="space-y-2">
                        {uploadedFiles.map((file, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-gray-800 p-2 rounded text-sm border border-gray-700">
                                <span className="truncate w-3/4 text-gray-300">📄 {file.name}</span>
                                <button onClick={() => handleRemoveFile(file.name)} className="text-red-400 hover:text-red-300 text-xs px-2">
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Chat History Area */}
            <div className="flex-1 overflow-y-auto mt-2">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3 tracking-wider">Recent Chats</p>
                {recentChats.map(chat => (
                    <button key={chat.id} className="w-full text-left truncate py-2 px-3 rounded hover:bg-gray-800 transition-colors text-sm mb-1 text-gray-300">
                        💬 {chat.title}
                    </button>
                ))}
            </div>

            {/* Bottom Controls */}
            <div className="mt-4 pt-4 border-t border-gray-700 space-y-4">
                <div>
                    <label className="text-xs text-gray-400 block mb-2">Similarity Threshold: {threshold}</label>
                    <input 
                        type="range" min="0.5" max="0.99" step="0.01" value={threshold} 
                        onChange={(e) => setThreshold(parseFloat(e.target.value))}
                        className="w-full accent-blue-500"
                    />
                </div>
                
                <button onClick={onClearChat} className="w-full py-2 bg-gray-800 border border-gray-600 rounded hover:bg-gray-700 transition-colors text-sm">
                    Clear Chat (Keep Files)
                </button>
                <button onClick={handleFullReset} className="w-full py-2 border border-red-500 text-red-500 rounded hover:bg-red-500 hover:text-white transition-colors text-sm">
                    Reset Entire Session
                </button>
                <button onClick={onLogout} className="w-full py-2 text-gray-400 hover:text-white transition-colors text-sm text-left pl-2">
                    ← Logout
                </button>
            </div>
        </div>
    );
};