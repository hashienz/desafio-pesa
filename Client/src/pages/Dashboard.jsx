import React, { useEffect, useState } from 'react';

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = () => {
    setLoading(true);
    fetch('http://localhost:5115/api/supplier/metrics')
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setMetrics({ dbOnline: false, erro: 'Não foi possível conectar ao servidor da API.' });
        setLoading(false);
      });
  };

  useEffect(() => { fetchMetrics(); }, []);

  const card = (icon, label, value, color, bg) => (
    <div className="data-panel" style={{ textAlign: 'center', padding: '15px', backgroundColor: bg || 'white' }}>
      <h4 style={{ color: color || '#333', marginBottom: '8px' }}>{icon} {label}</h4>
      <p style={{ fontSize: '28px', fontWeight: 'bold', color: color || '#333', margin: 0 }}>{value}</p>
    </div>
  );

  return (
    <div className="page-content">
      <fieldset className="desktop-fieldset">
        <legend>Painel de Controle Geral</legend>

        {loading ? (
          <p>Carregando métricas do banco de dados...</p>
        ) : !metrics?.dbOnline ? (
          <div>
            <div className="desktop-alert" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107', marginBottom: '10px' }}>
              ⚠️ <strong>Banco de dados offline ou inacessível.</strong> {metrics?.erro || 'Verifique se o XAMPP está rodando.'}
            </div>
            {card('⚠️', 'Dados indisponíveis', '--', 'gray', '#f8f8f8')}
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', color: '#666' }}>📊 Total de fornecedores cadastrados: <strong>{metrics.total ?? 0}</strong></span>
              <button className="desktop-button" onClick={fetchMetrics} style={{ fontSize: '11px', padding: '2px 8px' }}>🔄 Atualizar</button>
            </div>
            <div className="data-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', display: 'grid', gap: '10px' }}>
              {card('✔️', 'Homologados', metrics.homologados ?? 0, 'green')}
              {card('❌', 'Rejeitados', metrics.rejeitados ?? 0, 'red')}
              {card('⏳', 'Aguardando Auditoria', metrics.aguardandoAuditoria ?? 0, '#b07d00')}
              {card('🕐', 'Aguard. Aprovação', metrics.aguardandoAprovacao ?? 0, '#0a6991')}
              {card('⚠️', 'Alertas de Alto Risco', metrics.altoRisco ?? 0, 'darkred', '#fff3f3')}
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
}
