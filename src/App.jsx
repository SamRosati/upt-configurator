import React from 'react';
import ConfiguratorUI from './components/ConfiguratorUI';
import Experience from './components/Experience';
import './styles/configurator.css';

function App() {
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
