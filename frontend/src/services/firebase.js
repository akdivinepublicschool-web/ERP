import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId);
const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export const isPushSupported = async () => {
  if (!hasFirebaseConfig || !vapidKey || typeof window === 'undefined') return false;
  try {
    return 'Notification' in window && 'serviceWorker' in navigator && await isSupported();
  } catch {
    return false;
  }
};

const getFirebaseApp = () => getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const listenForForegroundMessages = (callback) => {
  if (!hasFirebaseConfig) return () => {};
  const messaging = getMessaging(getFirebaseApp());
  return onMessage(messaging, callback);
};

export const enablePushNotifications = async () => {
  if (!(await isPushSupported())) {
    throw new Error('Push notifications are not configured or are not supported by this browser.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted. Please allow notifications in browser settings.');
  }

  const configQuery = new URLSearchParams(firebaseConfig).toString();
  const registration = await navigator.serviceWorker.register(
    `/firebase-messaging-sw.js?${configQuery}`,
    { scope: '/' }
  );

  const messaging = getMessaging(getFirebaseApp());
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

  if (!token) throw new Error('Firebase could not generate a device token. Please try again.');

  return token;
};
