import { create } from 'zustand';
import matrix from '../data/configMatrix.json';

// Updated to a simpler comma-separated string of IDs
const getInitialStateFromURL = () => {
    const params = new URLSearchParams(window.location.search);
    const config = params.get('config');
    if (!config) return null;

    try {
        const selected = {};
        const pairs = config.split('|');
        pairs.forEach(pair => {
            const [catId, partIds] = pair.split(':');
            if (partIds.includes(',')) {
                selected[catId] = partIds.split(',');
            } else {
                selected[catId] = partIds;
            }
        });
        return selected;
    } catch (e) {
        console.error('Failed to parse config from URL', e);
        return null;
    }
};

const toArray = (val) => {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
};

const getPartById = (matrixData, partId) => matrixData.parts.find((p) => p.id === partId);
const getCategoryById = (matrixData, categoryId) => matrixData.categories.find((c) => c.id === categoryId);

const getCompositeCategories = (matrixData) => {
    const composite = new Set();

    matrixData.categories.forEach((cat) => {
        const partIds = new Set(matrixData.parts.filter((p) => p.category === cat.id).map((p) => p.id));
        const hasInternalRequires = matrixData.rules.some(
            (r) =>
                r.relation === 'REQUIRES' &&
                partIds.has(r.ifPart) &&
                partIds.has(r.thenPart)
        );
        if (hasInternalRequires) composite.add(cat.id);
    });

    return composite;
};

const compositeCategories = getCompositeCategories(matrix);

const normalizeSelectedParts = (selectedParts, matrixData) => {
    const normalized = { ...(selectedParts || {}) };

    matrixData.categories.forEach((cat) => {
        const val = normalized[cat.id];
        if (!val) return;

        if (cat.type === 'multi' || compositeCategories.has(cat.id)) {
            normalized[cat.id] = toArray(val);
        }
    });

    return normalized;
};

const getDefaultSelection = (matrixData) => {
    const defaults = {};

    matrixData.categories.forEach((cat) => {
        if (!cat.required) return;

        const partsForCategory = matrixData.parts.filter((p) => p.category === cat.id);
        if (partsForCategory.length === 0) return;

        const first = partsForCategory[0];

        if (cat.type === 'multi') {
            defaults[cat.id] = first?.id ? [first.id] : [];
        } else {
            if (first?.id) defaults[cat.id] = first.id;
        }
    });

    return defaults;
};

const addPartToSelection = (selectedParts, partId, matrixData) => {
    const part = getPartById(matrixData, partId);
    if (!part) return selectedParts;

    const cat = getCategoryById(matrixData, part.category);
    if (!cat) return selectedParts;

    const next = { ...selectedParts };
    const isArraySelection = cat.type === 'multi' || compositeCategories.has(cat.id);

    if (isArraySelection) {
        const arr = toArray(next[cat.id]);
        if (!arr.includes(partId)) next[cat.id] = [...arr, partId];
        else next[cat.id] = arr;
    } else {
        next[cat.id] = partId;
    }

    return next;
};

const applyRequiresClosure = (selectedParts, rootPartIds, matrixData) => {
    let next = { ...selectedParts };
    const queue = [...new Set(toArray(rootPartIds))];
    const visited = new Set();

    while (queue.length) {
        const current = queue.shift();
        if (!current || visited.has(current)) continue;
        visited.add(current);

        const rules = matrixData.rules.filter((r) => r.relation === 'REQUIRES' && r.ifPart === current);
        rules.forEach((r) => {
            const requiredId = r.thenPart;
            if (!requiredId) return;

            next = addPartToSelection(next, requiredId, matrixData);

            queue.push(requiredId);
        });
    }

    return next;
};

const getSelectedPartIds = (selectedParts) => {
    const ids = [];
    Object.values(selectedParts || {}).forEach((val) => {
        toArray(val).forEach((id) => {
            if (id) ids.push(id);
        });
    });
    return ids;
};

const removePartFromSelection = (selectedParts, partId, matrixData) => {
    const part = getPartById(matrixData, partId);
    if (!part) return selectedParts;

    const cat = getCategoryById(matrixData, part.category);
    if (!cat) return selectedParts;

    const next = { ...selectedParts };
    const isArraySelection = cat.type === 'multi' || compositeCategories.has(cat.id);

    if (isArraySelection) {
        const arr = toArray(next[cat.id]).filter((id) => id !== partId);
        if (arr.length === 0) delete next[cat.id];
        else next[cat.id] = arr;
    } else {
        if (next[cat.id] === partId) delete next[cat.id];
    }

    return next;
};

const pruneInvalidSelections = (selectedParts, matrixData) => {
    let next = normalizeSelectedParts(selectedParts, matrixData);
    let changed = true;

    while (changed) {
        changed = false;
        const selectedIds = getSelectedPartIds(next);
        const selectedSet = new Set(selectedIds);

        for (const id of selectedIds) {
            const requiresRules = matrixData.rules.filter((r) => r.relation === 'REQUIRES' && r.ifPart === id);
            const isValid = requiresRules.every((r) => !r.thenPart || selectedSet.has(r.thenPart));
            if (!isValid) {
                next = removePartFromSelection(next, id, matrixData);
                changed = true;
                break;
            }
        }
    }

    return next;
};

