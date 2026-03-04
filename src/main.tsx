import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' // or './AppNew.tsx' if you renamed it
import './index.css'

const rootElement = document.getElementById('root')!

if (import.meta.env.DEV) {
  // StrictMode ONLY in development (helps catch bugs locally)
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} else {
  // No StrictMode in production = no ghost/duplicates on Vercel
  ReactDOM.createRoot(rootElement).render(<App />)
}