/**
 * Google Apps Script backend for NovaVolt Solar Triage.
 *
 * SETUP
 * 1) Create a blank Google Sheet.
 * 2) Extensions -> Apps Script.
 * 3) Replace the default code with this file.
 * 4) Deploy -> New deployment -> Web app.
 * 5) Execute as: Me.
 * 6) Who has access: Anyone (or Anyone with Google account, if that works for your use).
 * 7) Copy the /exec URL and paste it into the Solar Triage app Settings.
 */

const SHEET_NAME = 'TriageData';

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['id','updatedAt','json']);
  }
  return sh;
}

function doPost(e) {
  const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  if (payload.action !== 'upsert' || !payload.record || !payload.record.id) {
    return json_({ok:false,error:'Invalid payload'});
  }

  const record = payload.record;
  const sh = getSheet_();
  const last = sh.getLastRow();
  const ids = last >= 2 ? sh.getRange(2,1,last-1,1).getValues().flat() : [];
  const idx = ids.indexOf(record.id);

  const row = [record.id, record.updatedAt || new Date().toISOString(), JSON.stringify(record)];

  if (idx >= 0) sh.getRange(idx + 2, 1, 1, 3).setValues([row]);
  else sh.appendRow(row);

  return json_({ok:true,id:record.id});
}

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';
  const callback = (e && e.parameter && e.parameter.callback) || '';

  if (action !== 'list') return jsonp_({ok:false,error:'Unknown action'}, callback);

  const sh = getSheet_();
  const last = sh.getLastRow();
  const values = last >= 2 ? sh.getRange(2,1,last-1,3).getValues() : [];

  const records = [];
  values.forEach(r => {
    try { records.push(JSON.parse(r[2])); } catch (_) {}
  });

  return jsonp_({ok:true,records}, callback);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(obj, callback) {
  const safe = String(callback || 'callback').replace(/[^\w$.]/g,'');
  return ContentService
    .createTextOutput(`${safe}(${JSON.stringify(obj)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
