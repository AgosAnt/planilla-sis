import { createBrowserRouter, Navigate } from 'react-router'
import { Layout } from './components/Layout'
import { RutaProtegida } from './components/RutaProtegida'
import { AccesoDenegado } from './paginas/AccesoDenegado'
import { EnConstruccion } from './paginas/EnConstruccion'
import { Login } from './paginas/Login'
import { NoEncontrada } from './paginas/NoEncontrada'
import { Panel } from './paginas/Panel'

import Rutas from './paginas/Rutas'
import Supervision from './paginas/Supervision'
import Planillas from './paginas/Planillas'
import Pagos from './paginas/Pagos'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    element: <RutaProtegida />,
    children: [
      { path: '/403', element: <AccesoDenegado /> },
      {
        element: <RutaProtegida roles={['administrador', 'supervisor']} />,
        children: [
          {
            element: <Layout />,
            children: [
              { path: '/', element: <Navigate to="/panel" replace /> },
              { path: '/panel', element: <Panel /> },
              { path: '/rutas', element: <Rutas /> },
              { path: '/turnos', element: <EnConstruccion titulo="Turnos" /> },
              { path: '/supervision', element: <Supervision /> },
              { path: '/planillas', element: <Planillas /> },
              {
                element: <RutaProtegida roles={['administrador']} />,
                children: [
                  { path: '/pagos', element: <Pagos /> },
                  { path: '/admin/usuarios', element: <EnConstruccion titulo="Usuarios" /> },
                  { path: '/admin/parametros', element: <EnConstruccion titulo="Parámetros" /> },
                  { path: '/auditoria', element: <EnConstruccion titulo="Auditoría" /> },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NoEncontrada /> },
    ],
  },
])