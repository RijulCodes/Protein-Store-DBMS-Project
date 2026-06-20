// src/pages/MacroAdvisorPage.js
import React, { useState } from 'react';
import API from '../api';

export default function MacroAdvisorPage() {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [goal, setGoal] = useState('muscle_gain');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { data } = await API.post('/ai/macros', {
        weight: parseFloat(weight),
        height: parseFloat(height),
        age: parseInt(age),
        goal
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-wrap">
      <div className="container" style={{ maxWidth: 800 }}>
        <div className="page-title">AI MACRO ADVISOR</div>
        <div className="page-subtitle">Calculate your fitness macros & get personalized supplement recommendations</div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="card" style={{ marginBottom: 32 }}>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Age (years) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 25"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  min="10"
                  max="100"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Goal *</label>
                <select value={goal} onChange={e => setGoal(e.target.value)}>
                  <option value="muscle_gain">💪 Muscle Gain (Bulking)</option>
                  <option value="fat_loss">🔥 Fat Loss (Cutting)</option>
                  <option value="maintenance">⚖️ Maintenance</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Weight (kg) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 70"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  min="30"
                  max="200"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Height (cm) *</label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 175"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  min="100"
                  max="250"
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading}>
              {loading ? 'Analyzing Profile & Formulating Targets...' : 'Calculate Macros & Recommendations'}
            </button>
          </form>
        </div>

        {loading && (
          <div className="loading-wrap" style={{ flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div className="spinner" />
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Connecting to Gemini AI Nutrition Coach...</p>
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Macro targets grid */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="stat-card" style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div className="stat-label" style={{ fontSize: 10 }}>Calories</div>
                <div className="stat-value" style={{ fontSize: 24 }}>{result.macros.calories} kcal</div>
              </div>
              <div className="stat-card" style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div className="stat-label" style={{ fontSize: 10 }}>Protein</div>
                <div className="stat-value" style={{ fontSize: 24, color: 'var(--accent2)' }}>{result.macros.protein}g</div>
              </div>
              <div className="stat-card" style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div className="stat-label" style={{ fontSize: 10 }}>Carbs</div>
                <div className="stat-value" style={{ fontSize: 24, color: '#00e676' }}>{result.macros.carbs}g</div>
              </div>
              <div className="stat-card" style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div className="stat-label" style={{ fontSize: 10 }}>Fats</div>
                <div className="stat-value" style={{ fontSize: 24, color: '#29b6f6' }}>{result.macros.fats}g</div>
              </div>
            </div>

            {/* AI Advisor Response */}
            <div className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
              <h3 className="section-title" style={{ fontSize: 22, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                🤖 NUTRITION COACH RECOMMENDATIONS
              </h3>
              <div
                style={{
                  lineHeight: '1.8',
                  fontSize: 14,
                  whiteSpace: 'pre-wrap',
                  color: '#e0e0e0',
                  fontFamily: 'var(--font-body)'
                }}
              >
                {result.advice}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
