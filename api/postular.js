/**
 * Recibe una postulación y la guarda en Vercel Blob (almacén privado).
 *
 * El guardado en Blob es lo único que decide si la postulación se dio por
 * buena. Los espejos —Apps Script y el correo— son redes de seguridad: si
 * fallan se anotan en el log, pero la persona ya postuló y no se le dice que
 * hubo un error.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   BLOB_READ_WRITE_TOKEN   la inyecta Vercel al crear el store. Obligatoria.
 *   PANEL_PASSWORD          clave para leer el panel. Obligatoria.
 *   APPS_SCRIPT_URL         opcional: espeja cada postulación a tu Google Sheet.
 *   RESEND_API_KEY          opcional: avisa por correo de cada postulación.
 *   NOTIFY_EMAIL            opcional: a qué dirección avisar.
 *   EMAIL_FROM              opcional: remitente (por defecto onboarding@resend.dev).
 */

import { put } from '@vercel/blob';
import { json, cuerpoCrudo, nuevoId, MAX_BYTES } from './_comun.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'Usa POST.' });

  let datos;
  try {
    const crudo = await cuerpoCrudo(req);
    if (crudo.length > MAX_BYTES) return json(res, 413, { ok: false, error: 'Postulación demasiado grande.' });
    datos = JSON.parse(crudo.toString('utf8'));
  } catch {
    return json(res, 400, { ok: false, error: 'No pude leer la postulación.' });
  }

  if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
    return json(res, 400, { ok: false, error: 'Formato inesperado.' });
  }
  if (!datos.nombres && !datos.apellidos && !datos.email) {
    return json(res, 400, { ok: false, error: 'Faltan los datos básicos.' });
  }

  const id = nuevoId();
  const registro = {
    id,
    recibido_en: new Date().toISOString(),
    ...datos,
    /* Los archivos ya se subieron por /api/archivo: aquí solo viajan sus rutas. */
    cv: datos.cv || null,
    portafolio: datos.portafolio || null,
  };

  try {
    await put(`postulaciones/${id}.json`, JSON.stringify(registro, null, 2), {
      access: 'private',
      contentType: 'application/json; charset=utf-8',
    });
  } catch (err) {
    console.error('Blob falló, la postulación NO se guardó:', err);
    return json(res, 500, { ok: false, error: 'No se pudo guardar la postulación.' });
  }

  /* A partir de aquí la postulación ya está a salvo. Nada puede tumbarla. */
  await Promise.allSettled([espejarAAppsScript(registro), avisarPorCorreo(registro)]);

  return json(res, 200, { ok: true, id });
}

async function espejarAAppsScript(registro) {
  const url = process.env.APPS_SCRIPT_URL;
  if (!url) return;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(registro),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) console.warn('Apps Script respondió', r.status);
  } catch (err) {
    console.warn('No se pudo espejar a Apps Script:', err.message);
  }
}

async function avisarPorCorreo(registro) {
  const clave = process.env.RESEND_API_KEY;
  const para = process.env.NOTIFY_EMAIL;
  if (!clave || !para) return;

  const nombre = [registro.nombres, registro.apellidos].filter(Boolean).join(' ') || 'Sin nombre';
  const lineas = [
    `${nombre} — ${registro.email || 'sin correo'}`,
    `${registro.telefono || ''} · ${registro.ciudad || ''}, ${registro.pais || ''}`,
    `${registro.universidad || ''} · ${registro.carrera || ''} · ciclo ${registro.ciclo || ''}`,
    `Squad: ${registro.squad || ''} · Perfiles: ${registro.perfiles || ''}`,
    `Horas/semana: ${registro.horas || ''} · Frente a cámara: ${registro.camara || ''}`,
    '',
    'Motivación:',
    registro.motivacion || '(vacía)',
    '',
    'Panel: https://limly-labs.vercel.app/panel',
  ];

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${clave}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Limly Labs <onboarding@resend.dev>',
        to: [para],
        subject: `Nueva postulación · ${nombre}`,
        text: lineas.join('\n'),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) console.warn('Resend respondió', r.status, await r.text());
  } catch (err) {
    console.warn('No se pudo avisar por correo:', err.message);
  }
}
