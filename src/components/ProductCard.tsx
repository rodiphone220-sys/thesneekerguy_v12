import React from 'react';
import { Product, OrderStatus } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { StatusPipeline } from './StatusPipeline';
import { MoreHorizontal, Edit2, Trash2, ArrowUpRight, ChevronDown, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductCardProps {
  product: Product;
  globalMarkup?: number;
  onEdit: (p: Product) => void;
  onStatusChange: (id: string, s: OrderStatus) => void;
  onDelete: (id: string) => void;
}

export function ProductCard({ product, globalMarkup = 35, onEdit, onStatusChange, onDelete }: ProductCardProps) {
  const [showActions, setShowActions] = React.useState(false);
  const [justUpdated, setJustUpdated] = React.useState(false);
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);
  
  const imageUrls = product.imageUrls || [];
  const hasMultipleImages = imageUrls.length > 1;
  
  const displayPriceMxn = (product.sellPriceMxn && product.sellPriceMxn > 0)  
    ? product.sellPriceMxn  
    : Math.round((product.buyPriceMxn || 0) * (1 + (globalMarkup / 100)));

  React.useEffect(() => {
    if (justUpdated) {
      const timer = setTimeout(() => setJustUpdated(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [justUpdated]);

  const handleStatusChange = (status: OrderStatus) => {
    onStatusChange(product.id, status);
    setJustUpdated(true);
  };

  // Status mapping for labels
  const getStatusLabel = (status: OrderStatus) => {
    switch(status) {
      case 'COMPRADO': return '📦 COMPRADO';
      case 'EN_RUTA': return '✈️ EN RUTA';
      case 'EN_BODEGA': return '📍 EN ZAFI';
      case 'ENVIADO': return '🚚 ENVIADO';
      case 'ENTREGADO': return '✅ ENTREGADO';
      default: return status;
    }
  };

  // Status mapping for pills
  const getStatusStyle = (status: OrderStatus) => {
    switch(status) {
      case 'ENTREGADO': return 'bg-green-100 text-green-700 border-green-200';
      case 'EN_BODEGA': return 'bg-pink-100 text-pink-700 border-pink-200';
      case 'COMPRADO': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'EN_RUTA': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ENVIADO': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const [isStatusOpen, setIsStatusOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <motion.div 
      whileHover={{ 
        y: -5,
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)"
      }}
      className="bg-white border border-brand-border rounded-xl overflow-hidden flex flex-col h-full transition-all group shadow-sm"
    >
<div className="relative aspect-video bg-brand-bg border-b border-brand-border overflow-hidden">
        <img
          src={imageUrls[currentImageIndex] || 'https://picsum.photos/seed/placeholder/400/400'} 
          alt={product.name}
          className="w-2 full h-2 full object-cover group-hover:scale-105 transition-2 transform duration-500"
          referrerPolicy="no-2 referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'https://picsum.photos/seed/error/400/400';
          }}
        />
        
        {hasMultipleImages && (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1)); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-2 all"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1)); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/60 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-2 all"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {imageUrls.map((_, idx) => (
                <div key={idx} className={cn("w-1.5 h-1.5 rounded-full transition-all", idx === currentImageIndex ? "bg-2 white" : "bg-white/40")} />
              ))}
            </div>
          </>
        )}
        
        <div className="absolute top-3 right-3 z-10">
          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowActions(!showActions)}
            className="w-8 h-8 rounded-md bg-white/90 backdrop-blur-md border border-brand-border shadow-sm flex items-center justify-center text-brand-muted hover:text-brand-ink transition-colors"
          >
            <MoreHorizontal size={16} />
          </motion.button>
          
          <AnimatePresence>
            {showActions && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-10 right-0 w-32 bg-white rounded-lg shadow-xl border border-brand-border py-1 z-20"
              >
                <button 
                  onClick={() => { onEdit(product); setShowActions(false); }}
                  className="w-full px-4 py-2 text-left text-[13px] font-bold flex items-center gap-2 hover:bg-brand-bg text-brand-ink"
                >
                  <Edit2 size={14} /> Editar
                </button>
                <button 
                  onClick={() => { onDelete(product.id); setShowActions(false); }}
                  className="w-full px-4 py-2 text-left text-[13px] font-bold flex items-center gap-2 hover:bg-[#FCE8E8] text-[#C53030]"
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="p-5 flex flex-col flex-1 gap-4">
        <div>
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-black text-brand-muted uppercase tracking-widest">{product.sku}</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded-md bg-brand-ink text-white text-[10px] font-black uppercase">
                {product.quantity} uds
              </span>
              
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsStatusOpen(!isStatusOpen)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border shadow-sm transition-all",
                    getStatusStyle(product.currentStatus),
                    justUpdated && "ring-2 ring-brand-accent scale-105"
                  )}
                >
                  {getStatusLabel(product.currentStatus)}
                  <ChevronDown size={12} className={cn("transition-transform", isStatusOpen && "rotate-180")} />
                </button>

                <AnimatePresence>
                  {isStatusOpen && (
                    <motion.div 
                      initial={{ opacity: 0, y: 5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 5, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-white border border-brand-border rounded-xl shadow-2xl z-50 overflow-hidden"
                    >
                      {(['COMPRADO', 'EN_RUTA', 'EN_BODEGA', 'ENVIADO', 'ENTREGADO'] as OrderStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => {
                            handleStatusChange(status);
                            setIsStatusOpen(false);
                          }}
                          className={cn(
                            "w-full px-4 py-3 text-left text-[11px] font-black uppercase tracking-wider flex items-center justify-between hover:bg-brand-bg transition-colors",
                            product.currentStatus === status ? "bg-brand-ink text-white hover:bg-brand-ink" : "text-brand-ink"
                          )}
                        >
                          {getStatusLabel(status)}
                          {product.currentStatus === status && <Check size={14} />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
          
          <h4 className="text-[20px] font-black text-brand-ink leading-tight uppercase mb-2">
            {product.category === 'TENIS' ? 'TENIS' : product.name}
          </h4>
          
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-brand-muted">
             {product.category === 'TENIS' && <span className="text-brand-ink font-black truncate max-w-[200px]">{product.name}</span>}
             <span className="flex items-center gap-1">• {product.size || 'No Size'}</span>
             {product.brand && <span className="flex items-center gap-1">• {product.brand}</span>}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-brand-border mt-auto">
          <div className="grid grid-cols-1 gap-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-brand-muted font-bold uppercase tracking-widest">Tarjeta</span>
              <span className="font-black text-brand-ink uppercase">{product.card || '-'}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-brand-muted font-bold uppercase tracking-widest">Boutique</span>
              <span className="font-black text-brand-ink uppercase">{product.boutique || '-'}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-brand-muted font-bold uppercase tracking-widest">Cliente</span>
              <span className="font-black text-brand-ink uppercase">{product.clientName || 'Libre'}</span>
            </div>
          </div>
          
          <div className="flex items-end justify-between pt-2">
            <div>
              <span className="text-[10px] text-brand-muted font-black uppercase tracking-widest block mb-1">Precio Final</span>
              <span className="text-2xl font-black text-brand-ink leading-none">
                ${displayPriceMxn.toLocaleString()}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-brand-muted font-black uppercase tracking-widest block mb-1">Costo Unit.</span>
              <span className="text-sm font-mono font-black text-brand-muted">
                {formatCurrency(product.buyPriceUsd || 0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
