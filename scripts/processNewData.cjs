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

    const isNonDataRow = (value) => {
        const text = String(value || '').trim();
        if (!text) return true;
        if (text.includes('(') && text.includes(')')) return true;
        const lowered = text.toLowerCase();
        return (
            lowered.startsWith('category name') ||
            lowered.startsWith('display name') ||
            lowered.startsWith('part_id that') ||
            lowered.startsWith('part_id') ||
            lowered.startsWith('description shown') ||
            lowered.startsWith('preset_name') ||
            lowered.startsWith('if_part') ||
            lowered.startsWith('relation') ||
            lowered.startsWith('then_part')
        );
    };

    const filterRows = (rows, key) => rows.filter((row) => !isNonDataRow(row?.[key]));

    const normalizeGlb = (glbFile) => {
        if (!glbFile) return '';
        const base = path.basename(String(glbFile).trim());
        if (!base.toLowerCase().endsWith('.glb')) return '';
        return base;
    };

    const slugFromSku = (sku) =>
        String(sku || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

    const safePartId = (row) => {
        let id = String(row.Part_ID || '').trim();
        if (!id || /^n\/a$/i.test(id) || id.length < 2) {
            const fromSku = slugFromSku(row.SKU);
            id = fromSku || '';
        }
        return id;
    };

    const categories = filterRows(rawCategories, 'Category').map(cat => ({
        id: cat.Category,
        name: cat.Display_Name,
        level: cat.Level,
        type: String(cat.Selection_Type || 'single').toLowerCase() === 'multi' ? 'multi' : 'single',
        required: String(cat.Required || '').toLowerCase() === 'yes',
        icon: cat.Icon
    }));

    let parts = filterRows(rawParts, 'Category').map(part => {
        const id = safePartId(part);
        return {
            id,
            name: String(part.Part_Name),
            category: part.Category,
            glb: normalizeGlb(part.GLB_File),
            node: part.Node_Name,
            sku: String(part.SKU),
            price: (part.Price === 'XXXX' || part.Price === 'XXX' || !part.Price) ? 0 : parseFloat(part.Price),
            status: String(part.Status || '').toLowerCase() || 'available',
            description: part.Description
        };
    }).filter((part) => part.id && part.category);

    const categoryIds = new Set(categories.map((c) => c.id));
    const partCategoryIds = new Set(parts.map((p) => p.category));
    partCategoryIds.forEach((cid) => {
        if (!categoryIds.has(cid)) {
            categories.push({
                id: cid,
                name: cid,
                level: '',
                type: 'single',
                required: cid === 'Column' || cid === 'Handle',
                icon: '',
            });
            categoryIds.add(cid);
        }
    });

    const categoriesWithParts = new Set(parts.map((p) => p.category));
    const prunedCategories = categories.filter((c) => categoriesWithParts.has(c.id));

    const validPartIds = new Set(parts.map((p) => p.id));
    const rules = filterRows(rawRules, 'If_Part').map(rule => ({
        ifPart: rule.If_Part,
        relation: String(rule.Relation || '').toUpperCase(),
        thenPart: rule.Then_Part,
        message: rule.Message
    })).filter((rule) =>
        rule.ifPart &&
        rule.thenPart &&
        (rule.relation === 'REQUIRES' || rule.relation === 'EXCLUDES') &&
        validPartIds.has(rule.ifPart) &&
        validPartIds.has(rule.thenPart)
    );

    const presets = filterRows(rawPresets, 'Preset_Name').map(preset => {
        const selectedParts = {};
        Object.keys(preset).forEach(key => {
            if (['Preset_Name', 'Description'].includes(key)) return;
            const val = preset[key];
            if (val) {
                const valStr = String(val);
                let parsed = valStr.includes(',') ? valStr.split(',').map(v => v.trim()) : valStr.trim();
                if (Array.isArray(parsed)) {
                    parsed = parsed.filter(Boolean);
                    if (parsed.length === 0) return;
                }
                selectedParts[key] = parsed;
            }
        });
        return {
            name: preset.Preset_Name,
            description: preset.Description,
            parts: selectedParts
        };
    }).filter((preset) => preset.name);

    const configMatrix = {
        categories: prunedCategories,
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
