import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  Upload, 
  Search, 
  Sparkles, 
  Trash2, 
  ImageIcon, 
  Loader2,
  Check,
  CheckCircle2,
  Zap,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Maximize
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

// --- Hooks ---

/**
 * Hook to manage Object URL lifecycle
 */
export function useObjectURL(file: File | null) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }

    const newUrl = URL.createObjectURL(file);
    setUrl(newUrl);

    return () => {
      URL.revokeObjectURL(newUrl);
    };
  }, [file]);

  return url;
}

// --- Components ---

export interface OCRData {
  category: string;
  brand: string;
  name: string;
  color_description: string;
  gender: string;
  size: string;
  buyPriceUsd?: number;
}

interface LectorOCRProps {
  onScan: (file: File) => Promise<OCRData | void>;
  onUpdate: (data: Partial<OCRData>) => void;
  currentItem: any;
  isScanning: boolean;
}

export function LectorOCR({ onScan, onUpdate, currentItem, isScanning }: LectorOCRProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isUploadingBasic, setIsUploadingBasic] = useState(false);
  const previewUrl = useObjectURL(selectedFile);
  
  const imageUrls = currentItem.imageUrls || [];
  const displayImage = previewUrl || imageUrls[0] || '';

  const handleFile = (file: File) => {
    setSelectedFile(file);
    onScan(file);
  };

  const handlePaste = useCallback(async (e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || isScanning || isUploadingBasic) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const objectUrl = URL.createObjectURL(blob);
          const currentImages = currentItem.imageUrls || [];
          onUpdate({ imageUrls: [...currentImages, objectUrl] } as any);
          setSelectedFile(blob);
        }
        e.preventDefault();
      }
    }
  }, [isScanning, isUploadingBasic, currentItem, onUpdate]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleBaseImage = async (file: File) => {
    setIsUploadingBasic(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Error al subir imagen. Cloudinary no está configurado.');
        return;
      }
      if (data.link) {
        const currentImages = currentItem.imageUrls || [];
        onUpdate({ imageUrls: [...currentImages, data.link] } as any);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Error de conexión al subir imagen');
    } finally {
      setIsUploadingBasic(false);
    }
  };

  return (
    <div className="space-y-6">
      <ImageDropzone 
        onFileSelect={handleFile}
        displayImage={displayImage}
        isScanning={isScanning || isUploadingBasic}
        onReset={() => {
          setSelectedFile(null);
          onUpdate({ imageUrls: [] } as any);
        }}
        onZoom={() => setShowModal(true)}
      />

      <div className="grid grid-cols-2 gap-3">
        <motion.button
          whileHover={!isScanning ? { scale: 1.02 } : {}}
          whileTap={!isScanning ? { scale: 0.98 } : {}}
          type="button"
          disabled={isScanning || !displayImage}
          onClick={() => selectedFile && onScan(selectedFile)}
          className={cn(
            "py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-wider transition-all border-2",
            isScanning || !displayImage
              ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed" 
              : "bg-gradient-to-br from-[#10B981] to-[#3B82F6] border-white/20 text-white shadow-lg"
          )}
        >
          {isScanning ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          OCR AI
        </motion.button>

        <label className={cn(
          "py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-wider transition-all border-2 border-dashed cursor-pointer",
          isUploadingBasic ? "bg-brand-surface border-brand-ink" : "bg-white border-brand-border text-brand-ink hover:bg-brand-surface"
        )}>
          <input 
            type="file" 
            accept="image/*"
            className="hidden"
            disabled={isUploadingBasic}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleBaseImage(file);
            }}
          />
          {isUploadingBasic ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
          {isUploadingBasic ? "Subiendo..." : "Imagen Base"}
        </label>
      </div>

      <AnimatePresence>
        {showModal && displayImage && (
          <OCRModal 
            imageUrls={displayImage ? [displayImage] : []} 
            data={currentItem} 
            onUpdate={onUpdate}
            onClose={() => setShowModal(false)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ImageDropzone({ onFileSelect, displayImage, isScanning, onReset, onZoom }: { 
  onFileSelect: (file: File) => void, 
  displayImage: string | null, 
  isScanning: boolean,
  onReset: () => void,
  onZoom: () => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file);
    }
  };

  return (
    <div 
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      className={cn(
        "relative group aspect-square rounded-3xl border-2 border-dashed transition-all overflow-hidden shadow-inner",
        displayImage ? "border-brand-ink/10 bg-white" : "border-gray-200 bg-gray-50/50 hover:border-brand-ink/30"
      )}
    >
      {displayImage ? (
        <div className="absolute inset-0">
          <img 
            src={displayImage} 
            alt="Preview" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-[2px]">
            <button
              type="button"
              onClick={onZoom}
              className="p-3 rounded-full bg-white text-brand-ink shadow-xl hover:scale-110 transition-transform"
            >
              <Maximize2 size={20} />
            </button>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onReset();
              }}
              className="p-3 rounded-full bg-red-500 text-white hover:scale-110 transition-transform shadow-xl"
            >
              <Trash2 size={20} />
            </button>
          </div>
          
          {isScanning && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-brand-accent" size={40} />
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Analizando...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-white shadow-md border border-brand-border flex items-center justify-center text-brand-muted group-hover:text-brand-ink transition-all group-hover:rotate-6">
            {isScanning ? <Loader2 className="animate-spin" size={28} /> : <ImageIcon size={28} />}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-black text-brand-ink uppercase tracking-tight">Dropzone de Imagen</p>
            <p className="text-[10px] text-brand-muted font-bold tracking-widest uppercase">Arrastra, pega o selecciona</p>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-2.5 bg-brand-ink text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-brand-ink/90 transition-all shadow-xl active:scale-95"
          >
            Explorar
          </button>
          <input 
            type="file" 
            ref={fileInputRef}
            className="hidden" 
            accept="image/*" 
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) onFileSelect(file);
            }} 
          />
        </div>
      )}
    </div>
  );
}

