import React, { useEffect, useState } from 'react';

export default function ApprovalQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = () => {
    setLoading(true);
    fetch('http://localhost:5115/api/supplier/pending-approvals')
      .then(res => res.json())
      .then(data => {
        setQueue(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  };

  const handleAction = (id, action) => {
    fetch(`http://localhost:5115/api/supplier/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }) // 'approve' or 'reject'
    })
      .then(() => {
        fetchQueue(); // Refresh queue
      })
      .catch(err => alert("Erro ao processar a ação: " + err.message));
  };

  return (
    <div className="page-content">
      <fieldset className="desktop-fieldset">
        <legend>Fila de Aprovação (Workflow RH/Jurídico)</legend>
        
        {loading ? (
          <p>Carregando fila...</p>
        ) : queue.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: '#555' }}>Não há aprovações pendentes no momento.</p>
        ) : (
          <table className="desktop-table" style={{ border: '1px solid #d9d9d9' }}>
            <thead>
              <tr style={{ background: '#f0f0f0', borderBottom: '1px solid #d9d9d9' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left' }}>CNPJ</th>
                <th style={{ padding: '6px 10px', textAlign: 'left' }}>Razão Social</th>
                <th style={{ padding: '6px 10px', textAlign: 'left' }}>Motivo do Bloqueio</th>
                <th style={{ padding: '6px 10px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(item => (
                <tr key={item.id}>
                  <td>{item.cnpj}</td>
                  <td>{item.corporateName}</td>
                  <td>{item.status}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="desktop-button" style={{ marginRight: '5px' }} onClick={() => handleAction(item.id, 'approve')}>✅ Aprovar</button>
                    <button className="desktop-button" onClick={() => handleAction(item.id, 'reject')}>❌ Rejeitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </fieldset>
    </div>
  );
}
