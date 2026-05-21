import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Users, AlertTriangle, RefreshCw, Database } from 'lucide-react';

const CARDS = [
  { key: 'homologados',         label: 'Homologados',        icon: CheckCircle,    color: 'text-emerald-600', bg: 'bg-emerald-50',  border: 'border-emerald-100' },
  { key: 'rejeitados',          label: 'Rejeitados',         icon: XCircle,        color: 'text-red-500',     bg: 'bg-red-50',      border: 'border-red-100'     },
  { key: 'aguardandoAuditoria', label: 'Aguard. Auditoria',  icon: Clock,          color: 'text-amber-500',   bg: 'bg-amber-50',    border: 'border-amber-100'   },
  { key: 'aguardandoAprovacao', label: 'Aguard. Aprovação',  icon: Users,          color: 'text-blue-600',    bg: 'bg-blue-50',     border: 'border-blue-100'    },
  { key: 'altoRisco',           label: 'Alto Risco',         icon: AlertTriangle,  color: 'text-rose-700',    bg: 'bg-rose-50',     border: 'border-rose-100'    },
];

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = () => {
    setLoading(true);
    fetch('http://localhost:5115/api/supplier/metrics')
      .then(r => r.json())
      .then(d => { setMetrics(d); setLoading(false); })
      .catch(() => { setMetrics({ dbOnline: false, erro: 'Não foi possível conectar ao servidor.' }); setLoading(false); });
  };

  useEffect(() => { fetchMetrics(); }, []);

  return (
    <div className="space-y-6">
      {/* Title row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Painel de Controle</h2>
          <p className="text-sm text-slate-500 mt-0.5">Visão geral dos fornecedores cadastrados</p>
        </div>
        {!loading && metrics?.dbOnline && (
          <button
            onClick={fetchMetrics}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw size={12} /> Atualizar
          </button>
        )}
      </div>

      {/* Offline warning */}
      {!loading && !metrics?.dbOnline && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <Database size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Banco de dados offline</p>
            <p className="text-amber-700 mt-0.5">{metrics?.erro || 'Verifique se o XAMPP/MySQL está rodando.'}</p>
          </div>
        </div>
      )}

      {/* Metrics cards */}
      {loading ? (
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-5 animate-pulse">
              <div className="w-9 h-9 rounded-xl bg-slate-100 mb-3" />
              <div className="h-7 w-12 bg-slate-100 rounded mb-2" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : metrics?.dbOnline && (
        <>
          <div className="grid grid-cols-5 gap-4">
            {CARDS.map(c => {
              const Icon = c.icon;
              return (
                <div key={c.key} className={`bg-white rounded-2xl border ${c.border} p-5 shadow-sm hover:shadow-md transition-shadow`}>
                  <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                    <Icon size={18} className={c.color} />
                  </div>
                  <p className={`text-2xl font-bold ${c.color}`}>{metrics[c.key] ?? 0}</p>
                  <p className="text-xs font-medium text-slate-500 mt-1">{c.label}</p>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-400">
            Total de fornecedores: <span className="font-semibold text-slate-600">{metrics.total ?? 0}</span>
          </p>
        </>
      )}
    </div>
  );
}
