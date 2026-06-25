import React, { useState } from 'react';
import { Star, Save, CheckCircle, XCircle, Loader2 } from 'lucide-react';

const Slider = ({ id, label, value, onChange, disabled }) => {
  const trackColor = value >= 7 ? '#10b981' : value >= 4 ? '#f59e0b' : '#ef4444';
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">{label}</label>
        <span className="text-sm font-bold text-blue-600">{value}<span className="text-slate-400 font-normal">/10</span></span>
      </div>
      <input
        type="range" id={id} min="0" max="10" value={value}
        onChange={e => onChange(parseInt(e.target.value))} disabled={disabled}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:cursor-not-allowed"
        style={{ accentColor: trackColor }}
      />
      <div className="flex justify-between text-xs text-slate-400">
        <span>Ruim</span><span>Excelente</span>
      </div>
    </div>
  );
};

export default function Feedback() {
  const [cnpj, setCnpj]       = useState(() => sessionStorage.getItem('pesa_feedback_cnpj') || '');
  const [scores, setScores]   = useState(() => {
    try {
      const cached = sessionStorage.getItem('pesa_feedback_scores');
      return cached ? JSON.parse(cached) : { deadline: 8, price: 8, quality: 8 };
    } catch {
      return { deadline: 8, price: 8, quality: 8 };
    }
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleCnpjChange = val => {
    setCnpj(val);
    sessionStorage.setItem('pesa_feedback_cnpj', val);
  };

  const handleScoreChange = (key, val) => {
    setScores(prev => {
      const next = { ...prev, [key]: val };
      sessionStorage.setItem('pesa_feedback_scores', JSON.stringify(next));
      return next;
    });
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!cnpj) return;
    setLoading(true); setMessage(null);

    fetch('http://localhost:5115/api/supplier/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj, deadline: scores.deadline, price: scores.price, quality: scores.quality })
    })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        setLoading(false);
        if (!ok) { setMessage({ ok: false, text: d.message || 'Erro desconhecido.' }); return; }
        setMessage({ ok: true, title: 'Avaliação registrada!', text: `Novo Score: ${d.novoScore}/100 — Novo Status: ${d.novoStatus}` });
        
        setCnpj('');
        setScores({ deadline: 8, price: 8, quality: 8 });
        sessionStorage.removeItem('pesa_feedback_cnpj');
        sessionStorage.removeItem('pesa_feedback_scores');

        try {
          localStorage.removeItem('pesa_dashboard_metrics');
          const cleanCnpj = cnpj.replace(/\D/g, '');
          localStorage.removeItem(`pesa_dossier_${cleanCnpj}`);
        } catch {}
      })
      .catch(() => { setMessage({ ok: false, text: 'Falha de conexão com o servidor.' }); setLoading(false); });
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Avaliação Pós-Aquisição</h2>
        <p className="text-sm text-slate-500 mt-0.5">As notas atribuídas recalcularão automaticamente o Score Histórico do fornecedor.</p>
      </div>

      {message && (
        <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${message.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {message.ok ? <CheckCircle size={16} className="flex-shrink-0 mt-0.5" /> : <XCircle size={16} className="flex-shrink-0 mt-0.5" />}
          <div>
            {message.title && <p className="font-semibold">{message.title}</p>}
            <p className={message.title ? 'text-xs mt-0.5 opacity-80' : ''}>{message.text}</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100">
          <Star size={15} className="text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Formulário de Avaliação</span>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* CNPJ */}
          <div>
            <label htmlFor="cnpjFb" className="block text-sm font-medium text-slate-700 mb-1.5">CNPJ do Fornecedor</label>
            <input
              id="cnpjFb" type="text" value={cnpj}
              onChange={e => handleCnpjChange(e.target.value)}
              placeholder="00.000.000/0001-00" required disabled={loading}
              className="w-full max-w-xs px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50"
            />
          </div>

          {/* Sliders */}
          <div className="bg-slate-50 rounded-xl p-5 space-y-5">
            <p className="text-sm font-semibold text-slate-700">Critérios de Avaliação</p>
            <Slider id="deadline" label="Cumprimento de Prazo"      value={scores.deadline} onChange={v => handleScoreChange('deadline', v)} disabled={loading} />
            <Slider id="price"    label="Relação Custo-Benefício"   value={scores.price}    onChange={v => handleScoreChange('price', v)}    disabled={loading} />
            <Slider id="quality"  label="Qualidade Técnica Entregue" value={scores.quality}  onChange={v => handleScoreChange('quality', v)}  disabled={loading} />
          </div>

          <button type="submit" disabled={loading || !cnpj}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {loading ? 'Registrando...' : 'Registrar Avaliação'}
          </button>
        </form>
      </div>
    </div>
  );
}
