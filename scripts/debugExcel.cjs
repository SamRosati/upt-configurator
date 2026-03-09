const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const excelPath = path.join(__dirname, '..', 'Configurator_Data.xlsx');
const workbook = xlsx.readFile(excelPath);

const parts = xlsx.utils.sheet_to_json(workbook.Sheets['Parts']);
const wb1130 = parts.find(p => p.Part_ID === 'wb-1130' || p.Part_ID === 'wb1130');
console.log('--- Parts ---');
console.log('WB 1130:', JSON.stringify(wb1130, null, 2));

const rules = xlsx.utils.sheet_to_json(workbook.Sheets['Rules']);
const wbRules = rules.filter(r => r.If_Part === 'wb-1130' || r.Then_Part === 'wb-1130');
console.log('--- Rules for 1130 ---');
console.log(JSON.stringify(wbRules, null, 2));
