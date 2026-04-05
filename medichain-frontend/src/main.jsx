import "./index.css"
import "./i18n"
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import MediChainApp from './MediChain.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <MediChainApp />
    </BrowserRouter>
  </React.StrictMode>
)