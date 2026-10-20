import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { aplicarTema, temaInicial } from "./lib/tema";
import { ProveedorSesion } from './sesion/ProveedorSesion'

aplicarTema(temaInicial())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProveedorSesion>
      <App />
    </ProveedorSesion>
  </StrictMode>,
)