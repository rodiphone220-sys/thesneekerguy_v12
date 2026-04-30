import React from 'react';
import { CreditCard, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Product, ExtraExpense } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { motion } from 'motion/react';

interface CreditCardManagerProps {
  products: Product[];
  extraExpenses?: ExtraExpense[];
}

export function CreditCardManager({ products, extraExpenses = [] }: CreditCardManagerProps) {
  const cardUsage = React.useMemo(() => {
    const cards: Record<string, { used: number; limit: number; transactions: number }> = {
      'AMEX CORPORATE': { used: 0, limit: 50000, transactions: 0 },
      'VISA BUSINESS': { used: 0, limit: 30000, transactions: 0 },
      'MASTERCARD BLACK': { used: 0, limit: 25000, transactions: 0 },
      'CITI PREMIER': { used: 0, limit: 20000, transactions: 0 },
    };

    products.forEach(p => {
      const card = p.card || 'OTHER';
      if (cards[card]) {
        cards[card].used += p.buyPriceMxn;
        cards[card].transactions += 1;
      } else {
        if (!cards['OTHER']) {
          cards['OTHER'] = { used: 0, limit: 10000, transactions: 0 };
        }
        cards['OTHER'].used += p.buyPriceMxn;
        cards['OTHER'].transactions += 1;
      }
    });

    extraExpenses.forEach(e => {
      if (e.card && cards[e.card]) {
        cards[e.card].used += e.amount;
        cards[e.card].transactions += 1;
      }
    });

    return Object.entries(cards).map(([name, data]) => {
      const used = data.used;
      const limit = data.limit;
      return {
        name,
        used,
        limit,
        transactions: data.transactions,
        available: limit - used,
        utilization: (used / limit) * 100
      };
    });
  }, [products, extraExpenses]);

  const totalUsed = cardUsage.reduce((acc, c) => acc + c.used, 0);
  const totalLimit = cardUsage.reduce((acc, c) => acc + c.limit, 0);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-ink rounded-lg">
            <CreditCard size={18} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-brand-ink">Gestor de Tarjetas</h3>
            <p className="text-[10px] text-brand-muted">Límites y utilización</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 px-4 py-2 bg-brand-bg rounded-xl border border-brand-border">
          <div className="text-right">
            <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest block">Total Usado</span>
            <span className="text-sm font-black text-brand-ink">{formatCurrency(totalUsed)}</span>
          </div>
          <div className="w-px h-8 bg-brand-border" />
          <div className="text-right">
            <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest block">Límite Total</span>
            <span className="text-sm font-black text-brand-ink">{formatCurrency(totalLimit)}</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cardUsage.map(card => (
          <motion.div
            key={card.name}
            whileHover={{ y: -2 }}
            className={cn(
              "p-6 rounded-2xl border-2 transition-all",
              card.utilization > 80 
                ? "border-red-200 bg-red-50" 
                : card.utilization > 50 
                  ? "border-orange-200 bg-orange-50"
                  : "border-brand-border bg-white"
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  card.name.includes('AMEX') ? "bg-green-600" :
                  card.name.includes('VISA') ? "bg-blue-600" :
                  card.name.includes('MASTER') ? "bg-orange-600" :
                  "bg-brand-ink"
                )}>
                  <CreditCard size={16} className="text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-brand-ink text-sm">{card.name}</h4>
                  <p className="text-[9px] text-brand-muted">{card.transactions} transacciones</p>
                </div>
              </div>
              {card.utilization > 80 && (
                <AlertCircle size={18} className="text-red-500" />
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest block">Usado</span>
                  <span className="text-lg font-black text-brand-ink">{formatCurrency(card.used)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-brand-muted uppercase tracking-widest block">Disponible</span>
                  <span className={cn(
                    "text-lg font-black",
                    card.available < 5000 ? "text-red-600" : "text-green-600"
                  )}>
                    {formatCurrency(card.available)}
                  </span>
                </div>
              </div>

              <div className="relative h-2 bg-brand-bg rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "absolute left-0 top-0 h-full rounded-full transition-all",
                    card.utilization > 80 ? "bg-red-500" :
                    card.utilization > 50 ? "bg-orange-500" :
                    "bg-brand-accent"
                  )}
                  style={{ width: `${Math.min(card.utilization, 100)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[9px] font-bold">
                <span className="text-brand-muted">{Math.round(card.utilization)}% usado</span>
                <span className="text-brand-muted">Límite: {formatCurrency(card.limit)}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {totalUsed > totalLimit && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle size={18} className="text-red-600" />
          <p className="text-sm font-bold text-red-600">
            Advertencia: Has excedido el límite total de tarjetas ({formatCurrency(totalUsed)} / {formatCurrency(totalLimit)})
          </p>
        </div>
      )}
    </div>
  );
}