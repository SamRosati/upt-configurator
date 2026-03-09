const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const excelPath = path.join(__dirname, '..', 'Configurator_Data.xlsx');
const workbook = xlsx.readFile(excelPath);

// 1. Update Parts
const partsSheet = workbook.Sheets['Parts'];
let parts = xlsx.utils.sheet_to_json(partsSheet);

// Ensure handlebar exists properly
const handlebar = {
    Category: 'Control',
    Part_Name: 'Handle Bar',
    Part_ID: 'control-handlebar',
    GLB_File: 'control.glb',
    Node_Name: 'Control_Handlebar',
    SKU: 'CTL-HBAR',
    Price: 500,
    Status: 'available',
    Description: 'Standard Handle Bar'
};

if (!parts.find(p => p.Part_ID === 'control-handlebar')) {
    parts.push(handlebar);
} else {
    parts = parts.map(p => p.Part_ID === 'control-handlebar' ? handlebar : p);
}

workbook.Sheets['Parts'] = xlsx.utils.json_to_sheet(parts);

// 2. Update Rules
const rulesSheet = workbook.Sheets['Rules'];
let rules = xlsx.utils.sheet_to_json(rulesSheet);

// Remove the conflicting rule where handlebar requires column (they are in the same single-select category)
const filteredRules = rules.filter(r => !(r.If_Part === 'control-handlebar' && r.Then_Part === 'control-column'));

workbook.Sheets['Rules'] = xlsx.utils.json_to_sheet(filteredRules);

// 3. Save Excel
xlsx.writeFile(workbook, excelPath);
console.log('Successfully updated Configurator_Data.xlsx with handlebar fix');
