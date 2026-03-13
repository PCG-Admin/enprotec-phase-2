import * as React from 'react';
import { getSession } from '../supabase/services/auth.service';

const PHASE1_URL = import.meta.env.VITE_PHASE1_URL ?? 'http://localhost:3002';

interface OperationsPortalProps {
  onSwitchToFleet?: () => void;   // undefined = user doesn't have fleet access
  onLogout: () => void;
}

const OperationsPortal: React.FC<OperationsPortalProps> = ({ onSwitchToFleet, onLogout }) => {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);

  // Listen for messages from Phase 1 (logout, switch module)
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SWITCH_TO_FLEET' && onSwitchToFleet) onSwitchToFleet();
      if (event.data?.type === 'LOGOUT') onLogout();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSwitchToFleet, onLogout]);

  // After iframe loads, send the Supabase session via postMessage (no timing race)
  const handleIframeLoad = React.useCallback(async () => {
    const session = await getSession();
    if (session && iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        {
          type:          'ENPROTEC_SESSION',
          access_token:  session.access_token,
          refresh_token: session.refresh_token,
        },
        PHASE1_URL,
      );
    }
  }, []);

  return (
    <div className="flex flex-col h-screen">
      {/* Phase 1 iframe — full screen, Phase 1 has its own header */}
      <iframe
        ref={iframeRef}
        src={PHASE1_URL}
        className="flex-1 w-full border-0"
        title="Operations"
        allow="camera; microphone; geolocation"
        onLoad={handleIframeLoad}
      />
    </div>
  );
};

export default OperationsPortal;
