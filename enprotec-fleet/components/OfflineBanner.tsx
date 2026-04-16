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
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-sm font-medium text-center ${
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