export function OCRModal({ imageUrls = [], data, onUpdate, onClose, totalItems = 1, currentItemIndex = 1 }: {  
  imageUrls: string[],
  data: any, 
  onUpdate: (data: Partial<OCRData>) => void,
  onClose: () => void,
  totalItems?: number,
  currentItemIndex?: number
}) {
  const [zoom, setZoom] = useState(100);
  
return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-2 md:p-4"
    >
      <motion.div 
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        className="w-full h-full max-w-[95vw] max-h-[95vh] flex flex-col bg-[#0F0F0F] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative"
      >
        {/* Header */}
        <header className="px-4 py-3 flex items-center justify-between border-b border-white/5 bg-[#141414] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-accent/20 flex items-center justify-center text-brand-accent">
              <Search size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black text-white uppercase">Verificación OCR</h2>
              <p className="text-[9px] text-brand-muted uppercase">
                Ítem {currentItemIndex} de {totalItems}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="w-9 h-9 bg-white/5 hover:bg-white/10 text-brand-muted hover:text-white rounded-lg transition-all flex items-center justify-center"
          >
            <X size={20} />
          </button>
        </header>

        {/* Content - stack on mobile, side by side on desktop */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Left: Image */}
          <div className="flex-1 bg-[#050505] relative overflow-hidden flex items-center justify-center p-4">
            <img 
              src={imageUrls[0] || ''} 
              alt="OCR Verification" 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
          </div>

          {/* Right: Data Panel */}
          <div className="w-full lg:w-[340px] bg-[#111111] border-t lg:border-t-0 lg:border-l border-white/5 p-4 flex flex-col overflow-hidden">
            <div className="shrink-0 mb-4">
              <h3 className="text-lg font-black text-white uppercase">Datos OCR</h3>
              <div className="w-8 h-0.5 bg-brand-accent" />
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              <QuickEditField 
                label="Categoría" 
                value={data.category} 
                options={['CALZADO', 'ACCESORIOS', 'STREETWEAR', 'COLECCIONABLES', 'OTROS']}
                onChange={val => onUpdate({ category: val })} 
              />
              
              <QuickEditField 
                label="Marca" 
                value={data.brand} 
                placeholder="Ej: Nike"
                onChange={val => onUpdate({ brand: val })} 
              />
              <QuickEditField 
                label="Modelo" 
                value={data.name} 
                placeholder="Air Jordan 1..."
                onChange={val => onUpdate({ name: val })} 
              />

              <QuickEditField 
                label="Género" 
                value={data.gender || 'UNISEX'} 
                options={['HOMBRE', 'MUJER', 'UNISEX', 'KIDS']}
                onChange={val => onUpdate({ gender: val })} 
              />
              <QuickEditField 
                label="Color" 
                value={data.color_description || ''} 
                placeholder="Negro"
                onChange={val => onUpdate({ color_description: val.toUpperCase() })} 
              />
              
              <QuickEditField 
                label="Talla" 
                value={data.size || ''} 
                placeholder="10"
                onChange={val => onUpdate({ size: val })} 
              />

              <QuickEditField 
                label="Precio USD" 
                value={data.buyPriceUsd?.toString() || ''} 
                placeholder="0.00"
                onChange={val => onUpdate({ buyPriceUsd: parseFloat(val) || 0 })} 
              />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 mt-4 bg-brand-accent text-white rounded-xl font-black text-xs uppercase tracking-wider"
            >
              Confirmar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function QuickEditField({ label, value, onChange, placeholder, options }: { 
  label: string, 
  value: string, 
  onChange: (val: string) => void,
  placeholder?: string,
  options?: string[]
}) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest pl-1 italic">{label}</label>
      <div className="relative group">
        {options ? (
          <select 
            value={value}
            onChange={e => onChange(e.target.value)}
            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold text-white outline-none focus:border-brand-accent focus:bg-white/10 transition-all appearance-none cursor-pointer"
          >
            {options.map(opt => <option key={opt} value={opt} className="bg-[#1A1A1A] text-white">{opt}</option>)}
          </select>
        ) : (
          <input 
            type="text"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-base font-bold text-white outline-none focus:border-brand-accent focus:bg-white/10 transition-all placeholder:text-white/20"
          />
        )}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <Zap size={14} className="text-brand-accent/50" />
        </div>
      </div>
    </div>
  );
}
