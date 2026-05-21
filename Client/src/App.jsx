import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Search, FolderOpen, Scale, Star,
  Plus, Save, Printer, HelpCircle, User, ChevronRight,
  Monitor
} from 'lucide-react';
import Dashboard    from './pages/Dashboard';
import Onboarding   from './pages/Onboarding';
import Dossier      from './pages/Dossier';
import ApprovalQueue from './pages/ApprovalQueue';
import Feedback     from './pages/Feedback';
import './index.css';

const NAV_ITEMS = [
  { to: '/',           label: 'Dashboard',          icon: LayoutDashboard, exact: true  },
  { to: '/onboarding', label: 'Busca / Onboarding',  icon: Search,          exact: false },
  { to: '/dossier',    label: 'Dossiê & Score',       icon: FolderOpen,      exact: false },
  { to: '/approvals',  label: 'Fila Jurídico/RH',    icon: Scale,           exact: false },
  { to: '/feedback',   label: 'Pós-Aquisição',        icon: Star,            exact: false },
];

const MENU_ITEMS = ['Arquivo', 'Editar', 'Exibir', 'Relatórios', 'Ajuda'];

function MainApp() {
  const location = useLocation();
  const [dialog, setDialog] = useState(null);

  const isActive = (item) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  const handleMenu = (item) =>
    setDialog(`A ação "${item}" não está disponível nesta versão demonstrativa.`);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100">

      {/* ── SIDEBAR ── */}
      <aside className="flex flex-col w-56 min-w-56 bg-[#0f172a] text-slate-300 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/60">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Monitor size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">PESA</p>
            <p className="text-slate-500 text-[10px] leading-tight">Homologação</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="px-2 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Módulos</p>
          {NAV_ITEMS.map(item => {
            const active = isActive(item);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium nav-item-transition
                  ${active
                    ? 'bg-blue-600/20 text-blue-400 border-l-2 border-blue-500'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border-l-2 border-transparent'
                  }`}
              >
                <Icon size={15} className="flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700/60">
          <p className="text-[10px] text-slate-500">v2.0.0 — PESA Corp</p>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── HEADER ── */}
        <header className="bg-white border-b border-slate-200 flex-shrink-0">
          {/* Top row */}
          <div className="flex items-center justify-between px-6 py-3">
            <div>
              <h1 className="text-base font-semibold text-slate-800">Sistema de Homologação PESA</h1>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <User size={15} className="text-blue-600" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-slate-700 leading-none">Admin</p>
                <p className="text-[10px] text-slate-400 leading-none mt-0.5">v2.0.0</p>
              </div>
            </div>
          </div>

          {/* Menu bar */}
          <div className="flex items-center gap-1 px-4 py-1 border-t border-slate-100">
            {MENU_ITEMS.map(m => (
              <button
                key={m}
                onClick={() => handleMenu(m)}
                className="px-3 py-1 text-xs text-slate-600 rounded hover:bg-slate-100 transition-colors"
              >
                {m}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 border-t border-slate-100">
            <Link to="/onboarding">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
                <Plus size={13} /> Novo
              </button>
            </Link>
            <button onClick={() => handleMenu('Salvar')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Save size={13} /> Salvar
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <Printer size={13} /> Imprimir
            </button>
            <button onClick={() => handleMenu('Ajuda')} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
              <HelpCircle size={13} /> Ajuda
            </button>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/onboarding"    element={<Onboarding />} />
            <Route path="/dossier"       element={<Dossier />} />
            <Route path="/dossier/:cnpj" element={<Dossier />} />
            <Route path="/approvals"     element={<ApprovalQueue />} />
            <Route path="/feedback"      element={<Feedback />} />
          </Routes>
        </main>

        {/* ── FOOTER ── */}
        <footer className="flex-shrink-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-end">
          <p className="text-[10px] text-slate-400">
            Sistema de Homologação PESA &nbsp;|&nbsp; v2.0.0 &nbsp;|&nbsp; Admin
          </p>
        </footer>
      </div>

      {/* ── DIALOG ── */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-80 overflow-hidden">
            <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">Aviso do Sistema</span>
              <button onClick={() => setDialog(null)} className="text-blue-200 hover:text-white transition-colors">✕</button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600 mb-4">{dialog}</p>
              <div className="flex justify-end">
                <button onClick={() => setDialog(null)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <MainApp />
    </BrowserRouter>
  );
}
