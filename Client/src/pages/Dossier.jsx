import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { FileText, BarChart2, User, AlertCircle, Cpu, CheckCircle, XCircle } from 'lucide-react';

/* ── helpers ── */
const statusBadge = (status) => {
  if (!status) return null;
  if (status.includes('Homolog'))   return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">{status}</span>;
  if (status.includes('Reprovado')) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">{status}</span>;
  if (status.includes('Aprovação')) return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{status}</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">{status}</span>;
};

const docBadge = (val) => {
  if (!val) return null;
  if (val === 'Válido')   return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700"><CheckCircle size={11}/>{val}</span>;
  if (val === 'Inválido') return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><XCircle size={11}/>{val}</span>;
  return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">{val}</span>;
};

const scoreGradient = (s) => {
  if (s >= 70) return { text: 'text-emerald-600', bar: 'bg-emerald-500', ring: 'ring-emerald-100' };
  if (s >= 40) return { text: 'text-amber-500',   bar: 'bg-amber-400',   ring: 'ring-amber-100'   };
  return         { text: 'text-red-500',   bar: 'bg-red-500',     ring: 'ring-red-100'     };
};

const Row = ({ label, children }) => (
  <div className="flex py-3 border-b border-slate-50 last:border-0">
    <dt className="w-40 text-xs font-medium text-slate-500 flex-shrink-0">{label}</dt>
    <dd className="text-sm text-slate-800">{children}</dd>
  </div>
);

