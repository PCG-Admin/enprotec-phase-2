import { registerSW as viteRegisterSW } from 'virtual:pwa-register';

export function registerSW() {
  const updateSW = viteRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Check for updates every 30 minutes
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);
      }
    },
    onOfflineReady() {
      console.log('[PWA] App ready for offline use');
    },
  });

  return updateSW;
}
