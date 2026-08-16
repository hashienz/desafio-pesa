import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Upload, FileCheck, X, Loader2, AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';

export default function Onboarding() {
  const [cnpj, setCnpj]         = useState(() => sessionStorage.getItem('pesa_onboarding_cnpj') || '');
  const [supplierName, setSupplierName] = useState(() => sessionStorage.getItem('pesa_supplier_name') || '');
  const [tradeName, setTradeName] = useState(() => sessionStorage.getItem('pesa_trade_name') || '');
  const [supplierType, setSupplierType] = useState(() => sessionStorage.getItem('pesa_supplier_type') || 'Terceiro Recorrente');
  const [supplierNotes, setSupplierNotes] = useState(() => sessionStorage.getItem('pesa_supplier_notes') || '');
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError]       = useState(null);
  const [history, setHistory]   = useState(() => {
    try {
      const cached = localStorage.getItem('pesa_onboarding_history');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [historyLoading, setHistoryLoading] = useState(history.length === 0);
  const navigate = useNavigate();

  const fetchHistory = () => {
    setHistoryLoading(true);
    fetch('http://localhost:5115/api/supplier/all')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => {
        setHistory(data);
        setHistoryLoading(false);
        try {
          localStorage.setItem('pesa_onboarding_history', JSON.stringify(data));
        } catch {}
      })
      .catch(() => {
        setHistoryLoading(false);
      });
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileChange = e => { if (e.target.files?.[0]) setFile(e.target.files[0]); };

  const handleSearch = e => {
    e.preventDefault();
    if (!cnpj) return;
    setLoading(true); setError(null); setProgress(10);
    const timer = setInterval(() => {
      setProgress(p => { if (p >= 90) { clearInterval(timer); return 90; } return p + 10; });
    }, 200);

    const fd = new FormData();
    fd.append('cnpj', cnpj);
    fd.append('supplierName', supplierName);
    fd.append('tradeName', tradeName);
    fd.append('supplierType', supplierType);
    fd.append('supplierNotes', supplierNotes);
    if (file) fd.append('document', file);

    fetch('http://localhost:5115/api/supplier/evaluate', { method: 'POST', body: fd })
      .then(r => { clearInterval(timer); setProgress(100); if (!r.ok) throw new Error('Falha ao conectar com o servidor.'); return r.json(); })
      .then(data => {
        setTimeout(() => {
          setLoading(false);
          sessionStorage.removeItem('pesa_onboarding_cnpj');
          try {
            localStorage.setItem(`pesa_dossier_${data.supplier.cnpj}`, JSON.stringify(data));
            localStorage.setItem('pesa_last_cnpj', data.supplier.cnpj);

            const updatedHistory = [
              {
                id: data.supplier.id,
                cnpj: data.supplier.cnpj,
                corporateName: data.supplier.corporateName,
                status: data.supplier.status,
                score: data.evaluation?.totalScore ?? null
              },
              ...history.filter(h => h.cnpj !== data.supplier.cnpj)
            ];
            setHistory(updatedHistory);
            localStorage.setItem('pesa_onboarding_history', JSON.stringify(updatedHistory));
          } catch {}
          navigate(`/dossier/${encodeURIComponent(data.supplier.cnpj)}`, { state: data });
        }, 400);
      })
      .catch(err => { clearInterval(timer); setError(err.message); setLoading(false); });
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">Busca & Onboarding de Fornecedores</h2>
        <p className="text-sm text-slate-500 mt-0.5">Informe o CNPJ e o motor de IA irá cruzar dados de bases públicas para gerar o score de compliance.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Search size={14} /> Identificação do Fornecedor</p>
        </div>
        <div className="p-6">
          <form onSubmit={handleSearch} className="space-y-5">
            {/* CNPJ */}
            <div>
              <label htmlFor="cnpj" className="block text-sm font-medium text-slate-700 mb-1.5">CNPJ do Fornecedor</label>
              <input
                id="cnpj" type="text" value={cnpj}
                onChange={e => {
                  const val = e.target.value;
                  setCnpj(val);
                  sessionStorage.setItem('pesa_onboarding_cnpj', val);
                }}
                placeholder="00.000.000/0001-00"
                disabled={loading}
                className="w-full max-w-xs px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="supplierName" className="block text-sm font-medium text-slate-700 mb-1.5">Razão Social</label>
                <input
                  id="supplierName"
                  type="text"
                  value={supplierName}
                  onChange={e => {
                    const val = e.target.value;
                    setSupplierName(val);
                    sessionStorage.setItem('pesa_supplier_name', val);
                  }}
                  placeholder="Nome da empresa"
                  disabled={loading}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>

              <div>
                <label htmlFor="tradeName" className="block text-sm font-medium text-slate-700 mb-1.5">Nome Fantasia</label>
                <input
                  id="tradeName"
                  type="text"
                  value={tradeName}
                  onChange={e => {
                    const val = e.target.value;
                    setTradeName(val);
                    sessionStorage.setItem('pesa_trade_name', val);
                  }}
                  placeholder="Nome comercial"
                  disabled={loading}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="supplierType" className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Fornecedor</label>
              <select
                id="supplierType"
                value={supplierType}
                onChange={e => {
                  const val = e.target.value;
                  setSupplierType(val);
                  sessionStorage.setItem('pesa_supplier_type', val);
                }}
                disabled={loading}
                className="w-full max-w-md px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="Terceiro Recorrente">Terceiro Recorrente</option>
                <option value="Serviços de Hospedagem">Serviços de Hospedagem</option>
                <option value="Opex/Capex">Opex/Capex</option>
              </select>
            </div>

            <div>
              <label htmlFor="supplierNotes" className="block text-sm font-medium text-slate-700 mb-1.5">Observações do Fornecedor</label>
              <textarea
                id="supplierNotes"
                rows="3"
                value={supplierNotes}
                onChange={e => {
                  const val = e.target.value;
                  setSupplierNotes(val);
                  sessionStorage.setItem('pesa_supplier_notes', val);
                }}
                placeholder="Ex.: histórico de entregas, prática ESG, pendências fiscais, processos judiciais ou comentários de compliance."
                disabled={loading}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
              />
            </div>

            {/* Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Documento de Compliance <span className="text-slate-400 font-normal">(opcional — PDF, PNG, JPG)</span>
              </label>
              <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-colors ${file ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}>
                <input type="file" onChange={handleFileChange} accept=".pdf,.png,.jpg,.jpeg" disabled={loading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3 ${file ? 'bg-blue-100' : 'bg-slate-100'}`}>
                  {file ? <FileCheck size={20} className="text-blue-600" /> : <Upload size={20} className="text-slate-400" />}
                </div>
                {file ? (
                  <>
                    <p className="text-sm font-semibold text-blue-700">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Clique para trocar</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-slate-600">Arraste ou clique para selecionar</p>
                    <p className="text-xs text-slate-400 mt-0.5">Certidão Negativa, Certificado ESG, Relatório Judicial...</p>
                  </>
                )}
              </div>
              {file && (
                <button type="button" onClick={() => setFile(null)} className="mt-2 flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 transition-colors">
                  <X size={12} /> Remover arquivo
                </button>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading || !cnpj}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              {loading ? 'Analisando...' : 'Iniciar Análise de Compliance'}
            </button>
          </form>

          {/* Progress */}
          {loading && (
            <div className="mt-5 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-semibold text-blue-700 mb-2">Motor de Análise em Execução</p>
              <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-2">Cruzando CNPJ com bases da Receita Federal, TST, TCU e registros ESG...</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-start gap-2.5 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
              <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {/* Histórico de Consultas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <FileCheck size={14} className="text-blue-600" /> Últimos Fornecedores Consultados
          </p>
          {!historyLoading && (
            <button
              onClick={fetchHistory}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={10} /> Atualizar
            </button>
          )}
        </div>
        <div>
          {historyLoading && history.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-400 animate-pulse">Carregando histórico...</div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">Nenhum fornecedor consultado recentemente.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">CNPJ</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Razão Social</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Dossiê</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.slice(0, 10).map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3 font-mono text-xs text-slate-600">{item.cnpj}</td>
                      <td className="px-5 py-3 font-medium text-slate-800 truncate max-w-xs">{item.corporateName}</td>
                      <td className={`px-5 py-3 text-center font-bold ${
                        item.score >= 70 ? 'text-emerald-600' : item.score >= 40 ? 'text-amber-500' : item.score != null ? 'text-red-500' : 'text-slate-400'
                      }`}>{item.score ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          item.status?.includes('Homolog') ? 'bg-emerald-100 text-emerald-700' :
                          item.status?.includes('Reprovado') ? 'bg-red-100 text-red-700' :
                          item.status?.includes('Aprovação') ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>{item.status}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => {
                            try {
                              localStorage.setItem('pesa_last_cnpj', item.cnpj);
                            } catch {}
                            navigate(`/dossier/${encodeURIComponent(item.cnpj)}`);
                          }}
                          className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-blue-600 transition-colors inline-flex items-center justify-center"
                          title="Ver Dossiê"
                        >
                          <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
