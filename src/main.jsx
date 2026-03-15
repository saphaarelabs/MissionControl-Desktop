import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ClerkProvider } from '@clerk/clerk-react'
import { desktopRouteHref, isDesktopApp } from './lib/desktop'

// Import your publishable key
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

const clerkAppearance = {
  variables: {
    fontFamily: '"Satoshi", ui-sans-serif, system-ui, sans-serif',
  },
  elements: {
    footer: "hidden",
    footerAction: "hidden",
    footerActionLink: "hidden",
    cardFooter: "hidden",
    userButtonPopoverFooter: "hidden",
    userProfileFooter: "hidden",
    badge: "hidden",
    badgeText: "hidden",
    badgeIcon: "hidden",
    developmentModeBadge: "hidden"
  }
}

const installClerkBrandingHider = () => {
  if (typeof window === 'undefined') return;

  const shouldHideByText = (text) => {
    const t = String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return t === 'secured by' || t === 'secured by clerk' || t === 'development mode';
  };

  const hideClosest = (el) => {
    if (!(el instanceof Element)) return;
    const container = el.closest('[class*="cl-"]') || el.parentElement || el;
    container.style.setProperty('display', 'none', 'important');
  };

  const scan = (root) => {
    if (!(root instanceof Element)) return;

    // Hide Clerk branding links + their immediate wrappers.
    root.querySelectorAll('a[href*="clerk.com"], a[href*="clerk.dev"]').forEach((a) => hideClosest(a));

    // Hide the "Secured by" and "Development mode" labels even if they're not links.
    root.querySelectorAll('span, p, div, a').forEach((el) => {
      const txt = el.textContent;
      if (!txt) return;
      if (shouldHideByText(txt)) hideClosest(el);
    });
  };

  const run = () => scan(document.body);
  run();

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        scan(node);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
};

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key")
}

installClerkBrandingHider();

if (typeof document !== 'undefined') {
  document.documentElement.classList.toggle('desktop-shell', isDesktopApp)
  document.body.classList.toggle('desktop-shell', isDesktopApp)
  if (isDesktopApp) {
    document.documentElement.dataset.platform = window.missionControlDesktop?.platform || 'desktop'
  }
}

const signInUrl = desktopRouteHref('/sign-in')
const signUpUrl = desktopRouteHref('/sign-up')
const signInFallbackRedirectUrl = desktopRouteHref('/sso-callback?oauth_complete=1&intent=sign-in')
const signUpFallbackRedirectUrl = desktopRouteHref('/sso-callback?oauth_complete=1&intent=sign-up')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      signInUrl={signInUrl}
      signUpUrl={signUpUrl}
      signInFallbackRedirectUrl={signInFallbackRedirectUrl}
      signUpFallbackRedirectUrl={signUpFallbackRedirectUrl}
      afterSignOutUrl={desktopRouteHref('/')}
      appearance={clerkAppearance}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
