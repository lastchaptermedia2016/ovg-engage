import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './AppNew.tsx'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (import.meta.env.DEV) {
  // StrictMode only in local dev (catches bugs)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} else {
  // No StrictMode in production = no ghost/duplicates on Vercel
  root.render(<App />)
}