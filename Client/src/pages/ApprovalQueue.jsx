import React, { useEffect, useState } from 'react';
import { Scale, RefreshCw, CheckCircle, XCircle, AlertTriangle, Database } from 'lucide-react';

const scoreColor = (s) => {
  if (s == null) return 'text-slate-400';
  if (s >= 70) return 'text-emerald-600';
  if (s >= 40) return 'text-amber-500';
  return 'text-red-500';
};

export default function ApprovalQueue() {
  const [queue, setQueue]         = useState(() => {
    try {
      const cached = localStorage.getItem('pesa_approval_queue');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading]     = useState(queue.length === 0);
  const [dbError, setDbError]     = useState(null);
  const [actionMsg, setActionMsg] = useState(null);

  const fetchQueue = (showLoading = true) => {
    if (showLoading) setLoading(true);
    setDbError(null);
    fetch('http://localhost:5115/api/supplier/pending-approvals')
      .then(r => { if (!r.ok) throw new Error(`Servidor retornou ${r.status}.`); return r.json(); })
      .then(d => {
        setQueue(d);
        setLoading(false);
        try {
          localStorage.setItem('pesa_approval_queue', JSON.stringify(d));
        } catch (e) {
          console.error(e);
        }
      })
      .catch(e => {
        if (queue.length === 0) {
          setDbError(e.message);
        }
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchQueue(queue.length === 0);
  }, []);

  const handleAction = (id, action) => {
    setActionMsg(null);
    fetch(`http://localhost:5115/api/supplier/${id}/approve`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action })
    })
      .then(r => { if (!r.ok) throw new Error(`Erro ${r.status}`); return r.json(); })
      .then(d => {
        setActionMsg({ ok: true, text: d.message });
        try {
          localStorage.removeItem('pesa_approval_queue');
        } catch {}
        fetchQueue(true);
      })
      .catch(e => setActionMsg({ ok: false, text: e.message }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Fila de Aprovação</h2>
          <p className="text-sm text-slate-500 mt-0.5">Fornecedores aguardando aprovação do RH / Jurídico</p>
        </div>
        <button onClick={fetchQueue} className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>

      {actionMsg && (
        <div className={`flex items-center gap-2.5 p-3.5 rounded-xl text-sm border ${actionMsg.ok ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-700'}`}>
          {actionMsg.ok ? <CheckCircle size={15} /> : <XCircle size={15} />}
          {actionMsg.text}
        </div>
      )}

      {dbError && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
          <Database size={16} className="flex-shrink-0 mt-0.5" />
          <span><strong>Erro de conexão:</strong> {dbError}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400 animate-pulse">Carregando fila de aprovação...</div>
        ) : queue.length === 0 && !dbError ? (
          <div className="p-10 text-center">
            <CheckCircle size={36} className="text-emerald-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500">Nenhuma aprovação pendente</p>
          </div>
        ) : !dbError && (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">CNPJ</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Razão Social</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {queue.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-xs text-slate-600">{item.cnpj}</td>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{item.corporateName}</td>
                  <td className={`px-5 py-3.5 text-center font-bold ${scoreColor(item.score)}`}>{item.score ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{item.status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleAction(item.id, 'approve')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                        <CheckCircle size={12} /> Aprovar
                      </button>
                      <button onClick={() => handleAction(item.id, 'reject')}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors">
                        <XCircle size={12} /> Rejeitar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
