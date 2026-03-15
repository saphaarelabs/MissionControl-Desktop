import React, { useEffect, useState } from 'react';
import { AuthenticateWithRedirectCallback, useUser } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiAuthFetch } from '../lib/apiBase';
import { clearDesktopSearch, desktopRouteHref } from '../lib/desktop';

export default function SsoCallback() {
    const { isLoaded, isSignedIn, user } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const [isChecking, setIsChecking] = useState(false);
    const searchParams = new URLSearchParams(location.search);
    const shouldShowCallback = searchParams.get('oauth_complete') !== '1';

    useEffect(() => {
        const checkAndRedirect = async () => {
            if (shouldShowCallback) return;
            // Wait for Clerk to fully load and sign in the user
            if (!isLoaded || !isSignedIn || !user || isChecking) return;

            setIsChecking(true);
            console.log('[SsoCallback] User signed in, checking profile status...');

            // Small delay to ensure Clerk session is fully established
            await new Promise(resolve => setTimeout(resolve, 500));

            try {
                // Check if user profile exists in our database
                console.log('[SsoCallback] Fetching user profile from backend...');
                const res = await apiAuthFetch('/api/user/profile');
                
                if (res.ok) {
                    const { profile } = await res.json();
                    console.log('[SsoCallback] Profile data:', profile);
                    
                    // If no profile or profile has no operation_status, they're new -> onboarding
                    if (!profile || !profile.operation_status) {
                        console.log('[SsoCallback] New user detected (no profile or no operation_status), redirecting to /onboarding');
                        clearDesktopSearch();
                        navigate('/onboarding', { replace: true });
                        return;
                    }
                    
                    // If user has onboarding data but is still provisioning, go to provisioning page
                    if (profile.operation_status === 'provisioning' || profile.operation_status === 'onboarded') {
                        console.log('[SsoCallback] User is provisioning, redirecting to /provisioning');
                        clearDesktopSearch();
                        navigate('/provisioning', { replace: true });
                        return;
                    }
                    
                    // Existing user with ready status -> dashboard
                    console.log('[SsoCallback] Existing user with operation_status:', profile.operation_status, '-> redirecting to /app');
                    clearDesktopSearch();
                    navigate('/app', { replace: true });
                } else {
                    // If profile fetch fails, assume new user
                    console.log('[SsoCallback] Profile fetch failed with status:', res.status, '-> assuming new user');
                    clearDesktopSearch();
                    navigate('/onboarding', { replace: true });
                }
            } catch (err) {
                console.error('[SsoCallback] Error checking user profile:', err);
                // On error, go to onboarding to be safe
                clearDesktopSearch();
                navigate('/onboarding', { replace: true });
            }
        };

        checkAndRedirect();
    }, [isLoaded, isSignedIn, user, navigate, isChecking, shouldShowCallback]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex items-center justify-center px-6 py-12">
            <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-8 shadow-lg">
                <div className="text-lg font-bold">Signing you in…</div>
                <div className="mt-2 text-sm text-slate-600">Please wait while we complete Google authentication.</div>
                {shouldShowCallback && (
                    <AuthenticateWithRedirectCallback
                        signInUrl={desktopRouteHref('/sign-in')}
                        signUpUrl={desktopRouteHref('/sign-up')}
                        signInForceRedirectUrl={desktopRouteHref('/sso-callback?oauth_complete=1&intent=sign-in')}
                        signUpForceRedirectUrl={desktopRouteHref('/sso-callback?oauth_complete=1&intent=sign-up')}
                        continueSignUpUrl={desktopRouteHref('/sso-callback?oauth_complete=1&intent=sign-up')}
                    />
                )}
            </div>
        </div>
    );
}
