import React, { useState, useMemo } from 'react';
import useConfiguratorStore from '../store/useConfiguratorStore';
import { getAvailableParts } from '../utils/rulesEngine';

const toArray = (val) => (Array.isArray(val) ? val : val ? [val] : []);

const CATEGORY_MAPPING = {
    'Block': 'CHASSIS',
    'Wheelbase': 'WHEELBASE',
    'Motor': 'MOTOR',
    'Tire': 'TIRES',
    'Control': 'STEERING & CONTROLS',
    'Seat': 'SEATING',
    'Body': 'BODY PARTS',
    'Accessories': 'ACCESSORIES'
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
        atmosphere,
        setAtmosphere,
        getBuildProgress
    } = useConfiguratorStore();

    const [activeTab, setActiveTab] = useState('build'); // 'preset' | 'build'
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedLevels, setExpandedLevels] = useState(new Set(ORDERED_LEVELS));

    const progress = getBuildProgress();

    const toggleLevel = (level) => {
        const next = new Set(expandedLevels);
        if (next.has(level)) next.delete(level);
        else next.add(level);
        setExpandedLevels(next);
    };

    const filteredParts = useMemo(() => {
        if (!searchQuery) return matrix.parts;
        const q = searchQuery.toLowerCase();
        return matrix.parts.filter(p => 
            p.name.toLowerCase().includes(q) || 
            p.category.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q)
        );
    }, [matrix.parts, searchQuery]);

    const renderedLevels = ORDERED_LEVELS.map(levelName => {
        // Find categories belonging to this level
        const levelCategories = matrix.categories.filter(c => c.level === levelName);
        
        // If no categories mapped to this level, we can skip or show empty
        if (levelCategories.length === 0) return null;

        const isExpanded = expandedLevels.has(levelName);
        
        // Check if any category in this level has a selection
        const hasAnySelection = levelCategories.some(cat => {
            const isMulti = cat.type === 'multi';
            const selected = isMulti ? toArray(selectedParts[cat.id]) : selectedParts[cat.id];
            return isMulti ? selected.length > 0 : !!selected;
        });

        return (
            <div key={levelName} className={`category-section ${isExpanded ? 'expanded' : ''}`}>
                <div className="category-header" onClick={() => toggleLevel(levelName)}>
                    <div className="category-title">
                        <span className={`dot ${hasAnySelection ? 'filled' : ''}`}></span>
                        {levelName.toUpperCase()}
                        {levelCategories.some(c => c.required) && <span className="badge-required">REQUIRED</span>}
                    </div>
                    <span className="caret">{isExpanded ? '▲' : '▼'}</span>
                </div>
                
                {isExpanded && (
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
                                    <div className="category-label" style={{ 
                                        fontSize: '0.65rem', 
                                        fontWeight: '800', 
                                        color: '#bbb', 
                                        padding: '8px 12px 4px',
                                        textTransform: 'uppercase'
                                    }}>
                                        {category.name}
                                    </div>
                                    {parts.map(part => {
                                        const isSelected = isMulti 
                                            ? selected.includes(part.id) 
                                            : selected === part.id;
                                        
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
                )}
            </div>
        );
    });

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
                    onClick={() => setActiveTab('build')}
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

            <div className="atmosphere-section">
                <span className="label">ATMOSPHERE</span>
                <div className="toggle-group">
                    <button 
                        className={atmosphere === 'studio' ? 'active' : ''} 
                        onClick={() => setAtmosphere('studio')}
                    >Studio</button>
                    <button 
                        className={atmosphere === 'indoor' ? 'active' : ''} 
                        onClick={() => setAtmosphere('indoor')}
                    >Indoor</button>
                    <button 
                        className={atmosphere === 'outdoor' ? 'active' : ''} 
                        onClick={() => setAtmosphere('outdoor')}
                    >Outdoor</button>
                </div>
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
                        {renderedLevels}
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
