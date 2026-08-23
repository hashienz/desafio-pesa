import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight, BarChart2, CheckCircle, GitCompare, Loader2, XCircle } from 'lucide-react';

const API_URL = 'http://localhost:5115/api/supplier/';

const scoreStyle = score => score >= 70
  ? 'text-emerald-600'
  : score >= 40 ? 'text-amber-500' : 'text-red-500';

const statusStyle = status => status?.includes('Homolog')
  ? 'bg-emerald-100 text-emerald-700'
  : status?.includes('Reprovado') ? 'bg-red-100 text-red-700'
    : status?.includes('Aprovação') ? 'bg-blue-100 text-blue-700'
      : 'bg-amber-100 text-amber-700';

const ComparisonRow = ({ label, values, render }) => (
  <div className="grid grid-cols-3 border-b border-slate-100 last:border-0">
    <div className="px-4 py-3 text-xs font-medium text-slate-500">{label}</div>
    {values.map((value, index) => (
      <div key={`${label}-${index}`} className="px-4 py-3 text-sm text-slate-800 border-l border-slate-100">
        {render ? render(value) : value || 'Não informado'}
      </div>
    ))}
  </div>
);

export default function Compare() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCnpjs, setSelectedCnpjs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pesa_compare_cnpjs') || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (selectedCnpjs.length !== 2) {
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all(selectedCnpjs.map(cnpj =>
      fetch(`${API_URL}${encodeURIComponent(cnpj)}`)
        .then(response => {
          if (!response.ok) throw new Error('Não foi possível carregar um dos fornecedores.');
          return response.json();
        })
    ))
      .then(setSuppliers)
      .catch(loadError => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [selectedCnpjs]);

  const clearSelection = () => {
    localStorage.removeItem('pesa_compare_cnpjs');
    setSelectedCnpjs([]);
    setSuppliers([]);
    setError(null);
  };

  if (selectedCnpjs.length !== 2) {
    return (
      <div className="max-w-xl space-y-4">
        <Header />
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>Selecione exatamente dois fornecedores no histórico da tela <strong>Busca / Onboarding</strong> para iniciar a comparação.</span>
        </div>
        <button onClick={() => navigate('/onboarding')} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          Escolher fornecedores <ArrowRight size={14} />
        </button>
      </div>
    );
  }

  if (loading) return <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 size={16} className="animate-spin" /> Carregando comparação...</div>;
  if (error) return <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700"><AlertCircle size={15} />{error}</div>;

  const evaluations = suppliers.map(item => item.evaluation || {});
  const scores = suppliers.map(item => item.evaluation?.totalScore ?? 0);
  const scoreWinner = scores[0] === scores[1] ? null : scores[0] > scores[1] ? 0 : 1;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <Header />
        <button onClick={clearSelection} className="text-xs font-medium text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">Trocar fornecedores</button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-200">
          <div className="px-4 py-4 flex items-center gap-2 text-sm font-semibold text-slate-600"><GitCompare size={16} className="text-blue-600" /> Comparativo</div>
          {suppliers.map((item, index) => (
            <div key={item.supplier.cnpj} className="px-4 py-4 border-l border-slate-200">
              <p className="text-sm font-semibold text-slate-800 truncate">{item.supplier.corporateName}</p>
              <p className="text-xs text-slate-500 font-mono mt-1">{item.supplier.cnpj}</p>
              {scoreWinner === index && <p className="text-[11px] font-semibold text-emerald-600 mt-2">Maior score de risco</p>}
            </div>
          ))}
        </div>

        <ComparisonRow label="Score de risco" values={scores} render={value => (
          <span className={`text-2xl font-black ${scoreStyle(value)}`}>{value}<span className="text-xs font-medium text-slate-400"> / 100</span></span>
        )} />
        <ComparisonRow label="Status" values={suppliers.map(item => item.supplier.status)} render={value => <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle(value)}`}>{value || 'Não informado'}</span>} />
        <ComparisonRow label="Tipo" values={suppliers.map(item => item.supplier.supplierType)} />
        <ComparisonRow label="Certificação ESG" values={evaluations.map(item => item.hasEsgCertification)} render={value => value ? <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle size={14} /> Sim</span> : <span className="inline-flex items-center gap-1 text-slate-500"><XCircle size={14} /> Não</span>} />
        <ComparisonRow label="Documentos fiscais" values={evaluations.map(item => item.hasIncompleteFiscalDocs)} render={value => value ? <span className="text-red-600 font-semibold">Pendentes</span> : <span className="text-emerald-600 font-semibold">Regulares</span>} />
        <ComparisonRow label="Processos judiciais/trabalhistas" values={evaluations.map(item => item.hasJudicialOrLaborProcess)} render={value => value ? <span className="text-red-600 font-semibold">Detectados</span> : <span className="text-emerald-600 font-semibold">Nenhum</span>} />
        <ComparisonRow label="Histórico interno positivo" values={evaluations.map(item => item.hasPositiveInternalHistory)} render={value => value ? <span className="text-emerald-600 font-semibold">Sim</span> : <span className="text-slate-500">Sem histórico</span>} />
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500"><BarChart2 size={14} /> A comparação usa os dados mais recentes disponíveis nos dossiês.</div>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-800">Comparar Fornecedores</h2>
      <p className="text-sm text-slate-500 mt-0.5">Análise lado a lado dos indicadores de compliance.</p>
    </div>
  );
}
