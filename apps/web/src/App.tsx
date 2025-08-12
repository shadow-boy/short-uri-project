import React, { useState } from 'react';
import { isLoggedIn } from './auth';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn());

  const handleLoginSuccess = () => {
    setAuthed(true);
  };

  const handleLogout = () => {
    setAuthed(false);
  };

  return (
    <>
      {!authed ? (
        <LoginPage onLoginSuccess={handleLoginSuccess} />
      ) : (
        <Dashboard onLogout={handleLogout} />
      )}
    </>
  );
}


