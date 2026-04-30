import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const SHEET_ID = process.env.GOOGLE_SHEET_ID || '';
const rawEmail = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '').trim();
let rawKey = (process.env.GOOGLE_PRIVATE_KEY || '').trim();

if (!SHEET_ID || !rawEmail || !rawKey) {
  console.error('✗ Faltan credenciales en .env');
  console.log('Asegúrate de tener GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY');
  process.exit(1);
}

let clientEmail = rawEmail;
let privateKey = rawKey;

try {
  if (rawKey.startsWith('{')) {
    const parsed = JSON.parse(rawKey);
    if (parsed.client_email) clientEmail = parsed.client_email;
    if (parsed.private_key) privateKey = parsed.private_key;
  }
} catch {}

const keyMatch = privateKey.match(/-----BEGIN [A-Z ]+-----([\s\S]*?)-----END [A-Z ]+-----/);
if (keyMatch) {
  privateKey = keyMatch[0];
}

const auth = new google.auth.JWT({
  email: clientEmail,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function setupSheet() {
  console.log('\n🟢 Setup de ZAFI CRM Spreadsheet\n');
  console.log(`📧 Service Account: ${clientEmail}\n`);

  try {
    console.log(`🔄 Conectando al Sheet ${SHEET_ID}...`);
    const ss = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
    const existingSheets = ss.data.sheets?.map((s: any) => s.properties?.title) || [];
    console.log(`✓ Conexión exitosa!`);
    console.log(`  Nombre: ${ss.data.properties?.title}`);
    console.log(`  Hojas: ${existingSheets.length > 0 ? existingSheets.join(', ') : 'NINGUNA'}\n`);

    const masterHeaders = [
      'ID_UNICO', 'ID_CODE_USUARIO', 'CREADO_POR_CODE', 'ACTUALIZADO_POR_CODE', 'FECHA_REGISTRO', 'NUMERO_PEDIDO', 'CLIENTE', 'CLIENTE_EMAIL',
      'CLIENTE_TELEFONO', 'CLIENTE_DIRECCION', 'REFERENCIADO_POR', 'METODO_PAGO_CLIENTE',
      'ARTICULO_DETALLE', 'CATEGORIA', 'BOUTIQUE_ORIGEN', 'LINK_CARPETA_IMAGENES',
      'TIPO_COMPRA', 'COSTO_USD', 'TIPO_CAMBIO', 'COSTO_MXN', 'PRECIO_VENTA_MXN',
      'UTILIDAD_BRUTA', 'COSTO_ENVIO_USA', 'ESTADO_ENVIO_USA', 'ESTADO_ENTREGA_USA',
      'UBICACION_ACTUAL', 'FECHA_INGRESO_ZAFIRO', 'INCLUIDO_EN_CORTE_ZAFIRO',
      'ESTADO_ENTREGA_MX', 'FECHA_ENTREGA_CLIENTE', 'ANTICIPO_ABONADO',
      'TOTAL_PAGADO', 'SALDO_PENDIENTE', 'ABONADO_AMEX', 'UTILIDAD_TOMADA',
      'REVISADO_RODRIGO', 'OBSERVACIONES_NOTAS', 'ULTIMO_STATUS_NOTIFICADO',
      'TOTAL_COSTO_USD', 'TOTAL_COSTO_MXN', 'TARJETA_PAGO', 'SUBCATEGORIA', 'TAGS'
    ];

    const usersHeaders = [
      'ID_USUARIO', 'ID_CODE', 'NOMBRE', 'EMAIL', 'ROL', 'FECHA_ALTA',
      'ULTIMO_LOGIN', 'PERMISOS', 'ACTIVO'
    ];

    const clientesHeaders = [
      'ID_CLIENTE', 'NOMBRE', 'EMAIL', 'TELEFONO', 'DIRECCION',
      'IG_HANDLE', 'REFERIDO_POR', 'FECHA_ALTA', 'TOTAL_PEDIDOS',
      'TOTAL_COMPRADO', 'NOTAS', 'TIPO_DE_PAGO'
    ];

    // Verificar/Crear MASTER_DATA
    if (!existingSheets.includes('MASTER_DATA')) {
      console.log('⚠ Crea manualmente la hoja MASTER_DATA en tu Google Sheet');
    } else {
      console.log('✓ Hoja MASTER_DATA existe');
    }

    // Verificar/Crear CLIENTES
    if (!existingSheets.includes('CLIENTES')) {
      console.log('⚠ Crea manualmente la hoja CLIENTES en tu Google Sheet');
    } else {
      console.log('✓ Hoja CLIENTES existe');
    }

    console.log('\n📌 PARA COMPLETAR EL SETUP:');
    console.log('  1. Abre: https://docs.google.com/spreadsheets/d/' + SHEET_ID);
    console.log('  2. Crea las hojas MASTER_DATA y CLIENTES si no existen');
    console.log('  3. Agrega los headers correspondientes\n');

    console.log('🎉 La app funciona con datos locales mientras tanto.\n');

  } catch (error: any) {
    console.error('\n✗ Error:', error.message);
    console.log('\n📌 SOLUCIONES:');
    console.log('  1. Verifica que el Sheet exista');
    console.log('  2. Comparte el Sheet con: ' + clientEmail);
    console.log('  3. Da permisos de Editor al service account\n');
    process.exit(1);
  }
}

setupSheet();