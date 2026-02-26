import { useState, useEffect } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import type { ChatMessage } from './types'; 

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    
    // Defaulting to 0.50 ensures Gemini's valid matches are not blocked
    const [threshold, setThreshold] = useState<number>(0.50); 
    
    useEffect(() => {
        setSessionId(crypto.randomUUID());
    }, []);

    const handleClearChat = () => {
        setMessages([]);
    };

    const handleResetSession = async () => {
        try {
            await fetch('http://localhost:3000/api/session', {
                method: 'DELETE',
                headers: { 'x-session-id': sessionId }
            });
            setMessages([]);
            setSessionId(crypto.randomUUID());
        } catch (error) {
            console.error("Failed to reset session", error);
        }
    };

    // Inside your App.tsx file:
    if (!isAuthenticated) {
        return (
            <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
                <div className="flex h-screen items-center justify-center bg-gray-50">
                    <div className="bg-white p-8 rounded-lg shadow-lg text-center">
                        <h1 className="text-2xl font-bold mb-6 text-gray-800">Docu-Chat AI</h1>
                        <p className="text-gray-500 mb-8">Sign in to securely access your documents.</p>
                        <GoogleLogin onSuccess={() => setIsAuthenticated(true)} onError={() => console.log('Login Failed')} />
                    </div>
                </div>
            </GoogleOAuthProvider>
        );
    }

    return (
        <div className="flex h-screen bg-white font-sans overflow-hidden">
            <Sidebar 
                sessionId={sessionId}
                threshold={threshold}
                setThreshold={setThreshold}
                onClearChat={handleClearChat}
                onResetSession={handleResetSession}
                onLogout={() => setIsAuthenticated(false)}
            />
            <ChatArea 
                sessionId={sessionId}
                messages={messages}
                setMessages={setMessages}
                threshold={threshold}
            />
        </div>
    );
}