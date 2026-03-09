const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const processData = () => {
    const excelPath = path.join(__dirname, '..', 'Configurator_Data.xlsx');
    if (!fs.existsSync(excelPath)) {
        console.error(`Excel file not found at ${excelPath}`);
        return;
    }

    const workbook = xlsx.readFile(excelPath);

    const getSheetData = (sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) return [];
        return xlsx.utils.sheet_to_json(worksheet, { defval: "" });
    };

    const rawCategories = getSheetData('Categories');
    const rawParts = getSheetData('Parts');
    const rawRules = getSheetData('Rules');
    const rawPresets = getSheetData('Presets');

    const filterHeaderDesc = (rows) => rows.filter(row => {
        const values = Object.values(row);
        // Skip rows that look like descriptions (contain parentheses) or are empty
        return values.length > 0 && values[0] && !String(values[0]).includes('(');
    });

    const categories = filterHeaderDesc(rawCategories).map(cat => ({
        id: cat.Category,
        name: cat.Display_Name,
        level: cat.Level,
        type: cat.Selection_Type,
        priority: parseInt(cat.Load_Priority),
        required: cat.Required && String(cat.Required).toLowerCase() === 'yes',
        icon: cat.Icon
    }));

    const parts = filterHeaderDesc(rawParts).map(part => ({
        id: part.Part_ID,
        name: String(part.Part_Name),
        category: part.Category,
        glb: part.GLB_File,
        node: part.Node_Name,
        sku: String(part.SKU),
        price: (part.Price === 'XXXX' || part.Price === 'XXX' || !part.Price) ? 0 : parseFloat(part.Price),
        status: part.Status,
        description: part.Description
    }));

    const rules = filterHeaderDesc(rawRules).map(rule => ({
        ifPart: rule.If_Part,
        relation: rule.Relation,
        thenPart: rule.Then_Part,
        message: rule.Message
    }));

    const presets = filterHeaderDesc(rawPresets).map(preset => {
        const selectedParts = {};
        Object.keys(preset).forEach(key => {
            if (['Preset_Name', 'Description'].includes(key)) return;
            const val = preset[key];
            if (val) {
                const valStr = String(val);
                selectedParts[key] = valStr.includes(',') ? valStr.split(',').map(v => v.trim()) : valStr.trim();
            }
        });
        return {
            name: preset.Preset_Name,
            description: preset.Description,
            parts: selectedParts
        };
    });

    const configMatrix = {
        categories,
        parts,
        rules,
        presets
    };

    const outPath = path.join(__dirname, '..', 'src', 'data', 'configMatrix.json');
    
    // Ensure data directory exists
    const dataDir = path.dirname(outPath);
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    fs.writeFileSync(outPath, JSON.stringify(configMatrix, null, 2));
    console.log(`Generated ${outPath}`);
};

processData();
