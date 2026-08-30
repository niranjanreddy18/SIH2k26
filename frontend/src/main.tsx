import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { ToastProvider } from './context/ToastContext.tsx'
import { ConfirmProvider } from './context/ConfirmContext.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  </React.StrictMode>,
)

