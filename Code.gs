// ═══════════════════════════════════════════════════════════════
//  Sales Dashboard — Google Apps Script Backend
//  Sheet columns: ID | Name | Instance | Status | Notes | Important Points | Date Added
// ═══════════════════════════════════════════════════════════════

const SECRET_KEY = 'sales2024secret'; // must match index.html
const SHEET_NAME = 'Companies';       // tab name in your Google Sheet

// Column index map (1-based)
const COL = {
  ID:               1,
  NAME:             2,
  INSTANCE:         3,
  STATUS:           4,
  NOTES:            5,
  IMPORTANT_POINTS: 6,
  DATE_ADDED:       7
};
const TOTAL_COLS = 7;

function doGet(e) {
  try {
    const p = e.parameter;
    if (p.key !== SECRET_KEY) return json({ error: 'Unauthorized' });

    const sheet = getSheet();

    switch (p.action) {
      case 'getAll':  return json({ companies: getAll(sheet) });
      case 'add':     return json(addCompany(sheet, p));
      case 'update':  return json(updateCompany(sheet, p));
      case 'delete':  return json(deleteCompany(sheet, p));
      default:        return json({ error: 'Unknown action' });
    }
  } catch (err) {
    return json({ error: err.message });
  }
}

// ── Helpers ───────────────────────────────────────────────────
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, TOTAL_COLS).setValues([[
      'ID', 'Name', 'Instance', 'Status', 'Notes', 'Important Points', 'Date Added'
    ]]);
    sheet.getRange(1, 1, 1, TOTAL_COLS).setFontWeight('bold').setBackground('#1a3a6e').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getAll(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  return data.slice(1).map(row => ({
    id:              Number(row[COL.ID - 1]),
    name:            row[COL.NAME - 1]             || '',
    instance:        row[COL.INSTANCE - 1]         || '',
    status:          row[COL.STATUS - 1]           || '',
    notes:           row[COL.NOTES - 1]            || '',
    importantPoints: row[COL.IMPORTANT_POINTS - 1] || '',
    dateAdded:       row[COL.DATE_ADDED - 1]       ? new Date(row[COL.DATE_ADDED - 1]).toISOString() : ''
  })).filter(c => c.id);
}

function addCompany(sheet, p) {
  const id        = nextId(sheet);
  const dateAdded = new Date();
  sheet.appendRow([
    id,
    sanitize(p.name),
    sanitize(p.instance),
    sanitize(p.status),
    sanitize(p.notes),
    sanitize(p.importantPoints),
    dateAdded
  ]);
  return { success: true, id };
}

function updateCompany(sheet, p) {
  const id  = parseInt(p.id);
  const row = findRow(sheet, id);
  if (!row) return { error: 'Company not found' };

  sheet.getRange(row, COL.NAME).setValue(sanitize(p.name));
  sheet.getRange(row, COL.INSTANCE).setValue(sanitize(p.instance));
  sheet.getRange(row, COL.STATUS).setValue(sanitize(p.status));
  sheet.getRange(row, COL.NOTES).setValue(sanitize(p.notes));
  sheet.getRange(row, COL.IMPORTANT_POINTS).setValue(sanitize(p.importantPoints));
  return { success: true };
}

function deleteCompany(sheet, p) {
  const id  = parseInt(p.id);
  const row = findRow(sheet, id);
  if (!row) return { error: 'Company not found' };
  sheet.deleteRow(row);
  return { success: true };
}

function findRow(sheet, id) {
  const ids = sheet.getRange(2, COL.ID, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (Number(ids[i][0]) === id) return i + 2;
  }
  return null;
}

function nextId(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return 1;
  const ids = sheet.getRange(2, COL.ID, last - 1, 1).getValues().flat().filter(Number);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function sanitize(val) {
  return val ? String(val).trim() : '';
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
