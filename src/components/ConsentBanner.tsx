import React, { useState, useEffect } from 'react';
import { ShieldCheck, X } from 'lucide-react';

interface ConsentBannerProps {
  onConsentChange?: (consented: boolean) => void;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({ onConsentChange }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('vanguard_cookie_consent');
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('vanguard_cookie_consent', 'accepted');
    setIsVisible(false);
    onConsentChange?.(true);
  };

  const handleDecline = () => {
    localStorage.setItem('vanguard_cookie_consent', 'essential_only');
    setIsVisible(false);
    onConsentChange?.(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-800 bg-slate-950/95 p-4 backdrop-blur-md text-xs text-slate-300">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed text-slate-300 max-w-3xl">
            Vanguard Opportunity Intelligence uses essential session storage and respects jurisdiction-specific privacy standards. When enabled, non-intrusive Google AdSense supports server operations. No personal application data is sold or tracked across third-party networks.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <button
            onClick={handleDecline}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            Essential Only
          </button>
          <button
            onClick={handleAccept}
            className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition-colors shadow-xs"
          >
            Accept Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
