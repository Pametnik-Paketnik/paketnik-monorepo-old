// Firebase Messaging Service Worker
// This file is required for Firebase Cloud Messaging to work

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.9.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker
const firebaseConfig = {
  apiKey: "AIzaSyCMDlQpyKflmxYiGfk6UT4ZJphXGiIIjr0",
  authDomain: "pametnipaketnik-4b073.firebaseapp.com",
  projectId: "pametnipaketnik-4b073",
  storageBucket: "pametnipaketnik-4b073.firebasestorage.app",
  messagingSenderId: "721288801053",
  appId: "1:721288801053:web:873288403f28c1ce144ff4",
  measurementId: "G-WE1KPDQ2GJ"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('🔥 [firebase-messaging-sw.js] Received background message:', payload);

  // Customize notification here
  const notificationTitle = payload.notification?.title || payload.data?.title || 'Firebase Message';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new message',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.type || 'firebase-notification',
    data: payload.data,
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Open App'
      },
      {
        action: 'close',
        title: 'Close'
      }
    ]
  };

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click events
self.addEventListener('notificationclick', function(event) {
  console.log('🔥 [firebase-messaging-sw.js] Notification click received.');

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Handle the click by opening/focusing the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('firebase-token-tester') && 'focus' in client) {
          return client.focus();
        }
      }
      
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow('/test/firebase-token-tester.html');
      }
    })
  );
});

// Log that service worker is loaded
console.log('🔥 [firebase-messaging-sw.js] Service worker loaded successfully'); 