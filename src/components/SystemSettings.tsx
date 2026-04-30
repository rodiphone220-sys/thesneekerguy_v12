import React from 'react';
import { 
  Bot, 
  MessageSquare, 
  Settings, 
  Save, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck,
  Zap,
  Info,
  Mail,
  Smartphone,
  Phone
} from 'lucide-react';
import { motion } from 'motion/react';
import { SystemSettings as SettingsType } from '../types';
import { cn } from '../lib/utils';

interface SystemSettingsProps {
  settings: SettingsType;
  onUpdateSettings: (settings: SettingsType) => void;
}

export function SystemSettings({ settings, onUpdateSettings }: SystemSettingsProps) {
  const [localSettings, setLocalSettings] = React.useState<SettingsType>(settings);
  const [isSaved, setIsSaved] = React.useState(false);

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleChange = (key: keyof SettingsType, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-4xl space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-brand-ink">Ajuste de Sistema</h2>
          <p className="text-sm text-brand-muted">Gestiona la automatización e inteligencia artificial del sistema</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSave}
          className={cn(
            "flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase italic tracking-tighter text-xs transition-all shadow-lg",
            isSaved ? "bg-green-600 text-white" : "bg-black text-white hover:scale-105"
          )}
        >
          {isSaved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {isSaved ? 'Guardado' : 'Guardar Cambios'}
        </motion.button>
      </div>

      {/* NEW SECTION: Communication and Reports */}
      <section className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-brand-border bg-brand-bg/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg text-white">
              <Smartphone size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-brand-ink">Comunicación y Reportes</h3>
              <p className="text-[10px] text-brand-muted font-medium">Configura canales de envío y recepción</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-bold text-brand-label uppercase tracking-widest px-1">
              <Smartphone size={12} /> WhatsApp de Envío (Formato: 521...)
            </label>
            <input 
              type="text"
              className="w-full p-4 bg-brand-bg border-none rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-ink transition-all text-brand-ink font-bold"
              value={localSettings.shareWhatsAppNumber || ''}
              onChange={e => handleChange('shareWhatsAppNumber', e.target.value)}
              placeholder="Ej: 521XXXXXXXXXX"
            />
            <p className="text-[9px] text-brand-muted px-1 italic">Número destino por defecto para compartir reportes.</p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-[10px] font-bold text-brand-label uppercase tracking-widest px-1">
              <Mail size={12} /> Email de Compartición
            </label>
            <input 
              type="email"
              className="w-full p-4 bg-brand-bg border-none rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-ink transition-all text-brand-ink font-bold"
              value={localSettings.shareEmailAddress || ''}
              onChange={e => handleChange('shareEmailAddress', e.target.value)}
              placeholder="ejemplo@correo.com"
            />
            <p className="text-[9px] text-brand-muted px-1 italic">Email receptor por defecto para los reportes CSV.</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Messenger AI Control */}
        <section className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-brand-border bg-brand-bg/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-ink rounded-lg text-brand-bg">
                <MessageSquare size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-brand-ink">Asistente de Mensajería</h3>
                <p className="text-[10px] text-brand-muted font-medium">Control primario de red neuronal</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-brand-ink">Activar IA en Chat</p>
                <p className="text-[10px] text-brand-muted">Habilitar respuestas automáticas</p>
              </div>
              <button 
                onClick={() => handleChange('isAiAssistantEnabled', !localSettings.isAiAssistantEnabled)}
                className={cn(
                  "w-12 h-6 rounded-full transition-all relative",
                  localSettings.isAiAssistantEnabled ? "bg-green-500" : "bg-brand-border"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  localSettings.isAiAssistantEnabled ? "right-1" : "left-1"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-brand-ink">Respondedor Primario</p>
                <p className="text-[10px] text-brand-muted">La IA responderá antes que el humano</p>
              </div>
              <button 
                 disabled={!localSettings.isAiAssistantEnabled}
                 onClick={() => handleChange('isAiPrimaryResponder', !localSettings.isAiPrimaryResponder)}
                 className={cn(
                   "w-12 h-6 rounded-full transition-all relative",
                   localSettings.isAiPrimaryResponder ? "bg-brand-accent" : "bg-brand-border",
                   !localSettings.isAiAssistantEnabled && "opacity-30 cursor-not-allowed"
                 )}
              >
                <div className={cn(
                  "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                  localSettings.isAiPrimaryResponder ? "right-1" : "left-1"
                )} />
              </button>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest px-1">Instrucciones Primarias (Brain Config)</label>
              <textarea 
                className="w-full h-32 p-4 bg-brand-bg border-none rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-ink transition-all text-brand-ink resize-none font-medium"
                value={localSettings.aiPrimaryPrompt}
                onChange={e => handleChange('aiPrimaryPrompt', e.target.value)}
                placeholder="Define el comportamiento de la IA en el chat..."
              />
              <div className="flex items-start gap-2 p-3 bg-brand-bg/50 rounded-lg border border-brand-border mt-2">
                <Info size={12} className="text-brand-muted mt-0.5" />
                <p className="text-[9px] text-brand-muted leading-relaxed">
                  <b>Tip:</b> Define el tono (profesional, alegre) y las giới hạn de respuesta. El sistema ya incluye lógica de satisfacción del cliente.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* General/Front-end AI */}
        <section className="bg-brand-surface border border-brand-border rounded-2xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-brand-border bg-brand-bg/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-400 rounded-lg text-black">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-brand-ink">Asistente General</h3>
                <p className="text-[10px] text-brand-muted font-medium">IA Frontal y Apoyo Interno</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest px-1">Prompt General del Sistema</label>
              <textarea 
                className="w-full h-32 p-4 bg-brand-bg border-none rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-ink transition-all text-brand-ink resize-none font-medium"
                value={localSettings.aiGeneralPrompt}
                onChange={e => handleChange('aiGeneralPrompt', e.target.value)}
                placeholder="Instrucciones para el asistente general..."
              />
            </div>

            <div className="pt-4 border-t border-brand-border">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-brand-ink rounded-full flex items-center justify-center text-brand-bg font-black italic text-sm">
                  S
                </div>
                <div>
                  <h4 className="font-bold text-xs text-brand-ink uppercase tracking-tight">Sneeky Bot (Chat Frontal)</h4>
                  <p className="text-[10px] text-brand-muted">Gestión de interacciones con el cliente final</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest px-1">Instrucciones Sneeky</label>
                <textarea 
                  className="w-full h-24 p-4 bg-brand-bg border-none rounded-xl text-xs outline-none focus:ring-1 focus:ring-brand-ink transition-all text-brand-ink resize-none font-medium"
                  value={localSettings.sneekyBotPrompt}
                  onChange={e => handleChange('sneekyBotPrompt', e.target.value)}
                  placeholder="Define la personalidad de Sneeky..."
                />
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-3 bg-brand-bg/30 border border-dashed border-brand-border rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
             <ShieldCheck size={24} />
          </div>
          <div className="max-w-md">
            <h4 className="font-bold text-sm text-brand-ink mb-1">Seguridad de Datos y IA</h4>
            <p className="text-[10px] text-brand-muted leading-relaxed">
              Toda la información procesada por los asistentes se mantiene dentro del contexto de tu sesión. Asegúrate de que las API Keys estén correctamente configuradas en el entorno.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
