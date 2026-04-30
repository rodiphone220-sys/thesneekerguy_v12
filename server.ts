import express from 'express';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function startServer() {
  // Configuración exacta como en el ejemplo de Cloudinary
  const urlParts = process.env.CLOUDINARY_URL?.match(/cloudinary:\/\/([^:]+):(.+)@(\w+)/);
  const cloudName = urlParts ? urlParts[3] : process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = urlParts ? urlParts[1] : process.env.CLOUDINARY_API_KEY;
  const apiSecret = urlParts ? urlParts[2] : process.env.CLOUDINARY_API_SECRET;
  
  console.log('[Cloudinary] cloud_name:', cloudName);
  console.log('[Cloudinary] api_key:', apiKey?.substring(0, 4) + '...');
  console.log('[Cloudinary] api_secret set:', !!apiSecret);
  
  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({ 
      cloud_name: cloudName, 
      api_key: apiKey, 
      api_secret: apiSecret 
    });
    console.log('[Cloudinary] Listo:', cloudName);
  } else {
    console.warn('[Cloudinary] Faltan credenciales');
  }
  
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  let autoExportEnabled = false;
  
  setInterval(() => {
    if (autoExportEnabled) {
      console.log(`[Auto-Export] ${new Date().toLocaleString()}: Sincronizando datos...`);
    }
  }, 1000 * 60 * 60);

  app.post('/api/settings/auto-export', (req, res) => {
    const { enabled } = req.body;
    autoExportEnabled = !!enabled;
    res.json({ status: 'ok', enabled: autoExportEnabled });
  });

  app.get('/api/exchange-rate', async (req, res) => {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json() as { rates: { MXN: number } };
      const rate = data.rates.MXN > 18 ? 17.31 : data.rates.MXN;
      res.json({ rate });
    } catch (error) {
      res.status(500).json({ error: 'No se pudo obtener el tipo de cambio' });
    }
  });

  const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1oL2P2AqClcusAJB4pFKx2RZXX2L6FqJIU5ElBg0A0Hc';
  
  const getCleanAuth = () => {
    const rawEmailInput = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
    const rawKeyInput = (process.env.GOOGLE_PRIVATE_KEY || '').trim();
    let clientEmail = '';
    let privateKey = '';

    const scanInput = (input: string) => {
      try {
        const cleaned = input.replace(/^[^{]*/, '').replace(/[^}]*$/, ''); 
        if (cleaned.startsWith('{')) {
          const parsed = JSON.parse(cleaned);
          if (parsed.client_email) clientEmail = parsed.client_email.trim();
          if (parsed.private_key) privateKey = parsed.private_key.trim();
        }
      } catch (e) {}

      if (!clientEmail) {
        const emailMatch = input.match(/[a-zA-Z0-9\._%\+\-]+@[a-zA-Z0-9\.\-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) clientEmail = emailMatch[0].trim();
      }
      if (!privateKey) {
        const keyMatch = input.match(/-----BEGIN .*?-----([\s\S]*?)-----END .*?-----/);
        if (keyMatch) privateKey = keyMatch[0].trim();
      }
    };

    scanInput(rawKeyInput);
    scanInput(rawEmailInput);

    clientEmail = clientEmail
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/^["']|["']$/g, '')
      .replace(/\s/g, '')
      .trim();

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
    if (!clientEmail || !privateKey) return null;

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
    const cleaned = val.toString().trim().replace(/[$\s]/g, '').replace(/,/g, '').replace(/\((.*)\)/, '-$1');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  app.post('/api/upload/drive', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
      const auth = getAuthClient();
      if (!auth) return res.status(500).json({ error: 'Google Drive credentials not configured' });

      const fileMetadata = { name: `${Date.now()}_${req.file.originalname}`, parents: [DRIVE_FOLDER_ID] };
      const file = await (drive.files.create as any)({
        auth,
        requestBody: fileMetadata,
        media: { mimeType: req.file.mimetype, body: Readable.from(req.file.buffer) },
        fields: 'id, name, webViewLink'
      });

      res.json({ success: true, fileId: file.data.id, link: file.data.webViewLink });
    } catch (error: any) {
      res.status(500).json({ error: `Error de Drive: ${error.message}` });
    }
  });

  app.post('/api/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file' });

      if (!cloudinary.config().cloud_name) {
        return res.status(500).json({ error: 'Cloudinary no configurado' });
      }

      // Upload usando la API directo como en el ejemplo
      const uploadResult = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        { folder: 'sneeker_pro_inventory' }
      );

      res.json({ success: true, fileId: uploadResult.public_id, link: uploadResult.secure_url });
    } catch (error: any) {
      console.error('[Upload] Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/health-check', async (req, res) => {
    try {
      const { clientEmail } = getCleanAuth();
      const auth = getAuthClient();
      if (!auth) return res.status(401).json({ status: 'error', message: 'Faltan credenciales' });
      
      const doc: any = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID, auth });
      res.json({ status: 'ok', title: doc.data.properties?.title });
    } catch (error: any) {
      res.status(500).json({ status: 'error', message: error.message });
    }
  });

  app.get('/api/customers', async (req, res) => {
    const auth = getAuthClient();
    if (!auth) return res.json([]);

    try {
      const response: any = await sheets.spreadsheets.values.get({ auth, spreadsheetId: SHEET_ID, range: "'CLIENTES'!A2:L" });
      const rows = response.data.values;
      if (!rows) return res.json([]);

      const customers = rows.map((row, index) => ({
        id: row[0] || `c-${index}`, name: row[1] || '', email: row[2] || '', phone: row[3] || '', address: row[4] || '', ig_handle: row[5] || '', referido_por: row[6] || '', fecha_alta: row[7] || '', total_pedidos: parseInt(row[8]) || 0, total_comprado: parseSheetNumber(row[9]), notes: row[10] || '', tipo_de_pago: row[11] || ''
      }));
      res.json(customers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/customers', async (req, res) => {
    const auth = getAuthClient();
    if (!auth) return res.status(500).json({ error: 'Sin credenciales' });

    try {
      const customer = req.body;
      const rowData = [
        customer.id || '',
        customer.name || '',
        customer.email || '',
        customer.phone || '',
        customer.address || '',
        customer.ig_handle || '',
        customer.referido_por || '',
        customer.fecha_alta || new Date().toISOString(),
        customer.total_pedidos || 0,
        customer.total_comprado || 0,
        customer.notes || '',
        customer.tipo_de_pago || 'Transferencia',
      ];

      await sheets.spreadsheets.values.append({
        auth, spreadsheetId: SHEET_ID, range: "'CLIENTES'!A2", valueInputOption: 'USER_ENTERED', requestBody: { values: [rowData] }
      });

      res.json({ success: true, customer });
    } catch (error: any) {
      console.error('[customers POST] Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/customers/:id', async (req, res) => {
    const auth = getAuthClient();
    if (!auth) return res.status(500).json({ error: 'Sin credenciales' });

    try {
      const { id } = req.params;
      const customer = req.body;
      
      const getRes: any = await sheets.spreadsheets.values.get({ auth, spreadsheetId: SHEET_ID, range: "'CLIENTES'!A:A" });
      const rows = getRes.data.values || [];
      const rowIndex = rows.findIndex((row: any[]) => row[0] === id);

      if (rowIndex === -1) return res.status(404).json({ error: 'Cliente no encontrado' });

      const rowNum = rowIndex + 1;
      const rowData = [
        id,
        customer.name || '',
        customer.email || '',
        customer.phone || '',
        customer.address || '',
        customer.ig_handle || '',
        customer.referido_por || '',
        customer.fecha_alta || new Date().toISOString(),
        customer.total_pedidos || 0,
        customer.total_comprado || 0,
        customer.notes || '',
        customer.tipo_de_pago || 'Transferencia',
      ];

      await sheets.spreadsheets.values.update({
        auth, spreadsheetId: SHEET_ID, range: `'CLIENTES'!A${rowNum}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [rowData] }
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/customers/:id', async (req, res) => {
    res.json({ success: true });
  });

  app.get('/api/products', async (req, res) => {
    const auth = getAuthClient();
    if (!auth) return res.json([]);

    try {
      const response: any = await sheets.spreadsheets.values.get({ auth, spreadsheetId: SHEET_ID, range: "'MASTER_DATA'!A2:AN" });
      const rows = response.data.values;
      if (!rows) return res.json([]);

      const products = rows.map((row, index) => ({
        id: `${row[0] || `row-${index + 2}`}-${index}`, originalId: row[0] || '', idCodeUsuario: row[1] || '', creadoPorCode: row[2] || '', actualizadoPorCode: row[3] || '', createdAt: row[4] || '', sku: row[5] || '', clientName: row[3] || '', clientEmail: row[4] || '', clientPhone: row[5] || '', clientAddress: row[6] || '', referenciado_por: row[7] || '', metodo_pago_cliente: row[8] || '', name: row[9] || '', category: row[10] || '', boutique: row[11] || '', imageUrl: row[12] || '', tipo_compra: row[13] || '', buyPriceUsd: parseSheetNumber(row[14]), exchangeRate: parseSheetNumber(row[15]), buyPriceMxn: parseSheetNumber(row[16]), sellPriceMxn: parseSheetNumber(row[17]), profit: parseSheetNumber(row[18]), costo_envio_usa: parseSheetNumber(row[19]), estado_envio_usa: row[20] || '', estado_entrega_usa: row[21] || '', ubicacion_actual: row[22] || '', fecha_ingreso_zafiro: row[23] || '', incluido_en_corte_zafiro: row[24] || '', estado_entrega_mx: row[25] || '', fecha_entrega_cliente: row[26] || '', anticipo_abonado: parseSheetNumber(row[27]), total_pagado: parseSheetNumber(row[28]), saldo_pendiente: parseSheetNumber(row[29]), abonado_amex: parseSheetNumber(row[30]), utilidad_tomada: parseSheetNumber(row[31]), revisado_rodrigo: row[32] || '', notes: row[33] || '', currentStatus: (row[34] || 'COMPRADO').toUpperCase(), totalBuyPriceUsd: parseSheetNumber(row[35]), totalBuyPriceMxn: parseSheetNumber(row[36]), card: row[37] || '', subcategory: row[38] || '', tags: row[39] ? row[39].split(',').map((t: string) => t.trim()) : [], quantity: 1, brand: '', updatedAt: new Date().toISOString()
      }));
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/products', async (req, res) => {
    try {
      const auth = getAuthClient();
      if (!auth) return res.status(500).json({ error: 'Google Sheets credentials not configured' });

      const body = req.body;
      const productsArray = Array.isArray(body) ? body : [body];
      
      const rowsToAppend = productsArray.map((p, idx) => {
        const rowSize = 43;
        const rowData = new Array(rowSize).fill('');
        
        rowData[0] = p.originalId || `SNK-${Date.now()}-${idx}`;
        rowData[1] = p.idCodeUsuario || '';
        rowData[2] = p.creadoPorCode || '';
        rowData[3] = p.actualizadoPorCode || '';
        rowData[4] = p.createdAt || new Date().toLocaleDateString();
        rowData[5] = p.sku || '';
        rowData[6] = p.clientName || '';
        rowData[7] = p.referenciado_por || '';
        rowData[8] = p.metodo_pago_cliente || '';
        rowData[9] = p.name || '';
        rowData[10] = p.category || '';
        rowData[11] = p.boutique || '';
        rowData[12] = p.imageUrl || '';
        rowData[13] = p.tipo_compra || '';
        rowData[14] = p.buyPriceUsd || 0;
        rowData[15] = p.exchangeRate || 18.5;
        rowData[16] = p.buyPriceMxn || 0;
        rowData[17] = p.sellPriceMxn || 0;
        rowData[18] = p.profit || 0;
        rowData[19] = p.costo_envio_usa || 0;
        rowData[20] = p.estado_envio_usa || '';
        rowData[21] = p.estado_entrega_usa || '';
        rowData[22] = p.ubicacion_actual || '';
        rowData[23] = p.fecha_ingreso_zafiro || '';
        rowData[24] = p.incluido_en_corte_zafiro || '';
        rowData[25] = p.estado_entrega_mx || '';
        rowData[26] = p.fecha_entrega_cliente || '';
        rowData[27] = p.anticipo_abonado || 0;
        rowData[28] = p.total_pagado || 0;
        rowData[29] = p.saldo_pendiente || 0;
        rowData[30] = p.abonado_amex || 0;
        rowData[31] = p.utilidad_tomada || 0;
        rowData[32] = p.revisado_rodrigo || '';
        rowData[33] = p.notes || '';
        rowData[34] = p.currentStatus || 'COMPRADO';
        rowData[35] = p.totalBuyPriceUsd || 0;
        rowData[36] = p.totalBuyPriceMxn || 0;
        rowData[37] = p.card || '';
        rowData[38] = p.subcategory || '';
        rowData[39] = p.tags ? p.tags.join(', ') : '';
        
        return rowData;
      });

      await sheets.spreadsheets.values.append({
        auth, spreadsheetId: SHEET_ID, range: "'MASTER_DATA'!A2", valueInputOption: 'USER_ENTERED', requestBody: { values: rowsToAppend }
      });

      res.json({ success: true, count: rowsToAppend.length });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/products/:id', async (req, res) => {
    try {
      const auth = getAuthClient();
      if (!auth) return res.status(500).json({ error: 'Auth failed' });
      
      const { id } = req.params;
      const p = req.body;

      const getRes: any = await sheets.spreadsheets.values.get({ auth, spreadsheetId: SHEET_ID, range: "'MASTER_DATA'!A:A" });
      const rows = getRes.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === id);

      if (rowIndex === -1) return res.status(404).json({ error: 'Producto no encontrado' });

      const rowNum = rowIndex + 1;
      const rowSize = 40;
      const rowData = new Array(rowSize).fill('');
      
      rowData[0] = id || p.originalId;
      rowData[1] = p.createdAt || new Date().toLocaleDateString();
      rowData[2] = p.sku || '';
      rowData[3] = p.clientName || '';
      rowData[4] = p.clientEmail || '';
      rowData[5] = p.clientPhone || '';
      rowData[6] = p.clientAddress || '';
      rowData[7] = p.referenciado_por || '';
      rowData[8] = p.metodo_pago_cliente || '';
      rowData[9] = p.name || '';
      rowData[10] = p.category || '';
      rowData[11] = p.boutique || '';
      rowData[12] = p.imageUrl || '';
      rowData[13] = p.tipo_compra || '';
      rowData[14] = p.buyPriceUsd || 0;
      rowData[15] = p.exchangeRate || 18.5;
      rowData[16] = p.buyPriceMxn || 0;
      rowData[17] = p.sellPriceMxn || 0;
      rowData[18] = p.profit || 0;
      rowData[19] = p.costo_envio_usa || 0;
      rowData[20] = p.estado_envio_usa || '';
      rowData[21] = p.estado_entrega_usa || '';
      rowData[22] = p.ubicacion_actual || '';
      rowData[23] = p.fecha_ingreso_zafiro || '';
      rowData[24] = p.incluido_en_corte_zafiro || '';
      rowData[25] = p.estado_entrega_mx || '';
      rowData[26] = p.fecha_entrega_cliente || '';
      rowData[27] = p.anticipo_abonado || 0;
      rowData[28] = p.total_pagado || 0;
      rowData[29] = p.saldo_pendiente || 0;
      rowData[30] = p.abonado_amex || 0;
      rowData[31] = p.utilidad_tomada || 0;
      rowData[32] = p.revisado_rodrigo || '';
      rowData[33] = p.notes || '';
      rowData[34] = p.currentStatus || 'COMPRADO';
      rowData[35] = p.totalBuyPriceUsd || 0;
      rowData[36] = p.totalBuyPriceMxn || 0;
      rowData[37] = p.card || '';
      rowData[38] = p.subcategory || '';
      rowData[39] = p.tags ? p.tags.join(', ') : '';

      await sheets.spreadsheets.values.update({
        auth, spreadsheetId: SHEET_ID, range: `'MASTER_DATA'!A${rowNum}`, valueInputOption: 'USER_ENTERED', requestBody: { values: [rowData] }
      });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/users', async (req, res) => {
    const auth = getAuthClient();
    if (!auth) return res.json([]);
    
    try {
      const response: any = await sheets.spreadsheets.values.get({ auth, spreadsheetId: SHEET_ID, range: "'USUARIOS'!A2:I" });
      const rows = response.data.values;
      if (!rows) return res.json([]);

      const users = rows.map((row, index) => ({
        id: row[0] || `user-${index}`, idCode: row[1] || '', name: row[2] || '', email: row[3] || '', role: row[4] || 'VENTAS', createdAt: row[5] || '', lastLogin: row[6] || '', permissions: row[7] ? row[7].split(',') : [], active: row[8] === 'TRUE' || row[8] === '1' || !row[8]
      }));
      res.json(users);
    } catch (error: any) {
      res.json([]);
    }
  });

  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => { res.sendFile(path.join(distPath, 'index.html')); });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));
  } else {
    console.log('Vercel serverless mode');
  }
}

startServer();