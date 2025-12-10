import { useState, useEffect } from 'react'
import './LoginCard.css'

export default function LoginCard({
  stage = 'oneid',
  postbankId,
  password,
  error,
  isLoading,
  setPostbankId,
  setPassword,
  onBack,
  onSubmit
}) {
  const [greeting, setGreeting] = useState('Guten Tag')

  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      setGreeting('Guten Morgen')
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Guten Tag')
    } else {
      setGreeting('Guten Abend')
    }
  }, [])

  return (
    <div className="login-card">
      <form onSubmit={onSubmit} className="login-card__form">
        {/* Postbank Logo */}
        <div className="login-card__logo">
          <img src="/assets/images/pb-logo.svg" alt="Postbank" />
        </div>

        {/* Header Section */}
        <div className="login-card__header">
          {stage === 'password' && (
            <button 
              type="button" 
              className="login-card__back"
              onClick={onBack}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Zurück zum Login</span>
            </button>
          )}
          
          <h1 className="login-card__greeting">{greeting}</h1>
          
          <p className="login-card__instruction">
            Bitte geben Sie Ihre Zugangsdaten ein.
          </p>
        </div>

        {/* Form Fields */}
        <div className="login-card__fields">
          {stage === 'oneid' ? (
            <div className="login-card__field">
              <label htmlFor="postbankId" className="login-card__label">
                Postbank ID
              </label>
              <input
                type="text"
                id="postbankId"
                className="login-card__input"
                value={postbankId}
                onChange={(e) => setPostbankId(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
          ) : (
            <div className="login-card__field">
              <label htmlFor="password" className="login-card__label">
                Passwort
              </label>
              <input
                type="password"
                id="password"
                className="login-card__input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                autoFocus
              />
            </div>
          )}

          {/* Setup link */}
          <a href="#" className="login-card__setup-link">
            Jetzt Postbank ID einrichten
          </a>

          {/* Error Message */}
          {error && (
            <div className="login-card__error">
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer Section */}
        <div className="login-card__footer">
          <a href="#" className="login-card__forgot-link">
            Zugangsdaten vergessen?
          </a>
          
          <button 
            type="submit" 
            className="login-card__submit"
            disabled={isLoading}
          >
            {isLoading ? 'Laden...' : 'Weiter'}
          </button>
        </div>
      </form>
    </div>
  )
}
