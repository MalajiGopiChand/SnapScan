import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App'
import './index.css'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

if (!PUBLISHABLE_KEY) {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Missing Clerk Publishable Key</h1>
      <p>Please add <b>VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</b> to your <code>.env</code> file.</p>
    </div>
  )
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ClerkProvider>
    </React.StrictMode>,
  )
}
