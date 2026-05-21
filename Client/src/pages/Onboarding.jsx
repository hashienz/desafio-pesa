import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Upload, FileCheck, X, Loader2, AlertCircle } from 'lucide-react';

export default function Onboarding() {
  const [cnpj, setCnpj]         = useState('');
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError]       = useState(null);
  const navigate = useNavigate();

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
    if (file) fd.append('document', file);

    fetch('http://localhost:5115/api/supplier/evaluate', { method: 'POST', body: fd })
      .then(r => { clearInterval(timer); setProgress(100); if (!r.ok) throw new Error('Falha ao conectar com o servidor.'); return r.json(); })
      .then(data => { setTimeout(() => { setLoading(false); navigate(`/dossier/${encodeURIComponent(data.supplier.cnpj)}`, { state: data }); }, 400); })
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
                onChange={e => setCnpj(e.target.value)}
                placeholder="00.000.000/0001-00"
                disabled={loading}
                className="w-full max-w-xs px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
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
    </div>
  );
}
