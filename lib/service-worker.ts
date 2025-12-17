export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          console.log('🤖 ServiceWorker registration successful:', registration.scope);
        })
        .catch((error) => {
          console.log('❌ ServiceWorker registration failed:', error);
        });
    });
  }
}

export function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      })
      .catch((error) => {
        console.error('❌ Failed to unregister service workers:', error);
      });
  }
}

export function clearServiceWorkerCache() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_CACHE'
    });
  }
}

export function isServiceWorkerSupported() {
  return 'serviceWorker' in navigator;
}