import React from 'react';
import { X, Plus, DollarSign, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExtraExpense } from '../types';
import { cn } from '../lib/utils';

interface ExtraExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expense: ExtraExpense) => void;
}

export function ExtraExpensesModal({ isOpen, onClose, onSave }: ExtraExpensesModalProps) {
  const [expense, setExpense] = React.useState<Partial<ExtraExpense>>({
    name: '',
    amount: 0,
    currency: 'USD',
    category: 'ENVIO',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const handleSave = () => {
    if (!expense.name || !expense.amount) return;
    
    const newExpense: ExtraExpense = {
      id: Date.now().toString(),
      name: expense.name!,
      amount: expense.amount!,
      currency: expense.currency || 'USD',
      category: expense.category || 'ENVIO',
      date: expense.date || new Date().toISOString().split('T')[0],
      notes: expense.notes,
      card: expense.card
    };
    
    onSave(newExpense);
    setExpense({
      name: '',
      amount: 0,
      currency: 'USD',
      category: 'ENVIO',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    onClose();
  };

  const categories = ['ENVIO', 'ALMACENAJE', 'COMISION', 'IMPUESTO', 'OTRO'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="flex items-center justify-between p-6 border-b border-brand-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-ink rounded-lg text-white">
                  <DollarSign size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-brand-ink">Agregar Gasto Extra</h3>
                  <p className="text-[10px] text-brand-muted">Costo adicional al inventario</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-brand-bg rounded-lg transition-colors">
                <X size={18} className="text-brand-muted" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Descripción</label>
                <input
                  type="text"
                  value={expense.name || ''}
                  onChange={e => setExpense({ ...expense, name: e.target.value })}
                  placeholder="Ej: Envío a México, Comisión..."
                  className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm font-bold text-brand-ink outline-none focus:border-brand-ink transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Monto</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={expense.amount || ''}
                      onChange={e => setExpense({ ...expense, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm font-bold text-brand-ink outline-none focus:border-brand-ink transition-all pl-8"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted font-bold text-sm">
                      {expense.currency === 'USD' ? '$' : '$'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Moneda</label>
                  <select
                    value={expense.currency || 'USD'}
                    onChange={e => setExpense({ ...expense, currency: e.target.value as 'USD' | 'MXN' })}
                    className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm font-bold text-brand-ink outline-none focus:border-brand-ink transition-all"
                  >
                    <option value="USD">USD - Dólar</option>
                    <option value="MXN">MXN - Peso</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Categoría</label>
                  <select
                    value={expense.category || 'ENVIO'}
                    onChange={e => setExpense({ ...expense, category: e.target.value })}
                    className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm font-bold text-brand-ink outline-none focus:border-brand-ink transition-all"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Fecha</label>
                  <input
                    type="date"
                    value={expense.date || ''}
                    onChange={e => setExpense({ ...expense, date: e.target.value })}
                    className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm font-bold text-brand-ink outline-none focus:border-brand-ink transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">Notas (Opcional)</label>
                <textarea
                  value={expense.notes || ''}
                  onChange={e => setExpense({ ...expense, notes: e.target.value })}
                  placeholder="Detalles adicionales..."
                  className="w-full px-4 py-3 bg-brand-bg border border-brand-border rounded-xl text-sm font-bold text-brand-ink outline-none focus:border-brand-ink transition-all resize-none h-20"
                />
              </div>
            </div>

            <div className="flex gap-4 p-6 border-t border-brand-border">
              <button
                onClick={onClose}
                className="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest text-brand-muted hover:text-brand-ink transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!expense.name || !expense.amount}
                className="flex-1 py-3 bg-brand-ink text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Agregar Gasto
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}