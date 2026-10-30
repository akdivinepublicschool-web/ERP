import React, { useState } from 'react';
import { BellRing, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../services/api';
import { enablePushNotifications, isPushSupported } from '../services/firebase';

export default function EnablePushNotifications() {
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');

  const handleEnable = async () => {
    setState('loading');
    setMessage('');
    try {
      if (!(await isPushSupported())) {
        throw new Error('Is browser mein push support available nahi hai ya Firebase configuration pending hai.');
      }
      const token = await enablePushNotifications();
      await api.post('/notifications/devices', { token, platform: 'web' });
      setState('enabled');
      setMessage('Is device par school notifications enabled hain.');
    } catch (error) {
      setState('error');
      setMessage(error.response?.data?.message || error.message || 'Notifications enable nahi ho paye.');
    }
  };

  if (state === 'enabled') {
    return <p className="px-4 py-2 text-xs font-semibold text-emerald-700 flex items-center gap-2"><CheckCircle2 size={15} />{message}</p>;
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
        {state === 'loading' ? 'Enabling...' : 'Enable phone notifications'}
      </button>
      {message && <p className="mt-2 text-[11px] text-rose-600">{message}</p>}
    </div>
  );
}
