import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import AppNew from './AppNew'
import './index.css'

// Temporary debug: log all clicks to identify intercepting elements
window.onclick = (e) => console.log('Document clicked at:', e.target);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <AppNew />
  </BrowserRouter>
)
