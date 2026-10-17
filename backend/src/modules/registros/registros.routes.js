import { Router } from 'express';
import { 
  obtenerRegistros, 
  crearRegistro, 
  marcarSalida, 
  asignarRuta 
} from './registros.controller.js';

const router = Router();

router.get('/', obtenerRegistros);
router.post('/', crearRegistro);
router.patch('/:id/salida', marcarSalida);
router.patch('/:id/ruta', asignarRuta);

export default router;