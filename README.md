# Limly Labs — Sitio web + Programa de Pasantías 2026

Sitio estático, sin dependencias ni build. Trilingüe (ES / EN / PT).

```
index.html      Sitio del holding: nosotros, portafolio, mapa, pasantías, beneficios
postular.html   Formulario de postulación con subida de CV y portafolio
favicon.png     Isotipo de la marca
vercel.json     Configuración de Vercel
backend/        Código para recibir las postulaciones (Google Apps Script)
```

---

## 1. Subir a GitHub

```bash
cd limly-labs-web
git init
git add .
git commit -m "Sitio Limly Labs + pasantías 2026"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/limly-labs-web.git
git push -u origin main
```

Si prefieres no usar la terminal: entra a github.com/new, crea el repositorio
`limly-labs-web` y arrastra los archivos con "uploading an existing file".

## 2. Publicar en Vercel

1. Entra a vercel.com y elige **Add New → Project**.
2. Importa el repositorio `limly-labs-web`.
3. Framework Preset: **Other**. Deja Build Command y Output Directory vacíos.
4. **Deploy**.

Queda en `limly-labs-web.vercel.app`. Para usar tu dominio: Project → Settings →
Domains → añade `limlylabs.com` y apunta el DNS a Vercel.

Con la configuración de `vercel.json` las URLs quedan limpias:
`limlylabs.com` y `limlylabs.com/postular`.

## 3. Conectar el formulario

Mientras no configures un endpoint, las postulaciones se guardan solo en el
navegador de quien postula. **Esto hay que hacerlo antes de publicar la
convocatoria.**

Sigue las instrucciones que están dentro de `backend/google-apps-script.gs`.
Al terminar tendrás una URL que termina en `/exec`. Pégala en `postular.html`,
en esta línea (cerca del inicio del bloque `<script>`):

```js
var CONFIG = { endpoint: "https://script.google.com/macros/s/.../exec", maxCvMB: 5, maxPfMB: 10 };
```

Haz commit y push: Vercel redespliega solo.

### Dónde ves los datos

- **Los datos:** en tu Google Sheet, una fila por postulante con todos los campos.
- **Los archivos:** en tu carpeta de Google Drive. En la hoja, las dos últimas
  columnas traen el enlace directo al CV y al portafolio de cada persona.

Guarda esos dos enlaces (hoja y carpeta): son tu panel de la convocatoria.

### Alternativa

Si prefieres n8n, Make o Zapier, crea un webhook y pega su URL en el mismo
campo `endpoint`. Recibe el mismo JSON: todos los campos en texto plano y los
archivos en `cv_base64` y `portafolio_base64`.

---

## Editar contenido

Todos los textos viven en el objeto `I18N` dentro de `index.html`, con las tres
versiones de idioma juntas. Los perfiles y el número de vacantes están en
`SQUADS`; los beneficios en `BENEFITS`; los 28 países del mapa en `COUNTRIES`.
Cambiar un dato ahí lo actualiza en el sitio y en el formulario a la vez.

## Pendientes

- Falta el cuarto programa del bloque "Seleccionados en 2026" (hoy hay tres).
- Confirmar la lista real de los 28 países con usuarios registrados.
- Reemplazar las URLs de Vercel de Praxon, Marqa, Portada y Tramo por sus
  dominios definitivos.
