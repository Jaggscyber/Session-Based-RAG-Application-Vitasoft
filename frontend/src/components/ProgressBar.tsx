import React from 'react';

interface ProgressBarProps {
    status: 'idle' | 'processing' | 'success' | 'error';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ status }) => {
    if (status === 'idle') return null;

    if (status === 'processing') {
        return (
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4 overflow-hidden">
                <div className="bg-blue-500 h-2 rounded-full animate-pulse w-full"></div>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4 overflow-hidden">
                <div className="bg-green-500 h-2 rounded-full w-full"></div>
            </div>
        );
    }

    return (
        <div className="w-full bg-gray-700 rounded-full h-2 mb-4 overflow-hidden">
            <div className="bg-red-500 h-2 rounded-full w-full"></div>
        </div>
    );
};