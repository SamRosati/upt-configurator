import React, { useState, useEffect } from 'react';
import * as github from '../services/github';
import * as xlsx from 'xlsx';

const LEVELS = [
    'Main Block',
    'Wheelbase',
    'Motor',
    'Tires',
    'Steering & Controls',
    'Seating',
    'Body Parts',
    'Accessories'
];

const AdminPage = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [excelData, setExcelData] = useState(null);
    const [parts, setParts] = useState([]);
    const [presets, setPresets] = useState([]);
    const [categoriesData, setCategoriesData] = useState([]);
    const [status, setStatus] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (password === 'envo2026') {
            setIsLoggedIn(true);
            fetchData();
        } else {
            alert('Incorrect access code');
        }
    };

    const [manualToken, setManualToken] = useState(() => {
        return localStorage.getItem('UPT_ADMIN_TOKEN') || '';
    });

    const fetchData = async (overrideToken = null) => {
        setLoading(true);
        setStatus('Fetching latest data from GitHub...');
        
        const tokenToUse = overrideToken || manualToken || import.meta.env.VITE_GITHUB_TOKEN;

        if (!tokenToUse) {
            setStatus('Error: VITE_GITHUB_TOKEN is missing.');
            setLoading(false);
            return;
        }

        if (overrideToken || manualToken) {
            github.setToken(tokenToUse);
        }

        try {
            const { sha, content } = await github.getExcelData();
            const workbook = xlsx.read(content, { type: 'base64' });
            
            const partsSheet = workbook.Sheets['Parts'];
            if (!partsSheet) throw new Error('Could not find "Parts" sheet in Excel file.');
            const rawParts = xlsx.utils.sheet_to_json(partsSheet, { defval: "" });
            
            const presetsSheet = workbook.Sheets['Presets'];
            const rawPresets = presetsSheet ? xlsx.utils.sheet_to_json(presetsSheet, { defval: "" }) : [];

            const categoriesSheet = workbook.Sheets['Categories'];
            const rawCats = categoriesSheet ? xlsx.utils.sheet_to_json(categoriesSheet, { defval: "" }) : [];
            
            setExcelData({ sha, workbook });
            setParts(rawParts);
            setPresets(rawPresets);
            setCategoriesData(rawCats);
            setStatus('Ready');
        } catch (err) {
            console.error(err);
            setStatus('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdatePart = (index, field, value) => {
        const newParts = [...parts];
        newParts[index][field] = value;
        setParts(newParts);
    };

    const handleAddPart = () => {
        const newId = `part-${Date.now()}`;
        const newPart = {
            Part_ID: newId,
            Part_Name: 'New Part',
            Category: categoriesData[0]?.Category || 'Accessories',
            Price: 0,
            GLB_File: 'models/parts/placeholder.glb',
            SKU: 'SKU-000',
            Status: 'active'
        };
        setParts([...parts, newPart]);
    };

    const handleDeletePart = (index) => {
        if (!window.confirm('Delete this part?')) return;
        const newParts = [...parts];
        newParts.splice(index, 1);
        setParts(newParts);
    };

    const handleUpdateCategory = (index, field, value) => {
        const newCats = [...categoriesData];
        newCats[index][field] = value;
        setCategoriesData(newCats);
    };

    const handleUpdatePreset = (index, field, value) => {
        const newPresets = [...presets];
        newPresets[index][field] = value;
        setPresets(newPresets);
    };

    const handleDeletePreset = (index) => {
        if (!window.confirm('Are you sure you want to delete this preset?')) return;
        const newPresets = [...presets];
        newPresets.splice(index, 1);
        setPresets(newPresets);
    };

    const handleCreatePreset = () => {
        const name = window.prompt('Enter new preset name:');
        if (!name) return;
        const newPreset = { Preset_Name: name, Description: 'New preset description' };
        setPresets([...presets, newPreset]);
    };

    const categories = categoriesData
        .filter(c => c.Category && !c.Category.includes('('))
        .map(c => c.Category);

    const handleSave = async () => {
        if (!excelData) return;
        setLoading(true);
        setStatus('Saving changes to GitHub and triggering production build...');
        
        try {
            const { workbook, sha } = excelData;
            
            // Clean up data before saving
            const cleanParts = parts.filter(p => !p.Part_ID.includes('('));
            const cleanPresets = presets.filter(p => !p.Preset_Name.includes('('));
            const cleanCats = categoriesData.filter(c => !c.Category.includes('('));

            // Update sheets
            workbook.Sheets['Parts'] = xlsx.utils.json_to_sheet(cleanParts);
            workbook.Sheets['Presets'] = xlsx.utils.json_to_sheet(cleanPresets);
            workbook.Sheets['Categories'] = xlsx.utils.json_to_sheet(cleanCats);
            
            const wbout = xlsx.write(workbook, { bookType: 'xlsx', type: 'base64' });
            
            await github.updateFile(
                'Configurator_Data.xlsx',
                wbout,
                `Admin update: Configurator Data (Parts, Presets, Categories updated)`,
                sha
            );
            
            setStatus('Successfully saved! Production build triggered.');
            fetchData();
        } catch (err) {
            console.error(err);
            setStatus('Error saving: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="admin-login" style={{ padding: '40px', maxWidth: '400px', margin: '100px auto', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
                <h2 style={{ marginTop: 0 }}>Envo Admin Access</h2>
                <form onSubmit={handleLogin}>
                    <input 
                        type="password" 
                        placeholder="Access Code" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: '100%', padding: '12px', marginBottom: '16px', border: '1px solid #ddd', borderRadius: '4px', boxSizing: 'border-box' }}
                    />
                    <button type="submit" style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                        Login
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="admin-dashboard" style={{ padding: '20px', background: '#fff', minHeight: '100vh', color: '#111' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom: '20px' }}>
                <h1 style={{ margin: 0 }}>Configurator Admin</h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <span style={{ 
                        color: status.includes('Error') ? '#dc2626' : '#666',
                        fontWeight: status.includes('Error') ? 'bold' : 'normal'
                    }}>
                        {status}
                    </span>
                    <button 
                        onClick={handleSave} 
                        disabled={loading || !excelData}
                        style={{ 
                            padding: '10px 20px', 
                            background: '#16a34a', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '4px', 
                            cursor: (loading || !excelData) ? 'not-allowed' : 'pointer',
                            opacity: (loading || !excelData) ? 0.6 : 1
                        }}
                    >
                        {loading ? 'Saving...' : 'Save & Publish'}
                    </button>
                </div>
            </header>

            {/* Token Fallback */}
            {status.includes('VITE_GITHUB_TOKEN') && (
                <div style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '20px' }}>
                    <h3 style={{ color: '#991b1b', marginTop: 0 }}>Setup Required</h3>
                    <p>Alternative: Paste your token here to use it for this session:</p>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="password" 
                            placeholder="Paste GitHub Token" 
                            value={manualToken}
                            onChange={(e) => setManualToken(e.target.value)}
                            style={{ flex: 1, padding: '10px', border: '1px solid #fecaca', borderRadius: '4px' }}
                        />
                        <button 
                            onClick={() => fetchData(manualToken)}
                            style={{ padding: '10px 20px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                        >
                            Try Token
                        </button>
                    </div>
                </div>
            )}

            {/* Category Manager */}
            <section style={{ marginBottom: '40px' }}>
                <h3>Category Settings & Level Mapping</h3>
                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb' }}>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Category ID</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Display Name</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>UI Level</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Selection</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Required</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categoriesData.filter(c => c.Category && !c.Category.includes('(')).map((cat, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '8px', fontSize: '12px', color: '#666' }}>{cat.Category}</td>
                                    <td style={{ padding: '8px' }}>
                                        <input 
                                            value={cat.Display_Name} 
                                            onChange={(e) => handleUpdateCategory(idx, 'Display_Name', e.target.value)}
                                            style={{ padding: '6px', border: '1px solid #eee' }}
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <select 
                                            value={cat.Level || ''} 
                                            onChange={(e) => handleUpdateCategory(idx, 'Level', e.target.value)}
                                            style={{ padding: '6px', border: '1px solid #eee' }}
                                        >
                                            <option value="">None</option>
                                            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                        </select>
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <select 
                                            value={cat.Selection_Type || 'single'} 
                                            onChange={(e) => handleUpdateCategory(idx, 'Selection_Type', e.target.value)}
                                            style={{ padding: '6px', border: '1px solid #eee' }}
                                        >
                                            <option value="single">Single</option>
                                            <option value="multi">Multi</option>
                                        </select>
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <select 
                                            value={cat.Required || 'no'} 
                                            onChange={(e) => handleUpdateCategory(idx, 'Required', e.target.value)}
                                            style={{ padding: '6px', border: '1px solid #eee' }}
                                        >
                                            <option value="yes">Yes</option>
                                            <option value="no">No</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Parts Manager */}
            <section className="parts-manager" style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0 }}>Parts Management</h3>
                    <button 
                        onClick={handleAddPart}
                        style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        + Add Part
                    </button>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '500px', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Part ID</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Name</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Category</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Price</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>GLB File</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parts.filter(p => p.Part_ID && !p.Part_ID.includes('(')).map((part, idx) => {
                                const originalIdx = parts.indexOf(part);
                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '8px', fontSize: '11px' }}>
                                            <input 
                                                value={part.Part_ID} 
                                                onChange={(e) => handleUpdatePart(originalIdx, 'Part_ID', e.target.value)}
                                                style={{ padding: '4px', width: '100px', border: '1px solid #eee' }}
                                            />
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            <input 
                                                value={part.Part_Name} 
                                                onChange={(e) => handleUpdatePart(originalIdx, 'Part_Name', e.target.value)}
                                                style={{ padding: '4px', border: '1px solid #eee' }}
                                            />
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            <select 
                                                value={part.Category} 
                                                onChange={(e) => handleUpdatePart(originalIdx, 'Category', e.target.value)}
                                                style={{ padding: '4px', border: '1px solid #eee' }}
                                            >
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            <input 
                                                value={part.Price} 
                                                onChange={(e) => handleUpdatePart(originalIdx, 'Price', e.target.value)}
                                                style={{ padding: '4px', width: '60px', border: '1px solid #eee' }}
                                            />
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            <input 
                                                value={part.GLB_File} 
                                                onChange={(e) => handleUpdatePart(originalIdx, 'GLB_File', e.target.value)}
                                                style={{ padding: '4px', width: '150px', border: '1px solid #eee' }}
                                            />
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            <button onClick={() => handleDeletePart(originalIdx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Presets Manager */}
            <section className="presets-manager">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0 }}>Presets Management</h3>
                    <button 
                        onClick={handleCreatePreset}
                        style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        + Add Preset
                    </button>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb' }}>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Preset Name</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Components</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {presets.filter(p => p.Preset_Name && !p.Preset_Name.includes('(')).map((preset, idx) => {
                                const originalIdx = presets.indexOf(preset);
                                return (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '8px', fontWeight: 'bold' }}>
                                            <input 
                                                value={preset.Preset_Name} 
                                                onChange={(e) => handleUpdatePreset(originalIdx, 'Preset_Name', e.target.value)}
                                                style={{ padding: '6px', border: '1px solid #eee' }}
                                            />
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                                                {categories.map(cat => (
                                                    <div key={cat}>
                                                        <label style={{ color: '#888' }}>{cat}</label>
                                                        <select 
                                                            value={preset[cat] || ''}
                                                            onChange={(e) => handleUpdatePreset(originalIdx, cat, e.target.value)}
                                                            style={{ width: '100%', padding: '2px' }}
                                                        >
                                                            <option value="">None</option>
                                                            {parts.filter(p => p.Category === cat).map(p => (
                                                                <option key={p.Part_ID} value={p.Part_ID}>{p.Part_Name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                        <td style={{ padding: '8px' }}>
                                            <button onClick={() => handleDeletePreset(originalIdx)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default AdminPage;
