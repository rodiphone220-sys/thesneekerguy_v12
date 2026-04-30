/**
 * ZAFI CRM - Google Apps Script para Setup Automático del Spreadsheet
 * 
 * Instrucciones:
 * 1. Ve a https://script.google.com
 * 2. Crea un nuevo proyecto
 * 3. Copia este código
 * 4. Ejecuta setupSheet() desde la consola
 * 5. Comparte tu Google Sheet con el email de service account (thesneekerguyv10n@...)
 */

function setupSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = 'ZAFI CRM Setup';
  
  // Crear o obtener hoja MASTER_DATA
  let masterSheet = ss.getSheetByName('MASTER_DATA');
  if (!masterSheet) {
    masterSheet = ss.insertSheet('MASTER_DATA');
    Logger.log('✓ Hoja MASTER_DATA creada');
  } else {
    Logger.log('✓ Hoja MASTER_DATA ya existe');
  }
  
  // Headers para MASTER_DATA (Columnas A hasta AN - 40 columnas)
  const masterHeaders = [
    'ID_UNICO',           // A
    'FECHA_REGISTRO',     // B
    'NUMERO_PEDIDO',      // C
    'CLIENTE',            // D
    'CLIENTE_EMAIL',      // E
    'CLIENTE_TELEFONO',  // F
    'CLIENTE_DIRECCION',  // G
    'REFERENCIADO_POR',   // H
    'METODO_PAGO_CLIENTE', // I
    'ARTICULO_DETALLE',   // J
    'CATEGORIA',         // K
    'BOUTIQUE_ORIGEN',   // L
    'LINK_CARPETA_IMAGENES', // M
    'TIPO_COMPRA',       // N
    'COSTO_USD',        // O
    'TIPO_CAMBIO',       // P
    'COSTO_MXN',        // Q
    'PRECIO_VENTA_MXN',  // R
    'UTILIDAD_BRUTA',    // S
    'COSTO_ENVIO_USA',   // T
    'ESTADO_ENVIO_USA',  // U
    'ESTADO_ENTREGA_USA', // V
    'UBICACION_ACTUAL',   // W
    'FECHA_INGRESO_ZAFIRO', // X
    'INCLUIDO_EN_CORTE_ZAFIRO', // Y
    'ESTADO_ENTREGA_MX',  // Z
    'FECHA_ENTREGA_CLIENTE', // AA
    'ANTICIPO_ABONADO',  // AB
    'TOTAL_PAGADO',     // AC
    'SALDO_PENDIENTE',   // AD
    'ABONADO_AMEX',     // AE
    'UTILIDAD_TOMADA',   // AF
    'REVISADO_RODRIGO', // AG
    'OBSERVACIONES_NOTAS', // AH
    'ULTIMO_STATUS_NOTIFICADO', // AI
    'TOTAL_COSTO_USD', // AJ
    'TOTAL_COSTO_MXN',  // AK
    'TARJETA_PAGO',    // AL
    'SUBCATEGORIA',    // AM
    'TAGS'            // AN
  ];
  
  // Escribir headers en MASTER_DATA
  masterSheet.getRange(1, 1, 1, masterHeaders.length).setValues([masterHeaders]);
  masterSheet.setFrozenRows(1);
  
  // Formato de headers
  masterSheet.getRange(1, 1, 1, masterHeaders.length).setFontWeight('bold');
  masterSheet.getRange(1, 1, 1, masterHeaders.length).setBackground('#1A1A1A');
  masterSheet.getRange(1, 1, 1, masterHeaders.length).setFontColor('#FFFFFF');
  
  // Auto-ajustar columnas
  for (let i = 1; i <= masterHeaders.length; i++) {
    masterSheet.autoResizeColumn(i);
  }
  
  Logger.log(`✓ ${masterHeaders.length} headers configurados en MASTER_DATA`);
  
  // Crear o obtener hoja CLIENTES
  let clientesSheet = ss.getSheetByName('CLIENTES');
  if (!clientesSheet) {
    clientesSheet = ss.insertSheet('CLIENTES');
    Logger.log('✓ Hoja CLIENTES creada');
  } else {
    Logger.log('✓ Hoja CLIENTES ya existe');
  }
  
  // Headers para CLIENTES (12 columnas)
  const clientesHeaders = [
    'ID_CLIENTE',     // A
    'NOMBRE',         // B
    'EMAIL',          // C
    'TELEFONO',       // D
    'DIRECCION',      // E
    'IG_HANDLE',      // F
    'REFERIDO_POR',   // G
    'FECHA_ALTA',     // H
    'TOTAL_PEDIDOS',  // I
    'TOTAL_COMPRADO', // J
    'NOTAS',         // K
    'TIPO_DE_PAGO'   // L
  ];
  
  clientesSheet.getRange(1, 1, 1, clientesHeaders.length).setValues([clientesHeaders]);
  clientesSheet.setFrozenRows(1);
  
  clientesSheet.getRange(1, 1, 1, clientesHeaders.length).setFontWeight('bold');
  clientesSheet.getRange(1, 1, 1, clientesHeaders.length).setBackground('#1A1A1A');
  clientesSheet.getRange(1, 1, 1, clientesHeaders.length).setFontColor('#FFFFFF');
  
  for (let i = 1; i <= clientesHeaders.length; i++) {
    clientesSheet.autoResizeColumn(i);
  }
  
  Logger.log(`✓ ${clientesHeaders.length} headers configurados en CLIENTES`);
  
  // Proteger hojas (opcional)
  const protection = masterSheet.protect().setDescription('ProtectedMASTER_DATA');
  protection.setWarningOnly(true);
  
  const clientesProtection = clientesSheet.protect().setDescription('ProtectedCLIENTES');
  clientesProtection.setWarningOnly(true);
  
  Logger.log('✓ Setup completado!');
  Logger.log('📊 Resumen:');
  Logger.log(`  - MASTER_DATA: ${masterHeaders.length} columnas`);
  Logger.log(`  - CLIENTES: ${clientesHeaders.length} columna`);
  Logger.log(`  - Total hojas: ${ss.getSheets().length}`);
  
  return {
    status: 'OK',
    sheets: ss.getSheets().map(s => s.getName())
  };
}

