import React, { useState, useEffect } from 'react';
import ConfiguratorUI from './components/ConfiguratorUI';
import Experience from './components/Experience';
import AdminPage from './pages/AdminPage';
import './styles/configurator.css';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('upt-theme') === 'light' ? 'light' : 'dark'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('upt-theme', theme);
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    
    if (params.get('admin') === 'true' || path === '/admin' || path === '/admin/') {
      setIsAdmin(true);
    }
  }, []);

  if (isAdmin) {
    return <AdminPage />;
  }

  return (
    <div className="app-container">
      <div className="canvas-container">
        <Experience theme={theme} />
      </div>
      <ConfiguratorUI
        theme={theme}
        onThemeChange={setTheme}
      />
    </div>
  );
}

export default App;
