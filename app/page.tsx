'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Trade {
  id: string;
  symbol: string;
  type: string;
  entry: number;
  stop_loss: number;
  take_profit: number | null;
  exit: number;
  lot_size: number;
  date: string;
  time_zone: string;
  pnl: number;
  rr_multiple: number;
  status: string;
  emotion: string;
  chart_link: string;
}

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  // Default date string (YYYY-MM-DD)
  const today = new Date().toISOString().split('T')[0];

  // Form State - Blank defaults except date
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState('');
  const [entry, setEntry] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [exit, setExit] = useState('');
  const [lotSize, setLotSize] = useState('');
  const [date, setDate] = useState(today);
  const [timeZone, setTimeZone] = useState('UTC');
  const [emotion, setEmotion] = useState('');
  const [chartLink, setChartLink] = useState('');

  // 1. Fetch trades from Supabase on page load
  useEffect(() => {
    fetchTrades();
  }, []);

  async function fetchTrades() {
    setLoading(true);
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching trades:', error);
    } else {
      setTrades(data || []);
    }
    setLoading(false);
  }

  // 2. Add new trade to Supabase
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const entryNum = parseFloat(entry);
    const exitNum = parseFloat(exit);
    const slNum = parseFloat(stopLoss);
    const tpNum = takeProfit ? parseFloat(takeProfit) : null;
    const lotNum = parseFloat(lotSize);

    // Calculate PnL and RR
    const pnl = type === 'BUY' ? (exitNum - entryNum) * lotNum * 100 : (entryNum - exitNum) * lotNum * 100;
    const risk = Math.abs(entryNum - slNum);
    const reward = Math.abs(exitNum - entryNum);
    const rrMultiple = risk > 0 ? parseFloat((reward / risk).toFixed(2)) : 0;
    const status = pnl >= 0 ? 'WIN' : 'LOSS';

    const newTrade = {
      symbol: symbol.toUpperCase(),
      type,
      entry: entryNum,
      stop_loss: slNum,
      take_profit: tpNum,
      exit: exitNum,
      lot_size: lotNum,
      date: date || today,
      time_zone: timeZone,
      pnl: parseFloat(pnl.toFixed(2)),
      rr_multiple: rrMultiple,
      status,
      emotion,
      chart_link: chartLink,
    };

    const { error } = await supabase.from('trades').insert([newTrade]);

    if (error) {
      alert('Failed to save trade to database: ' + error.message);
      console.error('Supabase Insert Error:', error);
    } else {
      // Re-fetch clean data from Supabase immediately
      await fetchTrades();

      // Reset form fields
      setSymbol('');
      setType('');
      setEntry('');
      setStopLoss('');
      setTakeProfit('');
      setExit('');
      setLotSize('');
      setDate(today);
      setEmotion('');
      setChartLink('');
    }
  }

  // 3. Delete trade from Supabase
  async function handleDelete(id: string) {
    const { error } = await supabase.from('trades').delete().eq('id', id);

    if (error) {
      alert('Failed to delete trade: ' + error.message);
    } else {
      await fetchTrades();
    }
  }

  // Calculate live summary metrics from database rows
  const totalPnl = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
  const winCount = trades.filter((t) => t.status === 'WIN').length;
  const winRate = trades.length > 0 ? ((winCount / trades.length) * 100).toFixed(1) : '0.0';

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold text-center">BullishFrank Trading Journal</h1>

      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 text-white">
          <p className="text-xs text-gray-400 font-semibold uppercase">Total P&L</p>
          <p className={`text-2xl font-bold mt-1 ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            ${totalPnl.toFixed(2)}
          </p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 text-white">
          <p className="text-xs text-gray-400 font-semibold uppercase">Win Rate</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{winRate}%</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 text-white">
          <p className="text-xs text-gray-400 font-semibold uppercase">Total Trades</p>
          <p className="text-2xl font-bold text-white mt-1">{trades.length}</p>
        </div>
      </div>

      {/* Trade Entry Form */}
      <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-xl space-y-4 text-white border border-slate-800">
        <h2 className="text-xl font-semibold mb-4">Log New Trade</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Symbol (e.g. EURUSD)"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            required
            className="p-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            required
            className="p-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="" disabled hidden>Select Type</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </select>
          <input
            type="number"
            step="any"
            placeholder="Entry Price"
            value={entry}
            onChange={(e) => setEntry(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            required
            className="p-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500"
          />
          <input
            type="number"
            step="any"
            placeholder="Exit Price"
            value={exit}
            onChange={(e) => setExit(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            required
            className="p-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500"
          />
          <input
            type="number"
            step="any"
            placeholder="Stop Loss"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            required
            className="p-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500"
          />
          <input
            type="number"
            step="any"
            placeholder="Take Profit (optional)"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            className="p-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500"
          />
          <input
            type="number"
            step="any"
            placeholder="Lot Size"
            value={lotSize}
            onChange={(e) => setLotSize(e.target.value)}
            onWheel={(e) => e.currentTarget.blur()}
            required
            className="p-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="p-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500"
          />
          <select
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
            required
            className="p-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="" disabled hidden>Select Emotion</option>
            <option value="Disciplined">Disciplined</option>
            <option value="FOMO">FOMO</option>
            <option value="Hesitant">Hesitant</option>
            <option value="Greedy">Greedy</option>
          </select>
          <input
            type="url"
            placeholder="TradingView Chart Link"
            value={chartLink}
            onChange={(e) => setChartLink(e.target.value)}
            className="p-2 rounded bg-slate-800 border border-slate-700 focus:outline-none focus:border-blue-500 col-span-2"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 font-bold rounded-lg transition"
        >
          Save Trade to Supabase
        </button>
      </form>

      {/* Trade Log Table */}
      <div className="bg-slate-900 p-6 rounded-xl text-white border border-slate-800">
        <h2 className="text-xl font-semibold mb-4">Trade History</h2>
        {loading ? (
          <p className="text-gray-400">Loading trades from cloud database...</p>
        ) : trades.length === 0 ? (
          <p className="text-gray-400">No trades logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-700 text-gray-400">
                <tr>
                  <th className="p-2">Date</th>
                  <th className="p-2">Symbol</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Lot</th>
                  <th className="p-2">P&L</th>
                  <th className="p-2">R:R</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Emotion</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr key={t.id} className="border-b border-slate-800">
                    <td className="p-2">{t.date}</td>
                    <td className="p-2 font-bold">{t.symbol}</td>
                    <td className={`p-2 font-bold ${t.type === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                      {t.type}
                    </td>
                    <td className="p-2">{t.lot_size}</td>
                    <td className={`p-2 font-bold ${t.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${t.pnl}
                    </td>
                    <td className="p-2">{t.rr_multiple}R</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          t.status === 'WIN' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="p-2 text-gray-400">{t.emotion}</td>
                    <td className="p-2">
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="text-red-400 hover:text-red-300 text-xs"
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
    </main>
  );
}