const updateURL = (selectedParts) => {
    const pairs = Object.entries(selectedParts)
        .filter(([_, value]) => value && (Array.isArray(value) ? value.length > 0 : true))
        .map(([catId, value]) => {
            const valStr = Array.isArray(value) ? value.join(',') : value;
            return `${catId}:${valStr}`;
        });

    const code = pairs.join('|');
    const params = new URLSearchParams(window.location.search);
    if (code) {
        params.set('config', code);
    } else {
        params.delete('config');
    }

    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState({}, '', newUrl);
};

const initialFromUrl = getInitialStateFromURL();
const initialBase = normalizeSelectedParts(initialFromUrl || getDefaultSelection(matrix), matrix);
const initialSelectedParts = applyRequiresClosure(initialBase, getSelectedPartIds(initialBase), matrix);
if (!initialFromUrl) {
    // Ensure a first-load render actually shows a baseline model and the URL is shareable.
    queueMicrotask(() => updateURL(initialSelectedParts));
}

const useConfiguratorStore = create((set, get) => ({
    matrix: matrix,
    selectedParts: initialSelectedParts,
    currentPreset: null,

    selectPart: (category, partId) => {
        set((state) => {
            const cat = matrix.categories.find(c => c.id === category);
            let newSelected;

            const isComposite = compositeCategories.has(category);

            if (cat && (cat.type === 'multi' || isComposite)) {
                const current = state.selectedParts[category] || [];
                const currentArr = toArray(current);

                if (cat.type === 'multi' && !isComposite) {
                    if (currentArr.includes(partId)) {
                        newSelected = { ...state.selectedParts, [category]: currentArr.filter(id => id !== partId) };
                    } else {
                        newSelected = { ...state.selectedParts, [category]: [...currentArr, partId] };
                    }
                } else {
                    // Composite (e.g. Steering Control): allow base + one attachment.
                    const partIdsInCat = new Set(matrix.parts.filter((p) => p.category === category).map((p) => p.id));
                    const internalRules = matrix.rules.filter(
                        (r) =>
                            r.relation === 'REQUIRES' &&
                            partIdsInCat.has(r.ifPart) &&
                            partIdsInCat.has(r.thenPart)
                    );
                    const baseIds = new Set(internalRules.map((r) => r.thenPart));
                    const dependentIds = new Set(internalRules.map((r) => r.ifPart));

                    const isBase = baseIds.has(partId);
                    const isDependent = dependentIds.has(partId);

                    let nextArr = [...currentArr];

                    if (isBase) {
                        // Replace base selection(s), keep any valid dependents.
                        nextArr = nextArr.filter((id) => !baseIds.has(id));
                        nextArr.push(partId);
                    } else if (isDependent) {
                        // Replace dependent selection(s), keep base(s).
                        nextArr = nextArr.filter((id) => !dependentIds.has(id));
                        nextArr.push(partId);
                    } else {
                        // For any other parts, just toggle like multi.
                        nextArr = nextArr.includes(partId)
                            ? nextArr.filter((id) => id !== partId)
                            : [...nextArr, partId];
                    }

                    newSelected = { ...state.selectedParts, [category]: Array.from(new Set(nextArr)) };
                }
            } else {
                // If same part is selected and it's not required, toggle off? 
                // For now, just set it.
                newSelected = { ...state.selectedParts, [category]: partId };
            }

            // Auto-apply REQUIRES rules so selections make sense (e.g. handlebar implies column).
            const normalized = normalizeSelectedParts(newSelected, matrix);
            const afterRequires = applyRequiresClosure(normalized, partId, matrix);
            const afterPrune = pruneInvalidSelections(afterRequires, matrix);

            updateURL(afterPrune);
            return { selectedParts: afterPrune, currentPreset: null };
        });
    },

    loadPreset: (presetName) => {
        const preset = matrix.presets.find(p => p.name === presetName);
        if (!preset) return;

        const normalizedPreset = normalizeSelectedParts({ ...preset.parts }, matrix);
        const withRequires = applyRequiresClosure(normalizedPreset, getSelectedPartIds(normalizedPreset), matrix);

        set({
            currentPreset: presetName,
            selectedParts: withRequires
        });
        updateURL(withRequires);
    },

    reset: () => {
        const defaults = normalizeSelectedParts(getDefaultSelection(matrix), matrix);
        const withRequires = applyRequiresClosure(defaults, getSelectedPartIds(defaults), matrix);
        set({ selectedParts: withRequires, currentPreset: null });
        updateURL(withRequires);
    },

    // Selector for Assets
    getAssetsToLoad: () => {
        const { selectedParts } = get();
        const urls = new Set();

        const categoryHasSelection = (catId) => {
            const val = selectedParts[catId];
            if (!val) return false;
            return Array.isArray(val) ? val.length > 0 : true;
        };

        const categoryGlbUrl = (catId) => {
            const part = matrix.parts.find((p) => p.category === catId && p.glb);
            return part?.glb ? `/models/parts/${part.glb}` : null;
        };

        matrix.categories.forEach((cat) => {
            if (!cat.required && !categoryHasSelection(cat.id)) return;
            const url = categoryGlbUrl(cat.id);
            if (url) urls.add(url);
        });

        return Array.from(urls);
    }
}));

export default useConfiguratorStore;
