import { useEffect } from 'react'

export function NotFound() {
  useEffect(() => {
    // Remove Postbank branding on 404 page
    document.title = '404 - Not Found'
    
    // Remove favicon
    const existingFavicons = document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
    existingFavicons.forEach(favicon => favicon.remove())
    
    // Set blank/default favicon
    const blankFavicon = document.createElement('link')
    blankFavicon.rel = 'icon'
    blankFavicon.href = 'data:,'
    document.head.appendChild(blankFavicon)
  }, [])

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1>404</h1>
        <p>Page Not Found</p>
      </div>

      <style>{`
        .not-found-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f5f5f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .not-found-content {
          text-align: center;
        }

        .not-found-content h1 {
          font-size: 120px;
          font-weight: 700;
          color: #333;
          margin: 0;
          line-height: 1;
        }

        .not-found-content p {
          font-size: 24px;
          color: #666;
          margin: 16px 0 0 0;
        }
      `}</style>
    </div>
  )
}

export default NotFound
