import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import type { ChatMessage } from './types'; 

interface GoogleJwtPayload {
    name: string;
    email: string;
    sub: string;
}

export interface ChatSession {
    sessionId: string;
    title: string;
    updatedAt: number;
    messages: ChatMessage[];
    chunks: number;
    files: {name: string, chunks: number}[];
}

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [userProfile, setUserProfile] = useState<{name: string, email: string} | null>(null);
    
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string>('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [chunksCreated, setChunksCreated] = useState<number>(0);
    const [uploadedFiles, setUploadedFiles] = useState<{name: string, chunks: number}[]>([]);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = useState('');

    // Configurable Settings (Added maxTokens for Bonus)
    const [threshold, setThreshold] = useState<number>(0.50); 
    const [chunkSize, setChunkSize] = useState<number>(1000);
    const [topK, setTopK] = useState<number>(3);
    const [maxTokens, setMaxTokens] = useState<number>(500);
    
    useEffect(() => {
        const savedUser = localStorage.getItem('userProfile');
        const savedSessions = localStorage.getItem('docuChatSessions');

        if (savedUser) {
            setUserProfile(JSON.parse(savedUser));
            setIsAuthenticated(true);
        }
        if (savedSessions) setSessions(JSON.parse(savedSessions));
        setActiveSessionId(crypto.randomUUID());
    }, []);

    useEffect(() => {
        if (!activeSessionId) return;
        if (messages.length === 0 && chunksCreated === 0) return; 

        setSessions(prev => {
            const existingIdx = prev.findIndex(s => s.sessionId === activeSessionId);
            const existingSession = existingIdx >= 0 ? prev[existingIdx] : null;
            const contentChanged = !existingSession || existingSession.messages.length !== messages.length || existingSession.chunks !== chunksCreated;
            const sessionTitle = uploadedFiles.length > 0 ? uploadedFiles[0].name : "New Document Chat";

            const updatedSession: ChatSession = {
                sessionId: activeSessionId,
                title: sessionTitle,
                updatedAt: contentChanged ? Date.now() : (existingSession ? existingSession.updatedAt : Date.now()),
                messages, chunks: chunksCreated, files: uploadedFiles
            };

            let newSessions = [...prev];
            if (existingIdx >= 0) newSessions[existingIdx] = updatedSession;
            else newSessions.unshift(updatedSession);
            
            newSessions.sort((a, b) => b.updatedAt - a.updatedAt);
            newSessions = newSessions.slice(0, 5);
            localStorage.setItem('docuChatSessions', JSON.stringify(newSessions));
            return newSessions;
        });
    }, [messages, chunksCreated, uploadedFiles, activeSessionId]);

    const handleLoginSuccess = (credentialResponse: CredentialResponse) => {
        if (credentialResponse.credential) {
            const decoded = jwtDecode<GoogleJwtPayload>(credentialResponse.credential);
            const profile = { name: decoded.name, email: decoded.email };
            setUserProfile(profile);
            localStorage.setItem('userProfile', JSON.stringify(profile));
            setIsAuthenticated(true);
        }
    };

    const uploadFile = async (file: File) => {
        setUploadStatus('processing');
        setStatusMessage(`Processing ${file.name}...`);
        try {
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            const formData = new FormData();
            formData.append('file', file);
            formData.append('chunkSize', chunkSize.toString()); 

            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                headers: { 'x-session-id': activeSessionId },
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');
            const data = await res.json();
            
            setUploadStatus('success');
            setStatusMessage('Upload Success!');
            
            setUploadedFiles(prev => {
                const filtered = prev.filter(f => f.name !== file.name);
                return [...filtered, { name: file.name, chunks: data.chunksCreated }];
            });
            setChunksCreated(prev => prev + data.chunksCreated);
            
            setTimeout(() => setUploadStatus('idle'), 3000);
        } catch (error) {
            setUploadStatus('error');
            setStatusMessage('Failed to upload document.');
            setTimeout(() => setUploadStatus('idle'), 5000);
        }
    };

    const handleLoadSession = (id: string) => {
        const sess = sessions.find(s => s.sessionId === id);
        if (sess) {
            setActiveSessionId(sess.sessionId);
            setMessages(sess.messages);
            setChunksCreated(sess.chunks);
            setUploadedFiles(sess.files);
            setIsSidebarOpen(false);
        }
    };

    // FEATURE: User Control to Delete specific chats
    const handleDeleteSession = (idToDelete: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents loading the chat when you just want to delete it
        setSessions(prev => {
            const updated = prev.filter(s => s.sessionId !== idToDelete);
            localStorage.setItem('docuChatSessions', JSON.stringify(updated));
            return updated;
        });
        if (activeSessionId === idToDelete) {
            handleNewChat();
        }
    };

    const handleNewChat = () => {
        setActiveSessionId(crypto.randomUUID());
        setMessages([]); setChunksCreated(0); setUploadedFiles([]);
        setIsSidebarOpen(false);
    };

    const handleLogout = () => {
        setIsAuthenticated(false); setUserProfile(null);
        localStorage.removeItem('userProfile');
    };

    if (!isAuthenticated) {
        return (
            <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
                <div className="flex h-screen items-center justify-center bg-gray-50">
                    <div className="bg-white p-10 rounded-xl shadow-xl text-center border border-gray-100 max-w-md w-full">
                        <h1 className="text-3xl font-bold mb-2 text-blue-600">Document Chat AI</h1>
                        <p className="text-gray-500 mb-8">Secure document intelligence.</p>
                        <div className="flex justify-center">
                            <GoogleLogin onSuccess={handleLoginSuccess} />
                        </div>
                    </div>
                </div>
            </GoogleOAuthProvider>
        );
    }

    return (
        <div className="flex h-screen bg-white font-sans overflow-hidden text-gray-800">
            <Sidebar 
                userName={userProfile?.name}
                activeSessionId={activeSessionId}
                sessions={sessions} uploadedFiles={uploadedFiles}
                uploadStatus={uploadStatus} statusMessage={statusMessage}
                uploadFile={uploadFile}
                threshold={threshold} setThreshold={setThreshold}
                chunkSize={chunkSize} setChunkSize={setChunkSize}
                topK={topK} setTopK={setTopK}
                maxTokens={maxTokens} setMaxTokens={setMaxTokens} // Passed new prop
                onRemoveFile={async (name) => {
                    try {
                        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                        await fetch(`${API_URL}/api/session/${encodeURIComponent(name)}`, {
                            method: 'DELETE', headers: { 'x-session-id': activeSessionId }
                        });
                        setUploadedFiles(prev => prev.filter(f => f.name !== name));
                    } catch (e) { console.error("Failed to delete file"); }
                }}
                onLoadSession={handleLoadSession}
                onDeleteSession={handleDeleteSession} // Passed new prop
                onNewChat={handleNewChat}
                onLogout={handleLogout}
                isOpen={isSidebarOpen}
                setIsOpen={setIsSidebarOpen}
            />
            <ChatArea 
                sessionId={activeSessionId}
                messages={messages} setMessages={setMessages}
                uploadedFiles={uploadedFiles} uploadFile={uploadFile}
                threshold={threshold} topK={topK} maxTokens={maxTokens} // Passed new prop
                onOpenSidebar={() => setIsSidebarOpen(true)}
            />
        </div>
    );
}