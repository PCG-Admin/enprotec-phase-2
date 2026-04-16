import React from 'react';

interface OfflineBannerProps {
  isOnline: boolean;
  pendingCount: number;
  syncing: boolean;
}

export default function OfflineBanner({ isOnline, pendingCount, syncing }: OfflineBannerProps) {
  if (isOnline && pendingCount === 0) return null;

  return (
    <div
      className={`w-full px-4 py-2 text-sm font-medium text-center flex-shrink-0 ${
        isOnline
          ? 'bg-sky-600 text-white'
          : 'bg-amber-500 text-zinc-900'
      }`}
    >
      {!isOnline && (
        <span>You are offline — inspections will be saved and synced when you reconnect.</span>
      )}
      {isOnline && pendingCount > 0 && !syncing && (
        <span>{pendingCount} inspection{pendingCount > 1 ? 's' : ''} waiting to sync…</span>
      )}
      {isOnline && syncing && (
        <span>Syncing pending inspections…</span>
      )}
    </div>
  );
}
