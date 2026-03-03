import React from 'react'
import ReactDOM from 'react-dom/client'

// Import your renamed component (adjust if the file name is different)
import AppNew from './AppNew.tsx'

import './index.css' // ← your global styles (Tailwind, etc.)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppNew />
  </React.StrictMode>
)