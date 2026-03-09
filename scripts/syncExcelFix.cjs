const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const excelPath = path.join(__dirname, '..', 'Configurator_Data.xlsx');
const workbook = xlsx.readFile(excelPath);

// 1. Update Parts
const partsSheet = workbook.Sheets['Parts'];
let parts = xlsx.utils.sheet_to_json(partsSheet);

parts = parts.map(p => {
    if (p.Part_ID === 'wb-1130') {
        return {
            ...p,
            GLB_File: 'wb.glb',
            Node_Name: 'WB_1130'
        };
    }
    return p;
});

// Add placeholder parts if they don't exist in Excel
const requiredPlaceholders = [
    {
        Category: 'Motor',
        Part_Name: 'Motor A 1130',
        Part_ID: 'motor-a-1130',
        GLB_File: 'motor.glb',
        Node_Name: 'Motor_A_1130',
        SKU: 'MOT-A-1130',
        Price: 899,
        Status: 'available',
        Description: 'Motor Type A for Short wheelbase'
    },
    {
        Category: 'Tire',
        Part_Name: 'Offroad Tires 1130',
        Part_ID: 'tire-offroad-1130',
        GLB_File: 'tire.glb',
        Node_Name: 'Tire_Offroad_1130',
        SKU: 'TIRE-OFF-1130',
        Price: 499,
        Status: 'available',
        Description: 'All-terrain tires for Short wheelbase'
    }
];

requiredPlaceholders.forEach(ph => {
    if (!parts.find(p => p.Part_ID === ph.Part_ID)) {
        parts.push(ph);
    }
});

workbook.Sheets['Parts'] = xlsx.utils.json_to_sheet(parts);

// 2. Update Rules
const rulesSheet = workbook.Sheets['Rules'];
let rules = xlsx.utils.sheet_to_json(rulesSheet);

const newRules = [
    { If_Part: 'wb-1130', Relation: 'REQUIRES', Then_Part: 'block-single', Message: '' },
    { If_Part: 'motor-a-1130', Relation: 'REQUIRES', Then_Part: 'wb-1130', Message: '' },
    { If_Part: 'tire-offroad-1130', Relation: 'REQUIRES', Then_Part: 'motor-a-1130', Message: '' }
];

newRules.forEach(nr => {
    if (!rules.find(r => r.If_Part === nr.If_Part && r.Then_Part === nr.Then_Part)) {
        rules.push(nr);
    }
});

workbook.Sheets['Rules'] = xlsx.utils.json_to_sheet(rules);

// 3. Save Excel
xlsx.writeFile(workbook, excelPath);
console.log('Successfully updated Configurator_Data.xlsx with 1130 fixes');
