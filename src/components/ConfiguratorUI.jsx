import React from 'react';
import useConfiguratorStore from '../store/useConfiguratorStore';
import { getAvailableParts } from '../utils/rulesEngine';

const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);

const getCompositeInfo = (categoryId, matrix) => {
    const partsInCategory = matrix.parts.filter((p) => p.category === categoryId);
    const partIds = new Set(partsInCategory.map((p) => p.id));

    const internalRules = matrix.rules.filter(
        (r) =>
            r.relation === 'REQUIRES' &&
            partIds.has(r.ifPart) &&
            partIds.has(r.thenPart)
    );

    const baseIds = new Set(internalRules.map((r) => r.thenPart));
    const dependentIds = new Set(internalRules.map((r) => r.ifPart));

    if (baseIds.size === 0 || dependentIds.size === 0) return null;

    const baseParts = partsInCategory.filter((p) => baseIds.has(p.id));
    const dependentParts = partsInCategory.filter((p) => dependentIds.has(p.id));
    const otherParts = partsInCategory.filter((p) => !baseIds.has(p.id) && !dependentIds.has(p.id));

    return { baseParts, dependentParts, otherParts };
};

const ConfiguratorUI = () => {
    const { matrix, selectedParts, selectPart, loadPreset, currentPreset } = useConfiguratorStore();

    return (
        <div className="configurator-ui">
            <div className="sidebar">
                <h2>UPT Configurator</h2>
                <div className="share-section">
                    <button className="share-btn" onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Configuration Link Copied!');
                    }}>
                        Share Configuration
                    </button>
                    <button className="reset-btn" onClick={() => useConfiguratorStore.getState().reset()}>
                        Reset
                    </button>
                </div>

                <div className="section">
                    <h3>Presets</h3>
                    <div className="preset-list">
                        {matrix.presets.map((preset, idx) => (
                            <button
                                key={idx}
                                className={currentPreset === preset.name ? 'active' : ''}
                                onClick={() => loadPreset(preset.name)}
                            >
                                {preset.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="parts-selection">
                    {matrix.categories.map(category => {
                        const parts = getAvailableParts(category.id, matrix);
                        if (parts.length === 0) return null;

                        const composite = getCompositeInfo(category.id, matrix);
                        const isArraySelection = category.type === 'multi' || !!composite;
                        const selected = isArraySelection ? toArray(selectedParts[category.id]) : selectedParts[category.id];
                        const hasSelection = isArraySelection ? selected.length > 0 : !!selected;

                        return (
                            <div key={category.id} className="category-group">
                                <h3>
                                    {category.name}
                                    {category.required && !hasSelection ? <span className="required-indicator"> (required)</span> : null}
                                </h3>

                                {composite ? (
                                    <>
                                        <div className="section">
                                            <h4>Base (required)</h4>
                                            <div className="options-grid">
                                                {composite.baseParts.map((part) => {
                                                    const isSelected = selected.includes(part.id);
                                                    return (
                                                        <button
                                                            key={part.id}
                                                            className={isSelected ? 'active' : ''}
                                                            onClick={() => selectPart(category.id, part.id)}
                                                        >
                                                            {part.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="section">
                                            <h4>Attachment</h4>
                                            <div className="options-grid">
                                                {composite.dependentParts.map((part) => {
                                                    const isSelected = selected.includes(part.id);
                                                    return (
                                                        <button
                                                            key={part.id}
                                                            className={isSelected ? 'active' : ''}
                                                            onClick={() => selectPart(category.id, part.id)}
                                                        >
                                                            {part.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {composite.otherParts.length > 0 && (
                                            <div className="section">
                                                <h4>Other</h4>
                                                <div className="options-grid">
                                                    {composite.otherParts.map((part) => {
                                                        const isSelected = selected.includes(part.id);
                                                        return (
                                                            <button
                                                                key={part.id}
                                                                className={isSelected ? 'active' : ''}
                                                                onClick={() => selectPart(category.id, part.id)}
                                                            >
                                                                {part.name}
                                                                <span className="checkbox">{isSelected ? '✓' : ''}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="options-grid">
                                        {parts.map(part => {
                                            const isSelected = isArraySelection
                                                ? selected.includes(part.id)
                                                : selected === part.id;

                                            return (
                                                <button
                                                    key={part.id}
                                                    className={isSelected ? 'active' : ''}
                                                    onClick={() => selectPart(category.id, part.id)}
                                                >
                                                    {part.name}
                                                    {category.type === 'multi' && (
                                                        <span className="checkbox">{isSelected ? '✓' : ''}</span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ConfiguratorUI;
