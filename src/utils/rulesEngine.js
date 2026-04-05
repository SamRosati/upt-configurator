const toArray = (val) => {
    if (!val) return [];
    return Array.isArray(val) ? val : [val];
};

const cloneSelection = (selectedParts = {}) => {
    const next = {};
    Object.entries(selectedParts).forEach(([catId, val]) => {
        next[catId] = Array.isArray(val) ? [...val] : val;
    });
    return next;
};

const selectedPartIds = (selectedParts) => {
    const ids = [];
    Object.values(selectedParts || {}).forEach((val) => {
        toArray(val).forEach((id) => {
            if (id) ids.push(id);
        });
    });
    return ids;
};

/** Same category: EXCLUDES pairs still appear in the list so the user can switch (single or multi). */
const samePartCategory = (idx, partIdA, partIdB) => {
    const a = idx.partById.get(partIdA);
    const b = idx.partById.get(partIdB);
    return !!(a && b && a.category === b.category);
};

const indexMatrix = (matrix) => {
    const partById = new Map(matrix.parts.map((p) => [p.id, p]));
    const categoryById = new Map(matrix.categories.map((c) => [c.id, c]));
    const rulesByIfPart = new Map();
    matrix.rules.forEach((rule) => {
        if (!rule?.ifPart || !rule?.relation || !rule?.thenPart) return;
        const arr = rulesByIfPart.get(rule.ifPart) || [];
        arr.push(rule);
        rulesByIfPart.set(rule.ifPart, arr);
    });
    return { partById, categoryById, rulesByIfPart };
};

const addPart = (selectedParts, partId, matrix, idx) => {
    const part = idx.partById.get(partId);
    if (!part) return selectedParts;
    const cat = idx.categoryById.get(part.category);
    if (!cat) return selectedParts;

    const next = cloneSelection(selectedParts);
    if (cat.type === 'multi') {
        const arr = toArray(next[cat.id]);
        if (!arr.includes(partId)) next[cat.id] = [...arr, partId];
    } else {
        next[cat.id] = partId;
    }
    return next;
};

const removePart = (selectedParts, partId, idx) => {
    const part = idx.partById.get(partId);
    if (!part) return selectedParts;
    const cat = idx.categoryById.get(part.category);
    if (!cat) return selectedParts;

    const next = cloneSelection(selectedParts);
    if (cat.type === 'multi') {
        const arr = toArray(next[cat.id]).filter((id) => id !== partId);
        if (arr.length > 0) next[cat.id] = arr;
        else delete next[cat.id];
    } else if (next[cat.id] === partId) {
        delete next[cat.id];
    }
    return next;
};

export const enforceRules = (selectedParts, matrix) => {
    const idx = indexMatrix(matrix);
    let next = cloneSelection(selectedParts);
    let changed = true;

    while (changed) {
        changed = false;

        // 1) Prune first: drop parts whose REQUIRES are not satisfied (cascades).
        //    Must run before expanding REQUIRES, otherwise e.g. motor would re-add wheelbase
        //    immediately after the user clears wheelbase.
        let pruned = true;
        while (pruned) {
            pruned = false;
            for (const id of [...selectedPartIds(next)]) {
                const rules = idx.rulesByIfPart.get(id) || [];
                const selectedSet = new Set(selectedPartIds(next));
                const hasMissingRequires = rules.some(
                    (r) => String(r.relation).toUpperCase() === 'REQUIRES' && !selectedSet.has(r.thenPart)
                );
                if (hasMissingRequires) {
                    const before = JSON.stringify(next);
                    next = removePart(next, id, idx);
                    if (JSON.stringify(next) !== before) {
                        pruned = true;
                        changed = true;
                    }
                    break;
                }
            }
        }

        // 2) Pull in all required dependencies for what remains selected.
        for (const id of selectedPartIds(next)) {
            const rules = idx.rulesByIfPart.get(id) || [];
            for (const rule of rules) {
                if (String(rule.relation).toUpperCase() !== 'REQUIRES') continue;
                const before = JSON.stringify(next);
                next = addPart(next, rule.thenPart, matrix, idx);
                if (JSON.stringify(next) !== before) changed = true;
            }
        }

        // 3) Remove any excluded parts.
        for (const id of selectedPartIds(next)) {
            const rules = idx.rulesByIfPart.get(id) || [];
            for (const rule of rules) {
                if (String(rule.relation).toUpperCase() !== 'EXCLUDES') continue;
                const before = JSON.stringify(next);
                next = removePart(next, rule.thenPart, idx);
                if (JSON.stringify(next) !== before) changed = true;
            }
        }
    }

    return next;
};

export const canSelectPart = (selectedParts, partId, matrix) => {
    const idx = indexMatrix(matrix);
    const candidateRules = idx.rulesByIfPart.get(partId) || [];
    const selectedSet = new Set(selectedPartIds(selectedParts));

    for (const rule of candidateRules) {
        const relation = String(rule.relation).toUpperCase();
        // Same category: EXCLUDES still allows seeing the other option to switch (e.g. bumper vs bumper OP).
        if (relation === 'EXCLUDES' && selectedSet.has(rule.thenPart)) {
            if (!samePartCategory(idx, partId, rule.thenPart)) return false;
        }
        if (relation === 'REQUIRES') {
            const required = idx.partById.get(rule.thenPart);
            if (!required) continue;
            const requiredCat = idx.categoryById.get(required.category);
            if (!requiredCat) continue;
            if (requiredCat.type === 'single') {
                const current = selectedParts[required.category];
                if (current && current !== rule.thenPart) return false;
            }
        }
    }

    // Also block if any selected part excludes this one.
    for (const selectedId of selectedSet) {
        const rules = idx.rulesByIfPart.get(selectedId) || [];
        const blocks = rules.some((r) => {
            if (String(r.relation).toUpperCase() !== 'EXCLUDES' || r.thenPart !== partId) return false;
            if (samePartCategory(idx, selectedId, partId)) return false;
            return true;
        });
        if (blocks) return false;
    }

    return true;
};

export const getAvailableParts = (categoryId, matrix, selectedParts) => {
    return matrix.parts
        .filter((part) => part.category === categoryId)
        .filter((part) => canSelectPart(selectedParts, part.id, matrix));
};
