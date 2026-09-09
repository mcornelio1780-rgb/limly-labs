/**
 * Los CV y portafolios, en el almacén privado de Blob.
 *
 * POST  /api/archivo?tipo=cv&nombre=hoja.pdf   sube un archivo (formulario público)
 *       El cuerpo son los bytes tal cual, sin base64: así cabe el doble en el
 *       límite de 4,5 MB por petición que impone Vercel.
 *
 * GET   /api/archivo?ruta=archivos/…           lo descarga (exige la clave del panel)
 *       Los blobs son privados: sin clave no hay forma de leerlos, ni siquiera
 *       teniendo la ruta.
 */

import { put, get } from '@vercel/blob';
import { json, cuerpoCrudo, exigeClave, nuevoId, limpiarNombre, MAX_BYTES } from './_comun.js';

const TIPOS = {
  cv: 'cv',
  portafolio: 'portafolio',
};

export default async function handler(req, res) {
  if (req.method === 'POST') return subir(req, res);
  if (req.method === 'GET') return descargar(req, res);
  return json(res, 405, { ok: false, error: 'Usa POST o GET.' });
}

async function subir(req, res) {
  const tipo = TIPOS[String(req.query.tipo || '')];
  if (!tipo) return json(res, 400, { ok: false, error: 'Tipo de archivo no reconocido.' });

  let bytes;
  try {
    bytes = await cuerpoCrudo(req);
  } catch {
    return json(res, 413, { ok: false, error: 'El archivo supera los 4 MB.' });
  }
  if (!bytes.length) return json(res, 400, { ok: false, error: 'Archivo vacío.' });
  if (bytes.length > MAX_BYTES) return json(res, 413, { ok: false, error: 'El archivo supera los 4 MB.' });

  const nombre = limpiarNombre(req.query.nombre);
  const ruta = `archivos/${nuevoId()}-${tipo}-${nombre}`;

  try {
    await put(ruta, bytes, {
      access: 'private',
      contentType: req.headers['content-type'] || 'application/octet-stream',
    });
  } catch (err) {
    console.error('No se pudo guardar el archivo:', err);
    return json(res, 500, { ok: false, error: 'No se pudo guardar el archivo.' });
  }

  return json(res, 200, { ok: true, ruta, nombre, bytes: bytes.length });
}

async function descargar(req, res) {
  if (exigeClave(req, res)) return;

  const ruta = String(req.query.ruta || '');
  /* Solo servimos lo que está bajo archivos/: que la clave no abra el store entero. */
  if (!ruta.startsWith('archivos/') || ruta.includes('..')) {
    return json(res, 400, { ok: false, error: 'Ruta no válida.' });
  }

  let r;
  try {
    r = await get(ruta, { access: 'private' });
  } catch (err) {
    console.error('No se pudo leer el archivo:', err);
    return json(res, 500, { ok: false, error: 'No se pudo leer el archivo.' });
  }
  if (!r || !r.stream) return json(res, 404, { ok: false, error: 'No existe.' });

  res.setHeader('content-type', r.blob?.contentType || 'application/octet-stream');
  res.setHeader('content-disposition',
    `inline; filename="${encodeURIComponent(ruta.split('/').pop())}"`);
  res.setHeader('cache-control', 'private, no-store');

  const buf = Buffer.from(await new Response(r.stream).arrayBuffer());
  res.status(200).send(buf);
}
