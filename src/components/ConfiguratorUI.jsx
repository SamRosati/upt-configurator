import React, { useState, useMemo, useEffect } from 'react';
import useConfiguratorStore from '../store/useConfiguratorStore';
import { getAvailableParts } from '../utils/rulesEngine';
import { buildOrderedSteps } from '../utils/buildSteps';

const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);

const isCompositeCategory = (matrix, categoryId) => {
    const partIds = new Set(matrix.parts.filter((p) => p.category === categoryId).map((p) => p.id));
    return matrix.rules.some(
        (r) =>
            r.relation === 'REQUIRES' &&
            partIds.has(r.ifPart) &&
            partIds.has(r.thenPart)
    );
};

const ConfiguratorUI = ({ theme = 'dark', onThemeChange }) => {
    const { 
        matrix, 
        selectedParts, 
        selectPart, 
        loadPreset, 
        currentPreset,
        getBuildProgress
    } = useConfiguratorStore();

    const [activeTab, setActiveTab] = useState('build'); // 'preset' | 'build'
    const [searchQuery, setSearchQuery] = useState('');
    const [currentStep, setCurrentStep] = useState(0);

    const buildSteps = useMemo(() => buildOrderedSteps(matrix), [matrix]);

    useEffect(() => {
        if (currentStep >= buildSteps.length) setCurrentStep(Math.max(0, buildSteps.length - 1));
    }, [buildSteps.length, currentStep]);

    const progress = getBuildProgress();

    const filteredParts = useMemo(() => {
        if (!searchQuery) return matrix.parts;
        const q = searchQuery.toLowerCase();
        return matrix.parts.filter(p => 
            p.name.toLowerCase().includes(q) || 
            p.category.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q)
        );
    }, [matrix.parts, searchQuery]);

    const handleNext = () => {
        if (currentStep < buildSteps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const currentStepDef = buildSteps[currentStep] || { label: '', categoryIds: [] };
    const currentLevelName = currentStepDef.label;
    const categoryIds = currentStepDef.categoryIds || [];
    const levelCategories = matrix.categories.filter(c => categoryIds.includes(c.id));
    
    // Check if current level has a selection
    const hasAnySelection = levelCategories.some(cat => {
        const selected = selectedParts[cat.id];
        const available = getAvailableParts(cat.id, matrix, selectedParts);
        const selectedArr = toArray(selected);
        // Only count as selected if the selected item is actually available
        return selectedArr.some(id => available.some(p => p.id === id));
    });

    const renderedStep = (
        <div key={currentLevelName} className="journey-step">
            <div className="step-indicator">
                STEP {currentStep + 1} OF {buildSteps.length}
            </div>
            <div className="category-section expanded">
                <div className="category-header no-click">
                    <div className="category-title">
                        <span className={`dot ${hasAnySelection ? 'filled' : ''}`}></span>
                        {currentLevelName.toUpperCase()}
                        {levelCategories.some(c => c.required) && <span className="badge-required">REQUIRED</span>}
                    </div>
                </div>
                
                <div className="options-list">
                    {levelCategories.map(category => {
                        const catId = category.id;
                        const parts = getAvailableParts(catId, matrix, selectedParts).filter(p => 
                            filteredParts.some(fp => fp.id === p.id)
                        );

                        const isMulti = category.type === 'multi' || isCompositeCategory(matrix, catId);
                        const selected = isMulti ? toArray(selectedParts[catId]) : selectedParts[catId];

                        return (
                            <div key={catId} className="category-group">
                                {levelCategories.length > 1 && (
                                    <div className="category-label">
                                        {category.name}
                                    </div>
                                )}
                                {parts.map(part => {
                                    const isSelected = toArray(selected).includes(part.id);
                                    
                                    return (
                                        <div 
                                            key={part.id} 
                                            className={`part-option ${isSelected ? 'active' : ''}`}
                                            onClick={() => selectPart(catId, part.id)}
                                        >
                                            <div className="checkbox-wrapper">
                                                <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
                                                    {isSelected && '✓'}
                                                </div>
                                            </div>
                                            <div className="part-info">
                                                <div className="part-name">{part.name}</div>
                                                <div className="part-desc">{part.description}</div>
                                            </div>
                                            <div className="part-price">
                                                {part.price > 0 ? `$${part.price.toLocaleString()}` : 'INCL.'}
                                            </div>
                                        </div>
                                    );
                                })}
                                {parts.length === 0 && <div className="no-parts">No parts available</div>}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="journey-navigation">
                <button 
                    className="nav-btn back" 
                    onClick={handleBack}
                    disabled={currentStep === 0}
                >
                    BACK
                </button>
                <button 
                    className="nav-btn next" 
                    onClick={handleNext}
                    disabled={currentStep === buildSteps.length - 1}
                >
                    CONTINUE
                </button>
            </div>
        </div>
    );

    const totalPrice = useMemo(() => {
        let total = 0;
        Object.entries(selectedParts).forEach(([catId, partIds]) => {
            toArray(partIds).forEach(pid => {
                const part = matrix.parts.find(p => p.id === pid);
                if (part) total += (part.price || 0);
            });
        });
        return total;
    }, [selectedParts, matrix.parts]);

    const totalSkus = useMemo(() => {
        let count = 0;
        Object.values(selectedParts).forEach(val => {
            count += toArray(val).length;
        });
        return count;
    }, [selectedParts]);

    return (
        <div className="configurator-ui">
            <div className="ui-header">
                <div className="ui-header-text">
                    <h1>UPT 3D Configurator</h1>
                    <p>Configure your build</p>
                </div>
                {typeof onThemeChange === 'function' && (
                    <button
                        type="button"
                        className="theme-toggle"
                        onClick={() => onThemeChange(theme === 'dark' ? 'light' : 'dark')}
                        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                    >
                        {theme === 'dark' ? '☀️' : '🌙'}
                    </button>
                )}
            </div>

            <div className="progress-section">
                <div className="progress-label">
                    <span>BUILD PROGRESS</span>
                    <span>{progress}%</span>
                </div>
                <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                </div>
            </div>

            <div className="mode-tabs">
                <button 
                    className={activeTab === 'preset' ? 'active' : ''} 
                    onClick={() => setActiveTab('preset')}
                >
                    <span className="icon">✨</span> Select Preset
                </button>
                <button 
                    className={activeTab === 'build' ? 'active' : ''} 
                    onClick={() => {
                        if (activeTab !== 'build') {
                            useConfiguratorStore.getState().resetConfig();
                        }
                        setActiveTab('build');
                    }}
                >
                    <span className="icon">🔩</span> Build from Frame
                </button>
            </div>

            <div className="search-box">
                <input 
                    type="text" 
                    placeholder="Find parts or specifications..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>


            <div className="content-scroll">
                {activeTab === 'preset' ? (
                    <div className="presets-view">
                        <h3>CURATED CONFIGURATIONS</h3>
                        <div className="presets-grid">
                            {matrix.presets.map((preset, idx) => (
                                <div 
                                    key={idx} 
                                    className={`preset-card ${currentPreset === preset.name ? 'active' : ''}`}
                                    onClick={() => loadPreset(preset.name)}
                                >
                                    <div className="preset-name">{preset.name}</div>
                                    <div className="preset-desc">{preset.description}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="build-view">
                        {renderedStep}
                    </div>
                )}
            </div>

            <div className="ui-footer">
                <div className="summary-row">
                    <div className="total-label">
                        <div className="label">TOTAL</div>
                        <div className="price">${totalPrice.toLocaleString()}</div>
                    </div>
                    <div className="skus-label">
                        <div className="label">PARTS</div>
                        <div className="count">{totalSkus} SKUs</div>
                    </div>
                </div>
                <button className="finalize-btn">🛒 FINALIZE</button>
                <button className="summary-btn" onClick={() => setActiveTab('build')}>📝 SUMMARY</button>
            </div>
        </div>
    );
};

export default ConfiguratorUI;
