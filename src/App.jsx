import React, { useState, useEffect } from 'react';
import ConfiguratorUI from './components/ConfiguratorUI';
import Experience from './components/Experience';
import AdminPage from './pages/AdminPage';
import './styles/configurator.css';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('admin') === 'true') {
      setIsAdmin(true);
    }
  }, []);

  if (isAdmin) {
    return <AdminPage />;
  }

  return (
    <div className="app-container">
      <div className="canvas-container">
        <Experience />
      </div>
      <ConfiguratorUI />
    </div>
  );
}

export default App;
