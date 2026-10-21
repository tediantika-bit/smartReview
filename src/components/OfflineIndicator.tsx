import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-medium text-white shadow-xl animate-bounce">
      <WifiOff className="w-4 h-4 flex-shrink-0" />
      <span>Mode Offline — Anda sedang tidak terhubung ke internet.</span>
    </div>
  );
};
