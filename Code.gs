// ═══════════════════════════════════════════════════════════════
//  Sales Dashboard — Google Apps Script Backend
//  Works with existing sheet structure, auto-adds new columns
// ═══════════════════════════════════════════════════════════════

const SECRET_KEY = 'sales2024secret';

function doGet(e) {
  try {
    const p = e.parameter;
    if (p.key !== SECRET_KEY) return json({ error: 'Unauthorized' });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    ensureColumns(sheet);

    switch (p.action) {
      case 'getAll': return json({ companies: getAll(sheet) });
      case 'add':    return json(addCompany(sheet, p));
      case 'update': return json(updateCompany(sheet, p));
      case 'delete': return json(deleteCompany(sheet, p));
      default:       return json({ error: 'Unknown action' });
    }
  } catch (err) {
    return json({ error: err.message });
  }
}

// Auto-add Instance and Important Points columns if missing
function ensureColumns(sheet) {
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  if (!headers.includes('Instance')) {
    sheet.getRange(1, headers.length + 1).setValue('Instance');
    headers.push('Instance');
  }
  if (!headers.includes('Important Points')) {
    const updatedLen = sheet.getLastColumn();
    sheet.getRange(1, updatedLen + 1).setValue('Important Points');
  }
}

function getHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

function colIndex(headers, name) {
  return headers.indexOf(name); // 0-based
}

function getAll(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  const headers  = getHeaders(sheet);
  const lastCol  = sheet.getLastColumn();
  const data     = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const iName   = colIndex(headers, 'Company Name');
  const iStatus = colIndex(headers, 'Status');
  const iNotes  = colIndex(headers, 'Notes');
  const iDate   = colIndex(headers, 'Date Added');
  const iInst   = colIndex(headers, 'Instance');
  const iImp    = colIndex(headers, 'Important Points');

  return data
    .map((row, i) => ({
      id:              i + 2,
      name:            iName   >= 0 ? (row[iName]   || '') : '',
      status:          iStatus >= 0 ? (row[iStatus] || '') : '',
      notes:           iNotes  >= 0 ? (row[iNotes]  || '') : '',
      dateAdded:       iDate   >= 0 && row[iDate] ? new Date(row[iDate]).toISOString() : '',
      instance:        iInst   >= 0 ? (row[iInst]   || '') : '',
      importantPoints: iImp    >= 0 ? (row[iImp]    || '') : ''
    }))
    .filter(c => c.name);
}

function addCompany(sheet, p) {
  const headers = getHeaders(sheet);
  const now     = new Date();

  // Build row matching existing columns
  const iName   = colIndex(headers, 'Company Name');
  const iStatus = colIndex(headers, 'Status');
  const iNotes  = colIndex(headers, 'Notes');
  const iDate   = colIndex(headers, 'Date Added');
  const iLast   = colIndex(headers, 'Last Updated');
  const iInst   = colIndex(headers, 'Instance');
  const iImp    = colIndex(headers, 'Important Points');

  const row = new Array(headers.length).fill('');
  if (iName   >= 0) row[iName]   = sanitize(p.name);
  if (iStatus >= 0) row[iStatus] = sanitize(p.status);
  if (iNotes  >= 0) row[iNotes]  = sanitize(p.notes);
  if (iDate   >= 0) row[iDate]   = now;
  if (iLast   >= 0) row[iLast]   = now;
  if (iInst   >= 0) row[iInst]   = sanitize(p.instance);
  if (iImp    >= 0) row[iImp]    = sanitize(p.importantPoints);

  sheet.appendRow(row);
  return { success: true, id: sheet.getLastRow() };
}

function updateCompany(sheet, p) {
  const rowNum = parseInt(p.id);
  if (rowNum < 2 || rowNum > sheet.getLastRow()) return { error: 'Row not found' };

  const headers = getHeaders(sheet);
  const now     = new Date();

  const iName   = colIndex(headers, 'Company Name');
  const iStatus = colIndex(headers, 'Status');
  const iNotes  = colIndex(headers, 'Notes');
  const iLast   = colIndex(headers, 'Last Updated');
  const iInst   = colIndex(headers, 'Instance');
  const iImp    = colIndex(headers, 'Important Points');

  if (iName   >= 0) sheet.getRange(rowNum, iName   + 1).setValue(sanitize(p.name));
  if (iStatus >= 0) sheet.getRange(rowNum, iStatus + 1).setValue(sanitize(p.status));
  if (iNotes  >= 0) sheet.getRange(rowNum, iNotes  + 1).setValue(sanitize(p.notes));
  if (iLast   >= 0) sheet.getRange(rowNum, iLast   + 1).setValue(now);
  if (iInst   >= 0) sheet.getRange(rowNum, iInst   + 1).setValue(sanitize(p.instance));
  if (iImp    >= 0) sheet.getRange(rowNum, iImp    + 1).setValue(sanitize(p.importantPoints));

  return { success: true };
}

function deleteCompany(sheet, p) {
  const rowNum = parseInt(p.id);
  if (rowNum < 2 || rowNum > sheet.getLastRow()) return { error: 'Row not found' };
  sheet.deleteRow(rowNum);
  return { success: true };
}

function sanitize(val) {
  return val ? String(val).trim() : '';
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
