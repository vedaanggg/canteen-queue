import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError, fetchKitchenOrders, updateOrderStatus, type Order } from '../lib/api';
import { socket } from '../lib/socket';

const columns = [
  { status: 'Placed', title: 'NEW', action: 'Preparing', actionLabel: 'Start' },
  { status: 'Preparing', title: 'PREPARING', action: 'Ready', actionLabel: 'Ready' },
  { status: 'Ready', title: 'READY', action: 'Collected', actionLabel: 'Collected' },
] as const;
const ageLabel = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s ago`;
};

export default function KitchenPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [boardError, setBoardError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connected, setConnected] = useState(Boolean(socket?.connected));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [newIds, setNewIds] = useState<string[]>([]);
  const [now, setNow] = useState(Date.now());
  const initialized = useRef(false);
  const orderIds = useRef(new Set<string>());
  const soundEnabledRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playArrivalSound = useCallback(() => {
    try {
      const context = audioContextRef.current;
      if (!context || context.state !== 'running') return;
      const oscillator = context.createOscillator(); const gain = context.createGain();
      oscillator.type = 'sine'; oscillator.frequency.value = 740; gain.gain.value = 0.045;
      oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + 0.16);
    } catch { /* Audio is optional and can be blocked by the browser. */ }
  }, []);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchKitchenOrders();
      const nextIds = new Set(result.orders.map((order) => order.id));
      if (initialized.current) {
        const arrivals = result.orders.filter((order) => !orderIds.current.has(order.id)).map((order) => order.id);
        if (arrivals.length) {
          setNewIds((current) => [...new Set([...current, ...arrivals])]);
          window.setTimeout(() => setNewIds((current) => current.filter((id) => !arrivals.includes(id))), 900);
          if (soundEnabledRef.current) playArrivalSound();
        }
      }
      initialized.current = true; orderIds.current = nextIds;
      setOrders(result.orders); setBoardError(null);
    } catch (error) {
      setBoardError(error instanceof Error ? error.message : 'Unable to load the kitchen board.');
    } finally { setLoading(false); }
  }, [playArrivalSound]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => {
    const ioSocket = socket;
    if (!ioSocket) return;
    const onConnect = () => { setConnected(true); void refresh(); };
    const onDisconnect = () => setConnected(false);
    const onOrderChange = () => void refresh();
    ioSocket.on('connect', onConnect); ioSocket.on('disconnect', onDisconnect);
    ioSocket.on('order:created', onOrderChange); ioSocket.on('order:updated', onOrderChange); ioSocket.on('order:cancelled', onOrderChange);
    setConnected(ioSocket.connected);
    return () => { ioSocket.off('connect', onConnect); ioSocket.off('disconnect', onDisconnect); ioSocket.off('order:created', onOrderChange); ioSocket.off('order:updated', onOrderChange); ioSocket.off('order:cancelled', onOrderChange); };
  }, [refresh]);
  useEffect(() => {
    if (connected) return;
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [connected, refresh]);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => () => { void audioContextRef.current?.close().catch(() => {}); }, []);

  async function advance(order: Order, target: 'Preparing' | 'Ready' | 'Collected') {
    setBusyId(order.id); setActionError(null);
    try { await updateOrderStatus(order.id, target); await refresh(); }
    catch (error) {
      const message = error instanceof ApiError ? error.message : error instanceof Error ? error.message : 'Could not update this order.';
      setActionError(message); await refresh();
    } finally { setBusyId(null); }
  }

  if (loading) return <main className="mx-auto flex min-h-[65vh] max-w-7xl items-center justify-center px-4"><p className="animate-pulse text-lg font-bold text-slate-600">Loading kitchen orders…</p></main>;

  return <main className="mx-auto max-w-[1500px] px-3 pb-8 pt-5 sm:px-5 sm:pt-8">
    <header className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-7">
      <div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-700">Staff view</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Kitchen Board</h1></div>
      <div className="flex items-center gap-3">
        {!connected && <p role="status" className="text-sm font-bold text-orange-800">Reconnecting…</p>}
        <button type="button" onClick={() => {
          soundEnabledRef.current = true; setSoundEnabled(true);
          try {
            const AudioContextClass = window.AudioContext;
            if (AudioContextClass && !audioContextRef.current) audioContextRef.current = new AudioContextClass();
            void audioContextRef.current?.resume().catch(() => {});
          } catch { /* Audio is optional and can be blocked by the browser. */ }
        }} aria-pressed={soundEnabled} className="min-h-10 rounded-full border border-orange-200 bg-white px-4 text-sm font-bold text-orange-800 hover:bg-orange-50">{soundEnabled ? 'Sound on' : 'Enable sound'}</button>
      </div>
    </header>
    {boardError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800"><span>{boardError}</span><button type="button" onClick={() => void refresh()} className="min-h-10 rounded-full bg-white px-4 font-bold text-red-800">Try again</button></div>}
    {actionError && <div role="alert" className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{actionError}</div>}
    <div className="grid items-start gap-4 md:grid-cols-3 md:gap-3 lg:gap-5">
      {columns.map((column) => {
        const group = orders.filter((order) => order.status === column.status);
        return <section key={column.status} aria-label={`${column.title} orders`} className="min-w-0 rounded-3xl border border-orange-100 bg-orange-50/80 p-3 sm:p-4">
          <header className="mb-3 flex items-center justify-between gap-2 px-1"><h2 className="text-sm font-black tracking-[0.14em] text-slate-800 sm:text-base">{column.title}</h2><span aria-label={`${group.length} orders`} className="flex h-8 min-w-8 items-center justify-center rounded-full bg-slate-900 px-2 text-sm font-black text-white">{group.length}</span></header>
          {group.length === 0 ? <p className="rounded-2xl border border-dashed border-orange-200 bg-white/70 px-3 py-7 text-center text-sm font-medium text-slate-500">No orders yet</p> : <div className="space-y-3">
            {group.map((order) => {
              const age = now - new Date(order.createdAt).getTime(); const old = age > 15 * 60 * 1000;
              return <article key={order.id} className={`rounded-2xl border-2 bg-white p-3 shadow-sm sm:p-4 ${old ? 'border-red-500' : 'border-white'} ${newIds.includes(order.id) ? 'kitchen-slide-in' : ''}`}>
                <div className="flex items-start justify-between gap-2"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Token</p><p className="text-4xl font-black leading-none text-orange-600">#{order.tokenNumber}</p></div><div className="text-right"><p className="max-w-[8rem] break-words font-extrabold text-slate-900">{order.studentName}</p><p className={`mt-1 text-xs font-bold ${old ? 'text-red-700' : 'text-slate-500'}`}>{ageLabel(age)}</p></div></div>
                <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">{order.items.map((item, index) => <li key={`${item.menuItemId}-${index}`} className="flex justify-between gap-2 text-sm"><span className="min-w-0 break-words text-slate-700">{item.itemName}</span><span className="shrink-0 font-black text-slate-900">× {item.quantity}</span></li>)}</ul>
                <button type="button" onClick={() => void advance(order, column.action)} disabled={busyId === order.id} className="mt-4 min-h-12 w-full rounded-xl bg-canteen px-3 font-extrabold text-white hover:bg-orange-600 disabled:cursor-wait disabled:opacity-60">{busyId === order.id ? 'Saving…' : column.actionLabel}</button>
              </article>;
            })}
          </div>}
        </section>;
      })}
    </div>
  </main>;
}
