import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cancelOrder, fetchOrder, type Order } from '../lib/api';
import { socket } from '../lib/socket';

const money = (amount: number) => `₹${amount}`;
const steps: Order['status'][] = ['Placed', 'Preparing', 'Ready'];

export default function OrderStatusPage() {
  const { id = '' } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(Boolean(socket?.connected));
  const [busy, setBusy] = useState(false);
  const previousStatus = useRef<Order['status'] | null>(null);
  const readOnlyRef = useRef(false);
  const refresh = useCallback(async () => {
    try { const result = await fetchOrder(id); readOnlyRef.current = result.order.readOnly; setOrder(result.order); setError(null); localStorage.setItem('canteen-queue-last-order-id', id); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load this order.'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { setLoading(true); void refresh(); }, [refresh]);
  useEffect(() => {
    const ioSocket = socket;
    if (!ioSocket) return;
    const onConnect = () => { setConnected(true); if (!readOnlyRef.current) void refresh(); };
    const onDisconnect = () => setConnected(false);
    const onOrderEvent = (changed: { id?: string }) => { if (!readOnlyRef.current && changed.id === id) void refresh(); };
    ioSocket.on('connect', onConnect); ioSocket.on('disconnect', onDisconnect);
    ioSocket.on('order:created', onOrderEvent); ioSocket.on('order:updated', onOrderEvent); ioSocket.on('order:cancelled', onOrderEvent);
    setConnected(ioSocket.connected);
    return () => { ioSocket.off('connect', onConnect); ioSocket.off('disconnect', onDisconnect); ioSocket.off('order:created', onOrderEvent); ioSocket.off('order:updated', onOrderEvent); ioSocket.off('order:cancelled', onOrderEvent); };
  }, [id, refresh]);
  useEffect(() => {
    if (!order || order.readOnly || connected) return;
    const timer = window.setInterval(() => void refresh(), 5000);
    return () => window.clearInterval(timer);
  }, [order, connected, refresh]);
  useEffect(() => {
    if (order?.status === 'Ready' && previousStatus.current !== 'Ready' && !order.readOnly) navigator.vibrate?.([200, 100, 200]);
    if (order) previousStatus.current = order.status;
  }, [order]);

  async function handleCancel() {
    if (!window.confirm('Cancel this order? This cannot be undone.')) return;
    setBusy(true);
    try { const result = await cancelOrder(id); setOrder(result.order); setError(null); }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to cancel this order.'); }
    finally { setBusy(false); }
  }

  if (loading) return <main className="mx-auto flex min-h-[65vh] max-w-3xl items-center justify-center px-5 text-center"><p className="animate-pulse text-lg font-bold text-slate-600">Loading your order…</p></main>;
  if (error && !order) return <main className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center px-5 text-center"><h1 className="text-3xl font-black text-slate-900">{error.includes('not found') ? 'Order not found' : 'We couldn’t load this order'}</h1><p className="mt-3 text-slate-600">{error}</p><Link to="/" className="mt-6 rounded-full bg-canteen px-5 py-3 font-bold text-white">Back to menu</Link></main>;
  if (!order) return null;
  const step = order.status === 'Collected' ? 2 : steps.indexOf(order.status as typeof steps[number]);
  return <main className="mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pt-10">
    {order.readOnly && <div role="status" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 font-bold text-amber-950">This order is from a previous day.</div>}
    {!order.readOnly && !connected && <p role="status" className="mb-4 text-sm font-semibold text-orange-800">Reconnecting…</p>}
    <section className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${order.status === 'Ready' ? 'border-emerald-200' : 'border-orange-100'}`}>
      <div className={`${order.status === 'Ready' ? 'bg-emerald-600' : 'bg-orange-500'} px-5 py-8 text-center text-white sm:py-10`}>
        <p className="text-sm font-bold uppercase tracking-[0.2em]">Your token</p>
        <p className="mt-1 text-[min(36vh,18rem)] font-black leading-none" aria-label={`Token ${order.tokenNumber}`}>{order.tokenNumber}</p>
        <p className="mt-3 text-xl font-extrabold">{order.status}</p>
      </div>
      <div className="p-5 sm:p-8">
        {order.status === 'Ready' && <div role="status" className="mb-5 rounded-2xl bg-emerald-100 px-4 py-4 text-center text-xl font-black text-emerald-900">Collect your order!</div>}
        {order.status === 'Collected' && <div role="status" className="mb-5 rounded-2xl bg-emerald-100 px-4 py-4 text-center font-extrabold text-emerald-900">Your order has been collected. Enjoy!</div>}
        {order.status === 'Cancelled' && <div role="status" className="mb-5 rounded-2xl bg-slate-100 px-4 py-4 text-center font-extrabold text-slate-700">This order was cancelled.</div>}
        {!order.readOnly && order.status !== 'Ready' && order.status !== 'Collected' && order.status !== 'Cancelled' && <div className="mb-6 text-center text-lg font-extrabold text-orange-800">{order.ordersAhead === 0 ? "You're next" : `Estimated wait: ${Number(order.ordersAhead) * 5} min`}</div>}
        {!order.readOnly && <div aria-label="Order progress" className="mb-7 grid grid-cols-3">
          {steps.map((label, index) => <div key={label} className="text-center"><span className={`mx-auto flex h-10 w-10 items-center justify-center rounded-full font-black ${index <= step ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{index < step ? '✓' : index + 1}</span><span className={`mt-2 block text-sm font-bold ${index <= step ? 'text-slate-900' : 'text-slate-400'}`}>{label}</span></div>)}
        </div>}
        <div className="border-t border-slate-100 pt-5"><h1 className="text-xl font-black text-slate-900">{order.studentName}</h1><p className="mt-1 text-sm text-slate-500">Roll number: {order.rollNumber}</p>
          <ul className="mt-5 space-y-3">{order.items.map((item, index) => <li key={`${item.menuItemId}-${index}`} className="flex justify-between gap-3 text-sm"><span className="text-slate-700">{item.itemName} × {item.quantity}</span><span className="font-bold text-slate-900">{money(item.lineTotal)}</span></li>)}</ul>
          <div className="mt-4 flex justify-between border-t border-slate-100 pt-4 font-black"><span>Total</span><span>{money(order.total)}</span></div>
        </div>
        {order.status === 'Placed' && !order.readOnly && <button type="button" onClick={() => void handleCancel()} disabled={busy} className="mt-6 min-h-12 w-full rounded-2xl border border-red-200 font-extrabold text-red-700 hover:bg-red-50 disabled:opacity-50">{busy ? 'Cancelling…' : 'Cancel order'}</button>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm font-medium text-red-800">{error}</p>}
      </div>
    </section>
  </main>;
}
