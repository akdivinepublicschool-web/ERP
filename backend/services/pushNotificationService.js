const admin = require('firebase-admin');
const fs = require('fs');
const DeviceToken = require('../models/DeviceToken');

let initialized = false;

const initializeFirebase = () => {
  if (initialized || admin.apps.length) {
    initialized = true;
    return true;
  }

  try {
    let serviceAccount;
    const serviceAccountFile =
      process.env.FCM_SERVICE_ACCOUNT_FILE || '/etc/secrets/firebase-service-account.json';

    if (process.env.FCM_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON);
    } else if (fs.existsSync(serviceAccountFile)) {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountFile, 'utf8'));
    } else if (process.env.FCM_PROJECT_ID && process.env.FCM_CLIENT_EMAIL && process.env.FCM_PRIVATE_KEY) {
      serviceAccount = {
        projectId: process.env.FCM_PROJECT_ID,
        clientEmail: process.env.FCM_CLIENT_EMAIL,
        privateKey: process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    } else {
      return false;
    }

    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    initialized = true;
    return true;
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error.message);
    return false;
  }
};

const sendPushToUsers = async (userIds, notification, data = {}) => {
  if (!initializeFirebase()) {
    return { configured: false, sent: 0, failed: 0 };
  }

  const devices = await DeviceToken.find({ user: { $in: userIds } }).select('token user');
  if (!devices.length) return { configured: true, sent: 0, failed: 0 };

  const tokens = [...new Set(devices.map((device) => device.token))];
  const invalidTokens = new Set();
  let sent = 0;
  let failed = 0;

  for (let index = 0; index < tokens.length; index += 500) {
    const batch = tokens.slice(index, index + 500);
    const response = await admin.messaging().sendEachForMulticast({
      tokens: batch,
      notification: {
        title: notification.title,
        body: notification.message,
      },
      data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value ?? '')])),
      webpush: {
        notification: {
          title: notification.title,
          body: notification.message,
          icon: '/favicon.png',
          badge: '/favicon.png',
          data: { link: notification.link || '/dashboard' },
        },
        },
      android: {
        priority: 'high',
        notification: { channelId: 'school_notifications', sound: 'default' },
      },
    });

    sent += response.successCount;
    failed += response.failureCount;
    response.responses.forEach((result, responseIndex) => {
      if (!result.success && [
        'messaging/invalid-registration-token',
        'messaging/registration-token-not-registered',
      ].includes(result.error?.code)) {
        invalidTokens.add(batch[responseIndex]);
      }
    });
  }

  if (invalidTokens.size) {
    await DeviceToken.deleteMany({ token: { $in: [...invalidTokens] } });
  }

  return { configured: true, sent, failed, removedInvalidTokens: invalidTokens.size };
};

module.exports = { initializeFirebase, sendPushToUsers };
