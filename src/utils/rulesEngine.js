export const getAvailableParts = (categoryId, matrix, selectedParts) => {
    const partsInCat = matrix.parts.filter(part => part.category === categoryId);
    
    return partsInCat.filter(part => {
        // Check if this part is compatible with what is already selected in OTHER categories
        const rules = matrix.rules.filter(r => r.ifPart === part.id);
        
        for (const rule of rules) {
            if (rule.relation === 'REQUIRES') {
                const requiredId = rule.thenPart;
                const requiredPart = matrix.parts.find(p => p.id === requiredId);
                if (!requiredPart) continue;

                const requiredCatId = requiredPart.category;
                const requiredCat = matrix.categories.find(c => c.id === requiredCatId);
                
                // If the required category is SINGLE-select and already has a DIFFERENT selection,
                // then this part is currently unavailable.
                if (requiredCat && requiredCat.type === 'single') {
                    const currentSelection = selectedParts[requiredCatId];
                    if (currentSelection && currentSelection !== requiredId) {
                        return false;
                    }
                }
            }
        }
        return true;
    });
};

export const checkCompatibility = (selectedParts, partId, matrix) => {
    const partRules = matrix.rules.filter(r => r.ifPart === partId);
    // ... rest unchanged for now, but getAvailableParts is the main one used for UI display
    return { isCompatible: true };
};
