import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Onboarding from './pages/Onboarding';
import Dossier from './pages/Dossier';
import ApprovalQueue from './pages/ApprovalQueue';
import Feedback from './pages/Feedback';
import './App.css';

function MainApp() {
  const location = useLocation();
  const [windowState, setWindowState] = useState('open'); // 'open', 'maximized', 'minimized', 'closed'
  const [dialogContent, setDialogContent] = useState(null);

  const handleClose = () => setWindowState('closed');
  const handleMaximize = () => setWindowState(prev => prev === 'maximized' ? 'open' : 'maximized');
  const handleMinimize = () => setWindowState('minimized');
  const handleOpen = () => setWindowState('open');

  const handleMenuClick = (item) => {
    setDialogContent(`Ação "${item}" não implementada nesta versão demonstrativa.`);
  };

  return (
    <div className="desktop-environment">
      
      {/* Desktop Icons */}
      <div className="desktop-icons">
        <div className="desktop-shortcut" onDoubleClick={handleOpen}>
          <div className="icon-img">💻</div>
          <div className="icon-text">Sistema PESA.exe</div>
        </div>
      </div>

      {/* Fake Windows Dialog */}
      {dialogContent && (
        <div className="windows-dialog-overlay">
          <div className="windows-dialog">
            <div className="title-bar">
              <div className="title-bar-text"><span>ℹ️ Aviso do Sistema</span></div>
              <div className="title-bar-controls">
                <button aria-label="Close" className="win-btn close" onClick={() => setDialogContent(null)}>X</button>
              </div>
            </div>
            <div className="dialog-body">
              <p>{dialogContent}</p>
              <div style={{ textAlign: 'center', marginTop: '15px' }}>
                <button className="desktop-button" onClick={() => setDialogContent(null)} style={{ padding: '4px 20px' }}>OK</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Application Window */}
      {(windowState === 'open' || windowState === 'maximized') && (
        <div className={`window-app ${windowState === 'maximized' ? 'is-maximized' : ''}`} style={windowState !== 'maximized' ? { maxWidth: '900px', height: '600px' } : {}}>
          
          {/* Title Bar */}
          <div className="title-bar" onDoubleClick={handleMaximize}>
            <div className="title-bar-text">
              <span>💻 Sistema de Homologação PESA.exe</span>
            </div>
            <div className="title-bar-controls">
              <button aria-label="Minimize" className="win-btn minimize" onClick={handleMinimize}>_</button>
              <button aria-label="Maximize" className="win-btn maximize" onClick={handleMaximize}>□</button>
              <button aria-label="Close" className="win-btn close" onClick={handleClose}>X</button>
            </div>
          </div>

          {/* Menu Bar */}
          <div className="menu-bar">
            <span onClick={() => handleMenuClick('Arquivo')}>Arquivo</span>
            <span onClick={() => handleMenuClick('Editar')}>Editar</span>
            <span onClick={() => handleMenuClick('Exibir')}>Exibir</span>
            <span onClick={() => handleMenuClick('Relatórios')}>Relatórios</span>
            <span onClick={() => handleMenuClick('Ajuda')}>Ajuda</span>
          </div>

          {/* Window Body */}
          <div className="window-body">
            <div className="toolbar">
              <Link to="/onboarding" className="toolbar-btn" style={{ textDecoration: 'none', color: 'inherit' }}>📄 Novo</Link>
              <button className="toolbar-btn" onClick={() => handleMenuClick('Salvar')}>💾 Salvar</button>
              <button className="toolbar-btn" onClick={() => window.print()}>🖨️ Imprimir</button>
              <div className="separator"></div>
              <button className="toolbar-btn" onClick={() => handleMenuClick('Ajuda')}>❓ Ajuda</button>
            </div>

            <div className="layout-split">
              {/* Sidebar Navigation */}
              <div className="sidebar">
                <div className="sidebar-header">Módulos</div>
                <ul className="nav-list">
                  <li><Link to="/" className={location.pathname === '/' ? 'active' : ''}>📊 Dashboard</Link></li>
                  <li><Link to="/onboarding" className={location.pathname === '/onboarding' ? 'active' : ''}>🔎 Busca / Onboarding</Link></li>
                  <li><Link to="/dossier" className={location.pathname.startsWith('/dossier') ? 'active' : ''}>🗂️ Dossiê & Score</Link></li>
                  <li><Link to="/approvals" className={location.pathname === '/approvals' ? 'active' : ''}>⚖️ Fila Jurídico/RH</Link></li>
                  <li><Link to="/feedback" className={location.pathname === '/feedback' ? 'active' : ''}>⭐ Pós-Aquisição</Link></li>
                </ul>
              </div>

              {/* Main Content Area */}
              <div className="content-area">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/dossier" element={<Dossier />} />
                  <Route path="/dossier/:cnpj" element={<Dossier />} />
                  <Route path="/approvals" element={<ApprovalQueue />} />
                  <Route path="/feedback" element={<Feedback />} />
                </Routes>
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="status-bar">
            <div className="status-item flex-grow">Pronto</div>
            <div className="status-item">Usuário: Admin</div>
            <div className="status-item">v2010.5.0</div>
          </div>

        </div>
      )}

      {/* Windows Taskbar */}
      <div className="windows-taskbar">
        <button className="start-button">Começar</button>
        <div className="taskbar-apps">
          {windowState !== 'closed' && (
            <div className={`taskbar-item ${windowState === 'minimized' ? '' : 'active'}`} onClick={handleOpen}>
              💻 Sistema PESA
            </div>
          )}
        </div>
        <div className="taskbar-tray">
          <span>{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
      </div>

    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}

export default App;
