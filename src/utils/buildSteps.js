/**
 * Build ordered wizard steps from Categories sheet + any category ids that only appear on Parts.
 * Groups categories that share the same non-empty `level` string into one step.
 */
export function buildOrderedSteps(matrix) {
    const seen = new Set(matrix.categories.map((c) => c.id));
    const mergedCategories = [...matrix.categories];

    matrix.parts.forEach((p) => {
        if (!p.category || seen.has(p.category)) return;
        seen.add(p.category);
        mergedCategories.push({
            id: p.category,
            name: p.category,
            level: '',
            type: 'single',
            required: false,
            icon: '',
        });
    });

    const stepOrder = [];
    const stepKeyToCategoryIds = new Map();

    mergedCategories.forEach((cat) => {
        const level = cat.level != null ? String(cat.level).trim() : '';
        const stepKey = level || `__cat__${cat.id}`;
        if (!stepKeyToCategoryIds.has(stepKey)) {
            stepKeyToCategoryIds.set(stepKey, []);
            stepOrder.push(stepKey);
        }
        stepKeyToCategoryIds.get(stepKey).push(cat.id);
    });

    return stepOrder.map((stepKey) => {
        const categoryIds = stepKeyToCategoryIds.get(stepKey) || [];
        const label = stepKey.startsWith('__cat__')
            ? mergedCategories.find((c) => c.id === stepKey.slice('__cat__'.length))?.name ||
              stepKey.slice('__cat__'.length)
            : stepKey;
        return { key: stepKey, label, categoryIds };
    });
}
