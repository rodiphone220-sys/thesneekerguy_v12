"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  X, 
  Upload, 
  Plus, 
  Trash2, 
  ChevronRight, 
  ChevronDown,
  UserPlus,
  Search, 
  Calculator, 
  CreditCard, 
  DollarSign, 
  Tag, 
  Clock, 
  CheckCircle2, 
  Building2, 
  MapPin, 
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Clipboard,
  Loader2,
  ListFilter,
  ShoppingBag,
  TrendingUp,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product, Customer, OrderStatus } from '../types';
import { cn } from '../lib/utils';

import { LectorOCR, QuickEditField, OCRModal, OCRData } from './OCRReader';
import Tesseract from 'tesseract.js';

interface ProductFormProps {
  product?: Product | null;
  onSave: (product: any | any[]) => void;
  onClose: () => void;
  exchangeRate?: number;
  customers?: Customer[];
  boutiques?: string[];
  masterCategories?: any[];
  globalMarkup?: number;
  onAddCustomer?: (customer: Customer) => void;
}

const CATEGORIES = ['CALZADO', 'ACCESORIOS', 'STREETWEAR', 'COLECCIONABLES', 'OTROS'];
const GENDERS = ['HOMBRE', 'MUJER', 'UNISEX', 'KIDS'];
const STATUSES: OrderStatus[] = ['COMPRADO', 'EN_RUTA', 'EN_BODEGA', 'ENVIADO', 'ENTREGADO'];
const CARD_TYPES = ['AMEX AZUL', 'AMEX PLATEADA', 'SANTANDER', 'INVEX', 'EFECTIVO', 'TRANSFERENCIA', 'OTRO'];
const COLORS = [
  'BLACK', 'WHITE', 'GREY', 'RED', 'BLUE', 'GREEN', 'YELLOW', 'ORANGE', 'PURPLE', 'PINK', 
  'BROWN', 'NAVY', 'OLIVE', 'BEIGE', 'CREAM', 'SILVER', 'GOLD', 'MULTI', 'NEON', 'GUM',
  'BRED', 'OREO', 'UNC', 'MOCHA', 'SHADOW', 'ROYAL', 'CHICAGO', 'PANDA', 'HYPER ROYAL',
  'VOLT', 'INFRARED', 'CEMENT', 'ELEPHANT', 'SAIL', 'COCONUT MILK', 'LIGHT BONE'
];

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch('http://localhost:3000/api/upload', {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  return data.link || '';
}

async function callGroq(prompt: string, imageBase64?: string) {
  const messages: any[] = [{ role: 'user', content: prompt }];
  if (imageBase64) {
    messages[0].content = [
      { type: 'text', text: prompt },
      { type: 'image_url', image_url: { url: imageBase64 } }
    ];
  }
  
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 1024
    })
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function extractTextWithOCR(imageBase64: string): Promise<string> {
  const { data: { text } } = await Tesseract.recognize(imageBase64, 'spa', {
    logger: () => {}
  });
  return text;
}

