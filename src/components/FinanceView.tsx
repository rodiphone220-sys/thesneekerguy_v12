import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Wallet, 
  BarChart3, 
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Clock as ClockIcon,
  Package,
  Plus,
  CreditCard,
  X
} from 'lucide-react';
import { Product, ExtraExpense } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion } from 'framer-motion';

interface FinanceViewProps {
  products: Product[];
  viewType?: 'visual' | 'excel';
  globalMarkup?: number;
  onUpdateMarkup?: (val: number) => void;
}

export function FinanceView({ products, viewType = 'visual', globalMarkup = 35, onUpdateMarkup }: FinanceViewProps) {
  const [activeTab, setActiveTab] = React.useState<'summary' | 'cards'>('summary');
  const [extraExpenses, setExtraExpenses] = React.useState<ExtraExpense[]>([]);
  const [isExtraModalOpen, setIsExtraModalOpen] = React.useState(false);
  const chartRef = React.useRef<HTMLDivElement>(null);
  const pieRef = React.useRef<HTMLDivElement>(null);

  const stats = React.useMemo(() => {
    const totalCostoUsd = products.reduce((acc, p) => acc + (p.buyPriceUsd * (p.quantity || 1)), 0);
    const totalCostoMxn = products.reduce((acc, p) => acc + (p.buyPriceMxn * (p.quantity || 1)), 0);
    const extraUsd = extraExpenses.filter(e => e.currency === 'USD').reduce((acc, e) => acc + e.amount, 0);
    const extraMxn = extraExpenses.filter(e => e.currency === 'MXN').reduce((acc, e) => acc + e.amount, 0);
    const exchangeRate = products[0]?.exchangeRate || 18;
    
    const totalVentaMxn = products.reduce((acc, p) => acc + ((p.sellPriceMxn || 0) * (p.quantity || 1)), 0);
    const totalUtilidad = products.reduce((acc, p) => acc + ((p.profit || 0) * (p.quantity || 1)), 0);
    
    const categoryData: Record<string, { name: string, value: number }> = {};
    products.forEach(p => {
      const cat = p.category || 'Otros';
      if (!categoryData[cat]) categoryData[cat] = { name: cat, value: 0 };
      categoryData[cat].value += (p.buyPriceMxn * (p.quantity || 1));
    });
    const categoryChartData = Object.values(categoryData).sort((a, b) => b.value - a.value);

    const statusData = [
      { name: 'Comprado', value: products.filter(p => p.currentStatus === 'COMPRADO').reduce((acc, p) => acc + (p.quantity || 0), 0) },
      { name: 'Tránsito', value: products.filter(p => p.currentStatus === 'EN_RUTA').reduce((acc, p) => acc + (p.quantity || 0), 0) },
      { name: 'En Stock', value: products.filter(p => p.currentStatus === 'EN_BODEGA').reduce((acc, p) => acc + (p.quantity || 0), 0) },
      { name: 'Entregado', value: products.filter(p => p.currentStatus === 'ENTREGADO').reduce((acc, p) => acc + (p.quantity || 0), 0) },
    ];
    const totalUnits = statusData.reduce((acc, s) => acc + s.value, 0);

    return {
      totalCostoUsd: totalCostoUsd + extraUsd,
      totalCostoMxn: totalCostoMxn + extraMxn + (extraUsd * exchangeRate),
      totalVentaMxn,
      totalUtilidad: totalUtilidad - (extraMxn + (extraUsd * exchangeRate)),
      categoryChartData,
      statusData,
      totalUnits
    };
  }, [products, extraExpenses]);

  const COLORS = ['#141414', '#5A5A40', '#F27D26', '#00FF00', '#FF4E00', '#5A5A40'];

  const handleAddExpense = (expense: ExtraExpense) => {
    setExtraExpenses(prev => [expense, ...prev]);
    setIsExtraModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-ink">Resumen Financiero</h2>
          <p className="text-sm text-brand-muted font-medium">Análisis de inversión y rentabilidad</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-brand-bg p-1 rounded-xl border border-brand-border">
            <button 
              onClick={() => setActiveTab('summary')}
              className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter", activeTab === 'summary' ? "bg-brand-ink text-white" : "text-brand-muted")}
            >
              Resumen
            </button>
            <button 
              onClick={() => setActiveTab('cards')}
              className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-tighter", activeTab === 'cards' ? "bg-brand-ink text-white" : "text-brand-muted")}
            >
              Tarjetas
            </button>
          </div>
          
          <button 
            onClick={() => setIsExtraModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-ink text-white rounded-xl font-black text-[10px] uppercase tracking-widest"
          >
            <Plus size={14} /> Gastos Extra
          </button>
        </div>
      </header>

      {activeTab === 'cards' ? (
        <CreditCardManagerWithExpenses products={products} extraExpenses={extraExpenses} />
      ) : viewType === 'excel' ? (
        <div className="bg-brand-surface border border-brand-border rounded-xl overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-brand-ink text-brand-bg">
                <th className="px-4 py-3 text-left font-bold">SKU</th>
                <th className="px-4 py-3 text-left font-bold">Artículo</th>
                <th className="px-4 py-3 text-left font-bold">Costo USD</th>
                <th className="px-4 py-3 text-right font-bold">Costo MXN</th>
                <th className="px-4 py-3 text-right font-bold">Venta MXN</th>
                <th className="px-4 py-3 text-right font-bold">Utilidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-brand-bg/50">
                  <td className="px-4 py-3 font-mono text-brand-muted">{p.sku}</td>
                  <td className="px-4 py-3 font-bold text-brand-ink">{p.name}</td>
                  <td className="px-4 py-3 font-mono">{formatCurrency(p.buyPriceUsd)}</td>
                  <td className="px-4 py-3 text-right font-mono">${Math.round(p.buyPriceMxn).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold">${Math.round(p.sellPriceMxn || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-green-600">${Math.round(p.profit || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <FinanceCard title="Inv. USD" value={formatCurrency(stats.totalCostoUsd)} icon={<DollarSign size={16} />} color="bg-brand-surface" />
            <FinanceCard title="Inv. MXN" value={`$${Math.round(stats.totalCostoMxn).toLocaleString()}`} icon={<Wallet size={16} />} color="bg-white" />
            <FinanceCard title="Venta Proy." value={`$${Math.round(stats.totalVentaMxn).toLocaleString()}`} icon={<TrendingUp size={16} />} color="bg-white" />
            <FinanceCard title="Utilidad" value={`$${Math.round(stats.totalUtilidad).toLocaleString()}`} icon={<Calculator size={16} />} color="bg-white" highlight />
          </div>

          <div id="pricing-manager" className="bg-brand-ink text-white rounded-2xl p-6 lg:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold uppercase flex items-center gap-2">
                  <Calculator size={20} className="text-brand-accent" />
                  Precios Sugeridos
                </h3>
                <p className="text-sm text-gray-400">Define un margen base para el precio sugerido.</p>
              </div>
              <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 block mb-1">Margen Base</span>
                  <input 
                    type="number" 
                    value={globalMarkup}
                    onChange={(e) => onUpdateMarkup?.(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-transparent text-3xl font-bold text-brand-accent outline-none border-b-2 border-brand-accent/30"
                  />
                  <span className="text-3xl font-bold text-brand-accent">%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div ref={chartRef} className="lg:col-span-2 bg-brand-surface border border-brand-border rounded-xl p-6">
              <h3 className="text-sm font-bold text-brand-ink mb-4 flex items-center gap-2">
                <BarChart3 size={16} /> Inversión por Categoría
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v/1000}k`} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {stats.categoryChartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div ref={pieRef} className="bg-brand-surface border border-brand-border rounded-xl p-6">
              <h3 className="text-sm font-bold text-brand-ink mb-4 flex items-center gap-2">
                <PieChartIcon size={16} /> Stock: {stats.totalUnits} uds
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={stats.statusData} innerRadius={60} outerRadius={80} dataKey="value">
                      {stats.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2 mt-4">
                {stats.statusData.map((item, idx) => (
                  <div key={item.name} className="flex justify-between text-xs font-bold">
                    <div className="flex items-center gap-2 text-brand-muted">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[idx] }} />
                      {item.name}
                    </div>
                    <span>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {isExtraModalOpen && (
        <ExpenseModal onClose={() => setIsExtraModalOpen(false)} onSave={handleAddExpense} />
      )}
    </div>
  );
}

function FinanceCard({ title, value, icon, color, highlight }: { title: string; value: string; icon: React.ReactNode; color: string; highlight?: boolean }) {
  return (
    <motion.div whileHover={{ y: -5 }} className={cn("p-4 rounded-xl border border-brand-border", color, "shadow-[0_2px_10px_rgba(0,0,0,0.02)]")}>
      <div className="flex justify-between mb-2">
        <div className="p-2 bg-brand-bg rounded-lg">{icon}</div>
      </div>
      <p className="text-[10px] font-bold text-brand-muted uppercase">{title}</p>
      <h3 className={cn("text-xl font-black", highlight && "text-brand-accent")}>{value}</h3>
    </motion.div>
  );
}

function CreditCardManagerWithExpenses({ products, extraExpenses = [] }: { products: Product[], extraExpenses?: ExtraExpense[] }) {
  const cardUsage = React.useMemo(() => {
    const cards: Record<string, { used: number; limit: number; transactions: number }> = {
      'AMEX CORPORATE': { used: 0, limit: 50000, transactions: 0 },
      'VISA BUSINESS': { used: 0, limit: 30000, transactions: 0 },
      'MASTERCARD BLACK': { used: 0, limit: 25000, transactions: 0 },
      'CITI PREMIER': { used: 0, limit: 20000, transactions: 0 },
    };
    products.forEach(p => {
      const card = p.card || 'OTHER';
      if (cards[card]) cards[card].used += p.buyPriceMxn;
    });
    return Object.entries(cards).map(([name, data]) => ({
      name, ...data, available: data.limit - data.used, utilization: (data.used / data.limit) * 100
    }));
  }, [products]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cardUsage.map(card => (
        <motion.div key={card.name} whileHover={{ y: -2 }} className={cn("p-6 rounded-xl border", card.utilization > 80 ? "border-red-200 bg-red-50" : "border-brand-border bg-white")}>
          <div className="flex justify-between mb-4">
            <h4 className="font-bold">{card.name}</h4>
            <span className="text-sm font-bold">{Math.round(card.utilization)}%</span>
          </div>
          <div className="h-2 bg-brand-bg rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full", card.utilization > 80 ? "bg-red-500" : "bg-brand-accent")} style={{ width: `${Math.min(card.utilization, 100)}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs font-bold text-brand-muted">
            <span>Usado: ${Math.round(card.used).toLocaleString()}</span>
            <span>Disp: ${Math.round(card.available).toLocaleString()}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function ExpenseModal({ onClose, onSave }: { onClose: () => void, onSave: (e: ExtraExpense) => void }) {
  const [expense, setExpense] = React.useState({ name: '', amount: 0, currency: 'USD' as const, category: 'ENVIO', date: '', notes: '' });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">Gastos Extra</h3>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <input type="text" placeholder="Descripción" className="w-full p-3 border rounded-xl mb-3" value={expense.name} onChange={e => setExpense({ ...expense, name: e.target.value })} />
        <div className="flex gap-2 mb-4">
          <input type="number" placeholder="Monto" className="flex-1 p-3 border rounded-xl" value={expense.amount || ''} onChange={e => setExpense({ ...expense, amount: parseFloat(e.target.value) || 0 })} />
          <select className="p-3 border rounded-xl" value={expense.currency} onChange={e => setExpense({ ...expense, currency: e.target.value as 'USD' | 'MXN' })}>
            <option value="USD">USD</option>
            <option value="MXN">MXN</option>
          </select>
        </div>
        <button onClick={() => onSave({ id: Date.now().toString(), ...expense, date: expense.date || new Date().toISOString().split('T')[0] })} className="w-full py-3 bg-brand-ink text-white rounded-xl font-bold">Agregar</button>
      </motion.div>
    </motion.div>
  );
}