import fs from 'fs';
import Papa from 'papaparse';
import path from 'path';

const readCSV = (filename) => {
    const csvFile = fs.readFileSync(filename, 'utf8');
    return Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
    }).data;
};

const processData = () => {
    const rawCategories = readCSV('Categories.csv');
    const rawParts = readCSV('Parts.csv');
    const rawRules = readCSV('Rules.csv');
    const rawPresets = readCSV('Presets.csv');

    // Filter out header description rows (row 1 in CSV usually)
    const filterHeaderDesc = (rows) => rows.filter(row => !Object.values(row)[0].includes('('));

    const categories = filterHeaderDesc(rawCategories).map(cat => ({
        id: cat.Category,
        name: cat.Display_Name,
        type: cat.Selection_Type,
        priority: parseInt(cat.Load_Priority),
        required: cat.Required.toLowerCase() === 'yes',
        icon: cat.Icon
    }));

    const parts = filterHeaderDesc(rawParts).map(part => ({
        id: part.Part_ID,
        name: part.Part_Name,
        category: part.Category,
        glb: part.GLB_File,
        node: part.Node_Name,
        sku: part.SKU,
        price: part.Price === 'XXXX' || part.Price === 'XXX' ? 0 : parseFloat(part.Price),
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
                // Handle comma separated for multi-select categories (like Body)
                selectedParts[key] = val.includes(',') ? val.split(',').map(v => v.trim()) : val.trim();
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

    fs.writeFileSync(path.join('src', 'data', 'configMatrix.json'), JSON.stringify(configMatrix, null, 2));
    console.log('Generated src/data/configMatrix.json');
};

processData();
