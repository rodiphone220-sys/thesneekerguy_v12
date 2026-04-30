export type OrderStatus = 'COMPRADO' | 'EN_RUTA' | 'EN_BODEGA' | 'ENVIADO' | 'ENTREGADO';

export interface Category {
  id: string;
  name: string;
  icon?: string;
  subcategories: string[];
  isActive?: boolean;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  subcategory?: string;
  tags?: string[];
  size?: string;
  buyPriceUsd: number;
  exchangeRate: number;
  buyPriceMxn: number;
  totalBuyPriceUsd?: number;
  totalBuyPriceMxn?: number;
  sellPriceMxn?: number;
  profit?: number;
  amountPaid?: number;
  isPaid?: boolean;
  isDelivered?: boolean;
  isReviewed?: boolean;
  fbPublished?: boolean;
  boutique?: string;
  card?: string;
  quantity: number;
  minStock: number;
  currentStatus: OrderStatus;
  destino?: 'EL PASO' | 'DALLAS' | 'MX';
  imageUrls?: string[];
  idCodeUsuario?: string;
  creadoPorCode?: string;
  actualizadoPorCode?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  clientIg?: string;
  referido_por?: string;
  referenciado_por?: string;
  metodo_pago_cliente?: string;
  tipo_compra?: string;
  costo_envio_usa?: number;
  estado_envio_usa?: string;
  estado_entrega_usa?: string;
  ubicacion_actual?: string;
  fecha_ingreso_zafiro?: string;
  incluido_en_corte_zafiro?: string;
  estado_entrega_mx?: string;
  fecha_entrega_cliente?: string;
  anticipo_abonado?: number;
  total_pagado?: number;
  saldo_pendiente?: number;
  abonado_amex?: number;
  utilidad_tomada?: number;
  revisado_rodrigo?: string;
  notes?: string;
  gender?: 'HOMBRE' | 'MUJER' | 'UNISEX';
  color_description?: string;
  createdAt: string;
  updatedAt: string;
  isShowcase?: boolean;
}

export interface ExtraExpense {
  id: string;
  name: string;
  amount: number;
  currency: 'USD' | 'MXN';
  category: string;
  date: string;
  card?: string;
  notes?: string;
  imageUrl?: string;
}

export interface StockMovement {
  id: string;
  productId: string;
  type: 'IN' | 'OUT';
  quantity: number;
  reason: string;
  timestamp: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  ig_handle?: string;
  referido_por?: string;
  fecha_alta?: string;
  total_pedidos?: number;
  total_comprado?: number;
  notes?: string;
  tipo_de_pago?: string;
  prioridad?: 'Normal' | 'Alta' | 'Urgente';
  status?: 'Activo' | 'Inactivo' | 'Prospecto';
  modelo?: string;
  talla?: string;
  cantidad?: number;
  preferred_size?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface CustomerOrder {
  id_cliente: string;
  nombre: string;
  telefono: string;
  email: string;
  direccion: string;
  ig_handle?: string;
  referido_por?: string;
  tipo_de_pago?: string;
  modelo_seleccionado: string;
  sku_referencia?: string;
  talla: string;
  cantidad: number;
  precio_unitario?: number;
  total_mxn?: number;
  notas: string;
  fecha_pedido: string;
  status: 'Pendiente' | 'Procesado' | 'Enviado' | 'Entregado';
  prioridad?: 'Normal' | 'Urgente' | 'Alta';
}

export interface SystemSettings {
  isAiAssistantEnabled: boolean;
  isAiPrimaryResponder: boolean;
  aiPrimaryPrompt: string;
  aiGeneralPrompt: string;
  sneekyBotPrompt: string;
  shareWhatsAppNumber?: string;
  shareEmailAddress?: string;
}

export interface DashboardStats {
  totalItems: number;
  lowStockItems: number;
  totalValueUsd: number;
  totalValueMxn: number;
  statusCounts: Record<OrderStatus, number>;
}

export type UserRole = 'MASTER' | 'CONTABILIDAD' | 'VENTAS' | 'ATENCION' | 'DEMO';

export interface UserPermission {
  id: string;
  name: string;
  description: string;
  module: 'inventory' | 'finances' | 'customers' | 'settings' | 'messaging';
  action: 'read' | 'write' | 'delete' | 'admin';
  isEnabled: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  idCode: string;
  masterId?: string;
  linkedToMaster?: string;
  permissions: UserPermission[];
  createdAt: string;
  lastLogin?: string;
}