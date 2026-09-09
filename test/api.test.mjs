/* Pruebas de la lógica que no toca Blob: autenticación, validación y utilidades.
   Es justo la parte donde un fallo se paga caro (o abre el panel a cualquiera). */
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

const BASE = new URL('../api/', import.meta.url).href;
const { claveValida, claveDe, cuerpoCrudo, limpiarNombre, nuevoId, enTandas } =
  await import(BASE + '_comun.js');

let fallos = 0;
async function t(nombre, fn) {
  try { await fn(); console.log('  ok  ' + nombre); }
  catch (e) { fallos++; console.error('  FALLO  ' + nombre + '\n        ' + e.message); }
}

function resFalso() {
  const r = { code: 0, cuerpo: '', cabeceras: {} };
  r.status = (c) => { r.code = c; return r; };
  r.setHeader = (k, v) => { r.cabeceras[k] = v; return r; };
  r.send = (b) => { r.cuerpo = b; return r; };
  return r;
}
const reqFalso = (o = {}) => ({ method: 'GET', headers: {}, query: {}, ...o });
const leer = (r) => JSON.parse(r.cuerpo);

console.log('\n_comun.js');

await t('claveValida rechaza si no hay PANEL_PASSWORD', () => {
  delete process.env.PANEL_PASSWORD;
  assert.equal(claveValida('loquesea'), false);
});

await t('claveValida acepta la correcta y rechaza el resto', () => {
  process.env.PANEL_PASSWORD = 'secreto-largo-123';
  assert.equal(claveValida('secreto-largo-123'), true);
  assert.equal(claveValida('secreto-largo-124'), false);
  assert.equal(claveValida('secreto'), false, 'un prefijo no debe pasar');
  assert.equal(claveValida(''), false);
  assert.equal(claveValida(undefined), false);
});

await t('claveDe lee Bearer, cabecera propia y query', () => {
  assert.equal(claveDe(reqFalso({ headers: { authorization: 'Bearer abc' } })), 'abc');
  assert.equal(claveDe(reqFalso({ headers: { 'x-panel-key': 'def' } })), 'def');
  assert.equal(claveDe(reqFalso({ query: { clave: 'ghi' } })), 'ghi');
  assert.equal(claveDe(reqFalso()), '');
});

await t('cuerpoCrudo lee del stream cuando Vercel no lo parseó', async () => {
  const req = Readable.from([Buffer.from('hola '), Buffer.from('mundo')]);
  req.headers = {};
  assert.equal((await cuerpoCrudo(req)).toString(), 'hola mundo');
});

await t('cuerpoCrudo respeta el body ya parseado por Vercel', async () => {
  assert.equal((await cuerpoCrudo({ body: Buffer.from('bytes') })).toString(), 'bytes');
  assert.equal((await cuerpoCrudo({ body: '{"a":1}' })).toString(), '{"a":1}');
  assert.equal((await cuerpoCrudo({ body: { a: 1 } })).toString(), '{"a":1}');
});

await t('cuerpoCrudo corta lo que pase de 4 MB', async () => {
  const req = Readable.from([Buffer.alloc(5 * 1024 * 1024)]);
  req.headers = {};
  await assert.rejects(() => cuerpoCrudo(req), /demasiado grande/);
});

await t('limpiarNombre neutraliza rutas y caracteres raros', () => {
  assert.equal(limpiarNombre('../../etc/passwd').includes('..'), false);
  assert.equal(limpiarNombre('informe..final.pdf').includes('..'), false);
  assert.equal(limpiarNombre('a/b/c.pdf').includes('/'), false);
  assert.equal(limpiarNombre('CV Ana Pérez.pdf'), 'CV Ana P-rez.pdf');
  assert.equal(limpiarNombre(''), 'archivo');
  assert.ok(limpiarNombre('x'.repeat(500)).length <= 100);
});

await t('nuevoId es único y ordenable', () => {
  const ids = Array.from({ length: 200 }, nuevoId);
  assert.equal(new Set(ids).size, 200, 'hubo colisión');
  assert.deepEqual([...ids].sort(), [...ids].sort());
});

await t('enTandas conserva el orden', async () => {
  const r = await enTandas([1, 2, 3, 4, 5, 6, 7], 3, async (n) => n * 2);
  assert.deepEqual(r, [2, 4, 6, 8, 10, 12, 14]);
});

console.log('\n/api/postulaciones');
const postulaciones = (await import(BASE + 'postulaciones.js')).default;

await t('rechaza métodos que no son GET', async () => {
  const res = resFalso();
  await postulaciones(reqFalso({ method: 'POST' }), res);
  assert.equal(res.code, 405);
});

await t('503 si falta configurar PANEL_PASSWORD', async () => {
  delete process.env.PANEL_PASSWORD;
  const res = resFalso();
  await postulaciones(reqFalso(), res);
  assert.equal(res.code, 503);
  assert.match(leer(res).error, /PANEL_PASSWORD/);
});

await t('401 sin clave y con clave equivocada', async () => {
  process.env.PANEL_PASSWORD = 'secreto-largo-123';
  for (const req of [reqFalso(), reqFalso({ headers: { authorization: 'Bearer nope' } })]) {
    const res = resFalso();
    await postulaciones(req, res);
    assert.equal(res.code, 401);
    assert.equal(leer(res).ok, false);
  }
});

console.log('\n/api/postular');
const postular = (await import(BASE + 'postular.js')).default;

await t('rechaza GET', async () => {
  const res = resFalso();
  await postular(reqFalso({ method: 'GET' }), res);
  assert.equal(res.code, 405);
});

await t('400 si el cuerpo no es JSON', async () => {
  const res = resFalso();
  await postular(reqFalso({ method: 'POST', body: 'esto no es json' }), res);
  assert.equal(res.code, 400);
});

await t('400 si no vienen los datos básicos', async () => {
  const res = resFalso();
  await postular(reqFalso({ method: 'POST', body: { ciudad: 'Lima' } }), res);
  assert.equal(res.code, 400);
  assert.match(leer(res).error, /datos básicos/);
});

await t('400 si mandan un array en vez de un objeto', async () => {
  const res = resFalso();
  await postular(reqFalso({ method: 'POST', body: [1, 2, 3] }), res);
  assert.equal(res.code, 400);
});

console.log('\n/api/archivo');
const archivo = (await import(BASE + 'archivo.js')).default;

await t('rechaza tipos de archivo desconocidos', async () => {
  const res = resFalso();
  await archivo(reqFalso({ method: 'POST', query: { tipo: 'malicioso' } }), res);
  assert.equal(res.code, 400);
});

await t('la descarga exige clave', async () => {
  process.env.PANEL_PASSWORD = 'secreto-largo-123';
  const res = resFalso();
  await archivo(reqFalso({ method: 'GET', query: { ruta: 'archivos/x' } }), res);
  assert.equal(res.code, 401);
});

await t('la descarga no sale de archivos/ ni acepta ..', async () => {
  process.env.PANEL_PASSWORD = 'secreto-largo-123';
  const auth = { authorization: 'Bearer secreto-largo-123' };
  for (const ruta of ['postulaciones/x.json', 'archivos/../postulaciones/x.json', '/etc/passwd']) {
    const res = resFalso();
    await archivo(reqFalso({ method: 'GET', headers: auth, query: { ruta } }), res);
    assert.equal(res.code, 400, 'dejó pasar ' + ruta);
  }
});

console.log(fallos ? `\n${fallos} FALLO(S)\n` : '\nTodo verde\n');
process.exit(fallos ? 1 : 0);
