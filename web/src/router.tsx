import { createBrowserRouter, Navigate } from 'react-router'
import { Layout } from '@/components/Layout'
import { RutaProtegida } from '@/components/RutaProtegida'
import { AccesoDenegado } from '@/paginas/AccesoDenegado'
import { EnConstruccion } from '@/paginas/EnConstruccion'
import { Login } from '@/paginas/Login'
import { NoEncontrada } from '@/paginas/NoEncontrada'
import { Panel } from '@/paginas/Panel'

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
              { path: '/rutas', element: <EnConstruccion titulo="Rutas" /> },
              { path: '/turnos', element: <EnConstruccion titulo="Turnos" /> },
              { path: '/supervision', element: <EnConstruccion titulo="Supervisión" /> },
              { path: '/planillas', element: <EnConstruccion titulo="Planillas" /> },
              {
                element: <RutaProtegida roles={['administrador']} />,
                children: [
                  { path: '/pagos', element: <EnConstruccion titulo="Pagos" /> },
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