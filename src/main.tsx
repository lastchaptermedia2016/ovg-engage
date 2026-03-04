import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' // or './AppNew.tsx' if you still have that name
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)

if (import.meta.env.DEV) {
  // StrictMode only in development (prevents ghost duplicates in prod)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} else {
  // No StrictMode in production = no double render = no ghost chat
  root.render(<App />)
}