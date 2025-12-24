import React from 'react'

/**
 * Reusable BestSign Panel Component
 * Used for 2FA/BestSign approval in login, transfers, and limit changes
 */
function BestSignPanel({ 
  code = 'XXXX',
  title = 'Mit BestSign freigeben',
  subtitle = 'Bitte prüfen Sie den Auftrag in Ihrer App. Nur wenn alle Angaben korrekt sind, geben Sie den Auftrag frei.',
  showBackButton = false,
  onBack = null,
  showActionBar = false,
  onPasswordLogin = null,
  compact = false,
  showSpinner = true
}) {
  return (
    <div className={`bestsign-panel ${compact ? 'bestsign-panel--compact' : ''}`}>
      {/* Back to Login Link - optional */}
      {showBackButton && onBack && (
        <div className="d-flex pt-3 pb-4">
          <button type="button" onClick={onBack} className="db-icon-action db-text db-text--mute py-0">
            <svg role="img" focusable="false" style={{height: '16px', width: '16px'}}>
              <use xlinkHref="#arrow2-left"></use>
            </svg>
            <span>Zurück zum Login</span>
          </button>
        </div>
      )}

      {/* 2FA Panel with Illustration */}
      <div role="alert" aria-live="polite">
        {/* Phone Illustration */}
        <div className={`illustration-wrapper ${compact ? 'mt-3' : 'mt-5 mt-md-7'}`}>
          <div className="wrapper">
            <div className={`db-banking-2fa-illustration mx-auto db-banking-2fa-illustration--mobile ${compact ? 'db-banking-2fa-illustration--compact' : ''}`}>
              <div className="top-box mt-3 mx-auto"></div>
              <div className="d-flex justify-content-center mx-auto status-box status-box--mobile status-box--default">
                <div className="d-flex align-items-center logo"></div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content Panel */}
        <div className="db-banking-2fa-panel">
          <div className="db-banking-2fa-panel__content">
            {/* Title and Subtitle */}
            <div className="db-banking-2fa-panel__textbox d-flex flex-wrap margin-with-subline">
              <h2 className={`${compact ? 'db-heading-4' : 'db-heading-3'} align-self-center mx-auto my-0 color-text-primary text-center w-100`}>
                {title}
              </h2>
              <p className="d-block mt-3 db-text--mute color-text-primary mx-auto text-center w-100">
                {subtitle}
              </p>
            </div>
            
            {/* BestSign Code Pill */}
            <div>
              <div className="d-flex justify-content-center">
                <div className="db-banking-2fa-pill db-text--mute">
                  <span className="mx-5 mx-md-6">{code}</span>
                </div>
              </div>
            </div>
            
            {/* Loading Spinner */}
            {showSpinner && (
              <div className="d-flex justify-content-center mt-4">
                <div className="bestsign-spinner">
                  <svg viewBox="0 0 24 24" width="32" height="32">
                    <circle cx="12" cy="12" r="10" stroke="#e0e0e0" strokeWidth="3" fill="none"/>
                    <path d="M12 2A10 10 0 0 1 22 12" stroke="#0a3478" strokeWidth="3" fill="none" strokeLinecap="round">
                      <animateTransform
                        attributeName="transform"
                        type="rotate"
                        from="0 12 12"
                        to="360 12 12"
                        dur="1s"
                        repeatCount="indefinite"
                      />
                    </path>
                  </svg>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Bar - optional */}
      {showActionBar && (
        <>
          <div className="db-banking-2fa-action-bar db-text--mute d-flex flex-wrap justify-content-sm-center">
            <span className="db-banking-2fa-action-bar__title py-5 pb-sm-4">Klappt nicht?</span>
          </div>
          <div className="db-banking-2fa-action-bar__divider d-sm-none"></div>
          <div className="d-block d-sm-flex align-items-sm-center justify-content-sm-center">
            {onPasswordLogin && (
              <div className="db-banking-2fa-action-bar-item d-flex">
                <button type="button" onClick={onPasswordLogin} data-test="cancelAuthorization" className="db-banking-icon-action">
                  <svg role="img" focusable="false" style={{height: '24px', width: '24px'}}>
                    <use xlinkHref="#shield"></use>
                  </svg>
                  <span>Mit Passwort einloggen</span>
                </button>
              </div>
            )}
            <div className="d-sm-none db-banking-2fa-action-bar-item-divider"></div>
            <div className="db-banking-2fa-action-bar-item d-flex">
              <a data-test="contactLink" className="d-flex" href="tel:004922855005500">
                <button type="button" className="db-banking-icon-action">
                  <svg role="img" focusable="false" style={{height: '24px', width: '24px'}}>
                    <use xlinkHref="#phone"></use>
                  </svg>
                  <span>Kundenservice 0228 5500 5500</span>
                </button>
              </a>
            </div>
            <div className="d-sm-none db-banking-2fa-action-bar-item-divider"></div>
          </div>
        </>
      )}
    </div>
  )
}

export default BestSignPanel

