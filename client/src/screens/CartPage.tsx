import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { submitOrder } from '../lib/api';
import { useCart } from '../state/CartContext';
import { useCanteenData } from '../state/CanteenDataContext';

const money = (amount: number) => `₹${amount}`;

export default function CartPage() {
  const { lines, itemCount, total, decrement, increment, remove, clear, notice, clearNotice } = useCart();
  const navigate = useNavigate();
  const { orderingStatus, loading, error, refresh } = useCanteenData();
  const [studentName, setStudentName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <main className="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center px-5 text-center"><span className="animate-pulse text-4xl" aria-hidden="true">🛒</span><h1 className="mt-4 text-2xl font-extrabold text-slate-900">Loading your cart…</h1></main>;
  if (error) return <main className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-5 text-center"><span aria-hidden="true" className="text-4xl">⚠️</span><h1 className="mt-4 text-2xl font-extrabold text-slate-900">We couldn’t load your cart</h1><p className="mt-2 text-slate-600">{error}</p><button type="button" onClick={() => void refresh()} className="mt-5 min-h-11 rounded-full bg-canteen px-5 font-bold text-white">Try again</button></main>;

  const isOpen = orderingStatus?.isOpen ?? false;
  const nameError = submitted && !studentName.trim();
  const rollError = submitted && !rollNumber.trim();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
    setValidationMessage(null);
    setSuccessMessage(null);
    if (!lines.length) {
      setValidationMessage('Add at least one item before continuing.');
      return;
    }
    if (!studentName.trim() || !rollNumber.trim()) {
      setValidationMessage('Please enter your name and roll number.');
      return;
    }
    if (!isOpen) {
      setValidationMessage('Ordering is closed right now. Please come back during canteen hours.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitOrder({ requestId: crypto.randomUUID(), studentName: studentName.trim(), rollNumber: rollNumber.trim(), items: lines.map(({ item, quantity }) => ({ id: item.id, quantity })) });
      localStorage.setItem('canteen-queue-last-order-id', result.order.id);
      clear();
      navigate(`/order/${result.order.id}`);
    } catch (err) {
      setValidationMessage(err instanceof Error ? err.message : 'Unable to place your order. Please try again.');
    } finally { setSubmitting(false); }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 pb-10 pt-6 sm:px-6 sm:pt-9">
      <div className="mb-6">
        <Link to="/" className="inline-flex min-h-10 items-center gap-2 rounded-full px-2 text-sm font-bold text-orange-800 hover:bg-orange-100">‹ Back to menu</Link>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Your cart</h1>
        <p className="mt-1 text-slate-600">Check your items before you continue.</p>
      </div>

      {!isOpen && <div role="status" className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"><p className="font-extrabold">Ordering closed</p><p className="mt-0.5 text-sm">The canteen accepts orders from 9:00 AM until 4:45 PM.</p></div>}
      {notice && <div role="status" className="mb-5 flex items-center justify-between gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-950"><span>{notice}</span><button type="button" onClick={clearNotice} className="font-bold underline">Dismiss</button></div>}

      {lines.length === 0 ? (
        <section className="rounded-3xl border border-orange-100 bg-white px-5 py-12 text-center shadow-sm sm:px-10">
          <span className="text-5xl" aria-hidden="true">🛒</span>
          <h2 className="mt-4 text-2xl font-extrabold text-slate-900">Your cart is empty</h2>
          <p className="mt-2 text-slate-600">Pick something tasty from the menu to get started.</p>
          <Link to="/" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-canteen px-6 font-bold text-white hover:bg-orange-600">Browse the menu</Link>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
          <section aria-label="Cart items" className="space-y-3">
            {lines.map(({ item, quantity }) => (
              <article key={item.id} className="flex items-center gap-3 rounded-3xl border border-orange-100 bg-white p-3 shadow-sm sm:gap-4 sm:p-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-3xl sm:h-20 sm:w-20 sm:text-4xl" aria-hidden="true">{item.emoji}</div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-extrabold text-slate-900">{item.name}</h2>
                  <p className="mt-0.5 text-sm text-slate-600">{money(item.price)} each</p>
                  <p className="mt-1 font-extrabold text-slate-900">{money(item.price * quantity)}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div className="flex h-10 items-center rounded-full bg-orange-100 text-orange-900" aria-label={`${item.name} quantity`}>
                    <button type="button" onClick={() => decrement(item.id)} className="h-10 w-9 rounded-full text-lg font-bold hover:bg-orange-200" aria-label={`Remove one ${item.name}`}>−</button>
                    <span className="min-w-5 text-center text-sm font-extrabold">{quantity}</span>
                    <button type="button" onClick={() => increment(item.id)} disabled={quantity >= 10} className="h-10 w-9 rounded-full text-lg font-bold hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Add one ${item.name}`}>+</button>
                  </div>
                  <button type="button" onClick={() => remove(item.id)} aria-label={`Remove ${item.name}`} className="min-h-8 px-2 text-xs font-bold text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-red-700">Remove</button>
                </div>
              </article>
            ))}
            <div className="flex items-center justify-between rounded-2xl bg-orange-100/70 px-4 py-3 font-bold text-slate-800"><span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span><span>Subtotal · {money(total)}</span></div>
          </section>

          <form onSubmit={handleSubmit} noValidate className="h-fit rounded-3xl border border-orange-100 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-xl font-extrabold text-slate-900">Your details</h2>
            <p className="mt-1 text-sm text-slate-600">We’ll use these to label your order.</p>

            <label className="mt-5 block text-sm font-bold text-slate-800" htmlFor="student-name">Student name</label>
            <input id="student-name" autoComplete="name" value={studentName} onChange={(event) => { setStudentName(event.target.value); setSuccessMessage(null); }} aria-invalid={nameError} aria-describedby={nameError ? 'name-error' : undefined} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3.5 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100" placeholder="e.g. Aditi Sharma" />
            {nameError && <p id="name-error" className="mt-1.5 text-sm font-medium text-red-700">Please enter your name.</p>}

            <label className="mt-4 block text-sm font-bold text-slate-800" htmlFor="roll-number">Roll number</label>
            <input id="roll-number" autoComplete="off" value={rollNumber} onChange={(event) => { setRollNumber(event.target.value); setSuccessMessage(null); }} aria-invalid={rollError} aria-describedby={rollError ? 'roll-error' : undefined} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 px-3.5 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100" placeholder="e.g. CS24-018" />
            {rollError && <p id="roll-error" className="mt-1.5 text-sm font-medium text-red-700">Please enter your roll number.</p>}

            <div className="my-5 flex justify-between border-t border-slate-100 pt-4 text-lg font-black text-slate-900"><span>Total</span><span>{money(total)}</span></div>
            {validationMessage && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm font-medium text-red-800">{validationMessage}</p>}
            {successMessage && <p role="status" className="mb-3 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-800">{successMessage}</p>}
            <button type="submit" disabled={!lines.length || !isOpen || submitting} className="min-h-14 w-full rounded-2xl bg-canteen px-5 text-base font-extrabold text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none">{submitting ? 'Placing order…' : 'Place Order'}</button>
            <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">You won’t be charged online.</p>
          </form>
        </div>
      )}
    </main>
  );
}
