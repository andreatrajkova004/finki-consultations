// src/components/Navbar.js
import React from 'react';
import { useAuth } from '../firebase/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <div className="brand-logo">F</div>
        <div className="brand-text">
          <span className="brand-title">ФИНКИ Консултации</span>
          <span className="brand-sub">Факултет за информатички науки</span>
        </div>
      </div>
      <div className="navbar-user">
        <div className="user-info">
          <div className="user-avatar">
            {userProfile?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="user-details">
            <span className="user-name">{userProfile?.name}</span>
            <span className={`user-role ${userProfile?.role}`}>
              {userProfile?.role === 'professor' ? '👩‍🏫 Професор' : '👨‍🎓 Студент'}
            </span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          Одјави се
        </button>
      </div>
    </nav>
  );
}
