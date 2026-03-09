import React, { useState, useMemo } from 'react';
import useConfiguratorStore from '../store/useConfiguratorStore';
import { getAvailableParts } from '../utils/rulesEngine';

const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);

const LEVEL_TO_CATEGORIES = {
    'Main Block': ['Block'],
    'Wheelbase': ['Wheelbase'],
    'Motor': ['Motor'],
    'Tires': ['Tire'],
    'Steering & Controls': ['Control'],
    'Seating': ['Seat'],
    'Body Parts': ['Body'],
    'Accessories': ['Accessories']
};

const ORDERED_LEVELS = [
    'Main Block',
    'Wheelbase',
    'Motor',
    'Tires',
    'Steering & Controls',
    'Seating',
    'Body Parts',
    'Accessories'
];

const ConfiguratorUI = () => {
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
        if (currentStep < ORDERED_LEVELS.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    const currentLevelName = ORDERED_LEVELS[currentStep];
    const categoryIds = LEVEL_TO_CATEGORIES[currentLevelName] || [];
    const levelCategories = matrix.categories.filter(c => categoryIds.includes(c.id));
    
    // Check if current level has a selection
    const hasAnySelection = levelCategories.some(cat => {
        const selected = selectedParts[cat.id];
        return toArray(selected).length > 0;
    });

    const renderedStep = (
        <div key={currentLevelName} className="journey-step">
            <div className="step-indicator">
                STEP {currentStep + 1} OF {ORDERED_LEVELS.length}
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
                        const parts = getAvailableParts(catId, matrix).filter(p => 
                            filteredParts.some(fp => fp.id === p.id)
                        );

                        const isMulti = category.type === 'multi';
                        const selected = isMulti ? toArray(selectedParts[catId]) : selectedParts[catId];

                        return (
                            <div key={catId} className="category-group">
                                {levelCategories.length > 1 && (
                                    <div className="category-label" style={{ 
                                        fontSize: '0.65rem', 
                                        fontWeight: '800', 
                                        color: '#bbb', 
                                        padding: '8px 12px 4px',
                                        textTransform: 'uppercase'
                                    }}>
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
                                {parts.length === 0 && <div className="no-parts" style={{ padding: '8px 12px', fontSize: '0.7rem', color: '#999' }}>No parts available</div>}
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
                    disabled={currentStep === ORDERED_LEVELS.length - 1}
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
                <h1>UPT 3D Configurator</h1>
                <p>Configure your build</p>
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
