import React, { useEffect, useState } from 'react';

export default function ApprovalQueue() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [actionMsg, setActionMsg] = useState(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = () => {
    setLoading(true);
    setDbError(null);
    fetch('http://localhost:5115/api/supplier/pending-approvals')
      .then(res => {
        if (!res.ok) throw new Error(`Servidor retornou erro ${res.status}. Verifique se o banco de dados está rodando.`);
        return res.json();
      })
      .then(data => {
        setQueue(data);
        setLoading(false);
      })
      .catch(err => {
        setDbError(err.message);
        setLoading(false);
      });
  };

  const handleAction = (id, action) => {
    setActionMsg(null);
    fetch(`http://localhost:5115/api/supplier/${id}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    })
      .then(res => {
        if (!res.ok) throw new Error(`Erro ao processar: servidor retornou ${res.status}`);
        return res.json();
      })
      .then(data => {
        setActionMsg({ type: 'info', text: `✅ ${data.message} ${data.persistido ? '(Persistido no banco)' : ''}` });
        fetchQueue();
      })
      .catch(err => {
        setActionMsg({ type: 'error', text: `❌ ${err.message}` });
      });
  };

  return (
    <div className="page-content">
      <fieldset className="desktop-fieldset">
        <legend>Fila de Aprovação (Workflow RH/Jurídico)</legend>

        {actionMsg && (
          <div className="desktop-alert" style={{ marginBottom: '10px', backgroundColor: actionMsg.type === 'error' ? '#f8d7da' : '#d4edda', border: '1px solid', borderColor: actionMsg.type === 'error' ? '#f5c6cb' : '#c3e6cb', color: actionMsg.type === 'error' ? '#721c24' : '#155724' }}>
            {actionMsg.text}
          </div>
        )}

        {dbError && (
          <div className="desktop-alert" style={{ backgroundColor: '#fff3cd', border: '1px solid #ffc107', marginBottom: '10px' }}>
            ⚠️ <strong>Erro de conexão:</strong> {dbError}
          </div>
        )}
        
        {loading ? (
          <p>Carregando fila...</p>
        ) : queue.length === 0 && !dbError ? (
          <p style={{ fontStyle: 'italic', color: '#555' }}>Não há aprovações pendentes no momento.</p>
        ) : !dbError && (
          <table className="desktop-table" style={{ border: '1px solid #d9d9d9' }}>
            <thead>
              <tr style={{ background: '#f0f0f0', borderBottom: '1px solid #d9d9d9' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left' }}>CNPJ</th>
                <th style={{ padding: '6px 10px', textAlign: 'left' }}>Razão Social</th>
                <th style={{ padding: '6px 10px', textAlign: 'center' }}>Score</th>
                <th style={{ padding: '6px 10px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '6px 10px', textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {queue.map(item => (
                <tr key={item.id}>
                  <td style={{ padding: '5px 10px' }}>{item.cnpj}</td>
                  <td style={{ padding: '5px 10px' }}>{item.corporateName}</td>
                  <td style={{ padding: '5px 10px', textAlign: 'center', fontWeight: 'bold', color: item.score >= 60 ? 'green' : item.score >= 40 ? '#b07d00' : 'red' }}>
                    {item.score ?? '--'}
                  </td>
                  <td style={{ padding: '5px 10px' }}>{item.status}</td>
                  <td style={{ textAlign: 'center', padding: '5px 10px' }}>
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
