const xlsx = require('xlsx');
const Papa = require('papaparse');
const supabase = require('../config/supabase');

exports.analyzeBuffer = (buffer, mimetype, originalname) => {
  try {
    let sheets = [];
    let columns = [];
    let previewData = [];

    if (mimetype === 'text/csv' || originalname.endsWith('.csv')) {
      const csvString = buffer.toString('utf8');
      const result = Papa.parse(csvString, { header: true, preview: 10, skipEmptyLines: true });
      sheets = ['CSV Data'];
      if (result.meta && result.meta.fields) {
        columns = result.meta.fields;
      }
      previewData = result.data;
    } else {
      // Excel (XLSX, XLS)
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      sheets = workbook.SheetNames;
      if (sheets.length > 0) {
        const firstSheet = workbook.Sheets[sheets[0]];
        const sheetData = xlsx.utils.sheet_to_json(firstSheet, { header: 1 });
        if (sheetData.length > 0) {
          columns = sheetData[0];
          // Get sample rows (skip header)
          previewData = sheetData.slice(1, 6).map(row => {
            let obj = {};
            columns.forEach((col, idx) => {
              obj[col] = row[idx];
            });
            return obj;
          });
        }
      }
    }

    return { sheets, columns, previewData };
  } catch (err) {
    console.error('Parse error:', err);
    throw new Error('Failed to parse file structure');
  }
};
