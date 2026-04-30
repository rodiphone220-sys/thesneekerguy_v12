import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Key, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  XCircle,
  Search,
  Filter,
  ArrowRight,
  Fingerprint,
  Mail,
  User,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { AppUser, UserRole, UserPermission } from '../types';
import { cn } from '../lib/utils';

interface UserManagementProps {
  currentUser: AppUser;
}

const MODULES = [
  { id: 'inventory', name: 'Inventario', color: 'bg-blue-500' },
  { id: 'finances', name: 'Finanzas', color: 'bg-green-500' },
  { id: 'customers', name: 'Clientes', color: 'bg-orange-500' },
  { id: 'messaging', name: 'Mensajería', color: 'bg-purple-500' },
];

export function UserManagement({ currentUser }: UserManagementProps) {
  const [users, setUsers] = React.useState<AppUser[]>([]);
  const [isAddingUser, setIsAddingUser] = React.useState(false);
  const [editingUser, setEditingUser] = React.useState<AppUser | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    role: 'VENTAS' as UserRole
  });

  const loadUsers = () => {
    const allUsers = JSON.parse(localStorage.getItem('stockmaster_users') || '[]');
    setUsers(allUsers.filter((u: AppUser) => u.masterId === currentUser.id || u.role !== 'MASTER'));
  };

  React.useEffect(() => {
    loadUsers();
  }, []);

  const generateIdCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: AppUser = {
      id: Math.random().toString(36).substring(2, 11),
      name: formData.name,
      email: formData.email,
      password: formData.password,
      role: formData.role,
      idCode: generateIdCode(),
      masterId: currentUser.id,
      permissions: currentUser.permissions.map(p => ({ ...p, isEnabled: false })),
      createdAt: new Date().toISOString()
    };

    const allUsers = JSON.parse(localStorage.getItem('stockmaster_users') || '[]');
    localStorage.setItem('stockmaster_users', JSON.stringify([...allUsers, newUser]));
    
    setUsers([...users, newUser]);
    setIsAddingUser(false);
    setFormData({ name: '', email: '', password: '', role: 'VENTAS' });
  };

  const togglePermission = (userId: string, permissionId: string) => {
    const updatedUsers = users.map(u => {
      if (u.id === userId) {
        return {
          ...u,
          permissions: u.permissions.map(p => 
            p.id === permissionId ? { ...p, isEnabled: !p.isEnabled } : p
          )
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    
    const allUsers = JSON.parse(localStorage.getItem('stockmaster_users') || '[]');
    const finalUsers = allUsers.map((u: AppUser) => {
      const updated = updatedUsers.find(uu => uu.id === u.id);
      return updated || u;
    });
    localStorage.setItem('stockmaster_users', JSON.stringify(finalUsers));
  };

  const handleDeleteUser = (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
    
    const updatedUsers = users.filter(u => u.id !== id);
    setUsers(updatedUsers);

    const allUsers = JSON.parse(localStorage.getItem('stockmaster_users') || '[]');
    localStorage.setItem('stockmaster_users', JSON.stringify(allUsers.filter((u: AppUser) => u.id !== id)));
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.idCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-brand-ink tracking-tight uppercase">Gestión de Acceso</h2>
          <p className="text-brand-muted text-xs font-bold uppercase tracking-widest mt-1">Control de roles, códigos y permisos</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-label group-focus-within:text-brand-ink transition-colors" size={16} />
            <input 
              type="text"
              placeholder="Buscar por nombre, correo o código..."
              className="w-full pl-10 pr-4 py-2.5 bg-brand-surface border border-brand-border rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-brand-ink transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsAddingUser(true)}
            className="px-4 py-2.5 bg-brand-ink text-brand-bg rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-black/10"
          >
            <UserPlus size={16} /> <span className="hidden sm:inline">Nuevo Usuario</span>
          </motion.button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-brand-surface p-4 rounded-2xl border border-brand-border">
          <p className="text-[10px] font-black text-brand-label uppercase tracking-widest">Total Usuarios</p>
          <p className="text-2xl font-black text-brand-ink">{users.length}</p>
        </div>
        <div className="bg-brand-surface p-4 rounded-2xl border border-brand-border">
          <p className="text-[10px] font-black text-brand-label uppercase tracking-widest">Vendedores</p>
          <p className="text-2xl font-black text-brand-ink">{users.filter(u => u.role === 'VENTAS').length}</p>
        </div>
        <div className="bg-brand-surface p-4 rounded-2xl border border-brand-border">
          <p className="text-[10px] font-black text-brand-label uppercase tracking-widest">Contabilidad</p>
          <p className="text-2xl font-black text-brand-ink">{users.filter(u => u.role === 'CONTABILIDAD').length}</p>
        </div>
        <div className="bg-brand-surface p-4 rounded-2xl border border-brand-border">
          <p className="text-[10px] font-black text-brand-label uppercase tracking-widest">Atención</p>
          <p className="text-2xl font-black text-brand-ink">{users.filter(u => u.role === 'ATENCION').length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredUsers.map((user) => (
            <motion.div 
              key={user.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-brand-surface border border-brand-border rounded-2xl p-6 shadow-sm group hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg transform group-hover:rotate-6 transition-transform",
                    user.role === 'MASTER' ? 'bg-brand-ink' : 'bg-blue-500'
                  )}>
                    {user.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black text-brand-ink leading-none mb-1 uppercase">{user.name}</h3>
                    <p className="text-xs text-brand-muted font-bold truncate max-w-[150px]">{user.email}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className={cn(
                    "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter mb-2",
                    user.role === 'MASTER' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  )}>
                    {user.role}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] font-mono font-black text-brand-ink bg-brand-bg px-2 py-1 rounded border border-brand-border">
                    <Key size={10} className="text-brand-label" /> {user.idCode}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-brand-label uppercase tracking-widest">Permisos de Módulo</span>
                  <ShieldCheck size={14} className="text-brand-label" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {user.permissions.map((perm) => (
                    <button
                      key={perm.id}
                      onClick={() => togglePermission(user.id, perm.id)}
                      disabled={user.role === 'MASTER'}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-xl border transition-all",
                        perm.isEnabled 
                          ? "bg-brand-bg border-brand-ink/20 shadow-sm" 
                          : "bg-brand-bg/30 border-transparent text-brand-muted"
                      )}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-[9px] font-black uppercase tracking-tighter">{perm.name}</span>
                      </div>
                      {perm.isEnabled ? (
                        <CheckCircle2 size={16} className="text-green-600" />
                      ) : (
                        <XCircle size={16} className="text-brand-label/30" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-brand-border flex items-center justify-between">
                <div className="text-[9px] font-bold text-brand-muted italic">
                  Creado: {new Date(user.createdAt).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-brand-muted hover:text-brand-ink transition-colors">
                    <Edit2 size={16} />
                  </button>
                  {user.role !== 'MASTER' && (
                    <button 
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-red-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isAddingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingUser(false)}
              className="absolute inset-0 bg-brand-ink/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-brand-surface w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden relative z-10"
            >
              <div className="p-8 border-b border-brand-border bg-brand-bg/30">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-brand-ink rounded-2xl flex items-center justify-center text-white shadow-xl">
                    <UserPlus size={28} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-brand-ink uppercase">Nuevo Usuario</h2>
                    <p className="text-[10px] text-brand-muted font-black uppercase tracking-widest">Genera credenciales y códigos</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddUser} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-label uppercase tracking-widest ml-1">Nombre</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-label group-focus-within:text-brand-ink transition-colors" size={16} />
                      <input 
                        required
                        type="text"
                        className="w-full pl-11 pr-4 py-3.5 bg-brand-bg border-2 border-transparent rounded-2xl text-xs font-bold outline-none focus:border-brand-ink focus:bg-white transition-all text-brand-ink"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-label uppercase tracking-widest ml-1">Email</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-label group-focus-within:text-brand-ink transition-colors" size={16} />
                      <input 
                        required
                        type="email"
                        className="w-full pl-11 pr-4 py-3.5 bg-brand-bg border-2 border-transparent rounded-2xl text-xs font-bold outline-none focus:border-brand-ink focus:bg-white transition-all text-brand-ink"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-label uppercase tracking-widest ml-1">Contraseña</label>
                    <div className="relative group">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-label group-focus-within:text-brand-ink transition-colors" size={16} />
                      <input 
                        required
                        type="password"
                        className="w-full pl-11 pr-4 py-3.5 bg-brand-bg border-2 border-transparent rounded-2xl text-xs font-bold outline-none focus:border-brand-ink focus:bg-white transition-all text-brand-ink"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-label uppercase tracking-widest ml-1">Rol del Sistema</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-label" size={16} />
                      <select 
                        className="w-full pl-11 pr-4 py-3.5 bg-brand-bg border-2 border-transparent rounded-2xl text-xs font-bold outline-none focus:border-brand-ink focus:bg-white transition-all appearance-none text-brand-ink"
                        value={formData.role}
                        onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                      >
                        <option value="VENTAS">Ventas</option>
                        <option value="CONTABILIDAD">Contabilidad</option>
                        <option value="ATENCION">Atención Cliente</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center gap-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="flex-1 py-4 bg-brand-bg text-brand-muted rounded-2xl font-black text-xs uppercase tracking-widest hover:text-brand-ink transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 py-4 bg-brand-ink text-brand-bg rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-black/10 hover:opacity-90 transition-all flex items-center justify-center gap-2"
                  >
                    Crear y Generar Código <ArrowRight size={16} />
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