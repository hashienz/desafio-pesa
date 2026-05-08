import React, { useState } from 'react';

export default function Feedback() {
  const [cnpj, setCnpj] = useState('');
  const [scores, setScores] = useState({ deadline: 10, price: 10, quality: 10 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!cnpj) return;

    setLoading(true);
    setMessage(null);

    fetch(`http://localhost:5115/api/supplier/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cnpj, ...scores })
    })
      .then(res => {
        if (!res.ok) throw new Error('Erro ao enviar feedback. Verifique se o fornecedor existe.');
        return res.json();
      })
      .then(data => {
        setMessage({ type: 'info', text: 'Feedback registrado! Score Histórico atualizado.' });
        setLoading(false);
        setCnpj('');
      })
      .catch(err => {
        setMessage({ type: 'error', text: err.message });
        setLoading(false);
      });
  };

  return (
    <div className="page-content">
      <fieldset className="desktop-fieldset">
        <legend>Feedback Pós-Aquisição</legend>
        <p style={{ fontSize: '12px', marginBottom: '15px' }}>
          Avalie o serviço entregue pelo fornecedor. As notas (de 0 a 10) recalcularão o Score Histórico.
        </p>
        
        {message && (
          <div className={`desktop-alert ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="desktop-form">
          <div className="form-row" style={{ marginBottom: '10px' }}>
            <label htmlFor="cnpjFb" style={{ width: '80px' }}>CNPJ:</label>
            <input 
              type="text" 
              id="cnpjFb" 
              value={cnpj} 
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="CNPJ do Fornecedor"
              className="desktop-input"
              required
            />
          </div>

          <div className="form-row" style={{ marginBottom: '10px' }}>
            <label htmlFor="deadline" style={{ width: '80px' }}>Prazo:</label>
            <input 
              type="number" 
              id="deadline" 
              min="0" max="10" 
              value={scores.deadline} 
              onChange={(e) => setScores({...scores, deadline: parseInt(e.target.value)})}
              className="desktop-input"
              style={{ width: '60px' }}
            />
            <span style={{ fontSize: '11px', color: '#555' }}>/ 10</span>
          </div>

          <div className="form-row" style={{ marginBottom: '10px' }}>
            <label htmlFor="price" style={{ width: '80px' }}>Preço:</label>
            <input 
              type="number" 
              id="price" 
              min="0" max="10" 
              value={scores.price} 
              onChange={(e) => setScores({...scores, price: parseInt(e.target.value)})}
              className="desktop-input"
              style={{ width: '60px' }}
            />
            <span style={{ fontSize: '11px', color: '#555' }}>/ 10</span>
          </div>

          <div className="form-row" style={{ marginBottom: '15px' }}>
            <label htmlFor="quality" style={{ width: '80px' }}>Qualidade:</label>
            <input 
              type="number" 
              id="quality" 
              min="0" max="10" 
              value={scores.quality} 
              onChange={(e) => setScores({...scores, quality: parseInt(e.target.value)})}
              className="desktop-input"
              style={{ width: '60px' }}
            />
            <span style={{ fontSize: '11px', color: '#555' }}>/ 10</span>
          </div>

          <div className="form-row">
            <button type="submit" className="desktop-button" disabled={loading}>
              {loading ? 'Enviando...' : 'Registrar Avaliação'}
            </button>
          </div>
        </form>
      </fieldset>
    </div>
  );
}
