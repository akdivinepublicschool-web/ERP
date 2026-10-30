import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, Loader2, Smartphone } from 'lucide-react';
import api from '../services/api';
import { enablePushNotifications, isPushSupported } from '../services/firebase';

export default function EnablePushNotifications() {
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');

  const registerThisDevice = async () => {
    if (!(await isPushSupported())) {
      throw new Error('Push notifications are unavailable. Check the Firebase web configuration and use Chrome on HTTPS.');
    }
    const token = await enablePushNotifications();
    await api.post('/notifications/devices', { token, platform: 'web' });
    window.dispatchEvent(new Event('push-permission-enabled'));
  };

  useEffect(() => {
    let cancelled = false;

    const refreshExistingPermission = async () => {
      if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return;
      setState('loading');
      try {
        await registerThisDevice();
        if (!cancelled) {
          setState('enabled');
          setMessage('This phone is registered for school notifications.');
        }
      } catch (error) {
        if (!cancelled) {
          setState('idle');
          setMessage(error.response?.data?.message || error.message || 'Unable to verify this phone registration.');
        }
      }
    };

    refreshExistingPermission();
    return () => { cancelled = true; };
  }, []);

  const handleEnable = async () => {
    setState('loading');
    setMessage('');
    try {
      await registerThisDevice();
      setState('enabled');
      setMessage('This phone is registered for school notifications.');
    } catch (error) {
      setState('error');
      const permissionDenied = typeof Notification !== 'undefined' && Notification.permission === 'denied';
      setMessage(permissionDenied
        ? 'Notifications are blocked in Chrome. Open Chrome Settings > Site settings > Notifications and allow this website.'
        : error.response?.data?.message || error.message || 'Unable to enable phone notifications.');
    }
  };

  if (state === 'enabled') {
    return (
      <div className="px-4 py-3 border-t border-slate-100">
        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-2">
          <CheckCircle2 size={15} /> Phone notifications enabled
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">This phone is registered for school notifications.</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 border-t border-slate-100">
      <button
        type="button"
        onClick={handleEnable}
        disabled={state === 'loading'}
        className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white px-3 py-2.5 text-xs font-bold transition-colors"
      >
        {state === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
        {state === 'loading' ? 'Registering this phone...' : 'Enable phone notifications'}
      </button>
      {message && <p className="mt-2 text-[11px] leading-relaxed text-rose-600">{message}</p>}
      <p className="mt-2 text-[10px] text-slate-400 flex items-start gap-1.5">
        <Smartphone size={12} className="mt-0.5 shrink-0" />
        Allow notifications when Chrome asks. Keep site notifications enabled in Android settings.
      </p>
    </div>
  );
}
