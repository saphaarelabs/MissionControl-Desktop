import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiUrl } from '../lib/apiBase';
import { isDesktopApp, openExternal } from '../lib/desktop';

export default function OAuthCallback() {
    const navigate = useNavigate();
    const location = useLocation();
    const [status, setStatus] = useState('Processing OAuth callback...');

    useEffect(() => {
        // The backend OAuth callback endpoint will redirect back to settings
        // This component handles the case where users land on /oauth/callback directly
        const urlParams = new URLSearchParams(location.search);
        const error = urlParams.get('error');
        const code = urlParams.get('code');
        const state = urlParams.get('state');

        if (error) {
            setStatus(`OAuth Error: ${error}`);
            setTimeout(() => {
                navigate('/app/settings?oauth_error=' + encodeURIComponent(error));
            }, 2000);
        } else if (code && state) {
            setStatus('Completing authentication...');
            // Redirect to backend callback endpoint for processing
            const callbackUrl = apiUrl(`/api/providers/oauth/callback${location.search}`);
            if (isDesktopApp) {
                openExternal(callbackUrl);
                setStatus('OAuth callback opened in your browser. The provider will complete there.');
                return;
            }
            window.location.href = callbackUrl;
        } else {
            setStatus('Invalid callback parameters');
            setTimeout(() => {
                navigate('/app/settings?oauth_error=' + encodeURIComponent('Invalid callback parameters'));
            }, 2000);
        }
    }, [location.search, navigate]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-8 shadow-lg text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <div className="text-lg font-bold mb-2">OAuth Authentication</div>
                <div className="text-sm text-slate-600">{status}</div>
            </div>
        </div>
    );
}
