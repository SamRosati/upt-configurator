import React, { useState, useEffect } from 'react';
import * as github from '../services/github';
import * as xlsx from 'xlsx';

const AdminPage = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [excelData, setExcelData] = useState(null);
    const [parts, setParts] = useState([]);
    const [presets, setPresets] = useState([]);
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
            
            setExcelData({ sha, workbook });
            setParts(rawParts);
            setPresets(rawPresets);
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

    // Helper to get unique categories
    const categories = [...new Set(parts.map(p => p.Category).filter(c => c && !c.includes('(')))];

    const handleSave = async () => {
        if (!excelData) return;
        setLoading(true);
        setStatus('Saving changes to GitHub and triggering production build...');
        
        try {
            const { workbook, sha } = excelData;
            
            // Clean up data before saving
            const cleanParts = parts.map(p => {
                const { ...rest } = p;
                return rest;
            });

            const cleanPresets = presets.map(p => {
                const { ...rest } = p;
                return rest;
            });

            // Update the Parts sheet
            const partsSheet = xlsx.utils.json_to_sheet(cleanParts);
            workbook.Sheets['Parts'] = partsSheet;
            
            // Update the Presets sheet
            const presetsSheet = xlsx.utils.json_to_sheet(cleanPresets);
            workbook.Sheets['Presets'] = presetsSheet;
            
            // Generate new base64 content
            const wbout = xlsx.write(workbook, { bookType: 'xlsx', type: 'base64' });
            
            await github.updateFile(
                'Configurator_Data.xlsx',
                wbout,
                `Admin update: Configurator Data (Parts and Presets updated)`,
                sha
            );
            
            setStatus('Successfully saved! Production build triggered.');
            // Refresh to get new SHA
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

            {status.includes('VITE_GITHUB_TOKEN') && (
                <div style={{ padding: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', marginBottom: '20px' }}>
                    <h3 style={{ color: '#991b1b', marginTop: 0 }}>Setup Required</h3>
                    <p>To enable the Admin Dashboard, you need to add a GitHub Personal Access Token to Vercel:</p>
                    <ol>
                        <li>Go to <strong>Vercel Dashboard &gt; Settings &gt; Environment Variables</strong></li>
                        <li>Add <strong>VITE_GITHUB_TOKEN</strong> with your token as the value.</li>
                        <li><strong>Redeploy</strong> your project for changes to take effect.</li>
                    </ol>
                    <div style={{ marginTop: '20px', borderTop: '1px solid #fecaca', paddingTop: '20px' }}>
                        <p><strong>Alternative:</strong> Paste your token here to use it for this session:</p>
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
                </div>
            )}

            <section className="parts-manager" style={{ marginBottom: '40px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0 }}>Parts Management</h3>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: '400px', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#f9fafb', zIndex: 1 }}>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Part ID</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Display Name</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Price</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>GLB File</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>SKU</th>
                            </tr>
                        </thead>
                        <tbody>
                            {parts.filter(p => p.Category && !p.Category.includes('(')).map((part, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '8px', fontSize: '13px', color: '#666' }}>{part.Part_ID}</td>
                                    <td style={{ padding: '8px' }}>
                                        <input 
                                            value={part.Part_Name} 
                                            onChange={(e) => handleUpdatePart(parts.indexOf(part), 'Part_Name', e.target.value)}
                                            style={{ padding: '6px', width: '100%', border: '1px solid #f3f3f3' }}
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input 
                                            value={part.Price} 
                                            onChange={(e) => handleUpdatePart(parts.indexOf(part), 'Price', e.target.value)}
                                            style={{ padding: '6px', width: '80px', border: '1px solid #f3f3f3' }}
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input 
                                            value={part.GLB_File} 
                                            onChange={(e) => handleUpdatePart(parts.indexOf(part), 'GLB_File', e.target.value)}
                                            style={{ padding: '6px', width: '150px', border: '1px solid #f3f3f3' }}
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input 
                                            value={part.SKU} 
                                            onChange={(e) => handleUpdatePart(parts.indexOf(part), 'SKU', e.target.value)}
                                            style={{ padding: '6px', width: '120px', border: '1px solid #f3f3f3' }}
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="presets-manager">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0 }}>Presets Management</h3>
                    <button 
                        onClick={handleCreatePreset}
                        style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
                    >
                        + Add Preset
                    </button>
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb' }}>
                            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Preset Name</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Description</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Components</th>
                                <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {presets.filter(p => p.Preset_Name && !p.Preset_Name.includes('(')).map((preset, idx) => (
                                <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{preset.Preset_Name}</td>
                                    <td style={{ padding: '8px' }}>
                                        <input 
                                            value={preset.Description} 
                                            onChange={(e) => handleUpdatePreset(presets.indexOf(preset), 'Description', e.target.value)}
                                            style={{ padding: '6px', width: '100%', border: '1px solid #f3f3f3' }}
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '11px' }}>
                                            {categories.map(cat => (
                                                <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <label style={{ fontWeight: '600', color: '#666' }}>{cat}</label>
                                                    <select 
                                                        value={preset[cat] || ''}
                                                        onChange={(e) => handleUpdatePreset(presets.indexOf(preset), cat, e.target.value)}
                                                        style={{ padding: '4px', fontSize: '11px', border: '1px solid #ddd' }}
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
                                        <button 
                                            onClick={() => handleDeletePreset(presets.indexOf(preset))}
                                            style={{ padding: '6px', background: 'transparent', color: '#dc2626', border: 'none', cursor: 'pointer', fontSize: '12px' }}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default AdminPage;
