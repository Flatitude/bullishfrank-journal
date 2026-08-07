'use client';

import { useState, useMemo } from 'react';

interface Trade {
  id: string;
  symbol: string;
  type: 'Long' | 'Short';
  entry: number;
  stopLoss: number;
  takeProfit: number;
  exit: number;
  lotSize: number;
  date: string; // YYYY-MM-DD format
  timeZone: string; // e.g., London (GMT), New York (EST)
  pnl: number;
  rrMultiple: number;
  status: 'Win' | 'Loss' | 'Breakeven';
  emotion: string;
  chartLink: string;
}

export default function BullishFrankJournal() {
  const todayStr = new Date().toISOString().split('T')[0];

  // Account Capital and Total Equity States
  const [baseBalance, setBaseBalance] = useState<number>(10000);
  const [isEditingBalance, setIsEditingBalance] = useState<boolean>(false);
  const [balanceInput, setBalanceInput] = useState<string>('10000');

  const [customEquity, setCustomEquity] = useState<number | null>(null);
  const [isEditingEquity, setIsEditingEquity] = useState<boolean>(false);
  const [equityInput, setEquityInput] = useState<string>('');

  // Trades state initialized with a sample demo trade
  const [trades, setTrades] = useState<Trade[]>([
    {
      id: '1',
      symbol: 'NQ',
      type: 'Long',
      entry: 18450,
      stopLoss: 18410,
      takeProfit: 18530,
      exit: 18530,
      lotSize: 1,
      date: todayStr,
      timeZone: 'New York (EST/EDT)',
      pnl: 400,
      rrMultiple: 2.0,
      status: 'Win',
      emotion: 'Confident & Patient',
      chartLink: 'https://www.tradingview.com/chart/'
    }
  ]);

  // Form input states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    symbol: '',
    type: 'Long',
    entry: '',
    stopLoss: '',
    takeProfit: '',
    exit: '',
    lotSize: '',
    date: todayStr,
    timeZone: 'New York (EST/EDT)',
    manualPnl: '',
    useManualPnl: false,
    emotion: 'Confident & Patient',
    chartLink: ''
  });

  // Calendar State navigation
  const [currentDate, setCurrentDate] = useState(new Date());

  // Handle Form Submission
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.entry || !form.stopLoss || !form.exit || !form.lotSize) return;

    const entryPrice = parseFloat(form.entry);
    const slPrice = parseFloat(form.stopLoss);
    const tpPrice = parseFloat(form.takeProfit || '0');
    const exitPrice = parseFloat(form.exit);
    const lots = parseFloat(form.lotSize);

    // Calculate Risk-to-Reward Multiple
    const riskPerUnit = Math.abs(entryPrice - slPrice);
    const plannedReward = tpPrice ? Math.abs(tpPrice - entryPrice) : Math.abs(exitPrice - entryPrice);
    const rrMultiple = riskPerUnit > 0 ? Number((plannedReward / riskPerUnit).toFixed(2)) : 0;

    // Calculate PnL (automatic or manual override)
    let pnl = 0;
    if (form.useManualPnl && form.manualPnl !== '') {
      pnl = parseFloat(form.manualPnl);
    } else {
      const priceDiff = form.type === 'Long' ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
      pnl = Number((priceDiff * lots * 100).toFixed(2));
    }

    // Status determination
    let status: 'Win' | 'Loss' | 'Breakeven' = 'Breakeven';
    if (pnl > 5) status = 'Win';
    else if (pnl < -5) status = 'Loss';

    if (editingId) {
      // Update existing trade
      setTrades(trades.map(t => t.id === editingId ? {
        ...t,
        symbol: form.symbol.toUpperCase(),
        type: form.type as 'Long' | 'Short',
        entry: entryPrice,
        stopLoss: slPrice,
        takeProfit: tpPrice,
        exit: exitPrice,
        lotSize: lots,
        date: form.date,
        timeZone: form.timeZone,
        pnl,
        rrMultiple,
        status,
        emotion: form.emotion,
        chartLink: form.chartLink
      } : t));
      setEditingId(null);
    } else {
      // Create new trade
      const newTrade: Trade = {
        id: Date.now().toString(),
        symbol: form.symbol.toUpperCase(),
        type: form.type as 'Long' | 'Short',
        entry: entryPrice,
        stopLoss: slPrice,
        takeProfit: tpPrice,
        exit: exitPrice,
        lotSize: lots,
        date: form.date,
        timeZone: form.timeZone,
        pnl,
        rrMultiple,
        status,
        emotion: form.emotion,
        chartLink: form.chartLink
      };
      setTrades([newTrade, ...trades]);
    }

    resetForm();
  };

  const resetForm = () => {
    setForm({
      symbol: '',
      type: 'Long',
      entry: '',
      stopLoss: '',
      takeProfit: '',
      exit: '',
      lotSize: '',
      date: todayStr,
      timeZone: 'New York (EST/EDT)',
      manualPnl: '',
      useManualPnl: false,
      emotion: 'Confident & Patient',
      chartLink: ''
    });
    setEditingId(null);
  };

  const startEditTrade = (trade: Trade) => {
    setEditingId(trade.id);
    setForm({
      symbol: trade.symbol,
      type: trade.type,
      entry: trade.entry.toString(),
      stopLoss: trade.stopLoss.toString(),
      takeProfit: trade.takeProfit.toString(),
      exit: trade.exit.toString(),
      lotSize: trade.lotSize.toString(),
      date: trade.date,
      timeZone: trade.timeZone,
      manualPnl: trade.pnl.toString(),
      useManualPnl: true,
      emotion: trade.emotion,
      chartLink: trade.chartLink
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTrade = (id: string) => {
    setTrades(trades.filter(t => t.id !== id));
    if (editingId === id) resetForm();
  };

  // Calculations
  const totalTrades = trades.length;
  const totalPnl = trades.reduce((acc, t) => acc + t.pnl, 0);
  const calculatedEquity = baseBalance + totalPnl;
  const currentEquity = customEquity !== null ? customEquity : calculatedEquity;

  const winningTrades = trades.filter(t => t.status === 'Win').length;
  const winRate = totalTrades > 0 ? ((winningTrades / totalTrades) * 100).toFixed(1) : '0';

  // Performance by Time Zone
  const timezoneStats = useMemo(() => {
    const stats: Record<string, { count: number; pnl: number }> = {};
    trades.forEach(t => {
      const tz = t.timeZone || 'Unknown';
      if (!stats[tz]) stats[tz] = { count: 0, pnl: 0 };
      stats[tz].count += 1;
      stats[tz].pnl += t.pnl;
    });
    return stats;
  }, [trades]);

  // Map trades by date string
  const tradesByDate = useMemo(() => {
    const map: Record<string, { status: string; pnl: number }[]> = {};
    trades.forEach(t => {
      if (!map[t.date]) map[t.date] = [];
      map[t.date].push({ status: t.status, pnl: t.pnl });
    });
    return map;
  }, [trades]);

  // Calendar matrix generator logic
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const formattedMonth = String(month + 1).padStart(2, '0');
      const formattedDay = String(d).padStart(2, '0');
      days.push(`${year}-${formattedMonth}-${formattedDay}`);
    }
    return days;
  }, [year, month, firstDayOfMonth, daysInMonth]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Dashboard Stats Bar */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold tracking-wider uppercase border border-emerald-500/20">
                SuperTrader Execution Hub
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
              BullishFrank
            </h1>
            <p className="text-emerald-400 text-sm font-semibold tracking-wide mt-1">
              Discipline. Patience. Profit. Catch the Trend.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            {/* Account Capital Widget */}
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center flex flex-col justify-center">
              <span className="block text-[11px] text-slate-400 uppercase tracking-wider">Account Capital</span>
              {isEditingBalance ? (
                <div className="flex items-center gap-1 mt-1">
                  <input 
                    type="number"
                    value={balanceInput}
                    onChange={(e) => setBalanceInput(e.target.value)}
                    className="w-20 bg-slate-900 text-white text-xs p-1 rounded border border-slate-700 text-center"
                  />
                  <button 
                    onClick={() => {
                      setBaseBalance(parseFloat(balanceInput) || baseBalance);
                      setIsEditingBalance(false);
                    }}
                    className="bg-emerald-600 text-white text-[10px] px-2 py-1 rounded font-bold"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 cursor-pointer group" onClick={() => { setBalanceInput(baseBalance.toString()); setIsEditingBalance(true); }}>
                  <span className="text-base font-mono font-bold text-white group-hover:text-emerald-400 transition">
                    ${baseBalance.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 group-hover:underline">(Edit)</span>
                </div>
              )}
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
              <span className="block text-[11px] text-slate-400 uppercase tracking-wider">Net P&L</span>
              <span className={`text-base font-mono font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalPnl >= 0 ? `+$${totalPnl.toFixed(2)}` : `-$${Math.abs(totalPnl).toFixed(2)}`}
              </span>
            </div>

            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center">
              <span className="block text-[11px] text-slate-400 uppercase tracking-wider">Win Rate</span>
              <span className="text-base font-mono font-bold text-cyan-400">{winRate}%</span>
            </div>

            {/* Editable Total Equity Widget */}
            <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-center flex flex-col justify-center">
              <span className="block text-[11px] text-slate-400 uppercase tracking-wider">Total Equity</span>
              {isEditingEquity ? (
                <div className="flex items-center gap-1 mt-1">
                  <input 
                    type="number"
                    value={equityInput}
                    onChange={(e) => setEquityInput(e.target.value)}
                    className="w-20 bg-slate-900 text-white text-xs p-1 rounded border border-slate-700 text-center"
                  />
                  <button 
                    onClick={() => {
                      if (equityInput !== '') {
                        setCustomEquity(parseFloat(equityInput));
                      } else {
                        setCustomEquity(null);
                      }
                      setIsEditingEquity(false);
                    }}
                    className="bg-emerald-600 text-white text-[10px] px-2 py-1 rounded font-bold"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 cursor-pointer group" onClick={() => { setEquityInput(currentEquity.toString()); setIsEditingEquity(true); }}>
                  <span className="text-base font-mono font-bold text-white group-hover:text-emerald-400 transition">
                    ${currentEquity.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-500 group-hover:underline">(Edit)</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Smart Calendar & Log Form Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form Section */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {editingId ? 'Edit Trade Log Entry' : 'Log New Trade Execution'}
              </h2>
              {editingId && (
                <button 
                  onClick={resetForm} 
                  className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-lg transition"
                >
                  Cancel Edit
                </button>
              )}
            </div>
            
            <form onSubmit={handleFormSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Symbol / Ticker</label>
                <input 
                  type="text" 
                  placeholder="e.g. NQ, EURUSD" 
                  value={form.symbol}
                  onChange={(e) => setForm({...form, symbol: e.target.value.toUpperCase()})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Execution Type</label>
                <select 
                  value={form.type}
                  onChange={(e) => setForm({...form, type: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Long">Long (Buy)</option>
                  <option value="Short">Short (Sell)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Lot Size / Contracts</label>
                <input 
                  type="number" 
                  step="any"
                  placeholder="e.g. 1.0" 
                  value={form.lotSize}
                  onChange={(e) => setForm({...form, lotSize: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Entry Price</label>
                <input 
                  type="number" 
                  step="any"
                  placeholder="0.00" 
                  value={form.entry}
                  onChange={(e) => setForm({...form, entry: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Stop Loss Price</label>
                <input 
                  type="number" 
                  step="any"
                  placeholder="0.00" 
                  value={form.stopLoss}
                  onChange={(e) => setForm({...form, stopLoss: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Take Profit Price</label>
                <input 
                  type="number" 
                  step="any"
                  placeholder="0.00" 
                  value={form.takeProfit}
                  onChange={(e) => setForm({...form, takeProfit: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Actual Exit Price</label>
                <input 
                  type="number" 
                  step="any"
                  placeholder="0.00" 
                  value={form.exit}
                  onChange={(e) => setForm({...form, exit: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Trade Date</label>
                <input 
                  type="date" 
                  value={form.date}
                  onChange={(e) => setForm({...form, date: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Session Time Zone</label>
                <select 
                  value={form.timeZone}
                  onChange={(e) => setForm({...form, timeZone: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="London (GMT/BST)">London (GMT/BST)</option>
                  <option value="New York (EST/EDT)">New York (EST/EDT)</option>
                  <option value="Asian Session (JST/SGT)">Asian Session (JST/SGT)</option>
                  <option value="Sydney Session (AEST)">Sydney Session (AEST)</option>
                </select>
              </div>

              {/* Manual Profit/Loss Option Box */}
              <div className="md:col-span-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox"
                    id="manualToggle"
                    checked={form.useManualPnl}
                    onChange={(e) => setForm({...form, useManualPnl: e.target.checked})}
                    className="w-4 h-4 accent-emerald-500 rounded"
                  />
                  <label htmlFor="manualToggle" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Override with Manual P&L ($)
                  </label>
                </div>
                <div className="md:col-span-2">
                  <input 
                    type="number"
                    step="any"
                    placeholder="Enter custom profit or loss amount (e.g. 250 or -120)"
                    disabled={!form.useManualPnl}
                    value={form.manualPnl}
                    onChange={(e) => setForm({...form, manualPnl: e.target.value})}
                    className={`w-full bg-slate-950 border rounded-xl p-2 text-sm text-white focus:outline-none ${form.useManualPnl ? 'border-emerald-500' : 'border-slate-800 opacity-50 cursor-not-allowed'}`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Mindset State</label>
                <select 
                  value={form.emotion}
                  onChange={(e) => setForm({...form, emotion: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Confident & Patient">Confident & Patient</option>
                  <option value="FOMO Entry">FOMO Entry</option>
                  <option value="Revenge Trade">Revenge Trade</option>
                  <option value="Disciplined Rule Follower">Disciplined Rule Follower</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">TradingView Chart Snapshot URL</label>
                <input 
                  type="url" 
                  placeholder="https://www.tradingview.com/x/your-chart-snapshot" 
                  value={form.chartLink}
                  onChange={(e) => setForm({...form, chartLink: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="md:col-span-3 pt-2">
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 font-bold text-white p-3 rounded-xl transition shadow-lg shadow-emerald-950/50">
                  {editingId ? 'Save Updated Trade' : 'Calculate R:R & Commit Trade Entry'}
                </button>
              </div>
            </form>
          </div>

          {/* Smart Continuous Calendar Sidebar */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">{monthNames[month]} {year}</h3>
                <div className="flex gap-1">
                  <button 
                    onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold"
                  >
                    &larr;
                  </button>
                  <button 
                    onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold"
                  >
                    &rarr;
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500 mb-2 font-mono">
                <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((dayStr, idx) => {
                  if (!dayStr) {
                    return <div key={`empty-${idx}`} className="h-8"></div>;
                  }
                  const dayTrades = tradesByDate[dayStr] || [];
                  let bgClass = "bg-slate-950 border-slate-800 text-slate-400";
                  
                  if (dayTrades.length > 0) {
                    const hasLoss = dayTrades.some(t => t.status === 'Loss');
                    const hasWin = dayTrades.some(t => t.status === 'Win');
                    
                    if (hasLoss && !hasWin) {
                      bgClass = "bg-rose-950/80 border-rose-800 text-rose-300 font-bold shadow-sm shadow-rose-950";
                    } else if (hasWin && !hasLoss) {
                      bgClass = "bg-emerald-950/80 border-emerald-800 text-emerald-300 font-bold shadow-sm shadow-emerald-950";
                    } else {
                      bgClass = "bg-slate-800 border-slate-600 text-slate-200 font-bold";
                    }
                  }
                  const dayNum = dayStr.split('-')[2];
                  return (
                    <div 
                      key={dayStr} 
                      title={`${dayTrades.length} trades recorded`}
                      className={`h-9 border rounded-lg flex flex-col items-center justify-center text-xs transition cursor-default ${bgClass}`}
                    >
                      <span>{Number(dayNum)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-800 text-xs space-y-2">
              <span className="text-slate-400 block font-semibold mb-1">Calendar Color Codes</span>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-700"></span>
                <span className="text-slate-300">Profitable Session Day</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-slate-700"></span>
                <span className="text-slate-300">Breakeven / Mixed Trades</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-rose-700"></span>
                <span className="text-slate-300">Drawdown / Loss Day</span>
              </div>
            </div>
          </div>
        </div>

        {/* Time Zone Analysis Section */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <h2 className="text-xl font-bold mb-1">Session & Time Zone Performance Analysis</h2>
          <p className="text-slate-400 text-xs mb-4">Discover automatically which market sessions yield your highest profitability.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.keys(timezoneStats).length === 0 ? (
              <p className="text-slate-500 text-xs">No time zone data recorded yet.</p>
            ) : (
              Object.entries(timezoneStats).map(([tz, data]) => (
                <div key={tz} className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                  <span className="block text-xs font-bold text-slate-300 mb-1 truncate">{tz}</span>
                  <div className="flex justify-between items-center text-sm font-mono mt-2">
                    <span className="text-slate-500 text-xs">{data.count} Trades</span>
                    <span className={`font-bold ${data.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {data.pnl >= 0 ? `+$${data.pnl.toFixed(2)}` : `-$${Math.abs(data.pnl).toFixed(2)}`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Trade Log Feed Table */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
          <h2 className="text-xl font-bold mb-4">Executed Trade Log Feed</h2>
          
          {trades.length === 0 ? (
            <p className="text-slate-500 text-center py-10">No execution records found. Log your first setup above.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase font-mono">
                    <th className="p-3">Date</th>
                    <th className="p-3">Symbol</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Session TZ</th>
                    <th className="p-3">R:R Multiple</th>
                    <th className="p-3">Net P&L</th>
                    <th className="p-3">Mindset</th>
                    <th className="p-3">Chart</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {trades.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3 font-mono text-slate-400 text-xs">{t.date}</td>
                      <td className="p-3 font-bold">{t.symbol}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${t.type === 'Long' ? 'bg-blue-950 text-blue-400 border border-blue-900' : 'bg-orange-950 text-orange-400 border border-orange-900'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-400">{t.timeZone}</td>
                      <td className="p-3 font-mono text-cyan-400 font-bold">{t.rrMultiple}R</td>
                      <td className={`p-3 font-mono font-bold ${t.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.pnl >= 0 ? `+$${t.pnl.toFixed(2)}` : `-$${Math.abs(t.pnl).toFixed(2)}`}
                      </td>
                      <td className="p-3">
                        <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">
                          {t.emotion}
                        </span>
                      </td>
                      <td className="p-3">
                        {t.chartLink ? (
                          <a 
                            href={t.chartLink} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-xs text-emerald-400 underline hover:text-emerald-300 font-medium"
                          >
                            View Chart &rarr;
                          </a>
                        ) : (
                          <span className="text-xs text-slate-600">None</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button 
                          onClick={() => startEditTrade(t)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1 rounded-lg transition font-semibold"
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => deleteTrade(t.id)}
                          className="bg-rose-950/50 hover:bg-rose-900 text-rose-400 border border-rose-900 text-xs px-3 py-1 rounded-lg transition font-semibold"
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
    </main>
  );
}