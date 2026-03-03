export const getAvailableParts = (category, matrix) => {
    return matrix.parts.filter(part => part.category === category);
};

export const checkCompatibility = (selectedParts, partId, matrix) => {
    // Basic implementation of rules from Rules.csv
    const partRules = matrix.rules.filter(r => r.ifPart === partId);

    for (const rule of partRules) {
        if (rule.relation === 'REQUIRES') {
            const requiredPartId = rule.thenPart;
            const requiredPart = matrix.parts.find(p => p.id === requiredPartId);
            if (!requiredPart) continue;

            const isSelected = Object.values(selectedParts).some(val =>
                Array.isArray(val) ? val.includes(requiredPartId) : val === requiredPartId
            );

            if (!isSelected) {
                return {
                    isCompatible: false,
                    message: rule.message || `Selecting this part requires ${requiredPart.name}.`
                };
            }
        }
        // Add EXCLUDES logic here if needed
    }

    return { isCompatible: true };
};
