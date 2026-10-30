import React, { useState } from 'react';
import { BellRing, Send, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '../../services/api';

const initialForm = { title: '', message: '', audience: 'all', type: 'info', link: '' };

export default function NotificationCenter() {
  const [form, setForm] = useState(initialForm);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setResult(null);
    setError('');
    try {
      const response = await api.post('/notifications/broadcast', form);
      setResult(response.data.data);
      setForm(initialForm);
    } catch (err) {
      setError(err.response?.data?.message || 'Notification send nahi ho saka.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="rounded-3xl bg-gradient-to-br from-slate-950 via-[#123b60] to-[#f28a24] p-6 sm:p-8 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-3"><span className="rounded-2xl bg-white/15 p-3"><BellRing size={24} /></span><span className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">School Communication</span></div>
        <h2 className="text-2xl sm:text-3xl font-black">Notification Center</h2>
        <p className="mt-2 max-w-2xl text-sm text-white/80">Teachers aur staff ke registered phones par important school updates bhejein. Notification ERP inbox mein bhi save hoga.</p>
      </div>

      <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">Notification title
            <input name="title" value={form.title} onChange={update} maxLength={120} required placeholder="e.g. School Holiday Tomorrow" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
          </label>
          <label className="block text-sm font-semibold text-slate-700">Send to
            <select name="audience" value={form.audience} onChange={update} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400">
              <option value="all">All admins + teachers</option><option value="teachers">Teachers only</option><option value="admins">Admins only</option>
            </select>
          </label>
        </div>
        <label className="block text-sm font-semibold text-slate-700">Message
          <textarea name="message" value={form.message} onChange={update} maxLength={1500} rows={5} required placeholder="Write the full announcement..." className="mt-2 w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100" />
          <span className="mt-1 block text-right text-xs text-slate-400">{form.message.length}/1500</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-slate-700">Notification category
            <select name="type" value={form.type} onChange={update} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400">
              <option value="info">General information</option><option value="warning">Important / Holiday</option><option value="success">Good news</option><option value="error">Urgent alert</option>
            </select>
          </label>
          <label className="block text-sm font-semibold text-slate-700">Open this ERP page (optional)
            <input name="link" value={form.link} onChange={update} placeholder="/admin/holidays" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" />
          </label>
        </div>
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 flex items-center gap-2"><AlertCircle size={16} />{error}</p>}
        {result && <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 space-y-1"><p className="font-bold flex items-center gap-2"><CheckCircle2 size={16} />Notification published</p><p>{result.recipientCount} users ke ERP inbox mein save hua.</p><p>Phone push: {result.push?.configured ? `${result.push.sent} delivered, ${result.push.failed} failed` : 'Firebase server credentials pending; inbox delivery is active.'}</p></div>}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500 flex items-center gap-2"><Users size={15} /> Sirf active user accounts ko notification jayega.</p>
          <button type="submit" disabled={sending} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-md shadow-orange-200 hover:bg-orange-600 disabled:opacity-60"><Send size={16} />{sending ? 'Publishing...' : 'Publish notification'}</button>
        </div>
      </form>
    </div>
  );
}
