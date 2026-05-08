import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (!cnpj) return;

    setLoading(true);
    setError(null);

    fetch('http://localhost:5115/api/supplier/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj })
    })
      .then(response => {
        if (!response.ok) throw new Error('Falha ao conectar com o servidor');
        return response.json();
      })
      .then(data => {
        setLoading(false);
        // Transita para o Dossiê enviando os dados (ou poderia buscar lá, mas vamos passar via state)
        navigate(`/dossier/${encodeURIComponent(data.supplier.cnpj)}`, { state: data });
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  return (
    <div className="page-content">
      <fieldset className="desktop-fieldset">
        <legend>Busca e Onboarding</legend>
        <p style={{ fontSize: '12px', marginBottom: '15px' }}>
          Digite o CNPJ do fornecedor. O sistema fará o preenchimento automático consultando as bases públicas e executará a malha de risco inicial.
        </p>
        <form onSubmit={handleSearch} className="desktop-form">
          <div className="form-row">
            <label htmlFor="cnpj">CNPJ:</label>
            <input 
              type="text" 
              id="cnpj" 
              value={cnpj} 
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="Ex: 12.345.678/0001-90"
              className="desktop-input"
            />
            <button type="submit" className="desktop-button" disabled={loading || !cnpj}>
              {loading ? 'Processando IA...' : 'Consultar'}
            </button>
          </div>
        </form>
      </fieldset>

      {loading && (
        <div className="desktop-alert info" style={{ marginTop: '15px' }}>
          <strong>[IA PESA]</strong> Conectando a bases públicas, validando documentação fiscal, varrendo tribunais e calculando score ESG... Por favor, aguarde.
        </div>
      )}

      {error && (
        <div className="desktop-alert error" style={{ marginTop: '15px' }}>
          <strong>Erro:</strong> {error}
        </div>
      )}
    </div>
  );
}
