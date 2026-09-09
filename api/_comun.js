/**
 * Utilidades compartidas por las funciones de /api.
 *
 * Vercel ignora en el enrutado los archivos que empiezan por "_", así que este
 * no es una ruta: solo código que las demás importan.
 */

import crypto from 'node:crypto';

/** Vercel corta las peticiones a 4.5 MB. Nos quedamos por debajo con margen. */
export const MAX_BYTES = 4 * 1024 * 1024;

export function json(res, codigo, cuerpo) {
  res.status(codigo).setHeader('content-type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(cuerpo));
}

/**
 * Compara la clave recibida con PANEL_PASSWORD sin filtrar por tiempo cuántos
 * caracteres acertó quien lo intenta.
 */
export function claveValida(recibida) {
  const esperada = process.env.PANEL_PASSWORD || '';
  if (!esperada || !recibida) return false;
  const a = Buffer.from(String(recibida));
  const b = Buffer.from(esperada);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/** Devuelve la clave que trae la petición, por cabecera o por query. */
export function claveDe(req) {
  const cabecera = req.headers.authorization || '';
  if (cabecera.startsWith('Bearer ')) return cabecera.slice(7);
  return req.headers['x-panel-key'] || req.query?.clave || '';
}

/** 401 si la petición no trae la clave del panel. Devuelve true si cortó. */
export function exigeClave(req, res) {
  if (!process.env.PANEL_PASSWORD) {
    json(res, 503, { ok: false, error: 'Falta configurar PANEL_PASSWORD en Vercel.' });
    return true;
  }
  if (!claveValida(claveDe(req))) {
    json(res, 401, { ok: false, error: 'Clave incorrecta.' });
    return true;
  }
  return false;
}

/**
 * Lee el cuerpo crudo. Vercel a veces ya lo dejó en req.body y entonces el
 * stream viene vacío; por eso se mira primero.
 */
export async function cuerpoCrudo(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);
  if (req.body && typeof req.body === 'object') return Buffer.from(JSON.stringify(req.body));

  const trozos = [];
  let total = 0;
  for await (const trozo of req) {
    total += trozo.length;
    if (total > MAX_BYTES) throw new Error('demasiado grande');
    trozos.push(trozo);
  }
  return Buffer.concat(trozos);
}

/** Identificador ordenable por fecha y único: 2026-09-09T11-32-05-a1b2c3d4 */
export function nuevoId() {
  const t = new Date().toISOString().replace(/[:.]/g, '-').replace(/Z$/, '');
  return t + '-' + crypto.randomBytes(4).toString('hex');
}

/**
 * Quita de un nombre de archivo lo que no queremos en una ruta de Blob.
 * Los ".." se colapsan a un punto: si sobrevivieran, el guardia de descarga
 * rechazaría esa ruta y el archivo quedaría guardado pero irrecuperable.
 */
export function limpiarNombre(s) {
  return String(s || 'archivo')
    .replace(/[^\w.\- ]+/g, '-')
    .replace(/\.{2,}/g, '.')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'archivo';
}

/** Lee el contenido de un blob privado y lo devuelve como texto. */
export async function textoDeBlob(get, pathname) {
  const r = await get(pathname, { access: 'private' });
  if (!r || !r.stream) return null;
  return await new Response(r.stream).text();
}

/** Ejecuta las tareas en tandas, para no abrir cientos de conexiones a la vez. */
export async function enTandas(items, tam, fn) {
  const salida = [];
  for (let i = 0; i < items.length; i += tam) {
    salida.push(...await Promise.all(items.slice(i, i + tam).map(fn)));
  }
  return salida;
}
