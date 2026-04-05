import { create } from 'zustand';
import matrix from '../data/configMatrix.json';
import { enforceRules } from '../utils/rulesEngine';

const canonicalPartId = (matrixData, rawId) => {
    if (rawId == null || rawId === '') return rawId;
    const s = String(rawId);
    const found = matrixData.parts.find((p) => p.id.toLowerCase() === s.toLowerCase());
    return found ? found.id : s;
};

const normalizeUrlSelection = (selected, matrixData) => {
    if (!selected) return null;
    const next = {};
    Object.entries(selected).forEach(([catId, val]) => {
        if (Array.isArray(val)) {
            next[catId] = val.map((id) => canonicalPartId(matrixData, id)).filter(Boolean);
        } else {
            next[catId] = canonicalPartId(matrixData, val);
        }
    });
    return next;
};

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
        return normalizeUrlSelection(selected, matrix);
    } catch (e) {
        console.error('Failed to parse config from URL', e);
        return null;
    }
};

const toArray = (val) => {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
};

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

    // For a "Build from Frame" starting point, we only want the absolute minimum.
    // Usually that's just the 'Block' category (Main Block).
    // Let's find the first required category.
    const firstRequiredCat = matrixData.categories.find(c => c.required);
    
    if (firstRequiredCat) {
        const partsForCategory = matrixData.parts.filter((p) => p.category === firstRequiredCat.id);
        if (partsForCategory.length > 0) {
            const first = partsForCategory[0];
            if (firstRequiredCat.type === 'multi') {
                defaults[firstRequiredCat.id] = [first.id];
            } else {
                defaults[firstRequiredCat.id] = first.id;
            }
        }
    }

    return defaults;
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
const initialSelectedParts = enforceRules(initialBase, matrix);
if (!initialFromUrl) {
    // Ensure a first-load render actually shows a baseline model and the URL is shareable.
    queueMicrotask(() => updateURL(initialSelectedParts));
}

const useConfiguratorStore = create((set, get) => ({
    matrix: matrix,
    selectedParts: initialSelectedParts,
    currentPreset: null,

    resetConfig: () => {
        const defaults = normalizeSelectedParts(getDefaultSelection(matrix), matrix);
        const next = enforceRules(defaults, matrix);
        set({
            selectedParts: next,
            currentPreset: null
        });
        updateURL(next);
    },

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
                        const basesNow = currentArr.filter((id) => baseIds.has(id));
                        if (basesNow.length === 1 && basesNow[0] === partId) {
                            nextArr = currentArr.filter((id) => !baseIds.has(id));
                        } else {
                            nextArr = nextArr.filter((id) => !baseIds.has(id));
                            nextArr.push(partId);
                        }
                    } else if (isDependent) {
                        const depsNow = currentArr.filter((id) => dependentIds.has(id));
                        if (depsNow.length === 1 && depsNow[0] === partId) {
                            nextArr = currentArr.filter((id) => !dependentIds.has(id));
                        } else {
                            nextArr = nextArr.filter((id) => !dependentIds.has(id));
                            nextArr.push(partId);
                        }
                    } else {
                        // For any other parts, just toggle like multi.
                        nextArr = nextArr.includes(partId)
                            ? nextArr.filter((id) => id !== partId)
                            : [...nextArr, partId];
                    }

                    newSelected = { ...state.selectedParts, [category]: Array.from(new Set(nextArr)) };
                }
            } else {
                // Single-select: click another part to switch; click the same part again to clear.
                const current = state.selectedParts[category];
                if (current === partId) {
                    newSelected = { ...state.selectedParts };
                    delete newSelected[category];
                } else {
                    newSelected = { ...state.selectedParts, [category]: partId };
                }
            }

            // Auto-apply REQUIRES rules so selections make sense (e.g. handlebar implies column).
            const normalized = normalizeSelectedParts(newSelected, matrix);
            const afterRules = enforceRules(normalized, matrix);

            updateURL(afterRules);
            return { selectedParts: afterRules, currentPreset: null };
        });
    },

    loadPreset: (presetName) => {
        const preset = matrix.presets.find(p => p.name === presetName);
        if (!preset) return;

        const normalizedPreset = normalizeSelectedParts({ ...preset.parts }, matrix);
        const withRequires = enforceRules(normalizedPreset, matrix);

        set({
            currentPreset: presetName,
            selectedParts: withRequires
        });
        updateURL(withRequires);
    },

    reset: () => {
        const defaults = normalizeSelectedParts(getDefaultSelection(matrix), matrix);
        const withRequires = enforceRules(defaults, matrix);
        set({ selectedParts: withRequires, currentPreset: null });
        updateURL(withRequires);
    },

    // Selector for Assets
    getAssetsToLoad: () => {
        const { selectedParts, matrix } = get();
        const urls = new Set();

        // Collect GLBs from all currently selected parts
        Object.entries(selectedParts).forEach(([catId, partIds]) => {
            const ids = Array.isArray(partIds) ? partIds : [partIds];
            ids.forEach(id => {
                const part = matrix.parts.find(p => p.id === id);
                if (part && part.glb) {
                    const filename = part.glb.split(/[/\\]/).pop();
                    urls.add(`/models/parts/${filename}`);
                }
            });
        });

        return Array.from(urls);
    },

    getBuildProgress: () => {
        const { matrix, selectedParts } = get();
        const requiredCategories = matrix.categories.filter(c => c.required);
        if (requiredCategories.length === 0) return 100;
        
        let completedCount = 0;
        requiredCategories.forEach(cat => {
            const val = selectedParts[cat.id];
            const hasValue = Array.isArray(val) ? val.length > 0 : !!val;
            if (hasValue) completedCount++;
        });
        
        return Math.round((completedCount / requiredCategories.length) * 100);
    }
}));

export default useConfiguratorStore;
