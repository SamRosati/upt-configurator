import React, { useState, useEffect } from 'react';
import * as github from '../services/github';
import * as xlsx from 'xlsx';

const AdminPage = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [excelData, setExcelData] = useState(null);
    const [parts, setParts] = useState([]);
    const [status, setStatus] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        // Simple client-side check for demo; should be VITE_ADMIN_SECRET in production
        if (password === 'envo2026') {
            setIsLoggedIn(true);
            fetchData();
        } else {
            alert('Incorrect access code');
        }
    };

    const fetchData = async () => {
        setLoading(true);
        setStatus('Fetching latest data from GitHub...');
        
        // Check for token first
        if (!import.meta.env.VITE_GITHUB_TOKEN) {
            setStatus('Error: VITE_GITHUB_TOKEN is missing. Please add it to your Vercel/environment variables.');
            setLoading(false);
            return;
        }

        try {
            const { sha, content } = await github.getExcelData();
            const workbook = xlsx.read(content, { type: 'base64' });
            
            const partsSheet = workbook.Sheets['Parts'];
            if (!partsSheet) throw new Error('Could not find "Parts" sheet in Excel file.');
            
            const rawParts = xlsx.utils.sheet_to_json(partsSheet, { defval: "" });
            
            setExcelData({ sha, workbook });
            setParts(rawParts);
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

    const handleSave = async () => {
        if (!excelData) return;
        setLoading(true);
        setStatus('Saving changes to GitHub and triggering production build...');
        
        try {
            // Update the Parts sheet in the existing workbook
            const newSheet = xlsx.utils.json_to_sheet(parts);
            const { workbook, sha } = excelData;
            workbook.Sheets['Parts'] = newSheet;
            
            // Generate new base64 content
            const wbout = xlsx.write(workbook, { bookType: 'xlsx', type: 'base64' });
            
            await github.updateFile(
                'Configurator_Data.xlsx',
                wbout,
                `Admin update: Configurator Data (Parts updated)`,
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
                </div>
            )}

            <section className="parts-manager">
                <h3>Parts Management</h3>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
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
                                    <td style={{ padding: '8px' }}>{part.Part_ID}</td>
                                    <td style={{ padding: '8px' }}>
                                        <input 
                                            value={part.Part_Name} 
                                            onChange={(e) => handleUpdatePart(idx, 'Part_Name', e.target.value)}
                                            style={{ padding: '4px', width: '100%' }}
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input 
                                            value={part.Price} 
                                            onChange={(e) => handleUpdatePart(idx, 'Price', e.target.value)}
                                            style={{ padding: '4px', width: '80px' }}
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input 
                                            value={part.GLB_File} 
                                            onChange={(e) => handleUpdatePart(idx, 'GLB_File', e.target.value)}
                                            style={{ padding: '4px', width: '150px' }}
                                        />
                                    </td>
                                    <td style={{ padding: '8px' }}>
                                        <input 
                                            value={part.SKU} 
                                            onChange={(e) => handleUpdatePart(idx, 'SKU', e.target.value)}
                                            style={{ padding: '4px', width: '120px' }}
                                        />
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
