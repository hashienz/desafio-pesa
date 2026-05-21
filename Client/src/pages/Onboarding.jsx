import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Onboarding() {
  const [cnpj, setCnpj] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!cnpj) return;

    setLoading(true);
    setError(null);
    setProgress(10);

    // Simular progresso do Wizard do Windows
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(timer);
          return 90;
        }
        return prev + 15;
      });
    }, 200);

    const formData = new FormData();
    formData.append('cnpj', cnpj);
    if (file) {
      formData.append('document', file);
    }

    fetch('http://localhost:5115/api/supplier/evaluate', {
      method: 'POST',
      body: formData
    })
      .then(response => {
        clearInterval(timer);
        setProgress(100);
        if (!response.ok) throw new Error('Falha ao conectar com o servidor');
        return response.json();
      })
      .then(data => {
        setTimeout(() => {
          setLoading(false);
          // Transita para o Dossiê enviando os dados completos (incluindo IA e documento)
          navigate(`/dossier/${encodeURIComponent(data.supplier.cnpj)}`, { state: data });
        }, 500);
      })
      .catch(err => {
        clearInterval(timer);
        setError(err.message);
        setLoading(false);
      });
  };

  return (
    <div className="page-content">
      <fieldset className="desktop-fieldset">
        <legend>Busca e Onboarding</legend>
        <p style={{ fontSize: '12px', marginBottom: '15px' }}>
          Digite o CNPJ do fornecedor. Opcionalmente, faça o upload de certidões fiscais ou certificados ESG para que a IA avalie e calcule o score automaticamente.
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
          </div>

          {/* Windows Wizard-style Document Upload Zone */}
          <div className="wizard-upload-box" style={{
            marginTop: '15px',
            border: '1px double #808080',
            backgroundColor: '#f0f0f0',
            padding: '10px',
            boxShadow: 'inset 1px 1px 2px #fff, inset -1px -1px 2px #808080'
          }}>
            <div style={{
              backgroundColor: '#0a6991',
              color: 'white',
              fontSize: '11px',
              padding: '2px 5px',
              fontWeight: 'bold',
              marginBottom: '10px',
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span>💾 Assistente de Importação de Documentos de Compliance v1.0</span>
              <span>[Wizard]</span>
            </div>
            
            <div style={{
              backgroundColor: 'white',
              border: '1px solid #7f9db9',
              padding: '15px',
              textAlign: 'center',
              cursor: 'pointer',
              position: 'relative'
            }}>
              <input 
                type="file" 
                id="doc-upload" 
                onChange={handleFileChange}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
                accept=".pdf,.png,.jpg,.jpeg"
              />
              <span style={{ fontSize: '28px', display: 'block' }}>📁</span>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#333' }}>
                {file ? `Selecionado: ${file.name}` : "Clique ou arraste um PDF/Imagem aqui..."}
              </span>
              <span style={{ fontSize: '10px', display: 'block', color: '#666', marginTop: '5px' }}>
                (Ex: certidao_negativa.pdf, certificado_esg.pdf, processo_trabalhista.pdf)
              </span>
            </div>

            {file && (
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#0a6991', fontWeight: 'bold' }}>✓ Arquivo carregado no assistente</span>
                <button 
                  type="button" 
                  onClick={() => setFile(null)} 
                  style={{
                    fontSize: '10px',
                    padding: '2px 5px',
                    cursor: 'pointer',
                    background: '#f0f0f0',
                    border: '1px solid #808080',
                    boxShadow: '1px 1px 0 #fff'
                  }}
                >
                  Remover
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: '15px', textAlign: 'right' }}>
            <button type="submit" className="desktop-button" disabled={loading || !cnpj} style={{ padding: '5px 15px' }}>
              {loading ? 'Instalando & Processando...' : 'Avançar >'}
            </button>
          </div>
        </form>
      </fieldset>

      {loading && (
        <div className="desktop-alert info" style={{ marginTop: '15px' }}>
          <strong>[IA PESA] Status da Análise:</strong>
          <div style={{
            height: '15px',
            backgroundColor: '#e0e0e0',
            border: '1px solid #808080',
            marginTop: '5px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              backgroundColor: '#0a6991',
              width: `${progress}%`,
              transition: 'width 0.2s ease-in-out',
              backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,.15) 50%, rgba(255,255,255,.15) 75%, transparent 75%, transparent)',
              backgroundSize: '15px 15px'
            }}></div>
          </div>
          <span style={{ fontSize: '10px', marginTop: '5px', display: 'block' }}>
            Lendo conteúdo dos documentos anexados com OCR da IA, processando pontuação ESG, fiscais e cruzando dados de 14 bases públicas...
          </span>
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