export default function Dossier() {
  const { cnpj }   = useParams();
  const location   = useLocation();

  const [result, setResult] = useState(() => {
    if (location.state) return location.state;
    const activeCnpj = cnpj || localStorage.getItem('pesa_last_cnpj');
    if (activeCnpj) {
      try {
        const clean = activeCnpj.replace(/\D/g, '');
        const cached = localStorage.getItem(`pesa_dossier_${clean}`);
        return cached ? JSON.parse(cached) : null;
      } catch {}
    }
    return null;
  });

  const activeCnpj = cnpj || localStorage.getItem('pesa_last_cnpj');
  const cleanActiveCnpj = activeCnpj ? activeCnpj.replace(/\D/g, '') : '';
  const resultCnpj = result?.supplier?.cnpj ? result.supplier.cnpj.replace(/\D/g, '') : '';

  const [loading, setLoading] = useState(() => {
    if (!activeCnpj) return false;
    if (result && resultCnpj === cleanActiveCnpj) return false;
    return true;
  });

  const [error, setError] = useState(null);

  useEffect(() => {
    const currentCnpj = cnpj || localStorage.getItem('pesa_last_cnpj');
    if (!currentCnpj) {
      setLoading(false);
      return;
    }

    const cleanCnpj = currentCnpj.replace(/\D/g, '');
    const cachedData = localStorage.getItem(`pesa_dossier_${cleanCnpj}`);
    let cachedJson = null;
    try {
      cachedJson = cachedData ? JSON.parse(cachedData) : null;
    } catch {}

    const currentResultCnpj = result?.supplier?.cnpj ? result.supplier.cnpj.replace(/\D/g, '') : '';

    if (currentResultCnpj !== cleanCnpj || !result) {
      if (cachedJson) {
        setResult(cachedJson);
        setLoading(false);
      } else {
        setLoading(true);
      }
      setError(null);

      fetch(`http://localhost:5115/api/supplier/${cleanCnpj}`)
        .then(r => { if (!r.ok) throw new Error('Fornecedor não encontrado.'); return r.json(); })
        .then(d => {
          setResult(d);
          setLoading(false);
          try {
            localStorage.setItem(`pesa_dossier_${cleanCnpj}`, JSON.stringify(d));
            localStorage.setItem('pesa_last_cnpj', cleanCnpj);
          } catch {}
        })
        .catch(e => {
          if (!cachedJson) {
            setError(e.message);
          }
          setLoading(false);
        });
    } else {
      // Background silent update
      fetch(`http://localhost:5115/api/supplier/${cleanCnpj}`)
        .then(r => { if (r.ok) return r.json(); })
        .then(d => {
          if (d) {
             setResult(d);
             try {
               localStorage.setItem(`pesa_dossier_${cleanCnpj}`, JSON.stringify(d));
               localStorage.setItem('pesa_last_cnpj', cleanCnpj);
             } catch {}
          }
        })
        .catch(() => {});
    }
  }, [cnpj]);

  if (!cnpj && !result)
    return (
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700 max-w-xl">
        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
        <span>Nenhum fornecedor selecionado. Use <strong>Busca / Onboarding</strong> para consultar um CNPJ.</span>
      </div>
    );

  if (loading) return <div className="text-sm text-slate-400 animate-pulse">Carregando dossiê...</div>;
  if (error)   return <div className="flex items-center gap-2 text-sm text-red-600 p-4 bg-red-50 border border-red-100 rounded-xl"><AlertCircle size={15}/>{error}</div>;
  if (!result) return null;

  const score  = result.evaluation?.totalScore ?? 0;
  const styles = scoreGradient(score);
  const ev     = result.evaluation ?? {};
  const sup    = result.supplier   ?? {};
  const doc    = result.documentAnalysis;

  return (
    <div className="space-y-4">
      {/* AI Report */}
      {result.aiSummary && (
        <div className="flex items-start gap-3 p-4 bg-sky-50 border border-sky-200 rounded-xl">
          <Cpu size={15} className="text-sky-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-sky-700 mb-1">Relatório do Motor de Análise</p>
            <p className="text-xs text-slate-600 leading-relaxed">{result.aiSummary}</p>
          </div>
        </div>
      )}

      {/* Top row grid */}
      <div className="grid grid-cols-3 gap-4">

        {/* ── Card 1: Documento OCR (ocupa 2 colunas) ── */}
        <div className="col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-blue-600" />
              <span className="text-sm font-semibold text-slate-700">Documento Analisado por OCR</span>
            </div>
            {doc ? docBadge(doc.validacaoDocumento) : <span className="text-xs text-slate-400">Nenhum documento enviado</span>}
          </div>
          <div className="px-5 py-1">
            {doc ? (
              <dl>
                <Row label="Tipo Detectado"><span className="font-semibold">{doc.tipoDocumento}</span></Row>
                <Row label="Ajuste de Score">
                  <span className={`font-bold ${doc.impactoScore > 0 ? 'text-emerald-600' : doc.impactoScore < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                    {doc.impactoScore > 0 ? `+${doc.impactoScore}` : doc.impactoScore} pontos
                  </span>
                </Row>
                <Row label="Parecer Extraído">
                  <span className="text-slate-600 leading-relaxed">{doc.resumo}</span>
                </Row>
              </dl>
            ) : (
              <p className="text-sm text-slate-400 py-6 text-center">
                Nenhum documento foi enviado durante o onboarding. O score foi calculado apenas com base nos dados públicos do CNPJ.
              </p>
            )}
          </div>
        </div>

        {/* ── Card 3: Score de Risco ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
            <BarChart2 size={15} className="text-blue-600" />
            <span className="text-sm font-semibold text-slate-700">Score de Risco</span>
          </div>
          <div className="px-5 pt-4 pb-2 text-center">
            <div className={`inline-flex items-baseline gap-1 ring-4 ${styles.ring} rounded-2xl px-4 py-2 mb-3`}>
              <span className={`text-5xl font-black ${styles.text}`}>{score}</span>
              <span className="text-xl text-slate-400 font-medium">/ 100</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
              <div className={`h-full ${styles.bar} rounded-full transition-all duration-700`} style={{ width: `${score}%` }} />
            </div>
          </div>
          <div className="px-5 pb-4">
            <dl className="space-y-2">
              {[
                { label: 'Cert. ESG',     value: ev.hasEsgCertification       ? 'Sim (+15 pts)'     : 'Não',             ok: ev.hasEsgCertification       },
                { label: 'Docs Fiscais',  value: ev.hasIncompleteFiscalDocs   ? 'Pendentes (−20 pts)': 'Regulares',       ok: !ev.hasIncompleteFiscalDocs  },
                { label: 'Processos',     value: ev.hasJudicialOrLaborProcess ? 'Detectados (−25 pts)': 'Nenhum',         ok: !ev.hasJudicialOrLaborProcess },
                { label: 'Histórico',     value: ev.hasPositiveInternalHistory ? 'Positivo (+20 pts)' : 'Sem histórico',  ok: ev.hasPositiveInternalHistory },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <dt className="text-xs text-slate-500">{item.label}</dt>
                  <dd className={`text-xs font-semibold ${item.ok ? 'text-emerald-600' : 'text-slate-400'}`}>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* ── Card 2: Dados Cadastrais (linha separada, largura total) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100">
          <User size={15} className="text-blue-600" />
          <span className="text-sm font-semibold text-slate-700">Dados Cadastrais</span>
        </div>
        <div className="px-5 py-1">
          <dl className="grid grid-cols-2">
            <div className="border-r border-slate-50 pr-6">
              <Row label="CNPJ"><span className="font-mono text-xs">{sup.cnpj}</span></Row>
              <Row label="Razão Social"><span className="font-medium">{sup.corporateName}</span></Row>
            </div>
            <div className="pl-6">
              <Row label="Tipo de Fornecedor">{sup.supplierType}</Row>
              <Row label="Status Atual">{statusBadge(sup.status)}</Row>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
