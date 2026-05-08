import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';

export default function Dossier() {
  const { cnpj } = useParams();
  const location = useLocation();
  const [result, setResult] = useState(location.state || null);
  const [loading, setLoading] = useState(!result && !!cnpj);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Se não veio do Onboarding (acesso direto via URL), busca na API
    if (!result && cnpj) {
      setLoading(true);
      fetch(`http://localhost:5115/api/supplier/${encodeURIComponent(cnpj)}`)
        .then(res => {
          if (!res.ok) throw new Error('Fornecedor não encontrado.');
          return res.json();
        })
        .then(data => {
          setResult(data);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [cnpj, result]);

  if (!cnpj && !result) {
    return (
      <div className="page-content" style={{ padding: '15px' }}>
        <div className="desktop-alert info">
          ℹ️ Nenhum fornecedor selecionado. Por favor, utilize a aba "Busca / Onboarding" para consultar um CNPJ.
        </div>
      </div>
    );
  }

  if (loading) return <p style={{ padding: '15px' }}>Carregando dossiê...</p>;
  if (error) return <div className="desktop-alert error" style={{ margin: '15px' }}>{error}</div>;
  if (!result) return null;

  return (
    <div className="page-content" style={{ paddingBottom: '20px' }}>
      <fieldset className="desktop-fieldset result-fieldset">
        <legend>Dossiê do Fornecedor & Score Engine</legend>
        
        {result.message && (
          <div className="desktop-alert info" style={{ marginBottom: '10px' }}>
            ℹ️ {result.message}
          </div>
        )}

        {result.aiSummary && (
          <div className="desktop-alert" style={{ marginBottom: '15px', backgroundColor: '#e8f4f8', border: '1px solid #99cce0' }}>
            <strong>🤖 Relatório da IA PESA:</strong><br/>
            {result.aiSummary}
          </div>
        )}

        <div className="data-grid">
          <div className="data-panel">
            <h4>📝 Dados Cadastrais</h4>
            <table className="desktop-table">
              <tbody>
                <tr>
                  <td className="lbl">CNPJ:</td>
                  <td>{result.supplier.cnpj}</td>
                </tr>
                <tr>
                  <td className="lbl">Razão Social:</td>
                  <td>{result.supplier.corporateName}</td>
                </tr>
                <tr>
                  <td className="lbl">Tipo:</td>
                  <td>{result.supplier.supplierType}</td>
                </tr>
                <tr>
                  <td className="lbl">Status Atual:</td>
                  <td>
                    <strong className={result.supplier.status === 'Homologado' || result.supplier.status === 'Homologado Automático' ? 'text-success' : 'text-warning'}>
                      {result.supplier.status}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="data-panel">
            <h4>📊 Detalhamento do Risco (Score Engine)</h4>
            <table className="desktop-table">
              <tbody>
                <tr>
                  <td className="lbl">Pontuação Final:</td>
                  <td><strong>{result.evaluation.totalScore} pts</strong></td>
                </tr>
                <tr>
                  <td className="lbl">Selo ESG (+15 pts se Sim):</td>
                  <td>{result.evaluation.hasEsgCertification ? 'Sim' : 'Não'}</td>
                </tr>
                <tr>
                  <td className="lbl">Docs Fiscais Incompletos (-20 pts):</td>
                  <td>{result.evaluation.hasIncompleteFiscalDocs ? 'Sim' : 'Não'}</td>
                </tr>
                <tr>
                  <td className="lbl">Processos Judiciais (-25 pts):</td>
                  <td>{result.evaluation.hasJudicialOrLaborProcess ? 'Sim' : 'Não'}</td>
                </tr>
                <tr>
                  <td className="lbl">Histórico Interno (+20 pts):</td>
                  <td>{result.evaluation.hasPositiveInternalHistory ? 'Positivo' : 'Sem Histórico'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
