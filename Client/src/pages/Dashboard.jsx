import React, { useEffect, useState } from 'react';

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    homologados: 0,
    rejeitados: 0,
    aguardandoAuditoria: 0,
    altoRisco: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5115/api/supplier/metrics')
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-content">
      <fieldset className="desktop-fieldset">
        <legend>Painel de Controle Geral</legend>
        {loading ? (
          <p>Carregando métricas...</p>
        ) : (
          <div className="data-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', display: 'grid' }}>
            <div className="data-panel" style={{ textAlign: 'center', padding: '15px' }}>
              <h4>✔️ Homologados</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'green' }}>{metrics.homologados}</p>
            </div>
            <div className="data-panel" style={{ textAlign: 'center', padding: '15px' }}>
              <h4>❌ Rejeitados</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'red' }}>{metrics.rejeitados}</p>
            </div>
            <div className="data-panel" style={{ textAlign: 'center', padding: '15px' }}>
              <h4>⏳ Aguardando Auditoria</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'orange' }}>{metrics.aguardandoAuditoria}</p>
            </div>
            <div className="data-panel" style={{ textAlign: 'center', padding: '15px', backgroundColor: '#fff3f3' }}>
              <h4 style={{ color: 'darkred' }}>⚠️ Alertas de Alto Risco</h4>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'darkred' }}>{metrics.altoRisco}</p>
            </div>
          </div>
        )}
      </fieldset>
    </div>
  );
}
