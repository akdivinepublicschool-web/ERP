/* Firebase Cloud Messaging service worker. Public Firebase config is passed as query parameters by the app. */
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

const config = new URLSearchParams(self.location.search);
const firebaseConfig = {
  apiKey: config.get('apiKey'),
  authDomain: config.get('authDomain'),
  projectId: config.get('projectId'),
  storageBucket: config.get('storageBucket'),
  messagingSenderId: config.get('messagingSenderId'),
  appId: config.get('appId'),
};

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const title = payload.notification?.title || 'AK Divine Public School';
    const options = {
      body: payload.notification?.body || 'You have a new school notification.',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      data: payload.data || payload.notification?.data || { link: '/dashboard' },
      tag: payload.data?.notificationId || 'ak-divine-notification',
      renotify: false,
    };
    self.registration.showNotification(title, options);
  });
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.link || '/dashboard';
  const safeTarget = target.startsWith('/') && !target.startsWith('//') ? target : '/dashboard';
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(safeTarget);
        return;
      }
    }
    if (clients.openWindow) await clients.openWindow(safeTarget);
  })());
});
