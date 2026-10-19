import { createBrowserRouter, Navigate } from 'react-router'
import { RutaProtegida } from '@/componentes/RutaProtegida'
import { AccesoDenegado } from '@/paginas/AccesoDenegado'
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
          { path: '/', element: <Navigate to="/panel" replace /> },
          { path: '/panel', element: <Panel /> },
        ],
      },
      { path: '*', element: <NoEncontrada /> },
    ],
  },
])
