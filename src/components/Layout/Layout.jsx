import './Layout.css'

export default function Layout({ children, sidebar }) {
  return (
    <div className="layout">
      {/* Background Image */}
      <div className="layout__background" />
      
      {/* Main Content */}
      <div className="layout__container">
        <main className="layout__main">
          {children}
        </main>
        
        {sidebar && (
          <aside className="layout__sidebar">
            {sidebar}
          </aside>
        )}
      </div>
    </div>
  )
}
