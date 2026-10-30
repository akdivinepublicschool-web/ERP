import React, { useEffect, useState } from 'react';
import { BellRing, CheckCircle2, Loader2, Smartphone, Send } from 'lucide-react';
import api from '../services/api';
import { enablePushNotifications, isPushSupported } from '../services/firebase';

export default function EnablePushNotifications() {
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');
  const [testState, setTestState] = useState('idle');

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

  const handleTest = async () => {
    setTestState('loading');
    setMessage('');
    try {
      const response = await api.post('/notifications/test');
      setTestState('success');
      setMessage(response.data?.message || 'Test notification sent. Check your phone notification shade.');
    } catch (error) {
      setTestState('error');
      setMessage(error.response?.data?.message || error.message || 'Test notification could not be sent.');
    }
  };

  if (state === 'enabled') {
    return (
      <div className="px-4 py-3 border-t border-slate-100 space-y-2">
        <p className="text-xs font-semibold text-emerald-700 flex items-center gap-2">
          <CheckCircle2 size={15} /> Phone notifications enabled
        </p>
        <button
          type="button"
          onClick={handleTest}
          disabled={testState === 'loading'}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 hover:bg-orange-100 disabled:opacity-60 text-orange-700 px-3 py-2.5 text-xs font-bold transition-colors"
        >
          {testState === 'loading' ? <Loader2 size={15} className="animate-spin" /> : <Send size={14} />}
          {testState === 'loading' ? 'Sending test...' : 'Send test notification'}
        </button>
        {message && <p className={`text-[11px] leading-relaxed ${testState === 'error' ? 'text-rose-600' : 'text-slate-500'}`}>{message}</p>}
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
