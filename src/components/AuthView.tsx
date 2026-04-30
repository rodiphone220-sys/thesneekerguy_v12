import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LogIn, 
  UserPlus, 
  Mail, 
  Lock, 
  ShieldCheck, 
  Smartphone, 
  Chrome,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ArrowRight,
  User,
  Fingerprint,
  Key
} from 'lucide-react';
import { AppUser, UserRole, UserPermission } from '../types';
import { cn } from '../lib/utils';

interface AuthViewProps {
  onLogin: (user: AppUser) => void;
}

const DEFAULT_PERMISSIONS: UserPermission[] = [
  { id: '1', name: 'Ver Inventario', description: 'Permite ver la lista de productos', module: 'inventory', action: 'read', isEnabled: true },
  { id: '2', name: 'Editar Inventario', description: 'Permite crear y editar productos', module: 'inventory', action: 'write', isEnabled: false },
  { id: '3', name: 'Ver Finanzas', description: 'Acceso a reportes financieros', module: 'finances', action: 'read', isEnabled: false },
  { id: '4', name: 'Ver Clientes', description: 'Acceso a gestión de clientes', module: 'customers', action: 'read', isEnabled: true },
  { id: '5', name: 'Mensajería', description: 'Uso del sistema de mensajes', module: 'messaging', action: 'read', isEnabled: true },
];

