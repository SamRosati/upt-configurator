import React, { useState, useEffect } from 'react';
import * as github from '../services/github';
import * as xlsx from 'xlsx';

const LEVELS = [
    'Main Block',
    'Wheelbase',
    'Motor',
    'Tires',
    'Steering & Controls',
    'Column',
    'Handle',
    'Seating',
    'Body Parts',
    'Top Body',
    'Accessories',
    'Color & Finish'
];

const AdminPage = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [excelData, setExcelData] = useState(null);
    const [parts, setParts] = useState([]);
    const [presets, setPresets] = useState([]);
    const [categoriesData, setCategoriesData] = useState([]);
    const [rulesData, setRulesData] = useState([]);
    const [status, setStatus] = useState('');
    const [activeTab, setActiveTab] = useState('parts');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

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
        setStatus('Fetching latest data...');
        
        const tokenToUse = overrideToken || manualToken || import.meta.env.VITE_GITHUB_TOKEN;
        if (overrideToken || manualToken) {
            github.setToken(tokenToUse);
            localStorage.setItem('UPT_ADMIN_TOKEN', tokenToUse);
        }

        try {
            const { sha, content } = await github.getExcelData();
            const workbook = xlsx.read(content, { type: 'base64' });
            
            const getSheet = (name) => {
                const sheet = workbook.Sheets[name];
                return sheet ? xlsx.utils.sheet_to_json(sheet, { defval: "" }) : [];
            };

            setExcelData({ sha, workbook });
            setParts(getSheet('Parts'));
            setPresets(getSheet('Presets'));
            setCategoriesData(getSheet('Categories'));
            setRulesData(getSheet('Rules'));
            setStatus('Ready');
        } catch (err) {
            console.error(err);
            setStatus('Error: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!excelData) return;
        setLoading(true);
        setStatus('Saving...');
        
        try {
            const { workbook, sha } = excelData;
            
            const clean = (data, key) => data.filter(item => item[key] && !String(item[key]).includes('('));

            workbook.Sheets['Parts'] = xlsx.utils.json_to_sheet(clean(parts, 'Part_ID'));
            workbook.Sheets['Presets'] = xlsx.utils.json_to_sheet(clean(presets, 'Preset_Name'));
            workbook.Sheets['Categories'] = xlsx.utils.json_to_sheet(clean(categoriesData, 'Category'));
            workbook.Sheets['Rules'] = xlsx.utils.json_to_sheet(clean(rulesData, 'If_Part'));
            
            const wbout = xlsx.write(workbook, { bookType: 'xlsx', type: 'base64' });
            await github.updateFile('Configurator_Data.xlsx', wbout, `Admin update: ${activeTab}`, sha);
            
            setStatus('Saved successfully!');
            fetchData();
        } catch (err) {
            setStatus('Error saving: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    // Managers logic
    const updateItem = (list, setList, index, field, value) => {
        const newList = [...list];
        newList[index][field] = value;
        setList(newList);
    };

    const addItem = (list, setList, template) => {
        setList([...list, template]);
    };

    const deleteItem = (list, setList, index, confirmMsg) => {
        if (window.confirm(confirmMsg)) {
            const newList = [...list];
            newList.splice(index, 1);
            setList(newList);
        }
    };

    if (!isLoggedIn) {
        return (
            <div style={{ padding: '100px 20px', textAlign: 'center' }}>
                <div style={{ maxWidth: '400px', margin: '0 auto', background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                    <h2 style={{ marginBottom: '24px', color: '#111' }}>Envo Configurator Admin</h2>
                    <form onSubmit={handleLogin}>
                        <input 
                            type="password" 
                            placeholder="Access Code" 
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ width: '100%', padding: '12px', marginBottom: '16px', border: '1px solid #ddd', borderRadius: '6px' }}
                        />
                        <button type="submit" style={{ width: '100%', padding: '12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                            Login
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const categoriesList = categoriesData.filter(c => c.Category && !c.Category.includes('(')).map(c => c.Category);

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Header */}
            <header style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 100 }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '20px', color: '#111' }}>Admin Dashboard</h1>
                    <span style={{ fontSize: '13px', color: status.includes('Error') ? '#ef4444' : '#64748b' }}>{status}</span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={fetchData} disabled={loading} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '6px', cursor: 'pointer' }}>Refresh</button>
                    <button onClick={handleSave} disabled={loading || !excelData} style={{ padding: '8px 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <nav style={{ background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0 40px', display: 'flex', gap: '32px' }}>
                {['parts', 'categories', 'rules', 'presets'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{ 
                            padding: '16px 0', 
                            background: 'none', 
                            border: 'none', 
                            borderBottom: activeTab === tab ? '2px solid #2563eb' : '2px solid transparent',
                            color: activeTab === tab ? '#2563eb' : '#64748b',
                            fontWeight: activeTab === tab ? '600' : '400',
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </nav>

            {/* Main Content */}
            <main style={{ padding: '40px' }}>
                {activeTab === 'parts' && (
                    <section>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <input 
                                    placeholder="Search parts..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)}
                                    style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', width: '300px' }}
                                />
                                <select 
                                    value={categoryFilter} 
                                    onChange={e => setCategoryFilter(e.target.value)}
                                    style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}
                                >
                                    <option value="all">All Categories</option>
                                    {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <button 
                                onClick={() => addItem(parts, setParts, { Part_ID: `new-${Date.now()}`, Part_Name: 'New Part', Category: categoriesList[0], Price: 0, GLB_File: 'placeholder.glb', Status: 'available' })}
                                style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                + Add Part
                            </button>
                        </div>
                        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', color: '#64748b' }}>ID / Name</th>
                                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', color: '#64748b' }}>Category</th>
                                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', color: '#64748b' }}>GLB / Node</th>
                                        <th style={{ textAlign: 'left', padding: '12px 20px', fontSize: '12px', color: '#64748b' }}>Price</th>
                                        <th style={{ textAlign: 'right', padding: '12px 20px', fontSize: '12px', color: '#64748b' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {parts
                                        .filter(p => p.Part_ID && !p.Part_ID.includes('('))
                                        .filter(p => p.Part_Name.toLowerCase().includes(searchTerm.toLowerCase()) || p.Part_ID.toLowerCase().includes(searchTerm.toLowerCase()))
                                        .filter(p => categoryFilter === 'all' || p.Category === categoryFilter)
                                        .map((part, idx) => {
                                            const originalIdx = parts.indexOf(part);
                                            return (
                                                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '12px 20px' }}>
                                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>
                                                            <input value={part.Part_Name} onChange={e => updateItem(parts, setParts, originalIdx, 'Part_Name', e.target.value)} style={{ border: 'none', width: '100%', outline: 'none' }} />
                                                        </div>
                                                        <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '4px' }}>
                                                            <input value={part.Part_ID} onChange={e => updateItem(parts, setParts, originalIdx, 'Part_ID', e.target.value)} style={{ border: 'none', color: 'inherit', background: 'transparent', width: '100%' }} />
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 20px' }}>
                                                        <select value={part.Category} onChange={e => updateItem(parts, setParts, originalIdx, 'Category', e.target.value)} style={{ padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                                                            {categoriesList.map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                    </td>
                                                    <td style={{ padding: '12px 20px' }}>
                                                        <div style={{ fontSize: '12px' }}><input value={part.GLB_File} onChange={e => updateItem(parts, setParts, originalIdx, 'GLB_File', e.target.value)} style={{ border: 'none', width: '120px' }} /></div>
                                                        <div style={{ fontSize: '12px', color: '#94a3b8' }}><input placeholder="Node Name" value={part.Node_Name} onChange={e => updateItem(parts, setParts, originalIdx, 'Node_Name', e.target.value)} style={{ border: 'none', width: '120px' }} /></div>
                                                    </td>
                                                    <td style={{ padding: '12px 20px' }}>
                                                        <input value={part.Price} onChange={e => updateItem(parts, setParts, originalIdx, 'Price', e.target.value)} style={{ width: '60px', padding: '4px', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                                                    </td>
                                                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                                                        <button onClick={() => deleteItem(parts, setParts, originalIdx, 'Delete this part?')} style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: '12px', cursor: 'pointer' }}>Delete</button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {activeTab === 'categories' && (
                    <section style={{ maxWidth: '900px' }}>
                        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                    <tr>
                                        <th style={{ textAlign: 'left', padding: '12px 20px' }}>ID</th>
                                        <th style={{ textAlign: 'left', padding: '12px 20px' }}>Display Name</th>
                                        <th style={{ textAlign: 'left', padding: '12px 20px' }}>UI Level</th>
                                        <th style={{ textAlign: 'left', padding: '12px 20px' }}>Selection</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categoriesData.filter(c => c.Category && !c.Category.includes('(')).map((cat, idx) => (
                                        <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px 20px', fontSize: '12px', color: '#64748b' }}>{cat.Category}</td>
                                            <td style={{ padding: '12px 20px' }}>
                                                <input value={cat.Display_Name} onChange={e => updateItem(categoriesData, setCategoriesData, idx, 'Display_Name', e.target.value)} style={{ padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px' }} />
                                            </td>
                                            <td style={{ padding: '12px 20px' }}>
                                                <select value={cat.Level || ''} onChange={e => updateItem(categoriesData, setCategoriesData, idx, 'Level', e.target.value)} style={{ padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                                                    <option value="">None</option>
                                                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                                                </select>
                                            </td>
                                            <td style={{ padding: '12px 20px' }}>
                                                <select value={cat.Selection_Type || 'single'} onChange={e => updateItem(categoriesData, setCategoriesData, idx, 'Selection_Type', e.target.value)} style={{ padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                                                    <option value="single">Single</option>
                                                    <option value="multi">Multi</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {activeTab === 'rules' && (
                    <section style={{ maxWidth: '1000px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Compatibility Rules</h3>
                            <button 
                                onClick={() => addItem(rulesData, setRulesData, { If_Part: parts[0]?.Part_ID, Relation: 'REQUIRES', Then_Part: parts[1]?.Part_ID, Message: '' })}
                                style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                + Add New Rule
                            </button>
                        </div>
                        <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                            {rulesData.length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>No rules defined.</div> : (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                        <tr>
                                            <th style={{ padding: '12px 20px', textAlign: 'left' }}>If Part</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'left' }}>Relation</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'left' }}>Then Part</th>
                                            <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rulesData.filter(r => r.If_Part && !String(r.If_Part).includes('(')).map((rule, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                <td style={{ padding: '12px 20px' }}>
                                                    <select value={rule.If_Part} onChange={e => updateItem(rulesData, setRulesData, idx, 'If_Part', e.target.value)} style={{ padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', width: '200px' }}>
                                                        {parts.filter(p => p.Part_ID && !p.Part_ID.includes('(')).map(p => <option key={p.Part_ID} value={p.Part_ID}>{p.Part_Name} ({p.Part_ID})</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ padding: '12px 20px' }}>
                                                    <select value={rule.Relation} onChange={e => updateItem(rulesData, setRulesData, idx, 'Relation', e.target.value)} style={{ padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
                                                        <option value="REQUIRES">REQUIRES</option>
                                                        <option value="EXCLUDES">EXCLUDES</option>
                                                    </select>
                                                </td>
                                                <td style={{ padding: '12px 20px' }}>
                                                    <select value={rule.Then_Part} onChange={e => updateItem(rulesData, setRulesData, idx, 'Then_Part', e.target.value)} style={{ padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px', width: '200px' }}>
                                                        {parts.filter(p => p.Part_ID && !p.Part_ID.includes('(')).map(p => <option key={p.Part_ID} value={p.Part_ID}>{p.Part_Name} ({p.Part_ID})</option>)}
                                                    </select>
                                                </td>
                                                <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                                                    <button onClick={() => deleteItem(rulesData, setRulesData, idx, 'Delete this rule?')} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </section>
                )}

                {activeTab === 'presets' && (
                    <section>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ margin: 0 }}>Vehicle Presets</h3>
                            <button 
                                onClick={() => addItem(presets, setPresets, { Preset_Name: 'New Preset', Description: 'Description' })}
                                style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >
                                + Create Preset
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
                            {presets.filter(p => p.Preset_Name && !p.Preset_Name.includes('(')).map((preset, idx) => (
                                <div key={idx} style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <input value={preset.Preset_Name} onChange={e => updateItem(presets, setPresets, idx, 'Preset_Name', e.target.value)} style={{ fontSize: '18px', fontWeight: 'bold', border: 'none', width: '70%' }} />
                                        <button onClick={() => deleteItem(presets, setPresets, idx, 'Delete preset?')} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Delete</button>
                                    </div>
                                    <textarea value={preset.Description} onChange={e => updateItem(presets, setPresets, idx, 'Description', e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #f1f5f9', borderRadius: '4px', marginBottom: '16px', fontSize: '13px', color: '#64748b' }} rows="2" />
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {categoriesList.map(cat => (
                                            <div key={cat}>
                                                <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>{cat}</label>
                                                <select value={preset[cat] || ''} onChange={e => updateItem(presets, setPresets, idx, cat, e.target.value)} style={{ width: '100%', padding: '4px', fontSize: '12px', border: '1px solid #f1f5f9' }}>
                                                    <option value="">None</option>
                                                    {parts.filter(p => p.Category === cat).map(p => <option key={p.Part_ID} value={p.Part_ID}>{p.Part_Name}</option>)}
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
};

export default AdminPage;