/**
 * Agregar datos de ejemplo para pruebas
 */
function addSampleData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const masterSheet = ss.getSheetByName('MASTER_DATA');
  
  if (!masterSheet) {
    Logger.log('✗ Hoja MASTER_DATA no existe. Ejecuta setupSheet() primero.');
    return;
  }
  
  const sampleData = [
    [
      'SNK-2024-001',          // ID_UNICO
      new Date().toLocaleDateString(), // FECHA_REGISTRO
      'ORD-001',             // NUMERO_PEDIDO
      'Juan Pérez',          // CLIENTE
      'juan@email.com',     // CLIENTE_EMAIL
      '8331234567',         // CLIENTE_TELEFONO
      'Mexico, TAM',        // CLIENTE_DIRECCION
      'Instagram',         // REFERENCIADO_POR
      'Transferencia',     // METODO_PAGO_CLIENTE
      'Air Jordan 1 Retro High OG', // ARTICULO_DETALLE
      'CALZADO',           // CATEGORIA
      'Nike Outlet LA',    // BOUTIQUE_ORIGEN
      '',                  // LINK_CARPETA_IMAGENES
      'Directo',           // TIPO_COMPRA
      '170',               // COSTO_USD
      '18.50',            // TIPO_CAMBIO
      '3145',             // COSTO_MXN
      '6999',             // PRECIO_VENTA_MXN
      '3854',             // UTILIDAD_BRUTA
      '15',               // COSTO_ENVIO_USA
      'Entregado',         // ESTADO_ENVIO_USA
      'Recibido',         // ESTADO_ENTREGA_USA
      'El Paso',          // UBICACION_ACTUAL
      new Date().toLocaleDateString(), // FECHA_INGRESO_ZAFIRO
      'Sí',               // INCLUIDO_EN_CORTE_ZAFIRO
      'Entregado',        // ESTADO_ENTREGA_MX
      new Date().toLocaleDateString(), // FECHA_ENTREGA_CLIENTE
      '3500',            // ANTICIPO_ABONADO
      '6999',            // TOTAL_PAGADO
      '0',               // SALDO_PENDIENTE
      '0',               // ABONADO_AMEX
      '3854',            // UTILIDAD_TOMADA
      'Revisado',        // REVISADO_RODRIGO
      'Todo correcto',   // OBSERVACIONES_NOTAS
      'ENTREGADO',      // ULTIMO_STATUS_NOTIFICADO
      '170',          // TOTAL_COSTO_USD
      '3145',         // TOTAL_COSTO_MXN
      'AMEX',         // TARJETA_PAGO
      'Basketball',   // SUBCATEGORIA
      'Jordan,Retro' // TAGS
    ]
  ];
  
  masterSheet.getRange(2, 1, 1, sampleData[0].length).setValues(sampleData);
  Logger.log('✓ Datos de ejemplo agregados');
}

/**
 * Verificar estado del sheet
 */
function checkStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  Logger.log('📊 Estado actual del Spreadsheet:');
  Logger.log(`  Nombre: ${ss.getName()}`);
  Logger.log(`  URLs: ${ss.getUrl()}`);
  Logger.log(`  Total hojas: ${sheets.length}`);
  
  sheets.forEach(sheet => {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    Logger.log(`  - ${sheet.getName()}: ${lastRow} filas, ${lastCol} columnas`);
  });
}