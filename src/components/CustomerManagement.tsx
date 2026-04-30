import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  MoreHorizontal, 
  Trash2,
  Edit2,
  ExternalLink,
  Filter,
  ArrowUpRight,
  UserPlus,
  MessageSquare,
  FileText,
  ShieldCheck,
  Zap,
  ChevronRight,
  DollarSign,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer } from '../types';
import { cn, formatDate } from '../lib/utils';

interface CustomerManagementProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

export function CustomerManagement({ 
  customers, 
  onAddCustomer, 
  onUpdateCustomer, 
  onDeleteCustomer 
}: CustomerManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState<Partial<Customer>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    tipo_de_pago: 'Transferencia',
    notes: '',
    fecha_alta: new Date().toISOString(),
    total_pedidos: 0,
    total_comprado: 0
  });

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.id && c.id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) return;

    if (editingCustomer) {
      onUpdateCustomer({ ...editingCustomer, ...newCustomer } as Customer);
      setEditingCustomer(null);
    } else {
      const id = `CUST-${Date.now()}`;
      onAddCustomer({ 
        ...newCustomer, 
        id,
        fecha_alta: new Date().toISOString(),
        total_pedidos: 0,
        total_comprado: 0
      } as Customer);
    }
    
    setShowAddForm(false);
    setNewCustomer({
      name: '',
      email: '',
      phone: '',
      address: '',
      tipo_de_pago: 'Transferencia',
      notes: '',
    });
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setNewCustomer(customer);
    setShowAddForm(true);
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-brand-ink uppercase tracking-tight italic">
            Base de Datos de Clientes
          </h2>
          <p className="text-xs font-bold text-brand-muted uppercase tracking-[0.2em] flex items-center gap-2 mt-1">
            <Users size={14} className="text-brand-accent" />
            {customers.length} Registros activos en el sistema
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted group-focus-within:text-brand-ink transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nombre, email o WhatsApp..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3.5 bg-white border-2 border-brand-border rounded-2xl text-sm font-bold outline-none focus:border-brand-ink transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => { setEditingCustomer(null); setNewCustomer({ name: '', email: '', phone: '', address: '', tipo_de_pago: 'Transferencia', notes: '' }); setShowAddForm(true); }}
            className="flex items-center gap-2 bg-brand-ink text-white px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-ink/20"
          >
            <UserPlus size={18} /> Nuevo Cliente
          </button>
        </div>
      </div>

      {/* Customers List - Modern Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredCustomers.map((customer, index) => (
            <motion.div 
              key={customer.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.03 }}
              className="group bg-white border border-brand-border rounded-[32px] p-6 shadow-sm hover:shadow-2xl hover:border-brand-ink/10 transition-all relative overflow-hidden"
            >
              {/* Status Indicator */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-brand-accent/10 transition-colors" />
              
              <div className="flex flex-col md:flex-row gap-6 relative z-10">
                {/* Avatar / Initial */}
                <div className="w-16 h-16 rounded-2xl bg-brand-ink text-brand-bg flex items-center justify-center text-2xl font-black shrink-0 shadow-lg group-hover:rotate-3 transition-transform">
                  {customer.name.charAt(0)}
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-brand-accent uppercase tracking-widest bg-brand-accent/10 px-2 py-0.5 rounded">
                          {customer.id}
                        </span>
                        <span className="text-[10px] font-black text-brand-muted uppercase tracking-widest">
                          Alta: {customer.fecha_alta ? formatDate(customer.fecha_alta) : 'N/A'}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-brand-ink uppercase tracking-tight leading-none group-hover:text-brand-accent transition-colors">
                        {customer.name}
                      </h3>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => handleEdit(customer)}
                        className="p-2.5 bg-brand-bg border border-brand-border rounded-xl text-brand-muted hover:text-brand-ink hover:border-brand-ink transition-all"
                       >
                         <Edit2 size={16} />
                       </button>
                       <button 
                        onClick={() => onDeleteCustomer(customer.id)}
                        className="p-2.5 bg-brand-bg border border-brand-border rounded-xl text-brand-muted hover:text-red-500 hover:border-red-500 transition-all"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest flex items-center gap-1.5">
                        <Phone size={10} /> WhatsApp
                      </p>
                      <p className="text-xs font-bold text-brand-ink">{customer.phone}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest flex items-center gap-1.5">
                        <Mail size={10} /> Email
                      </p>
                      <p className="text-xs font-bold text-brand-ink truncate max-w-[150px]">{customer.email}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-brand-muted uppercase tracking-widest flex items-center gap-1.5">
                        <CreditCard size={10} /> Pago Preferido
                      </p>
                      <p className="text-xs font-bold text-brand-ink">{customer.tipo_de_pago || 'Transferencia'}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-brand-border/50">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                        <Zap size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand-ink leading-none">{customer.total_pedidos || 0}</p>
                        <p className="text-[8px] font-bold text-brand-muted uppercase tracking-widest">Pedidos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                        <DollarSign size={14} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-brand-ink leading-none">${customer.total_comprado || 0}</p>
                        <p className="text-[8px] font-bold text-brand-muted uppercase tracking-widest">Inversión</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      <MapPin size={12} className="text-brand-muted" />
                      <p className="text-[10px] font-bold text-brand-muted uppercase tracking-widest italic truncate max-w-[150px]">
                        {customer.address}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Overlay on Hover */}
              <div className="absolute inset-x-0 bottom-0 py-2 px-6 bg-brand-ink translate-y-full group-hover:translate-y-0 transition-transform flex items-center justify-between">
                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Ver Reporte Detallado</span>
                <ChevronRight size={16} className="text-white" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
              className="absolute inset-0 bg-brand-ink/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col"
            >
              <div className="p-6 sm:p-8 flex-shrink-0">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-brand-ink uppercase tracking-tight italic">
                      {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                    </h3>
                    <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em]">Registro CRM</p>
                  </div>
                  <button 
                    onClick={() => setShowAddForm(false)}
                    className="w-10 h-10 bg-brand-bg border border-brand-border rounded-2xl flex items-center justify-center text-brand-muted hover:text-brand-ink transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest ml-1">Nombre *</label>
                    <input 
                      required
                      type="text" 
                      value={newCustomer.name}
                      onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                      placeholder="Nombre completo"
                      className="w-full px-4 py-3 bg-brand-bg border-2 border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest ml-1">Teléfono</label>
                     <input 
                      type="text" 
                      value={newCustomer.phone}
                      onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})}
                      placeholder="WhatsApp"
                      className="w-full px-4 py-3 bg-brand-bg border-2 border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest ml-1">Correo</label>
                    <input 
                      type="email" 
                      value={newCustomer.email}
                      onChange={e => setNewCustomer({...newCustomer, email: e.target.value})}
                      placeholder="email@correo.com"
                      className="w-full px-4 py-3 bg-brand-bg border-2 border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                     <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest ml-1">Pago</label>
                     <select 
                      value={newCustomer.tipo_de_pago}
                      onChange={e => setNewCustomer({...newCustomer, tipo_de_pago: e.target.value})}
                      className="w-full px-4 py-3 bg-brand-bg border-2 border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink appearance-none transition-all"
                     >
                      <option value="Transferencia">Transferencia</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Tarjeta">Tarjeta</option>
                      <option value="Anticipo">Anticipo</option>
                     </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest ml-1">Dirección</label>
                  <input 
                    type="text" 
                    value={newCustomer.address}
                    onChange={e => setNewCustomer({...newCustomer, address: e.target.value})}
                    placeholder="Ciudad, Estado"
                    className="w-full px-4 py-3 bg-brand-bg border-2 border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink transition-all"
                  />
                </div>

                <div className="space-y-1">
<label className="text-[10px] font-black text-brand-muted uppercase tracking-widest ml-1">Notas</label>
                  <textarea 
                    rows={2}
                    value={newCustomer.notes}
                    onChange={e => setNewCustomer({...newCustomer, notes: e.target.value})}
                    placeholder="Notas del cliente..."
                    className="w-full px-4 py-3 bg-brand-bg border-2 border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink transition-all resize-none"
                  />
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full bg-brand-ink text-white py-4 rounded-2xl text-sm font-black uppercase tracking-[0.3em] shadow-lg hover:scale-[1.01] active:scale-95 transition-all"
                  >
                    {editingCustomer ? 'Actualizar' : 'Guardar Cliente'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
