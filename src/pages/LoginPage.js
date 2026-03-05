// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useAuth } from '../firebase/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name, role);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message.replace('Firebase: ', '').replace(/\(auth.*\)\.?/, ''));
    }
    setLoading(false);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-mark">
            <span>F</span>
          </div>
          <div className="logo-text">
            <span className="logo-title">ФИНКИ</span>
            <span className="logo-sub">Консултации</span>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setError(''); }}
          >Најава</button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setError(''); }}
          >Регистрација</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="error-banner">{error}</div>}

          {!isLogin && (
            <>
              <div className="form-group">
                <label>Целосно Ime</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Марко Марковски"
                  required
                />
              </div>
              <div className="form-group">
                <label>Улога</label>
                <div className="role-selector">
                  <button
                    type="button"
                    className={`role-btn ${role === 'student' ? 'active' : ''}`}
                    onClick={() => setRole('student')}
                  >
                    <span className="role-icon">👨‍🎓</span>
                    Студент
                  </button>
                  <button
                    type="button"
                    className={`role-btn ${role === 'professor' ? 'active' : ''}`}
                    onClick={() => setRole('professor')}
                  >
                    <span className="role-icon">👩‍🏫</span>
                    Професор
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label>Е-маил</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={role === 'professor' ? 'profesor@finki.ukim.mk' : 'student@students.finki.ukim.mk'}
              required
            />
          </div>

          <div className="form-group">
            <label>Лозинка</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <span className="spinner"></span>
            ) : isLogin ? 'Најави се' : 'Регистрирај се'}
          </button>
        </form>

        <p className="auth-footer">
          Факултет за информатички науки и компјутерско инженерство
        </p>
      </div>
    </div>
  );
}