export function ProductForm({ 
  product, 
  onSave, 
  onClose, 
  exchangeRate: initialExchangeRate = 18.00,
  customers = [],
  boutiques = [],
  masterCategories = [],
  globalMarkup: initialGlobalMarkup = 30,
  onAddCustomer
}: ProductFormProps) {
  // Common data for the entire purchase session
  const [commonData, setCommonData] = useState({
    destination: 'MEXICO',
    exchangeRate: initialExchangeRate,
    sku_manual: '',
    internal_notes: '',
    boutique: '',
    payment_card: '',
    purchaseCurrency: 'USD',
  });

  // Array of items in this purchase
  const [items, setItems] = useState<any[]>(product ? [product] : [{
    id: Date.now(),
    name: '',
    brand: '',
    category: 'CALZADO',
    gender: 'UNISEX',
    color_description: '',
    size: '',
    buyPriceUsd: 0,
    buyPriceMxn: 0,
    sellPriceMxn: 0,
    quantity: 1,
    imageUrls: [],
    currentStatus: 'COMPRADO',
    isShowcase: true,
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    clientIg: '',
    referido_por: '',
    referenciado_por: '',
    metodo_pago_cliente: 'Efectivo/Transferencia',
    costo_envio_usa: 0,
    anticipo_abonado: 0,
    saldo_pendiente: 0,
    tags: []
  }]);

  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showQuickCustomerAdd, setShowQuickCustomerAdd] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ name: '', email: '', phone: '', city: '' });
  const [globalMarkup, setGlobalMarkup] = useState(initialGlobalMarkup);

  // OCR Verification States
  const [showOCRVerification, setShowOCRVerification] = useState(false);
  const [pendingOCRData, setPendingOCRData] = useState<Partial<OCRData>>({});
  const [pendingOCRImage, setPendingOCRImage] = useState<string>('');

  const currentItem = items[activeItemIndex];

  const handleQuickSaveCustomer = () => {
    if (!quickCustomer.name) return;

    const newCustomer: Customer = {
      id: `CUST-${Date.now()}`,
      name: quickCustomer.name,
      email: quickCustomer.email,
      phone: quickCustomer.phone,
      address: quickCustomer.city,
      fecha_alta: new Date().toISOString(),
      total_pedidos: 0,
      total_comprado: 0
    };

    // If parent provided onAddCustomer, notify them
    if (onAddCustomer) {
      onAddCustomer(newCustomer);
    }

    // Select the newly created customer for current item
    selectCustomer(newCustomer);
    
    // Reset quick add state
    setQuickCustomer({ name: '', email: '', phone: '', city: '' });
    setShowQuickCustomerAdd(false);
  };

  // Helper mapping for status labels and styles
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const container = document.getElementById('status-dropdown-container');
      if (container && !container.contains(event.target as Node)) {
        setIsStatusDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchExchangeRate = async () => {
    try {
      setIsUploading(true);
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      const data = await response.json();
      const rate = data.rates.MXN;
      
      setCommonData(prev => ({ ...prev, exchangeRate: rate }));
      
      // Update all items
      const updatedItems = items.map(item => {
        const buyPriceMxn = Math.round(item.buyPriceUsd * rate);
        // If we have a global markup, maybe we should update sell price too
        const sellPriceMxn = Math.round(buyPriceMxn * (1 + (globalMarkup / 100)));
        return {
          ...item,
          buyPriceMxn,
          sellPriceMxn: item.sellPriceMxn === 0 ? sellPriceMxn : item.sellPriceMxn
        };
      });
      setItems(updatedItems);
    } catch (error) {
      console.error("Error fetching rate:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const applyMarkupToAll = (markup: number) => {
    setGlobalMarkup(markup);
    const updatedItems = items.map(item => ({
      ...item,
      sellPriceMxn: Math.round(item.buyPriceMxn * (1 + (markup / 100)))
    }));
    setItems(updatedItems);
  };


  // OCR scanning with Tesseract.js
  const scanImageWithAI = async (base64Image: string) => {
    setIsUploading(true);
    try {
      const ocrText = await extractTextWithOCR(base64Image);
      if (!ocrText) return;

      const lines = ocrText.split('\n').filter(l => l.trim());
      const lowerText = ocrText.toLowerCase();

      let extractedData: Partial<OCRData> = {
        name: currentItem.name,
        brand: currentItem.brand,
        category: currentItem.category,
        gender: currentItem.gender,
        color_description: currentItem.color_description,
        size: currentItem.size,
        buyPriceUsd: currentItem.buyPriceUsd
      };

      const categories = ['CALZADO', 'ACCESORIOS', 'STREETWEAR', 'COLECCIONABLES', 'OTROS'];
      for (const cat of categories) {
        if (lowerText.includes(cat.toLowerCase())) {
          extractedData.category = cat;
          break;
        }
      }

      const genders = ['HOMBRE', 'MUJER', 'UNISEX', 'KIDS'];
      for (const gen of genders) {
        if (lowerText.includes(gen.toLowerCase())) {
          extractedData.gender = gen;
          break;
        }
      }

      const brands = ['nike', 'adidas', 'puma', 'jordan', 'new balance', 'converse', 'vans', 'asics', 'reebok', 'yeezy', 'salomon', 'north face', 'supreme', 'stussy', 'carhartt', 'palace', 'kith'];
      for (const brand of brands) {
        if (lowerText.includes(brand)) {
          extractedData.brand = brand.toUpperCase();
          break;
        }
      }

      const colors = ['black', 'white', 'red', 'blue', 'green', 'grey', 'gray', 'pink', 'orange', 'purple', 'yellow', 'brown', 'navy', 'olive', 'beige', 'cream', 'gold', 'silver', 'multicolor', 'negro', 'blanco', 'rojo', 'azul', 'verde', 'gris', 'rosa', 'morado', 'amarillo', 'cafe', 'cafe', 'marron'];
      for (const color of colors) {
        if (lowerText.includes(color)) {
          extractedData.color_description = color.toUpperCase();
          break;
        }
      }

      const priceMatch = ocrText.match(/\$?\d+[\.,]\d{2}|\d+\s*(?:usd|dls)?/i);
      if (priceMatch) {
        extractedData.buyPriceUsd = parseFloat(priceMatch[0].replace(/[^\d.,]/g, '').replace(',', '.'));
      }

      const sizeMatch = ocrText.match(/(\d{1,2}[A-Z]?(?:\s*x\s*\d{1,2}[A-Z]?)?|US\s*\d{1,2}|Size\s*\d+|Talla\s*\d+)/i);
      if (sizeMatch) {
        extractedData.size = sizeMatch[0].replace(/size|talla/i, '').trim().toUpperCase();
      }

      const nameLines = lines.filter(l => l.length > 3 && l.length < 50 && !l.match(/^\d+[\.,]?\d*$/) && !l.match(/^(usd|dls| peso)/i));
      if (nameLines.length > 0) {
        extractedData.name = nameLines[0].trim();
      }

      setPendingOCRData(extractedData);
      setPendingOCRImage(base64Image);
      setShowOCRVerification(true);
    } catch (error) {
      console.error("OCR Scan failed:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Handling clipboard paste
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const base64 = event.target?.result as string;
                    updateItem(activeItemIndex, { imageUrl: base64 });
                    scanImageWithAI(base64);
                };
                reader.readAsDataURL(blob);
            }
            e.preventDefault();
        }
    }
  }, [activeItemIndex, commonData.exchangeRate]);

  useEffect(() => {
    window.addEventListener('paste', handlePaste as any);
    return () => window.removeEventListener('paste', handlePaste as any);
  }, [handlePaste]);

  const addItem = () => {
    setItems([...items, {
      id: Date.now(),
      name: '',
      brand: '',
      category: 'CALZADO',
      gender: 'UNISEX',
      color_description: '',
      size: '',
      buyPriceUsd: 0,
      buyPriceMxn: 0,
      sellPriceMxn: 0,
      quantity: 1,
      imageUrls: [],
      currentStatus: 'COMPRADO',
      isShowcase: true,
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
      clientIg: '',
      referido_por: '',
      metodo_pago_cliente: 'Efectivo/Transferencia',
      tags: []
    }]);
    setActiveItemIndex(items.length);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) return;
    const newItems = items.filter((_, i) => i !== idx);
    setItems(newItems);
    if (activeItemIndex >= newItems.length) {
      setActiveItemIndex(newItems.length - 1);
    }
  };

  const updateItem = (idx: number, data: any) => {
    const newItems = [...items];
    newItems[idx] = { ...newItems[idx], ...data };
    setItems(newItems);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        updateItem(idx, { imageUrl: base64 });
        scanImageWithAI(base64);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalProducts = items.map(item => {
      const buyMxn = item.buyPriceUsd * commonData.exchangeRate;
      const totalBuyMxn = buyMxn + (item.costo_envio_usa || 0);
      const profit = (item.sellPriceMxn || 0) - totalBuyMxn;
      const saldo = (item.sellPriceMxn || 0) - (item.anticipo_abonado || 0);

      return {
        ...item,
        ...commonData,
        buyPriceMxn: Math.round(buyMxn),
        totalBuyPriceMxn: Math.round(totalBuyMxn),
        profit: Math.round(profit),
        saldo_pendiente: Math.round(saldo),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
    onSave(product ? finalProducts[0] : finalProducts);
  };

  const selectCustomer = (c: Customer) => {
    updateItem(activeItemIndex, {
      clientName: c.name,
      clientEmail: c.email || '',
      clientPhone: c.phone || '',
      clientAddress: c.address || '',
      clientIg: c.ig_handle || '',
      referido_por: c.referido_por || ''
    });
    setCustomerSearch('');
    setShowCustomerSearch(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.email?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phone?.includes(customerSearch)
  );

  const globalTotalUsd = items.reduce((sum, item) => sum + (item.quantity * item.buyPriceUsd), 0);
  const globalTotalMxn = items.reduce((sum, item) => sum + (item.quantity * item.buyPriceMxn), 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 lg:p-0">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-[1400px] h-full lg:h-[90vh] bg-[#F1F3F2] rounded-[40px] shadow-2xl shadow-black/20 overflow-hidden flex flex-col relative border border-white/20"
      >
        <header className="px-8 py-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg transform -rotate-12 border border-brand-border">
               <Plus className="text-brand-ink" size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-black text-brand-ink uppercase tracking-tight leading-tight">
                 {product ? 'Edición de Registro' : 'Nueva Compra Consolidada'}
               </h2>
               <p className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.3em]">
                 Registro de Pedido Master
               </p>
             </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 bg-white/50 hover:bg-white text-brand-ink rounded-full transition-all border border-brand-border hover:shadow-lg"
          >
            <X size={24} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col lg:flex-row overflow-hidden pb-4">
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white mx-8 mb-4 rounded-[32px] border border-brand-border shadow-sm">
            {/* Left Panel: Global Configuration */}
            <div className="w-full lg:w-[380px] bg-[#F8FAF9] border-r border-brand-border p-8 flex flex-col gap-8 shrink-0 overflow-y-auto custom-scrollbar">
              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-brand-ink text-white flex items-center justify-center shadow-lg">
                    <Building2 size={16} />
                  </div>
                  <h3 className="text-xs font-black text-brand-ink uppercase tracking-widest italic">Configuración de Origen</h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest pl-1">Destino Global</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" size={16} />
                      <select 
                        value={commonData.destination}
                        onChange={e => setCommonData({ ...commonData, destination: e.target.value })}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold appearance-none outline-none focus:border-brand-ink"
                      >
                        <option value="MEXICO">MEXICO</option>
                        <option value="USA">USA</option>
                        <option value="CANADA">CANADA</option>
                        <option value="OTRO">OTRO</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest pl-1">Tienda / Boutique</label>
                    <input 
                      type="text" 
                      value={commonData.boutique}
                      onChange={e => setCommonData({ ...commonData, boutique: e.target.value })}
                      placeholder="Ej: StockX"
                      className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">T.C. Base (Real-time)</label>
                      <button 
                        type="button"
                        onClick={fetchExchangeRate}
                        className="text-[9px] font-black text-brand-accent uppercase hover:scale-105 transition-transform"
                      >
                        Actualizar
                      </button>
                    </div>
                    <div className="relative">
                      <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent" size={16} />
                      <input 
                        type="number" 
                        step="0.01"
                        value={commonData.exchangeRate}
                        onChange={e => {
                          const rate = parseFloat(e.target.value) || 0;
                          setCommonData({ ...commonData, exchangeRate: rate });
                          // Auto update MXN costs and suggested sale prices when TC changes
                          const updatedItems = items.map(item => {
                            const buyMxn = Math.round(item.buyPriceUsd * rate);
                            const sellMxn = Math.round(buyMxn * (1 + (globalMarkup / 100)));
                            return {
                              ...item,
                              buyPriceMxn: buyMxn,
                              sellPriceMxn: sellMxn
                            };
                          });
                          setItems(updatedItems);
                        }}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-brand-border rounded-xl text-sm font-bold outline-none focus:border-brand-ink"
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-green-500 text-white flex items-center justify-center shadow-lg">
                    <TrendingUp size={16} />
                  </div>
                  <h3 className="text-xs font-black text-brand-ink uppercase tracking-widest italic">Gestor de Precios Sugeridos</h3>
                </div>

                <div className="bg-white/50 p-4 rounded-2xl border border-brand-border space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest">% Ganancia Global</label>
                      <span className="text-[10px] font-black text-brand-ink">{globalMarkup}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={globalMarkup}
                      onChange={e => applyMarkupToAll(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-ink"
                    />
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-brand-accent/5 rounded-xl border border-brand-accent/10">
                    <Info size={12} className="text-brand-accent" />
                    <p className="text-[9px] text-brand-muted font-bold leading-tight">
                      Este porcentaje se aplica sobre el costo en MXN para sugerir el precio de venta final.
                    </p>
                  </div>
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-brand-accent text-white flex items-center justify-center shadow-lg">
                      <Tag size={16} />
                    </div>
                    <h3 className="text-xs font-black text-brand-ink uppercase tracking-widest italic">Identificación</h3>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest pl-1">Identificador / SKU (Editable)</label>
                    <input 
                      type="text" 
                      value={commonData.sku_manual}
                      onChange={e => setCommonData({ ...commonData, sku_manual: e.target.value })}
                      placeholder="TSG26-00000"
                      className="w-full px-5 py-3 bg-white border border-brand-border rounded-xl text-sm font-mono font-bold outline-none focus:border-brand-ink border-b-2 border-brand-accent/30"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-brand-muted uppercase tracking-widest pl-1">Notas Internas / Ubicación Física</label>
                    <textarea 
                      value={commonData.internal_notes}
                      onChange={e => setCommonData({ ...commonData, internal_notes: e.target.value })}
                      placeholder="Ej: Rack A4, Bodega Sur..."
                      rows={3}
                      className="w-full px-5 py-3 bg-white border border-brand-border rounded-xl text-sm outline-none focus:border-brand-ink resize-none"
                    />
                  </div>
                </div>
              </section>

              <section className="pt-6 border-t border-brand-border bg-brand-ink/5 p-4 rounded-2xl space-y-4">
                <h4 className="text-[10px] font-black text-brand-ink uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Calculator size={14} className="text-brand-accent" /> Total Consolidado
                </h4>
                
                <div className="space-y-4 mb-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest pl-1">Tarjeta de Pago</label>
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" size={14} />
                      <select 
                        value={commonData.payment_card}
                        onChange={e => setCommonData({ ...commonData, payment_card: e.target.value })}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-brand-border rounded-xl text-xs font-bold appearance-none outline-none focus:border-brand-ink"
                      >
                        <option value="">Seleccionar Tarjeta</option>
                        {CARD_TYPES.map(card => <option key={card} value={card}>{card}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest pl-1">Moneda de Compra</label>
                    <div className="flex bg-white rounded-xl border border-brand-border p-1">
                      <button
                        type="button"
                        onClick={() => setCommonData({ ...commonData, purchaseCurrency: 'USD' })}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-[10px] font-black transition-all",
                          commonData.purchaseCurrency === 'USD' ? "bg-brand-ink text-white" : "text-brand-muted hover:text-brand-ink"
                        )}
                      >
                        DOLARES (USD)
                      </button>
                      <button
                        type="button"
                        onClick={() => setCommonData({ ...commonData, purchaseCurrency: 'MXN' })}
                        className={cn(
                          "flex-1 py-2 rounded-lg text-[10px] font-black transition-all",
                          commonData.purchaseCurrency === 'MXN' ? "bg-brand-ink text-white" : "text-brand-muted hover:text-brand-ink"
                        )}
                      >
                        PESOS (MXN)
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-brand-ink/10">
                  <div className="flex justify-between items-end border-b border-brand-border pb-2">
                    <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider">Monto USD</span>
                    <span className="text-xl font-mono font-black text-brand-ink">${globalTotalUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] font-bold text-brand-muted uppercase tracking-wider italic">Inversión Final MXN</span>
                    <span className="text-xl font-mono font-black text-brand-accent">${globalTotalMxn.toLocaleString()}</span>
                  </div>
                </div>
              </section>
            </div>

            {/* Right Panel: Items Dynamic List */}
            <div className="flex-1 flex flex-col min-w-0 bg-white lg:h-full">
              {!product && (
                <div className="px-6 py-4 border-b border-brand-border flex items-center justify-between shrink-0 bg-white z-10">
                  <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
                    {items.map((_, idx) => (
                      <div key={idx} className="relative group shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveItemIndex(idx)}
                          className={cn(
                            "px-4 py-2 rounded-lg text-[10px] font-black tracking-widest transition-all min-w-[80px]",
                            activeItemIndex === idx ? "bg-brand-ink text-white shadow-lg shadow-black/10" : "bg-[#F8FAF9] text-brand-muted border border-brand-border hover:border-brand-ink"
                          )}
                        >
                          ÍTEM {idx + 1}
                        </button>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                          >
                            <Trash2 size={8} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    type="button"
                    onClick={addItem}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-accent text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-brand-accent/20"
                  >
                    <Plus size={14} /> Añadir Ítem
                  </motion.button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-10 custom-scrollbar pb-10">
                <main className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                  {/* Left Column: Image & Basic Info */}
                  <div className="xl:col-span-4 space-y-6">
                    <LectorOCR 
                      isScanning={isUploading}
                      currentItem={currentItem}
                      onUpdate={(data) => updateItem(activeItemIndex, data)}
                      onScan={async (file) => {
                        setIsUploading(true);
                        try {
                          const imageUrl = await uploadToCloudinary(file);
                          if (imageUrl) {
                            const currentImages = currentItem.imageUrls || [];
                            updateItem(activeItemIndex, { imageUrls: [...currentImages, imageUrl] });
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              const base64 = event.target?.result as string;
                              scanImageWithAI(base64);
                            };
                            reader.readAsDataURL(file);
                          }
                        } catch (error) {
                          console.error('Upload failed:', error);
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                    />
                    
                    <div className="p-5 bg-brand-surface border border-brand-border rounded-2xl shadow-sm">
                      <div className="flex items-center gap-2 mb-3 text-brand-ink">
                        <Clipboard size={14} className="text-brand-accent" />
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none">Smart Import Tip</span>
                      </div>
                      <p className="text-[11px] text-brand-muted leading-relaxed font-medium">
                        Puedes <b>pegar (Ctrl+V)</b> imágenes de StockX o facturas. La IA de Google Gemini detectará automáticamente los detalles del producto.
                      </p>
                    </div>
                  </div>

                  {/* Right Column: Information Flow */}
                  <div className="xl:col-span-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest flex items-center gap-2">
                          <Tag size={12} className="text-brand-accent" /> 1. Categoría
                        </label>
                        <select 
                          required
                          value={currentItem.category}
                          onChange={e => updateItem(activeItemIndex, { category: e.target.value })}
                          className="w-full px-5 py-4 border border-brand-border rounded-2xl outline-none focus:border-brand-ink transition-all text-sm font-bold bg-[#F8FAF9] appearance-none"
                        >
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest">2. Artículo (Marca)</label>
                        <input 
                          type="text" 
                          required
                          value={currentItem.brand}
                          onChange={e => updateItem(activeItemIndex, { brand: e.target.value })}
                          placeholder="Nike, Jordan, Adidas..."
                          className="w-full px-5 py-4 border border-brand-border rounded-2xl outline-none focus:border-brand-ink transition-all text-sm font-bold bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest">3. Modelo</label>
                        <input 
                          type="text" 
                          required
                          value={currentItem.name}
                          onChange={e => updateItem(activeItemIndex, { name: e.target.value })}
                          placeholder="Air Jordan 1 Retro..."
                          className="w-full px-5 py-4 border border-brand-border rounded-2xl outline-none focus:border-brand-ink transition-all text-sm font-bold bg-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest">4. Género</label>
                        <select 
                          value={currentItem.gender}
                          onChange={e => updateItem(activeItemIndex, { gender: e.target.value as any })}
                          className="w-full px-5 py-4 border border-brand-border rounded-2xl outline-none focus:border-brand-ink transition-all text-sm font-bold bg-[#F8FAF9]"
                        >
                          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest">5. Color</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            list="color-list"
                            value={currentItem.color_description}
                            onChange={e => updateItem(activeItemIndex, { color_description: e.target.value.toUpperCase() })}
                            placeholder="Black/Red..."
                            className="w-full px-5 py-4 border border-brand-border rounded-2xl outline-none focus:border-brand-ink transition-all text-sm font-bold bg-white"
                          />
                          <datalist id="color-list">
                            {COLORS.map(color => <option key={color} value={color} />)}
                          </datalist>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-brand-label uppercase tracking-widest italic flex items-center justify-between">
                          {currentItem.category === 'COLECCIONABLES' ? '6. Escala / Edición' : 
                           currentItem.category === 'ACCESORIOS' ? '6. Tamaño / Medida' : 
                           currentItem.category === 'STREETWEAR' ? '6. Talla / Corte' : 
                           '6. Talla / Size'}
                          <span className="text-[9px] font-medium text-brand-muted lowercase">
                            {currentItem.category === 'COLECCIONABLES' ? '1:64, v1, limited...' : 'US, MX, S/M/L...'}
                          </span>
                        </label>
                        <input 
                          type="text" 
                          value={currentItem.size}
                          onChange={e => updateItem(activeItemIndex, { size: e.target.value })}
                          placeholder={currentItem.category === 'COLECCIONABLES' ? 'Ej: 1:64' : 'Ej: 9.5 US'}
                          className="w-full px-5 py-4 border border-brand-border rounded-2xl outline-none focus:border-brand-ink transition-all text-sm font-bold bg-white"
                        />
                      </div>
                    </div>

                    {/* Logistics & Status Grid */}
                    <div className="pt-6 border-t border-brand-border grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-brand-accent/5 border border-brand-accent/10 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                            currentItem.isShowcase ? "bg-brand-accent text-white shadow-lg shadow-brand-accent/20" : "bg-white text-brand-muted border border-brand-border"
                          )}>
                            <ShoppingBag size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-brand-ink uppercase tracking-tight">Publicar en Vitrina</h4>
                            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest">Estado: {currentItem.isShowcase ? 'VISIBLE' : 'OCULTO'}</p>
                          </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer"
                            checked={currentItem.isShowcase}
                            onChange={e => updateItem(activeItemIndex, { isShowcase: e.target.checked })}
                          />
                          <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-accent"></div>
                        </label>
                      </div>

                      <div className="p-5 bg-brand-surface border border-brand-border rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-brand-ink text-white flex items-center justify-center">
                            <Clock size={24} />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-brand-ink uppercase tracking-tight">Estatus</h4>
                            <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest italic">Logística</p>
                          </div>
                        </div>
                        
                        <div className="relative" id="status-dropdown-container">
                          <button 
                            type="button"
                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                            className={cn(
                              "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border shadow-sm transition-all min-w-[160px] justify-between",
                              getStatusStyle(currentItem.currentStatus)
                            )}
                          >
                            {getStatusLabel(currentItem.currentStatus)}
                            <ChevronDown size={14} className={cn("transition-transform", isStatusDropdownOpen && "rotate-180")} />
                          </button>

                          <AnimatePresence>
                            {isStatusDropdownOpen && (
                              <motion.div 
                                initial={{ opacity: 0, y: 5, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                className="absolute right-0 bottom-full mb-2 w-52 bg-white border border-brand-border rounded-2xl shadow-2xl z-50 overflow-hidden"
                              >
                                {STATUSES.map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => {
                                      updateItem(activeItemIndex, { currentStatus: status });
                                      setIsStatusDropdownOpen(false);
                                    }}
                                    className={cn(
                                      "w-full px-5 py-4 text-left text-[11px] font-black uppercase tracking-wider flex items-center justify-between hover:bg-brand-bg transition-colors border-b last:border-0 border-brand-border/50",
                                      currentItem.currentStatus === status ? "bg-brand-ink text-white hover:bg-brand-ink" : "text-brand-ink"
                                    )}
                                  >
                                    {getStatusLabel(status)}
                                    {currentItem.currentStatus === status && <CheckCircle2 size={16} />}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Customer Assignment Section */}
                    <div className="pt-6 border-t border-brand-border space-y-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-xs font-black text-brand-ink uppercase tracking-wider">Asignación de Cliente</h3>
                          <p className="text-[10px] text-brand-muted border-b border-brand-accent/30 inline-block">¿Para quién es este artículo?</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                            className={cn(
                              "text-[10px] font-bold px-4 py-2 rounded-xl border transition-all flex items-center gap-2 shadow-sm",
                              showCustomerSearch ? "bg-brand-ink text-white border-brand-ink" : "bg-[#F8FAF9] text-brand-ink border-brand-border hover:bg-brand-ink hover:text-white"
                            )}
                          >
                            <Search size={14} /> {showCustomerSearch ? 'Cerrar Buscador' : 'Seleccionar Cliente'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowQuickCustomerAdd(true)}
                            className="text-[10px] font-bold text-brand-accent bg-brand-accent/5 border border-brand-accent/20 px-4 py-2 rounded-xl hover:bg-brand-accent hover:text-white transition-all flex items-center gap-2 shadow-sm"
                          >
                            <UserPlus size={14} /> Nuevo Cliente
                          </button>
                        </div>
                      </div>

                      <AnimatePresence>
                        {showQuickCustomerAdd && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white border-2 border-brand-accent/30 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden"
                          >
                            <div className="absolute top-0 left-0 w-1 h-full bg-brand-accent" />
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-brand-accent text-white flex items-center justify-center">
                                  <UserPlus size={20} />
                                </div>
                                <div>
                                  <h4 className="text-sm font-black text-brand-ink uppercase tracking-tight">Alta Rápida de Cliente</h4>
                                  <p className="text-[10px] text-brand-muted font-bold uppercase tracking-widest italic">Nuevo Registro</p>
                                </div>
                              </div>
                              <button 
                                type="button"
                                onClick={() => setShowQuickCustomerAdd(false)}
                                className="p-2 hover:bg-red-50 text-red-400 rounded-lg transition-colors"
                              >
                                <X size={20} />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Nombre Completo *</label>
                                <input 
                                  autoFocus
                                  type="text"
                                  value={quickCustomer.name}
                                  onChange={e => setQuickCustomer({...quickCustomer, name: e.target.value})}
                                  placeholder="Ej. Juan Pérez"
                                  className="w-full px-4 py-3 border border-brand-border rounded-xl text-sm outline-none focus:border-brand-accent bg-brand-accent/[0.02]"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">WhatsApp / Teléfono</label>
                                <input 
                                  type="text"
                                  value={quickCustomer.phone}
                                  onChange={e => setQuickCustomer({...quickCustomer, phone: e.target.value})}
                                  placeholder="833 000 0000"
                                  className="w-full px-4 py-3 border border-brand-border rounded-xl text-sm outline-none focus:border-brand-accent"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Email</label>
                                <input 
                                  type="email"
                                  value={quickCustomer.email}
                                  onChange={e => setQuickCustomer({...quickCustomer, email: e.target.value})}
                                  placeholder="cliente@ejemplo.com"
                                  className="w-full px-4 py-3 border border-brand-border rounded-xl text-sm outline-none focus:border-brand-accent"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-black text-brand-muted uppercase tracking-widest">Ciudad / Estado</label>
                                <input 
                                  type="text"
                                  value={quickCustomer.city}
                                  onChange={e => setQuickCustomer({...quickCustomer, city: e.target.value})}
                                  placeholder="Ej. Tampico, TAM"
                                  className="w-full px-4 py-3 border border-brand-border rounded-xl text-sm outline-none focus:border-brand-accent"
                                />
                              </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setShowQuickCustomerAdd(false)}
                                className="px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-brand-muted hover:text-brand-ink transition-colors"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                disabled={!quickCustomer.name}
                                onClick={handleQuickSaveCustomer}
                                className="bg-brand-accent text-white px-8 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-brand-accent/20 hover:brightness-110 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                              >
                                Guardar y Seleccionar
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {showCustomerSearch && (
                        <div className="bg-[#F8FAF9] border border-brand-border rounded-2xl p-4 space-y-4 shadow-inner">
                          <input 
                            autoFocus
                            type="text"
                            placeholder="Nombre, email o teléfono del cliente..."
                            value={customerSearch}
                            onChange={e => setCustomerSearch(e.target.value)}
                            className="w-full px-5 py-3 text-sm border border-brand-border rounded-xl outline-none focus:border-brand-ink bg-white shadow-sm"
                          />
                          <div className="max-h-56 overflow-y-auto divide-y divide-[#E0E5E2] bg-white rounded-xl border border-brand-border overflow-hidden">
                            {filteredCustomers.length > 0 ? filteredCustomers.map(c => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => selectCustomer(c)}
                                className="w-full text-left p-4 hover:bg-brand-ink hover:text-white transition-all group flex items-center justify-between"
                              >
                                <div>
                                  <div className="text-sm font-bold flex items-center gap-2">
                                    {c.name}
                                    {currentItem.clientName === c.name && <CheckCircle2 size={14} className="text-brand-accent" />}
                                  </div>
                                  <div className="text-[10px] opacity-60 font-mono">{c.email || c.phone}</div>
                                </div>
                                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                              </button>
                            )) : (
                              <div className="p-8 text-center text-brand-muted flex flex-col items-center gap-2">
                                <Search size={24} className="opacity-20" />
                                <span className="text-xs font-bold uppercase tracking-widest">Sin resultados</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {currentItem.clientName && !showCustomerSearch && (
                         <div className="flex items-center justify-between p-4 bg-[#F8FAF9] border border-brand-border rounded-xl">
                           <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-brand-ink text-white flex items-center justify-center text-[10px] font-black">
                               {currentItem.clientName.charAt(0).toUpperCase()}
                             </div>
                             <div>
                               <div className="text-xs font-bold text-brand-ink">{currentItem.clientName}</div>
                               <div className="text-[10px] text-brand-muted lowercase">{currentItem.clientEmail}</div>
                             </div>
                           </div>
                           <button 
                             type="button" 
                             onClick={() => updateItem(activeItemIndex, { clientName: '', clientEmail: '', clientPhone: '', clientAddress: '', clientIg: '', referido_por: '' })}
                             className="text-red-500 hover:scale-110 transition-transform"
                           >
                             <Trash2 size={14} />
                           </button>
                         </div>
                      )}
                    </div>

                    {/* Pricing Section */}
                    <div className="pt-8 border-t border-brand-border grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Cost Basis Card */}
                      <div className="bg-[#F8FAF9] p-6 rounded-2xl border border-brand-border space-y-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-brand-accent/10 flex items-center justify-center">
                            <Calculator size={16} className="text-brand-accent" />
                          </div>
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-brand-ink italic">Precio de Compra</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest leading-none">Monto USD (Costo)</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted font-mono text-sm">$</span>
                              <input 
                                type="number" 
                                step="0.01"
                                required
                                value={currentItem.buyPriceUsd || ''}
                                onChange={e => {
                                  const usd = parseFloat(e.target.value) || 0;
                                  const buyMxn = Math.round(usd * commonData.exchangeRate);
                                  const sellMxn = Math.round(buyMxn * (1 + (globalMarkup / 100)));
                                  updateItem(activeItemIndex, { 
                                    buyPriceUsd: usd,
                                    buyPriceMxn: buyMxn,
                                    sellPriceMxn: sellMxn
                                  });
                                }}
                                className="w-full pl-8 pr-4 py-3 border border-brand-border rounded-xl text-lg font-mono font-black outline-none focus:border-brand-ink bg-white shadow-inner"
                                placeholder="0.00"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest leading-none italic">MXN Estimado</label>
                            <div className="w-full px-4 py-3 bg-white border border-brand-border rounded-xl text-lg font-mono font-black text-brand-ink/40 flex items-center justify-between shadow-sm">
                              <span>${(currentItem.buyPriceMxn || 0).toLocaleString()}</span>
                              <span className="text-[8px] font-bold opacity-30">TC {commonData.exchangeRate}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Revenue Card */}
                      <div className="bg-brand-accent/5 p-6 rounded-2xl border border-brand-accent/20 space-y-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-brand-accent text-white flex items-center justify-center">
                            <CreditCard size={16} />
                          </div>
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-brand-ink italic">Sugerido de Venta</h3>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-brand-muted uppercase tracking-widest leading-none">Venta Final (MXN)</label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-accent font-mono text-sm">$</span>
                              <input 
                                type="number" 
                                value={currentItem.sellPriceMxn || ''}
                                onChange={e => updateItem(activeItemIndex, { sellPriceMxn: parseFloat(e.target.value) || 0 })}
                                placeholder="0.00"
                                className="w-full pl-8 pr-4 py-4 border-2 border-brand-accent/40 rounded-xl text-2xl font-mono font-black outline-none focus:border-brand-accent bg-white transition-all text-brand-accent shadow-lg"
                              />
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                 <span className="text-[8px] font-black italic bg-brand-accent text-white px-2 py-1 rounded shadow-sm">
                                   {Math.round(((currentItem.sellPriceMxn / (currentItem.buyPriceMxn || 1)) - 1) * 100) || 0}% GANANCIA
                                 </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between px-2 bg-white/50 py-2 rounded-lg border border-brand-accent/5">
                            <span className="text-[9px] font-black text-brand-muted uppercase tracking-widest">Utilidad Proyectada:</span>
                            <span className={cn(
                              "text-xs font-black font-mono",
                              (currentItem.sellPriceMxn - currentItem.buyPriceMxn) > 0 ? "text-green-600" : "text-red-500"
                            )}>
                              ${((currentItem.sellPriceMxn || 0) - (currentItem.buyPriceMxn || 0)).toLocaleString()} MXN
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </main>
              </div>
            </div>
          </div>

          {/* Sticky Action Footer */}
          <footer className="w-full absolute bottom-0 left-0 bg-white/95 backdrop-blur-md border-t border-brand-border px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-50">
            <div className="flex items-center gap-4 text-brand-muted px-8">
               <div className="flex flex-col">
                 <span className="text-[8px] font-bold uppercase tracking-widest leading-none">Total Consolidado</span>
                 <span className="text-15px font-bold text-brand-ink font-mono">
                   USD ${globalTotalUsd.toFixed(2)}
                 </span>
               </div>
               <div className="w-px h-6 bg-brand-border" />
               <div className="flex flex-col">
                 <span className="text-[8px] font-bold uppercase tracking-widest leading-none">Inversión Final</span>
                 <span className="text-15px font-bold text-brand-accent font-mono">
                   MXN ${globalTotalMxn.toLocaleString()}
                 </span>
               </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto px-8">
              <motion.button 
                whileTap={{ scale: 0.95 }}
                type="button" 
                onClick={onClose}
                className="px-6 py-3 rounded-xl font-bold text-brand-muted hover:text-brand-ink text-sm transition-all border border-transparent hover:border-brand-border"
              >
                Cancelar
              </motion.button>
              <motion.button 
                whileTap={{ scale: 0.95 }}
                type="submit" 
                className="flex-1 md:flex-none px-10 py-3 rounded-xl font-bold bg-brand-ink text-white hover:bg-black transition-all text-sm shadow-xl shadow-black/10 flex items-center justify-center gap-2"
              >
                {product ? 'Actualizar Cambios' : `Registrar ${items.length} Artículos`}
                <span className="opacity-40"><ChevronRight size={16} /></span>
              </motion.button>
            </div>
          </footer>
          <AnimatePresence>
            {showOCRVerification && (
              <OCRModal 
                imageUrls={pendingOCRImage ? [pendingOCRImage] : []}
                data={pendingOCRData}
                totalItems={items.length}
                currentItemIndex={activeItemIndex + 1}
                onUpdate={(data) => setPendingOCRData(prev => ({ ...prev, ...data }))}
                onClose={() => {
                  // Apply pending data to the actual item
                  updateItem(activeItemIndex, {
                    ...pendingOCRData,
                    buyPriceMxn: Math.round((pendingOCRData.buyPriceUsd || 0) * commonData.exchangeRate),
                    imageUrl: pendingOCRImage
                  });
                  setShowOCRVerification(false);
                }}
              />
            )}
          </AnimatePresence>
        </form>

      </motion.div>
    </div>
  );
}
