const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const excelPath = path.join(__dirname, '..', 'Configurator_Data.xlsx');
if (!fs.existsSync(excelPath)) {
    console.error(`Excel file not found at ${excelPath}`);
    process.exit(1);
}

const workbook = xlsx.readFile(excelPath);

// 1. Update Categories
const categoriesSheet = workbook.Sheets['Categories'];
let categories = xlsx.utils.sheet_to_json(categoriesSheet);

categories = categories.map(c => {
    if (c.Category === 'Control') {
        return {
            ...c,
            Selection_Type: 'multi'
        };
    }
    return c;
});

workbook.Sheets['Categories'] = xlsx.utils.json_to_sheet(categories);

// 2. Update Rules
const rulesSheet = workbook.Sheets['Rules'];
let rules = xlsx.utils.sheet_to_json(rulesSheet);

const handlebarRule = {
    If_Part: 'control-handlebar',
    Relation: 'REQUIRES',
    Then_Part: 'control-column',
    Message: ''
};

if (!rules.find(r => r.If_Part === 'control-handlebar' && r.Then_Part === 'control-column')) {
    rules.push(handlebarRule);
}

workbook.Sheets['Rules'] = xlsx.utils.json_to_sheet(rules);

// 3. Save Excel
xlsx.writeFile(workbook, excelPath);
console.log('Successfully updated Configurator_Data.xlsx: Control set to multi and handlebar rule reinstated.');
