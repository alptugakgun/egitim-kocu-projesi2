self.addEventListener('install', (e) => {
    console.log('[Service Worker] Uygulama telefona kuruldu! 📱');
});
self.addEventListener('fetch', (e) => {
    // Bulut tabanlı çalıştığımız için istekleri doğrudan internete yönlendiriyoruz
});