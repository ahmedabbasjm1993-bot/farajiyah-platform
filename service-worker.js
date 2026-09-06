/* خدمة إشعارات منصة المدرسة - FCM Web Push */
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyBWPHnFrcC2NiRpHk8MB9ZEk_EghH-_Phc',
  authDomain: 'alfarajia2027-80fdd.firebaseapp.com',
  databaseURL: 'https://alfarajia2027-80fdd-default-rtdb.firebaseio.com',
  projectId: 'alfarajia2027-80fdd',
  storageBucket: 'alfarajia2027-80fdd.firebasestorage.app',
  messagingSenderId: '201311860084',
  appId: '1:201311860084:web:15b6fc29c0ed88ec7ca821'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const n = payload.notification || {};
  const d = payload.data || {};
  self.registration.showNotification(n.title || d.title || '🔔 منصة المدرسة', {
    body: n.body || d.body || 'لديك إشعار جديد من منصة المدرسة',
    icon: n.icon || d.icon || undefined,
    badge: n.badge || d.badge || undefined,
    tag: n.tag || d.tag || ('school-' + Date.now()),
    renotify: true,
    data: d
  });
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const list = await clients.matchAll({type:'window', includeUncontrolled:true});
    for (const client of list) {
      if ('focus' in client) { await client.focus(); return; }
    }
    if (clients.openWindow) await clients.openWindow('./');
  })());
});
