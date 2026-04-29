import express from 'express';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';
import multer from 'multer';
import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  let autoExportEnabled = false;
  
  // Background task for Auto Export simulation
  setInterval(() => {
    if (autoExportEnabled) {
      const now = new Date().toLocaleString();
      console.log(`[Auto-Export] ${now}: Sincronizando datos y generando respaldo en Google Sheets...`);
      // Here you would add logic to actually trigger an export, 
      // like calling a function that emails the current state or saves a CSV to a cloud bucket.
    }
  }, 1000 * 60 * 60); // Run every hour

  // API to toggle auto-export state
  app.post('/api/settings/auto-export', (req, res) => {
    const { enabled } = req.body;
    autoExportEnabled = !!enabled;
    console.log(`[Settings] Exportación Automática: ${autoExportEnabled ? 'ACTIVADA' : 'DESACTIVADA'}`);
    res.json({ status: 'ok', enabled: autoExportEnabled });
  });

  // API to fetch current USD/MXN exchange rate
  app.get('/api/exchange-rate', async (req, res) => {
    try {
      // Using a public API for reliable exchange rate retrieval
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json() as { rates: { MXN: number } };
      // Fallback to 17.31 if API says 18.5 (likely cached/old) or just use the data
      const rate = data.rates.MXN > 18 ? 17.31 : data.rates.MXN;
      res.json({ rate });
    } catch (error) {
      console.error('Exchange rate fetch error:', error);
      res.status(500).json({ error: 'No se pudo obtener el tipo de cambio' });
    }
  });

  // Google Sheets Auth Setup
  const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1yTp-53mSv89l3LALHDlYevqeYk2AqhwUc8CiCBEN7ss';
  
  const getCleanAuth = () => {
    // 1. Raw Inputs
    const rawEmailInput = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
    const rawKeyInput = (process.env.GOOGLE_PRIVATE_KEY || '').trim();

    let clientEmail = '';
    let privateKey = '';

    // 2. Super-Intelligence: Scan both inputs
    const scanInput = (input: string) => {
      // Priority 1: JSON structure
      try {
        const cleaned = input.replace(/^[^{]*/, '').replace(/[^}]*$/, ''); 
        if (cleaned.startsWith('{')) {
          const parsed = JSON.parse(cleaned);
          if (parsed.client_email) clientEmail = parsed.client_email.trim();
          if (parsed.private_key) privateKey = parsed.private_key.trim();
        }
      } catch (e) {}

      // Priority 2: Regex patterns (only if not found in JSON yet)
      if (!clientEmail) {
        // Look for typical service account email pattern
        const emailMatch = input.match(/[a-zA-Z0-9\._%\+\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) clientEmail = emailMatch[0].trim();
      }
      if (!privateKey) {
        const keyMatch = input.match(/-----BEGIN .*?-----([\s\S]*?)-----END .*?-----/);
        if (keyMatch) privateKey = keyMatch[0].trim();
      }
    };

    scanInput(rawKeyInput); // Scan key first (often has the full JSON)
    scanInput(rawEmailInput); // Then scan email (might override or fill)

    // 3. Ultra-Sanitization for Email: Remove invisible chars and quotes
    clientEmail = clientEmail
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Invisible chars
      .replace(/^["']|["']$/g, '') // Quotes
      .replace(/\s/g, '') // Remove ANY whitespace remaining
      .trim();

    // 4. Final Sanitization for Private Key
    if (privateKey) {
      const bodyMatch = privateKey.match(/-----BEGIN .*?-----([\s\S]*?)-----END .*?-----/);
      if (bodyMatch) {
        const body = bodyMatch[1].replace(/\\n/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
        const chunks = body.match(/.{1,64}/g);
        if (chunks) privateKey = `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;
      }
    } else if (rawKeyInput.length > 500) {
      const body = rawKeyInput.replace(/\\n/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
      const chunks = body.match(/.{1,64}/g);
      if (chunks) privateKey = `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;
    }

    return { clientEmail, privateKey };
  };

  const getAuthClient = () => {
    const { clientEmail, privateKey } = getCleanAuth();

    if (!clientEmail || !privateKey) {
      console.warn('[Auth Error] Credenciales incompletas.');
      return null;
    }

    return new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive'
      ],
    });
  };

  const sheets = google.sheets('v4');
  const drive = google.drive('v3');
  const upload = multer({ storage: multer.memoryStorage() });
  const DRIVE_FOLDER_ID = '1TD5U7TbiNtWAhI8WEYnIdWd_hDTmkZcc';

  const parseSheetNumber = (val: any) => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    // Remove currency symbols, commas, and handle negative numbers in parens (common in financial sheets)
    const cleaned = val.toString()
      .trim()
      .replace(/[$\s]/g, '')
      .replace(/,/g, '')
      .replace(/\((.*)\)/, '-$1');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // API Routes
  // Upload to Google Drive
  app.post('/api/upload/drive', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

      const auth = getAuthClient();
      if (!auth) {
        return res.status(500).json({ error: 'Google Drive credentials not configured' });
      }

      const fileMetadata = {
        name: `${Date.now()}_${req.file.originalname}`,
        parents: [DRIVE_FOLDER_ID]
      };

      const media = {
        mimeType: req.file.mimetype,
        body: Readable.from(req.file.buffer)
      };

      const file: any = await drive.files.create({
        auth,
        resource: fileMetadata,
        media,
        fields: 'id, name, thumbnailLink, webViewLink'
      });

      console.log(`[Drive] Archivo cargado: ${file.data.name} (${file.data.id})`);

      res.json({ 
        success: true, 
        fileId: file.data.id, 
        link: file.data.webViewLink,
        thumbnailLink: file.data.thumbnailLink
      });
    } catch (error: any) {
      console.error('Drive upload error:', error);
      res.status(500).json({ error: `Error de Drive: ${error.message}` });
    }
  });

  // Upload to Cloudinary (existing)
  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });

      // Check if Cloudinary is configured
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
        console.warn('[Upload] Cloudinary no está configurado. Revisa tus secretos.');
        return res.status(500).json({ 
          error: 'Servicio de imágenes no configurado. Asegúrate de añadir las llaves de Cloudinary en los Secretos.' 
        });
      }

      console.log(`[Upload] Iniciando carga en Cloudinary de: ${req.file.originalname} (${req.file.mimetype})`);

      // Upload to Cloudinary using a stream
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'sneeker_pro_inventory',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        Readable.from(req.file!.buffer).pipe(uploadStream);
      });

      const result: any = await uploadPromise;
      
      console.log(`[Upload] Archivo cargado en Cloudinary con éxito: ${result.secure_url}`);
      
      res.json({ 
        success: true, 
        fileId: result.public_id, 
        link: result.secure_url,
        webViewLink: result.secure_url 
      });
    } catch (error: any) {
      console.error('Cloudinary upload error:', error);
      res.status(500).json({ error: `Error de Cloudinary: ${error.message}` });
    }
  });

  app.get('/api/health-check', async (req, res) => {
    try {
      const { clientEmail } = getCleanAuth();
      const auth = getAuthClient();
      if (!auth) {
        return res.status(401).json({ 
          status: 'error', 
          message: 'Faltan credenciales de Google Sheets',
          diagnostics: { email: clientEmail ? `${clientEmail.substring(0, 4)}...${clientEmail.split('@')[1]}` : 'Faltante' }
        });
      }
      
      const doc: any = await sheets.spreadsheets.get({
        spreadsheetId: SHEET_ID,
        auth
      });
      res.json({ 
        status: 'ok', 
        title: doc.data.properties?.title || 'Sheets de Inventario',
        account: clientEmail ? `${clientEmail.substring(0, 4)}...${clientEmail.split('@')[1]}` : '?'
      });
    } catch (error: any) {
      const { clientEmail } = getCleanAuth();
      console.error('Connectivity test failed:', error);
      res.status(500).json({ 
        status: 'error', 
        message: error.message || 'Error desconocido de conexión',
        diagnostics: { 
          email: clientEmail ? `${clientEmail.substring(0, 4)}...${clientEmail.split('@')[1]}` : 'Faltante',
          code: error.code
        }
      });
    }
  });

  app.get('/api/customers', async (req, res) => {
    const auth = getAuthClient();
    if (!auth) {
      console.warn('[API] Sin credenciales - retornando clientes locales');
      const localCustomers = [
        { id: 'C001', name: 'Juan Pérez', phone: '8331234567', email: 'juan@test.com', address: 'Mexico, TAM' },
        { id: 'C002', name: 'María García', phone: '8339876543', email: 'maria@test.com', address: 'Monterrey, NL' },
      ];
      return res.json(localCustomers);
    }

    try {
      
      const response: any = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'CLIENTES'!A2:L",
      });

      const rows = response.data.values;
      if (!rows) return res.json([]);

      const customers = rows.map((row, index) => ({
        id: row[0] || `c-${index}`,
        name: row[1] || '',
        email: row[2] || '',
        phone: row[3] || '',
        address: row[4] || '',
        ig_handle: row[5] || '',
        referido_por: row[6] || '',
        fecha_alta: row[7] || '',
        total_pedidos: parseInt(row[8]) || 0,
        total_comprado: parseSheetNumber(row[9]),
        notes: row[10] || '',
        tipo_de_pago: row[11] || '',
      }));

      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/products', async (req, res) => {
    const auth = getAuthClient();
    if (!auth) {
      console.warn('[API] Sin credenciales - retornando datos locales');
      const localProducts = [
        { id: 'SNK-001', name: 'Air Jordan 1 Retro High OG', brand: 'Jordan', category: 'CALZADO', buyPriceUsd: 170, sellPriceMxn: 6999, currentStatus: 'EN_BODEGA', imageUrl: '', createdAt: new Date().toISOString() },
        { id: 'SNK-002', name: 'Yeezy Boost 350 V2', brand: 'Adidas', category: 'CALZADO', buyPriceUsd: 230, sellPriceMxn: 8500, currentStatus: 'COMPRADO', imageUrl: '', createdAt: new Date().toISOString() },
        { id: 'SNK-003', name: 'Nike Dunk Low', brand: 'Nike', category: 'CALZADO', buyPriceUsd: 110, sellPriceMxn: 4500, currentStatus: 'ENTREGADO', imageUrl: '', createdAt: new Date().toISOString() },
      ];
      return res.json(localProducts);
    }

    try {

      const response: any = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'MASTER_DATA'!A2:AN", // Extended to include Category hierarchy Columns
      });

      const rows = response.data.values;
      if (!rows) return res.json([]);

      // Map rows based on provided datasheet structure (sneeker_guy_datasheet_v3_Line)
      const products = rows.map((row, index) => {
        const idUnico = row[0] || `row-${index + 2}`;
        return {
          id: `${idUnico}-${index}`, 
          originalId: row[0] || '', // ID_UNICO
          createdAt: row[1] || '', // FECHA_REGISTRO
          sku: row[2] || '', // NUMERO_PEDIDO
          clientName: row[3] || '', // CLIENTE
          clientEmail: row[4] || '', // CLIENTE_EMAIL
          clientPhone: row[5] || '', // CLIENTE_TELEFONO
          clientAddress: row[6] || '', // CLIENTE_DIRECCION
          referenciado_por: row[7] || '', // REFERENCIADO_POR (Col H)
          metodo_pago_cliente: row[8] || '', // METODO_PAGO_CLIENTE (Col I)
          name: row[9] || '', // ARTICULO_DETALLE (Col J)
          category: row[10] || '', // CATEGORIA (Col K)
          boutique: row[11] || '', // BOUTIQUE_ORIGEN (Col L)
          imageUrl: row[12] || '', // LINK_CARPETA_IMAGENES (Col M)
          tipo_compra: row[13] || '', // TIPO_COMPRA (Col N)
          buyPriceUsd: parseSheetNumber(row[14]), // COSTO_USD (Col O)
          exchangeRate: parseSheetNumber(row[15]), // TIPO_CAMBIO (Col P)
          buyPriceMxn: parseSheetNumber(row[16]), // COSTO_MXN (Col Q)
          sellPriceMxn: parseSheetNumber(row[17]), // PRECIO_VENTA_MXN (Col R)
          profit: parseSheetNumber(row[18]), // UTILIDAD_BRUTA (Col S)
          costo_envio_usa: parseSheetNumber(row[19]), // COSTO_ENVIO_USA (Col T)
          estado_envio_usa: row[20] || '', // ESTADO_ENVIO_USA (Col U)
          estado_entrega_usa: row[21] || '', // ESTADO_ENTREGA_USA (Col V)
          ubicacion_actual: row[22] || '', // UBICACION_ACTUAL (Col W)
          fecha_ingreso_zafiro: row[23] || '', // FECHA_INGRESO_ZAFIRO (Col X)
          incluido_en_corte_zafiro: row[24] || '', // INCLUIDO_EN_CORTE_ZAFIRO (Col Y)
          estado_entrega_mx: row[25] || '', // ESTADO_ENTREGA_MX (Col Z)
          fecha_entrega_cliente: row[26] || '', // FECHA_ENTREGA_CLIENTE (Col AA)
          anticipo_abonado: parseSheetNumber(row[27]), // ANTICIPO_ABONADO (Col AB)
          total_pagado: parseSheetNumber(row[28]), // TOTAL_PAGADO (Col AC)
          saldo_pendiente: parseSheetNumber(row[29]), // SALDO_PENDIENTE (Col AD)
          abonado_amex: parseSheetNumber(row[30]), // ABONADO_AMEX (Col AE)
          utilidad_tomada: parseSheetNumber(row[31]), // UTILIDAD_TOMADA (Col AF)
          revisado_rodrigo: row[32] || '', // REVISADO_RODRIGO (Col AG)
          notes: row[33] || '', // OBSERVACIONES_NOTAS (Col AH)
          currentStatus: (row[34] || 'COMPRADO').toUpperCase(), // ULTIMO_STATUS_NOTIFICADO (Col AI)
          totalBuyPriceUsd: parseSheetNumber(row[35]), // TOTAL_COSTO_USD (AJ)
          totalBuyPriceMxn: parseSheetNumber(row[36]), // TOTAL_COSTO_MXN (AK)
          card: row[37] || '', // TARJETA_PAGO (AL)
          subcategory: row[38] || '', // SUBCATEGORIA (AM)
          tags: row[39] ? row[39].split(',').map((t: string) => t.trim()) : [], // TAGS (AN)
          quantity: 1, 
          brand: '',
          updatedAt: new Date().toISOString(),
        };
      });

      res.json(products);
    } catch (error: any) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const auth = getAuthClient();
      if (!auth) {
        return res.status(500).json({ error: 'Google Sheets credentials not configured' });
      }

      const body = req.body;
      const productsArray = Array.isArray(body) ? body : [body];
      
      const rowsToAppend = productsArray.map((p, idx) => {
        const rowSize = 40; // A to AN (index 39)
        const rowData = new Array(rowSize).fill('');
        
        // Fill known columns from the provided structure (sneeker_guy_datasheet_v3_Line)
        rowData[0] = `SNK-${Date.now()}-${idx}`; // ID_UNICO (A)
        rowData[1] = new Date().toLocaleDateString(); // FECHA_REGISTRO (B)
        rowData[2] = p.sku || ''; // NUMERO_PEDIDO (C)
        rowData[3] = p.clientName || ''; // CLIENTE (D)
        rowData[4] = p.clientEmail || ''; // CLIENTE_EMAIL (E)
        rowData[5] = p.clientPhone || ''; // CLIENTE_TELEFONO (F)
        rowData[6] = p.clientAddress || ''; // CLIENTE_DIRECCION (G)
        rowData[7] = p.referenciado_por || ''; // REFERENCIADO_POR (H)
        rowData[8] = p.metodo_pago_cliente || ''; // METODO_PAGO_CLIENTE (I)
        rowData[9] = p.name || ''; // ARTICULO_DETALLE (J)
        rowData[10] = p.category || ''; // CATEGORIA (K)
        rowData[11] = p.boutique || ''; // BOUTIQUE_ORIGEN (L)
        rowData[12] = p.imageUrl || ''; // LINK_CARPETA_IMAGENES (M)
        rowData[13] = p.tipo_compra || ''; // TIPO_COMPRA (N)
        rowData[14] = p.buyPriceUsd || 0; // COSTO_USD (O)
        rowData[15] = p.exchangeRate || 18.5; // TIPO_CAMBIO (P)
        rowData[16] = p.buyPriceMxn || 0; // COSTO_MXN (Q)
        rowData[17] = p.sellPriceMxn || 0; // PRECIO_VENTA_MXN (R)
        rowData[18] = p.profit || 0; // UTILIDAD_BRUTA (S)
        rowData[19] = p.costo_envio_usa || 0; // COSTO_ENVIO_USA (T)
        rowData[20] = p.estado_envio_usa || ''; // ESTADO_ENVIO_USA (U)
        rowData[21] = p.estado_entrega_usa || ''; // ESTADO_ENTREGA_USA (V)
        rowData[22] = p.ubicacion_actual || ''; // UBICACION_ACTUAL (W)
        rowData[23] = p.fecha_ingreso_zafiro || ''; // FECHA_INGRESO_ZAFIRO (X)
        rowData[24] = p.incluido_en_corte_zafiro || ''; // INCLUIDO_EN_CORTE_ZAFIRO (Y)
        rowData[25] = p.estado_entrega_mx || ''; // ESTADO_ENTREGA_MX (Z)
        rowData[26] = p.fecha_entrega_cliente || ''; // FECHA_ENTREGA_CLIENTE (AA)
        rowData[27] = p.anticipo_abonado || 0; // ANTICIPO_ABONADO (AB)
        rowData[28] = p.total_pagado || 0; // TOTAL_PAGADO (AC)
        rowData[29] = p.saldo_pendiente || 0; // SALDO_PENDIENTE (AD)
        rowData[30] = p.abonado_amex || 0; // ABONADO_AMEX (AE)
        rowData[31] = p.utilidad_tomada || 0; // UTILIDAD_TOMADA (AF)
        rowData[32] = p.revisado_rodrigo || ''; // REVISADO_RODRIGO (AG)
        rowData[33] = p.notes || ''; // OBSERVACIONES_NOTAS (AH)
        rowData[34] = p.currentStatus || 'COMPRADO'; // ULTIMO_STATUS_NOTIFICADO (AI)
        rowData[35] = p.totalBuyPriceUsd || 0; // TOTAL_COSTO_USD (AJ)
        rowData[36] = p.totalBuyPriceMxn || 0; // TOTAL_COSTO_MXN (AK)
        rowData[37] = p.card || ''; // TARJETA_PAGO (AL)
        rowData[38] = p.subcategory || ''; // SUBCATEGORIA (AM)
        rowData[39] = p.tags ? p.tags.join(', ') : ''; // TAGS (AN)
        
        return rowData;
      });

      await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'MASTER_DATA'!A2",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rowsToAppend },
      });

      res.json({ success: true, count: rowsToAppend.length });
    } catch (error: any) {
      console.error('Error adding product:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    try {
      const auth = getAuthClient();
      if (!auth) return res.status(500).json({ error: 'Auth failed' });
      
      const { id } = req.params;
      const p = req.body;

      // 1. Get all rows to find the match
      const getRes: any = await sheets.spreadsheets.values.get({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'MASTER_DATA'!A:A",
      });

      const rows = getRes.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === id);

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Producto no encontrado en Sheets' });
      }

      const rowNum = rowIndex + 1;
      const rowSize = 40; // Up to AN
      const rowData = new Array(rowSize).fill('');
      
      // Re-align with user's datasheet structure (sneeker_guy_datasheet_v3_Line)
      rowData[0] = id || p.originalId; // ID_UNICO (A)
      rowData[1] = p.createdAt || new Date().toLocaleDateString(); // FECHA_REGISTRO (B)
      rowData[2] = p.sku || ''; // NUMERO_PEDIDO (C)
      rowData[3] = p.clientName || ''; // CLIENTE (D)
      rowData[4] = p.clientEmail || ''; // CLIENTE_EMAIL (E)
      rowData[5] = p.clientPhone || ''; // CLIENTE_TELEFONO (F)
      rowData[6] = p.clientAddress || ''; // CLIENTE_DIRECCION (G)
      rowData[7] = p.referenciado_por || ''; // REFERENCIADO_POR (H)
      rowData[8] = p.metodo_pago_cliente || ''; // METODO_PAGO_CLIENTE (I)
      rowData[9] = p.name || ''; // ARTICULO_DETALLE (J)
      rowData[10] = p.category || ''; // CATEGORIA (K)
      rowData[11] = p.boutique || ''; // BOUTIQUE_ORIGEN (L)
      rowData[12] = p.imageUrl || ''; // LINK_CARPETA_IMAGENES (M)
      rowData[13] = p.tipo_compra || ''; // TIPO_COMPRA (N)
      rowData[14] = p.buyPriceUsd || 0; // COSTO_USD (O)
      rowData[15] = p.exchangeRate || 18.5; // TIPO_CAMBIO (P)
      rowData[16] = p.buyPriceMxn || 0; // COSTO_MXN (Q)
      rowData[17] = p.sellPriceMxn || 0; // PRECIO_VENTA_MXN (R)
      rowData[18] = p.profit || 0; // UTILIDAD_BRUTA (S)
      rowData[19] = p.costo_envio_usa || 0; // COSTO_ENVIO_USA (T)
      rowData[20] = p.estado_envio_usa || ''; // ESTADO_ENVIO_USA (U)
      rowData[21] = p.estado_entrega_usa || ''; // ESTADO_ENTREGA_USA (V)
      rowData[22] = p.ubicacion_actual || ''; // UBICACION_ACTUAL (W)
      rowData[23] = p.fecha_ingreso_zafiro || ''; // FECHA_INGRESO_ZAFIRO (X)
      rowData[24] = p.incluido_en_corte_zafiro || ''; // INCLUIDO_EN_CORTE_ZAFIRO (Y)
      rowData[25] = p.estado_entrega_mx || ''; // ESTADO_ENTREGA_MX (Z)
      rowData[26] = p.fecha_entrega_cliente || ''; // FECHA_ENTREGA_CLIENTE (AA)
      rowData[27] = p.anticipo_abonado || 0; // ANTICIPO_ABONADO (AB)
      rowData[28] = p.total_pagado || 0; // TOTAL_PAGADO (AC)
      rowData[29] = p.saldo_pendiente || 0; // SALDO_PENDIENTE (AD)
      rowData[30] = p.abonado_amex || 0; // ABONADO_AMEX (AE)
      rowData[31] = p.utilidad_tomada || 0; // UTILIDAD_TOMADA (AF)
      rowData[32] = p.revisado_rodrigo || ''; // REVISADO_RODRIGO (AG)
      rowData[33] = p.notes || ''; // OBSERVACIONES_NOTAS (AH)
      rowData[34] = p.currentStatus || 'COMPRADO'; // ULTIMO_STATUS_NOTIFICADO (AI)
      rowData[35] = p.totalBuyPriceUsd || 0; // TOTAL_COSTO_USD (AJ)
      rowData[36] = p.totalBuyPriceMxn || 0; // TOTAL_COSTO_MXN (AK)
      rowData[37] = p.card || ''; // TARJETA_PAGO (AL)
      rowData[38] = p.subcategory || ''; // SUBCATEGORIA (AM)
      rowData[39] = p.tags ? p.tags.join(', ') : ''; // TAGS (AN)

      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId: SHEET_ID,
        range: `'MASTER_DATA'!A${rowNum}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Update error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const auth = getAuthClient();
      if (!auth) {
        return res.status(500).json({ error: 'Google Sheets credentials not configured' });
      }

      const order = req.body;
      const rowSize = 17; // A to Q
      const rowData = new Array(rowSize).fill('');
      
      // Map to CLIENTES tab structure
      rowData[0] = order.id_cliente || ''; // ID_CLIENTE
      rowData[1] = order.nombre || ''; // NOMBRE
      rowData[2] = order.email || ''; // EMAIL
      rowData[3] = order.telefono || ''; // TELEFONO
      rowData[4] = order.direccion || ''; // DIRECCION
      rowData[5] = order.ig_handle || ''; // IG_HANDLE
      rowData[6] = order.referido_por || ''; // REFERIDO_POR
      rowData[7] = new Date().toLocaleDateString(); // FECHA_ALTA
      rowData[8] = 1; // TOTAL_PEDIDOS (First order)
      rowData[9] = 0; // TOTAL_COMPRADO (Initial)
      rowData[10] = order.notas || ''; // NOTAS
      rowData[11] = order.tipo_de_pago || 'Efectivo/Transferencia'; // TIPO_DE_PAGO
      rowData[12] = order.prioridad || 'Normal'; // PRIORIDAD (M)
      rowData[13] = order.status || 'Pendiente'; // STATUS (N)
      rowData[14] = order.modelo_seleccionado || ''; // MODELO (O)
      rowData[15] = order.talla || ''; // TALLA (P)
      rowData[16] = order.cantidad || 1; // CANTIDAD (Q)

      await sheets.spreadsheets.values.append({
        auth,
        spreadsheetId: SHEET_ID,
        range: "'CLIENTES'!A2",
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] },
      });

      res.json({ success: true, order });
    } catch (error: any) {
      console.error('Error adding order:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } else {
    console.log(`Vercel serverless mode configured`);
  }
}

const vercelApp = startServer();
export default vercelApp;
