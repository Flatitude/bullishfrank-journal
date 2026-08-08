'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';

interface Trade {
  id: string;
  pair: string;
  type: 'BUY' | 'SELL';
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  pnl: number;
  rr: number;
  session: 'Asian' | 'London' | 'New York' | 'Overlap';
  status: 'WIN' | 'LOSS' | 'BREAKEVEN';
  date: string; // YYYY-MM-DD
  notes?: string;
  created_at?: string;
}

export default function Dashboard() {
  // Account State
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [isEditingBalance, setIsEditingBalance] = useState<boolean>(false);

  // Trades & Loading State
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingTradeId, setEditingTradeId] = useState<string | null>(null);

  // Calendar State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Form State
  const [formData, setFormData] = useState({
    pair: 'EURUSD',
    type: 'BUY' as 'BUY' | 'SELL',
    entry_price: '',
    stop_loss: '',
    take_profit: '',
    pnl: '',
    session: 'London' as 'Asian' | 'London' | 'New York' | 'Overlap',
    status: 'WIN' as 'WIN' | 'LOSS' | 'BREAKEVEN',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Fetch Trades from Supabase
  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching trades:', error.message);
    } else if (data) {
      setTrades(data as Trade[]);
    }
    setLoading(false);
  };

  // Auto Risk:Reward Calculation
  const computedRR = useMemo(() => {
    const entry = parseFloat(formData.entry_price);
    const sl = parseFloat(formData.stop_loss);
    const tp = parseFloat(formData.take_profit);

    if (!entry || !sl || !tp || entry === sl) return 0;

    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    return parseFloat((reward / risk).toFixed(2));
  }, [formData.entry_price, formData.stop_loss, formData.take_profit]);

  // Handle Create / Update Trade
  const handleSubmitTrade = async (e: React.FormEvent) => {
    e.preventDefault();

    const tradePayload = {
      pair: formData.pair.toUpperCase(),
      type: formData.type,
      entry_price: parseFloat(formData.entry_price) || 0,
      stop_loss: parseFloat(formData.stop_loss) || 0,
      take_profit: parseFloat(formData.take_profit) || 0,
      pnl: parseFloat(formData.pnl) || 0,
      rr: computedRR,
      session: formData.session,
      status: formData.status,
      date: formData.date,
      notes: formData.notes,
    };

    if (editingTradeId) {
      // Update
      const { error } = await supabase
        .from('trades')
        .update(tradePayload)
        .eq('id', editingTradeId);

      if (!error) {
        setEditingTradeId(null);
        fetchTrades();
        resetForm();
      } else {
        alert('Failed to update trade: ' + error.message);
      }
    } else {
      // Create
      const { error } = await supabase.from('trades').insert([tradePayload]);

      if (!error) {
        fetchTrades();
        resetForm();
      } else {
        alert('Failed to log trade: ' + error.message);
      }
    }
  };

  const handleEditClick = (trade: Trade) => {
    setEditingTradeId(trade.id);
    setFormData({
      pair: trade.pair,
      type: trade.type,
      entry_price: trade.entry_price.toString(),
      stop_loss: trade.stop_loss.toString(),
      take_profit: trade.take_profit.toString(),
      pnl: trade.pnl.toString(),
      session: trade.session,
      status: trade.status,
      date: trade.date,
      notes: trade.notes || '',
    });
  };

  const handleDeleteTrade = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trade?')) return;
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (!error) fetchTrades();
  };

  const resetForm = () => {
    setFormData({
      pair: 'EURUSD',
      type: 'BUY',
      entry_price: '',
      stop_loss: '',
      take_profit: '',
      pnl: '',
      session: 'London',
      status: 'WIN',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setEditingTradeId(null);
  };

  // Analytics Calculations
  const totalPnL = useMemo(() => trades.reduce((acc, t) => acc + (t.pnl || 0), 0), [trades]);
  const currentTotalEquity = accountBalance + totalPnL;

  const sessionAnalytics = useMemo(() => {
    const map: Record<string, { pnl: number; wins: number; total: number }> = {
      Asian: { pnl: 0, wins: 0, total: 0 },
      London: { pnl: 0, wins: 0, total: 0 },
      'New York': { pnl: 0, wins: 0, total: 0 },
      Overlap: { pnl: 0, wins: 0, total: 0 },
    };

    trades.forEach((t) => {
      if (map[t.session]) {
        map[t.session].pnl += t.pnl || 0;
        map[t.session].total += 1;
        if (t.status === 'WIN') map[t.session].wins += 1;
      }
    });

    let bestSession = 'N/A';
    let maxPnL = -Infinity;

    Object.entries(map).forEach(([session, data]) => {
      if (data.total > 0 && data.pnl > maxPnL) {
        maxPnL = data.pnl;
        bestSession = session;
      }
    });

    return { breakdown: map, bestSession };
  }, [trades]);

  // Calendar Helpers
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const totalDays = daysInMonth(year, month);
    const startDay = firstDayOfMonth(year, month);

    const daysArray = [];
    for (let i = 0; i < startDay; i++) {
      daysArray.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;

      const dayTrades = trades.filter((t) => t.date === dateKey);
      const dayPnL = dayTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

      let status: 'WIN' | 'LOSS' | 'BREAKEVEN' | 'NONE' = 'NONE';
      if (dayTrades.length > 0) {
        if (dayPnL > 0) status = 'WIN';
        else if (dayPnL < 0) status = 'LOSS';
        else status = 'BREAKEVEN';
      }

      daysArray.push({ day: d, dateKey, dayPnL, status, tradeCount: dayTrades.length });
    }
    return daysArray;
  }, [currentDate, trades]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-8 selection:bg-amber-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-zinc-800/80 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
                BULLISHFRANK
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                PRO JOURNAL
              </span>
            </div>
            <p className="text-xs tracking-widest text-zinc-400 uppercase font-medium mt-1">
              Catch The Trend
            </p>
          </div>

          {/* Account Balance Widget */}
          <div className="mt-4 sm:mt-0 flex items-center gap-4 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 px-5 shadow-2xl backdrop-blur-md">
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider">Account Balance</p>
              {isEditingBalance ? (
                <input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(parseFloat(e.target.value) || 0)}
                  onBlur={() => setIsEditingBalance(false)}
                  autoFocus
                  className="bg-zinc-800 text-amber-400 font-bold text-lg rounded px-2 w-28 focus:outline-none"
                />
              ) : (
                <p
                  onClick={() => setIsEditingBalance(true)}
                  className="text-xl font-bold text-amber-400 cursor-pointer hover:underline"
                  title="Click to edit balance"
                >
                  ${currentTotalEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>
            <div className="h-8 w-px bg-zinc-800" />
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wider">Net P&L</p>
              <p className={`text-lg font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPnL >= 0 ? `+$${totalPnL.toFixed(2)}` : `-$${Math.abs(totalPnL).toFixed(2)}`}
              </p>
            </div>
          </div>
        </header>

        {/* Top Grid: Analytics & Smart Calendar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Analytics Overview Card */}
          <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between shadow-xl">
            <div>
              <h2 className="text-lg font-bold text-zinc-200 mb-4 flex items-center justify-between">
                <span>Performance Insights</span>
                <span className="text-xs text-amber-400 font-mono">Live Sync</span>
              </h2>
              
              <div className="space-y-4">
                <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-zinc-800/50 flex justify-between items-center">
                  <span className="text-xs text-zinc-400">Most Profitable Session</span>
                  <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md border border-emerald-500/20">
                    {sessionAnalytics.bestSession}
                  </span>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-zinc-400 font-medium">Session P&L Breakdown</p>
                  {Object.entries(sessionAnalytics.breakdown).map(([session, data]) => (
                    <div key={session} className="flex justify-between items-center text-xs py-1.5 border-b border-zinc-800/40">
                      <span className="text-zinc-300">{session}</span>
                      <span className={data.pnl >= 0 ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>
                        {data.pnl >= 0 ? `+$${data.pnl.toFixed(2)}` : `-$${Math.abs(data.pnl).toFixed(2)}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/60 flex justify-between items-center text-xs text-zinc-400">
              <span>Total Logged Trades: <strong className="text-zinc-200">{trades.length}</strong></span>
            </div>
          </div>

          {/* Smart Phone-Style Calendar (2 Columns wide) */}
          <div className="lg:col-span-2 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-zinc-200">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={prevMonth}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-lg text-zinc-300 transition"
                >
                  &larr; Prev
                </button>
                <button
                  onClick={nextMonth}
                  className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold rounded-lg text-zinc-300 transition"
                >
                  Next &rarr;
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-xs font-semibold text-zinc-500 py-1 uppercase tracking-wider">
                  {day}
                </div>
              ))}

              {calendarDays.map((item, idx) => {
                if (!item) {
                  return <div key={`empty-${idx}`} className="h-14 rounded-lg bg-zinc-950/30" />;
                }

                let badgeColor = 'bg-zinc-900 border-zinc-800/60 text-zinc-400';
                if (item.status === 'WIN') badgeColor = 'bg-emerald-950/40 border-emerald-500/40 text-emerald-400';
                if (item.status === 'LOSS') badgeColor = 'bg-rose-950/40 border-rose-500/40 text-rose-400';
                if (item.status === 'BREAKEVEN') badgeColor = 'bg-amber-950/40 border-amber-500/40 text-amber-400';

                return (
                  <div
                    key={item.dateKey}
                    className={`h-14 rounded-lg border p-1.5 flex flex-col justify-between transition hover:border-zinc-500 ${badgeColor}`}
                  >
                    <span className="text-xs font-bold self-start">{item.day}</span>
                    {item.tradeCount > 0 && (
                      <span className="text-[10px] font-mono font-bold self-end">
                        {item.dayPnL >= 0 ? `+$${item.dayPnL.toFixed(0)}` : `-$${Math.abs(item.dayPnL).toFixed(0)}`}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-end gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Profit Day
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Loss Day
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Breakeven Day
              </span>
            </div>
          </div>

        </div>

        {/* Trade Entry / Edit Form */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl">
          <h2 className="text-lg font-bold text-zinc-200 mb-4 flex items-center justify-between">
            <span>{editingTradeId ? 'Edit Logged Trade' : 'Log New Execution'}</span>
            {editingTradeId && (
              <button
                onClick={resetForm}
                className="text-xs text-rose-400 hover:underline"
              >
                Cancel Edit
              </button>
            )}
          </h2>

          <form onSubmit={handleSubmitTrade} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            
            {/* Pair */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Asset / Pair</label>
              <input
                type="text"
                required
                value={formData.pair}
                onChange={(e) => setFormData({ ...formData, pair: e.target.value })}
                placeholder="e.g. EURUSD"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as 'BUY' | 'SELL' })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="BUY">BUY</option>
                <option value="SELL">SELL</option>
              </select>
            </div>

            {/* Session */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Session</label>
              <select
                value={formData.session}
                onChange={(e) => setFormData({ ...formData, session: e.target.value as any })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="London">London</option>
                <option value="New York">New York</option>
                <option value="Asian">Asian</option>
                <option value="Overlap">Overlap</option>
              </select>
            </div>

            {/* Outcome Status */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Outcome</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              >
                <option value="WIN">WIN</option>
                <option value="LOSS">LOSS</option>
                <option value="BREAKEVEN">BREAKEVEN</option>
              </select>
            </div>

            {/* Manual PnL */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Profit / Loss ($)</label>
              <input
                type="number"
                step="any"
                required
                value={formData.pnl}
                onChange={(e) => setFormData({ ...formData, pnl: e.target.value })}
                placeholder="e.g. +250 or -100"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Entry Price */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Entry Price</label>
              <input
                type="number"
                step="any"
                value={formData.entry_price}
                onChange={(e) => setFormData({ ...formData, entry_price: e.target.value })}
                placeholder="1.0850"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Stop Loss */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Stop Loss</label>
              <input
                type="number"
                step="any"
                value={formData.stop_loss}
                onChange={(e) => setFormData({ ...formData, stop_loss: e.target.value })}
                placeholder="1.0820"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Take Profit */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Take Profit</label>
              <input
                type="number"
                step="any"
                value={formData.take_profit}
                onChange={(e) => setFormData({ ...formData, take_profit: e.target.value })}
                placeholder="1.0910"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Date</label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Auto R:R Display */}
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">Calculated R:R</label>
              <div className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-lg px-3 py-2 text-sm font-mono text-amber-400 font-bold">
                {computedRR > 0 ? `1:${computedRR}` : 'N/A'}
              </div>
            </div>

            {/* Notes / Psychology */}
            <div className="sm:col-span-2 md:col-span-4 lg:col-span-6">
              <label className="block text-xs font-medium text-zinc-400 mb-1">Psychology & Execution Notes</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="e.g. Felt uneasy during entry due to news release, strictly followed risk parameters."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Submit Button */}
            <div className="sm:col-span-2 md:col-span-4 lg:col-span-6 flex justify-end">
              <button
                type="submit"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-amber-500/10 transition transform active:scale-95"
              >
                {editingTradeId ? 'Save Changes' : 'Log Trade Execution'}
              </button>
            </div>
          </form>
        </div>

        {/* Trade History Table */}
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-md shadow-xl overflow-hidden">
          <h2 className="text-lg font-bold text-zinc-200 mb-4">Trade Logs</h2>

          {loading ? (
            <p className="text-zinc-500 text-sm py-4">Syncing with database...</p>
          ) : trades.length === 0 ? (
            <p className="text-zinc-500 text-sm py-4">No trades recorded yet. Log your first execution above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950/80 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Pair</th>
                    <th className="py-3 px-3">Type</th>
                    <th className="py-3 px-3">Session</th>
                    <th className="py-3 px-3">R:R</th>
                    <th className="py-3 px-3">P&L ($)</th>
                    <th className="py-3 px-3">Notes</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono">
                  {trades.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-800/30 transition">
                      <td className="py-3 px-3 text-zinc-400">{t.date}</td>
                      <td className="py-3 px-3 font-bold text-zinc-100">{t.pair}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-zinc-400">{t.session}</td>
                      <td className="py-3 px-3 text-amber-400">1:{t.rr || 'N/A'}</td>
                      <td className={`py-3 px-3 font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.pnl >= 0 ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`}
                      </td>
                      <td className="py-3 px-3 font-sans text-zinc-400 max-w-xs truncate" title={t.notes}>
                        {t.notes || '-'}
                      </td>
                      <td className="py-3 px-3 text-right space-x-2 font-sans">
                        <button
                          onClick={() => handleEditClick(t)}
                          className="text-amber-400 hover:text-amber-300 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTrade(t.id)}
                          className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}