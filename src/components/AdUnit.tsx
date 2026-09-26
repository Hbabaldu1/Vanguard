import React, { useEffect, useRef } from 'react';
import { AdSensePublicConfig } from '../types/opportunity';

interface AdUnitProps {
  slotType: 'feed' | 'detail' | 'sidebar';
  config?: AdSensePublicConfig | null;
  className?: string;
}

/**
 * Reusable Google AdSense monetization component.
 * STRICT POLICIES:
 * - Only loads the official Google AdSense script if ADSENSE_ENABLED=true and a valid client ID is present.
 * - Never fabricates fake advertisement mocks or deceptive UI elements.
 * - Gracefully renders nothing if AdSense is disabled or unconfigured.
 * - Strictly prohibited in Admin Console, Login page, or around official application buttons.
 */
export const AdUnit: React.FC<AdUnitProps> = ({ slotType, config, className = '' }) => {
  const adRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  const isConfigured = Boolean(
    config?.enabled &&
    config?.clientId &&
    !config.clientId.includes('REPLACE') &&
    config.clientId.startsWith('ca-pub-')
  );

  const slotId = config?.slots?.[slotType] || '';

  useEffect(() => {
    if (!isConfigured || !config?.clientId) return;

    // Load Google AdSense library asynchronously if not already on the page
    const existingScript = document.querySelector('script[src*="pagead2.googlesyndication.com"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.clientId}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }

    // Trigger ad push safely without breaking layout
    if (adRef.current && !pushedRef.current && slotId) {
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        pushedRef.current = true;
      } catch (err) {
        // Suppress benign ad blocker or offline push exceptions
      }
    }
  }, [isConfigured, config?.clientId, slotId]);

  // If AdSense is not legitimately configured, render nothing (no fake mocks)
  if (!isConfigured || !slotId || !config?.clientId) {
    return null;
  }

  return (
    <aside
      aria-label="Advertisement"
      className={`w-full overflow-hidden rounded-xl border border-slate-800/80 bg-slate-900/30 p-3 my-4 text-center ${className}`}
    >
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 font-medium">
        Advertisement
      </div>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', minHeight: '90px' }}
        data-ad-client={config.clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
};
