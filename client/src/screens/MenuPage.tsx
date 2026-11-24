import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../state/CartContext';
import { useCanteenData } from '../state/CanteenDataContext';

const money = (amount: number) => `₹${amount}`;

export default function MenuPage() {
  const { categories, menuItems, orderingStatus, loading, error, refresh } = useCanteenData();
  const { lines, itemCount, total, add, increment, decrement, notice, clearNotice } = useCart();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const quantities = useMemo(() => new Map(lines.map((line) => [line.item.id, line.quantity])), [lines]);
  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return menuItems.filter((item) => (
      (activeCategory === 'All' || item.category === activeCategory)
      && (!query || item.name.toLocaleLowerCase().includes(query))
    ));
  }, [menuItems, search, activeCategory]);

  if (loading) return <PageMessage title="Loading the menu…" body="Getting the latest menu and canteen hours." />;
  if (error) return <PageError message={error} onRetry={() => void refresh()} />;

  const isOpen = orderingStatus?.isOpen ?? false;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-28 pt-5 sm:px-6 sm:pt-8">
      <section className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-orange-700">Fresh from the counter</p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">Campus Canteen</h1>
          <p className="mt-1 text-sm text-slate-600">Good food, ready between classes.</p>
        </div>
        <span className={`inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-slate-500'}`} />
          {isOpen ? 'Open till 5 PM' : 'Currently closed'}
        </span>
      </section>

      {!isOpen && <ClosedBanner />}
      {notice && <Notice message={notice} onDismiss={clearNotice} />}

      <label className="relative block">
        <span className="sr-only">Search menu</span>
        <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-slate-400">⌕</span>
        <input
          className="w-full rounded-2xl border border-orange-100 bg-white py-3.5 pl-11 pr-4 text-base shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          type="search"
          placeholder="Search samosa, chai, dosa…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      <nav aria-label="Menu categories" className="sticky top-0 z-20 -mx-4 mt-4 flex gap-2 overflow-x-auto border-b border-orange-100 bg-orange-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        {['All', ...categories].map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={activeCategory === category}
            onClick={() => setActiveCategory(category)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition ${activeCategory === category ? 'bg-canteen text-white shadow-sm' : 'bg-white text-slate-700 hover:bg-orange-100'}`}
          >
            {category}
          </button>
        ))}
      </nav>

      {filteredItems.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-orange-200 bg-white px-6 py-12 text-center">
          <span className="text-4xl" aria-hidden="true">🔎</span>
          <h2 className="mt-3 text-xl font-bold text-slate-900">No items found</h2>
          <p className="mt-1 text-slate-600">Try another search or choose a different category.</p>
        </div>
      ) : (
        <section aria-label="Menu items" className="grid grid-cols-2 gap-3 pt-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {filteredItems.map((item) => {
            const quantity = quantities.get(item.id) ?? 0;
            const unavailable = !item.isAvailable || !isOpen;
            return (
              <article key={item.id} className={`flex min-w-0 flex-col rounded-3xl border bg-white p-3 shadow-sm transition sm:p-4 ${!item.isAvailable ? 'border-slate-200 opacity-60 grayscale' : 'border-orange-100 hover:-translate-y-0.5 hover:shadow-md'}`}>
                <div className="flex h-24 items-center justify-center rounded-2xl bg-orange-50 text-5xl sm:h-32 sm:text-6xl" aria-hidden="true">{item.emoji}</div>
                <div className="flex flex-1 flex-col pt-3">
                  <div className="flex items-start gap-2">
                    <h2 className="min-w-0 flex-1 text-base font-extrabold leading-snug text-slate-900 sm:text-lg">{item.name}</h2>
                    <span className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-sm border-2 p-0.5 ${item.isVegetarian ? 'border-emerald-600' : 'border-red-600'}`} aria-label={item.isVegetarian ? 'Vegetarian' : 'Non-vegetarian'}>
                      <span className={`block h-full w-full rounded-full ${item.isVegetarian ? 'bg-emerald-600' : 'bg-red-600'}`} />
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 min-h-10 text-xs leading-relaxed text-slate-600 sm:text-sm">{item.description}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <span className="text-lg font-black text-slate-900">{money(item.price)}</span>
                    {!item.isAvailable ? (
                      <button type="button" disabled className="min-h-10 cursor-not-allowed rounded-full bg-slate-100 px-2.5 text-xs font-bold text-slate-500 sm:text-sm">Sold out</button>
                    ) : quantity === 0 ? (
                      <button type="button" disabled={unavailable} onClick={() => add(item)} className="min-h-10 rounded-full bg-orange-100 px-3 text-sm font-bold text-orange-800 transition hover:bg-canteen hover:text-white disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">+ Add</button>
                    ) : (
                      <div className="flex min-h-10 items-center rounded-full bg-orange-100 text-orange-900" aria-label={`${item.name} quantity`}>
                        <button type="button" onClick={() => decrement(item.id)} className="h-10 w-9 rounded-full text-lg font-bold hover:bg-orange-200" aria-label={`Remove one ${item.name}`}>−</button>
                        <span className="min-w-5 text-center text-sm font-extrabold" aria-live="polite">{quantity}</span>
                        <button type="button" onClick={() => increment(item.id)} disabled={quantity >= 10 || unavailable} className="h-10 w-9 rounded-full text-lg font-bold hover:bg-orange-200 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Add one ${item.name}`}>+</button>
                      </div>
                    )}
                  </div>
                  {!item.isAvailable && <p className="sr-only">This item is sold out.</p>}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {itemCount > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-orange-100 bg-white/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:p-4">
          <Link to="/cart" className="mx-auto flex min-h-14 max-w-3xl items-center justify-between rounded-2xl bg-canteen px-5 text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600">
            <span className="font-bold">{itemCount} {itemCount === 1 ? 'item' : 'items'} · {money(total)}</span>
            <span className="font-extrabold">View cart <span aria-hidden="true">›</span></span>
          </Link>
        </div>
      )}
    </main>
  );
}

function PageMessage({ title, body }: { title: string; body: string }) {
  return <main className="mx-auto flex min-h-[55vh] max-w-3xl flex-col items-center justify-center px-5 text-center"><span className="animate-pulse text-4xl" aria-hidden="true">🍽️</span><h1 className="mt-4 text-2xl font-extrabold text-slate-900">{title}</h1><p className="mt-2 text-slate-600">{body}</p></main>;
}

function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <main className="mx-auto flex min-h-[55vh] max-w-xl flex-col items-center justify-center px-5 text-center"><span className="text-4xl" aria-hidden="true">⚠️</span><h1 className="mt-4 text-2xl font-extrabold text-slate-900">We couldn’t load the menu</h1><p className="mt-2 text-slate-600">{message}</p><button type="button" onClick={onRetry} className="mt-5 min-h-11 rounded-full bg-canteen px-5 font-bold text-white hover:bg-orange-600">Try again</button></main>;
}

function ClosedBanner() {
  return <div role="status" className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950"><span aria-hidden="true">🔒</span><div><p className="font-extrabold">Ordering closed</p><p className="text-sm">The canteen accepts orders from 9:00 AM until 4:45 PM.</p></div></div>;
}

function Notice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return <div role="status" className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-sky-50 px-4 py-3 text-sm text-sky-950"><span>{message}</span><button type="button" onClick={onDismiss} className="shrink-0 font-bold underline">Dismiss</button></div>;
}
