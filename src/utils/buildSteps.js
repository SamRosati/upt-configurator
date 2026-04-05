/**
 * Categories forced to the final step(s), in order (after all others).
 * Matches typical build flow: chassis → drivetrain → steering → seat → body → top → accessories.
 */
const STEP_LAST_CATEGORY_IDS = ['Accessories', 'Color'];

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

    const lastIdSet = new Set(STEP_LAST_CATEGORY_IDS);
    const tail = STEP_LAST_CATEGORY_IDS.map((id) => mergedCategories.find((c) => c.id === id)).filter(
        Boolean
    );
    const head = mergedCategories.filter((c) => !lastIdSet.has(c.id));
    const orderedCategories = [...head, ...tail];

    const stepOrder = [];
    const stepKeyToCategoryIds = new Map();

    orderedCategories.forEach((cat) => {
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
            ? orderedCategories.find((c) => c.id === stepKey.slice('__cat__'.length))?.name ||
              stepKey.slice('__cat__'.length)
            : stepKey;
        return { key: stepKey, label, categoryIds };
    });
}