export function AuthView({ onLogin }: AuthViewProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    inviteCode: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleStep, setGoogleStep] = useState<'none' | 'naming'>('none');
  const [tempGoogleData, setTempGoogleData] = useState({ email: '', name: '', role: 'VENTAS' as UserRole, masterCode: '' });
  const [showWelcome, setShowWelcome] = useState<{ name: string; email: string; role: string; code: string } | null>(null);

  const generateIdCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const sendWelcomeEmail = (name: string, email: string, role: string, code: string) => {
    console.log(`%c[EMAIL ENVIADO A: ${email}]`, 'color: #2563eb; font-weight: bold;');
    console.log(`Asunto: ¡Bienvenido a StockMaster Pro!`);
    console.log(`Contenido: Hola ${name}, tu cuenta como ${role} ha sido activada. Código: ${code}`);
    setShowWelcome({ name, email, role, code });
  };

  const finalizeGoogleAuth = async (finalName: string, finalRole: UserRole) => {
    const storedUsers = JSON.parse(localStorage.getItem('stockmaster_users') || '[]');
    
    const existingUser = storedUsers.find((u: AppUser) => u.email === tempGoogleData.email);
    if (existingUser) {
      existingUser.lastLogin = new Date().toISOString();
      localStorage.setItem('stockmaster_users', JSON.stringify(storedUsers));
      onLogin(existingUser);
      return;
    }

    // Validate master code for non-MASTER users
    if (finalRole !== 'MASTER' && tempGoogleData.masterCode) {
      const masterUser = storedUsers.find((u: AppUser) => 
        u.role === 'MASTER' && u.idCode === tempGoogleData.masterCode
      );
      if (!masterUser) {
        setError('Código de Master inválido. Verifica e intenta de nuevo.');
        return;
      }
    }

    const idCode = generateIdCode();
    const newUser: AppUser = {
      id: 'google-' + Math.random().toString(36).substring(2, 9),
      email: tempGoogleData.email,
      name: finalName,
      role: finalRole,
      idCode: idCode,
      linkedToMaster: finalRole !== 'MASTER' ? tempGoogleData.masterCode : '',
      permissions: finalRole === 'MASTER' ? DEFAULT_PERMISSIONS.map(p => ({ ...p, isEnabled: true })) : DEFAULT_PERMISSIONS,
      createdAt: new Date().toISOString()
    };

    const updatedUsers = [...storedUsers, newUser];
    localStorage.setItem('stockmaster_users', JSON.stringify(updatedUsers));
    
    // Save to Google Sheets USUARIOS
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: newUser }),
      });
    } catch (e) {
      console.warn('[Auth] No se guardó en Sheets:', e);
    }
    
    sendWelcomeEmail(newUser.name, newUser.email, newUser.role, newUser.idCode);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const storedUsers = JSON.parse(localStorage.getItem('stockmaster_users') || '[]');
      
      if (mode === 'login') {
        const user = storedUsers.find((u: AppUser) => u.email === formData.email && u.password === formData.password);
        
        if (user) {
          user.lastLogin = new Date().toISOString();
          localStorage.setItem('stockmaster_users', JSON.stringify(storedUsers));
          onLogin(user);
        } else {
          setError('Credenciales inválidas. Por favor verifique su correo y contraseña.');
        }
      } else {
        if (storedUsers.some((u: AppUser) => u.email === formData.email)) {
          setError('Este correo ya está registrado.');
          setLoading(false);
          return;
        }

        const isAdmin = storedUsers.length === 0;
        const role: UserRole = isAdmin ? 'MASTER' : 'VENTAS';
        const idCode = generateIdCode();
        
        const newUser: AppUser = {
          id: Math.random().toString(36).substring(2, 11),
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: role,
          idCode: idCode,
          permissions: role === 'MASTER' ? DEFAULT_PERMISSIONS.map(p => ({ ...p, isEnabled: true })) : DEFAULT_PERMISSIONS,
          createdAt: new Date().toISOString()
        };

        const updatedUsers = [...storedUsers, newUser];
        localStorage.setItem('stockmaster_users', JSON.stringify(updatedUsers));
        
        sendWelcomeEmail(newUser.name, newUser.email, newUser.role, newUser.idCode);
      }
    } catch (err) {
      setError('Ocurrió un error en el sistema. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAccess = () => {
    const demoUser: AppUser = {
      id: 'demo-user',
      email: 'demo@stockmaster.pro',
      name: 'Invitado Demo',
      role: 'DEMO',
      idCode: 'DEMO-CODE',
      permissions: DEFAULT_PERMISSIONS,
      createdAt: new Date().toISOString()
    };
    onLogin(demoUser);
  };

  const handleGoogleAuth = () => {
    setLoading(true);
    setError(null);

    setTimeout(() => {
      const storedUsers = JSON.parse(localStorage.getItem('stockmaster_users') || '[]');
      const isFirstUser = storedUsers.length === 0;
      
      const mockGoogleEmail = "rodiphone220@gmail.com"; 
      
      const existingUser = storedUsers.find((u: AppUser) => u.email === mockGoogleEmail);
      
      if (existingUser) {
        onLogin(existingUser);
      } else {
        setTempGoogleData({
          email: mockGoogleEmail,
          name: 'Usuario Google',
          role: isFirstUser ? 'MASTER' : 'VENTAS'
        });
        setGoogleStep('naming');
      }
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-ink/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-brand-surface border border-brand-border rounded-[2.5rem] shadow-2xl p-8 relative z-10"
      >
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-brand-ink rounded-2xl flex items-center justify-center shadow-lg transform -rotate-6">
            <Fingerprint className="text-white" size={32} />
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl font-black text-brand-ink tracking-tight mb-2">StockMaster <span className="text-blue-600">Pro</span></h1>
          <p className="text-brand-muted text-sm font-medium">Logística Inteligente y Gestión Multi-Rol</p>
        </div>

        <AnimatePresence mode="wait">
          {showWelcome ? (
            <motion.div 
              key="welcome-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-6"
            >
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 shadow-inner">
                  <CheckCircle2 size={40} />
                </div>
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-black text-brand-ink uppercase">¡Registro Exitoso!</h2>
                <p className="text-[10px] text-green-600 font-black uppercase tracking-[0.2em]">Email de Bienvenida Enviado</p>
              </div>

              <div className="bg-brand-bg rounded-3xl p-6 text-left border border-brand-border space-y-4 shadow-sm">
                <div className="flex items-center gap-3 border-b border-brand-border pb-3">
                  <Mail className="text-brand-label" size={16} />
                  <span className="text-[10px] font-black text-brand-ink uppercase tracking-widest">{showWelcome.email}</span>
                </div>
                
                <div className="space-y-4 py-2">
                  <p className="text-xs font-bold text-brand-ink leading-relaxed">
                    Estimado/a <span className="text-blue-600">{showWelcome.name}</span>,
                  </p>
                  <p className="text-[10px] font-medium text-brand-muted leading-relaxed">
                    Es un placer darte la bienvenida a <span className="font-black text-brand-ink">StockMaster Pro</span>. Tu cuenta ha sido configurada exitosamente con el rol de <span className="font-black text-brand-ink uppercase tracking-tighter">{showWelcome.role}</span>.
                  </p>
                  <div className="bg-white p-4 rounded-2xl border border-brand-border text-center">
                    <p className="text-[9px] font-black text-brand-label uppercase tracking-widest mb-1">Tu Código Único</p>
                    <p className="text-xl font-mono font-black text-brand-ink tracking-widest">{showWelcome.code}</p>
                  </div>
                  <p className="text-[9px] font-medium text-brand-muted text-center italic">
                    Utiliza este código para vincular tus acciones con tu Administrador Maestro.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => {
                  const storedUsers = JSON.parse(localStorage.getItem('stockmaster_users') || '[]');
                  const user = storedUsers.find((u: AppUser) => u.email === showWelcome.email);
                  if (user) onLogin(user);
                }}
                className="w-full py-4 bg-brand-ink text-brand-bg rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:opacity-90 transition-all"
              >
                Ingresar al Sistema <ArrowRight size={18} />
              </button>
            </motion.div>
          ) : googleStep === 'naming' ? (
            <motion.div 
              key="google-naming"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <Chrome className="text-blue-600" size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Cuenta Conectada</p>
                  <p className="text-xs font-bold text-brand-ink">{tempGoogleData.email}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-brand-label uppercase tracking-widest ml-1">Confirma tu Nombre</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-label group-focus-within:text-brand-ink transition-colors" size={18} />
                    <input 
                      required
                      type="text"
                      className="w-full pl-12 pr-4 py-4 bg-brand-bg border-2 border-transparent rounded-2xl text-xs font-bold outline-none focus:border-brand-ink focus:bg-white transition-all text-brand-ink"
                      value={tempGoogleData.name}
                      onChange={e => setTempGoogleData({...tempGoogleData, name: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-brand-label uppercase tracking-widest ml-1">Tu Rol en el Sistema</label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-label" size={18} />
                    <select 
                      disabled={tempGoogleData.role === 'MASTER'}
                      className="w-full pl-12 pr-4 py-4 bg-brand-bg border-2 border-transparent rounded-2xl text-xs font-bold outline-none focus:border-brand-ink focus:bg-white transition-all appearance-none text-brand-ink disabled:opacity-70"
                      value={tempGoogleData.role}
                      onChange={e => setTempGoogleData({...tempGoogleData, role: e.target.value as UserRole})}
                    >
                      <option value="VENTAS">Ventas</option>
                      <option value="CONTABILIDAD">Contabilidad</option>
                      <option value="ATENCION">Atención Cliente</option>
                    </select>
                  </div>
                </div>

                {tempGoogleData.role !== 'MASTER' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-brand-label uppercase tracking-widest ml-1">Código del Master</label>
                    <div className="relative group">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-label group-focus-within:text-brand-ink transition-colors" size={18} />
                      <input 
                        required
                        type="text"
                        placeholder="Ej: 1ZI9CQ"
                        className="w-full pl-12 pr-4 py-4 bg-brand-bg border-2 border-transparent rounded-2xl text-xs font-bold outline-none focus:border-brand-ink focus:bg-white transition-all text-brand-ink placeholder:text-brand-muted"
                        value={tempGoogleData.masterCode}
                        onChange={e => setTempGoogleData({...tempGoogleData, masterCode: e.target.value.toUpperCase()})}
                      />
                    </div>
                    <p className="text-[9px] text-brand-muted font-medium ml-1">
                      Solicita este código a tu administrador Master
                    </p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => finalizeGoogleAuth(tempGoogleData.name, tempGoogleData.role)}
                className="w-full py-4 bg-brand-ink text-brand-bg rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:opacity-90 transition-all"
              >
                Comenzar ahora <ArrowRight size={18} />
              </button>
            </motion.div>
          ) : (
            <motion.div key="auth-form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex bg-brand-bg p-1 rounded-2xl border border-brand-border mb-8 shadow-inner">
                <button 
                  onClick={() => { setMode('login'); setError(null); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    mode === 'login' ? "bg-white text-brand-ink shadow-sm" : "text-brand-label hover:text-brand-ink"
                  )}
                >
                  Iniciar Sesión
                </button>
                <button 
                  onClick={() => { setMode('register'); setError(null); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                    mode === 'register' ? "bg-white text-brand-ink shadow-sm" : "text-brand-label hover:text-brand-ink"
                  )}
                >
                  Registrarse
                </button>
              </div>

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-50 border border-red-100 rounded-xl p-4 mb-6 flex items-start gap-3"
                  >
                    <AlertTriangle className="text-red-500 shrink-0" size={18} />
                    <p className="text-xs font-bold text-red-600 leading-relaxed">{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={handleAuth} className="space-y-4">
                {mode === 'register' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-brand-label uppercase tracking-widest ml-1">Nombre Completo</label>
                    <div className="relative group">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-label group-focus-within:text-brand-ink transition-colors" size={18} />
                      <input 
                        required
                        type="text"
                        placeholder="Tu nombre aquí..."
                        className="w-full pl-12 pr-4 py-4 bg-brand-bg border-2 border-transparent rounded-2xl text-xs font-bold outline-none focus:border-brand-ink focus:bg-white transition-all text-brand-ink"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-brand-label uppercase tracking-widest ml-1">Correo Electrónico</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-label group-focus-within:text-brand-ink transition-colors" size={18} />
                    <input 
                      required
                      type="email"
                      placeholder="ejemplo@stockmaster.com"
                      className="w-full pl-12 pr-4 py-4 bg-brand-bg border-2 border-transparent rounded-2xl text-xs font-bold outline-none focus:border-brand-ink focus:bg-white transition-all text-brand-ink"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-brand-label uppercase tracking-widest ml-1">Contraseña</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-label group-focus-within:text-brand-ink transition-colors" size={18} />
                    <input 
                      required
                      type="password"
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-4 bg-brand-bg border-2 border-transparent rounded-2xl text-xs font-bold outline-none focus:border-brand-ink focus:bg-white transition-all text-brand-ink"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={loading}
                  type="submit"
                  className="w-full py-4 bg-brand-ink text-brand-bg rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:opacity-90 transition-all disabled:opacity-50 mt-4"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      {mode === 'login' ? 'Acceder al Sistema' : 'Crear mi Cuenta'}
                      <ArrowRight size={18} />
                    </>
                  )}
                </motion.button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-brand-border"></div>
                </div>
                <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                  <span className="px-4 bg-brand-surface text-brand-label">O continuar con</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleGoogleAuth}
                  className="flex items-center justify-center gap-2 py-3.5 border-2 border-brand-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-ink hover:bg-brand-bg transition-all"
                >
                  <Chrome size={16} /> Google
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleDemoAccess}
                  className="flex items-center justify-center gap-2 py-3.5 border-2 border-brand-border rounded-2xl text-[10px] font-black uppercase tracking-widest text-brand-ink hover:bg-brand-bg transition-all"
                >
                  <Smartphone size={16} /> Demo
                </motion.button>
              </div>

              <p className="mt-10 text-center text-[10px] text-brand-muted font-bold leading-relaxed px-4">
                Al continuar, aceptas nuestros términos de servicio y políticas de seguridad multi-usuario.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}