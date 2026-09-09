/**
 * GET /api/postulaciones — devuelve todas las postulaciones guardadas en Blob.
 * Exige la clave del panel. Es lo que lee /panel.
 */

import { list, get } from '@vercel/blob';
import { json, exigeClave, textoDeBlob, enTandas } from './_comun.js';

/* Tope de seguridad: si algún día hay más, hay que paginar el panel. */
const MAX_POSTULACIONES = 2000;

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { ok: false, error: 'Usa GET.' });
  if (exigeClave(req, res)) return;

  let rutas = [];
  try {
    let cursor;
    do {
      const pagina = await list({ prefix: 'postulaciones/', limit: 1000, cursor });
      rutas.push(...pagina.blobs.map((b) => b.pathname));
      cursor = pagina.hasMore ? pagina.cursor : undefined;
    } while (cursor && rutas.length < MAX_POSTULACIONES);
  } catch (err) {
    console.error('No se pudo listar el almacén:', err);
    return json(res, 500, { ok: false, error: 'No se pudo leer el almacén: ' + err.message });
  }

  const leidas = await enTandas(rutas.slice(0, MAX_POSTULACIONES), 25, async (ruta) => {
    try {
      const texto = await textoDeBlob(get, ruta);
      return texto ? JSON.parse(texto) : null;
    } catch (err) {
      /* Una postulación ilegible no puede tumbar el panel entero. */
      console.warn('No pude leer', ruta, err.message);
      return { id: ruta, _error: 'No se pudo leer este registro.' };
    }
  });

  const postulaciones = leidas
    .filter(Boolean)
    .sort((a, b) => String(b.recibido_en || '').localeCompare(String(a.recibido_en || '')));

  return json(res, 200, {
    ok: true,
    total: postulaciones.length,
    truncado: rutas.length > MAX_POSTULACIONES,
    postulaciones,
  });
}
