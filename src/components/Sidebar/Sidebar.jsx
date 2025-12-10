import './Sidebar.css'

// Warning icon
const WarningIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9V13M12 17H12.01M4.98207 19H19.0179C20.5615 19 21.5233 17.3256 20.7455 15.9923L13.7276 3.96153C12.9558 2.63852 11.0442 2.63852 10.2724 3.96153L3.25452 15.9923C2.47675 17.3256 3.43849 19 4.98207 19Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// Monitor/Computer icon
const MonitorIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 21H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 17V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

// Lock icon
const LockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M7 11V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export default function Sidebar() {
  return (
    <div className="sidebar">
      <div className="sidebar__content">
        {/* Wero Card */}
        <article className="sidebar-card sidebar-card--featured">
          <div className="sidebar-card__image">
            <img 
              src="/assets/images/wero-stage.jpg" 
              alt="Wero - Geld senden in Echtzeit" 
            />
          </div>
          <h3 className="sidebar-card__title">
            Wero – Geld senden und empfangen in Echtzeit
          </h3>
          <p className="sidebar-card__text">
            Wero ist die neue europäische Lösung für mobile Zahlungen in Echtzeit. 
            Senden und empfangen Sie Geld in Sekundenschnelle – ganz einfach über 
            die Handynummer oder E-Mail-Adresse.
          </p>
          <a href="#" className="sidebar-card__link">Jetzt informieren</a>
        </article>

        {/* Security Warnings Card */}
        <article className="sidebar-card">
          <div className="sidebar-card__header">
            <WarningIcon />
            <h3 className="sidebar-card__title">Sicherheitshinweise</h3>
          </div>
          <p className="sidebar-card__text">
            Aktuell wird ein erhöhtes Aufkommen von Anrufen falscher 
            Bankmitarbeiter festgestellt.
          </p>
          <div className="sidebar-card__links">
            <a href="#" className="sidebar-card__link">Link zu den aktuellen Sicherheitshinweisen</a>
            <a href="#" className="sidebar-card__link">Link zu Sicherheit im Überblick</a>
          </div>
        </article>

        {/* Help & Services Card */}
        <article className="sidebar-card">
          <div className="sidebar-card__header">
            <MonitorIcon />
            <h3 className="sidebar-card__title">Schnelle Hilfe und Services</h3>
          </div>
          <p className="sidebar-card__text">
            Hier finden Sie unsere Services und Hilfe zu Ihrem Online-Banking.
          </p>
          <a href="#" className="sidebar-card__link">Link zu Services und Hilfe</a>
        </article>

        {/* BestSign Card */}
        <article className="sidebar-card">
          <div className="sidebar-card__header">
            <LockIcon />
            <h3 className="sidebar-card__title">Unsere Sicherheitsverfahren</h3>
          </div>
          <p className="sidebar-card__text">
            Alles Wissenswerte rund um BestSign.
          </p>
          <a href="#" className="sidebar-card__link">Link zu den Sicherheitsverfahren</a>
        </article>
      </div>

      {/* Footer */}
      <footer className="sidebar__footer">
        <nav className="sidebar__nav">
          <a href="#">Erste Schritte</a>
          <a href="#">Terminvereinbarung</a>
          <a href="#">Demo-Konto</a>
          <a href="#">Kontakt</a>
          <a href="#">Impressum</a>
          <a href="#">Rechtshinweise</a>
          <a href="#">Datenschutz</a>
          <a href="#">Cookie-Einstellungen</a>
        </nav>
        <p className="sidebar__copyright">
          © 2025 Postbank – eine Niederlassung der Deutsche Bank AG
        </p>
      </footer>
    </div>
  )
}
