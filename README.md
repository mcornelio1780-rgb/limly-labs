# Limly Labs — Sitio web + Programa de Pasantías 2026

Sitio estático, sin dependencias ni build. Trilingüe (ES / EN / PT).

```
index.html      Sitio del holding: nosotros, portafolio, mapa, pasantías, beneficios
postular.html   Formulario de postulación con subida de CV y portafolio
panel.html      Panel interno para leer las postulaciones (pide clave)
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

El receptor es un Google Apps Script: guarda cada postulación como una fila en
una Google Sheet y sube el CV y el portafolio a una carpeta de Drive. Es gratis
y no necesita servidor.

1. Crea una hoja nueva en <https://sheets.new> y nómbrala
   "Postulaciones Limly Labs 2026".
2. En esa hoja: **Extensiones → Apps Script**. Borra lo que haya y pega todo
   `backend/google-apps-script.gs`. Guarda.
3. En el selector de función elige **`instalar`** y pulsa **Ejecutar**. Autoriza
   los permisos (la pantalla de "app no verificada" es normal: la app es tuya —
   Configuración avanzada → Ir a… → Permitir). Al terminar, el panel de
   ejecución imprime los enlaces a tu hoja y a tu carpeta de Drive: **guárdalos,
   son tu panel de la convocatoria.**
4. **Implementar → Nueva implementación → Aplicación web**, con
   *Ejecutar como:* **Yo** y *Quién tiene acceso:* **Cualquier usuario**.
   Copia la URL que termina en `/exec`.
5. Pega esa URL en el navegador. Si responde
   `{"ok":true,"servicio":"limly-labs-postulaciones",...}`, está viva.
6. Abre `postular.html` y pega la URL en esta línea (cerca del inicio del bloque
   `<script>`):

   ```js
   var CONFIG = { endpoint: "https://script.google.com/macros/s/.../exec", maxCvMB: 5, maxPfMB: 10 };
   ```

7. Commit y push: Vercel redespliega solo. Envía una postulación de prueba
   desde el sitio y comprueba que aparece la fila.

Si cambias el código del script después, usa **Implementar → Administrar
implementaciones → editar (lápiz) → Versión: Nueva versión**. Si en cambio
creas una implementación *nueva*, la URL cambia y el formulario deja de enviar.

Opcional: pon tu correo en `NOTIFICAR_A` (dentro del `.gs`) para recibir un
aviso por cada postulación.

### Dónde ves los datos

No hay panel propio: **el panel es tu Google Sheet.**

- **Los datos:** una fila por postulante con todos los campos, en la hoja que
  creaste en el paso 1. Está en <https://sheets.google.com> con el nombre
  "Postulaciones Limly Labs 2026".
- **Los archivos:** en tu carpeta de Drive, <https://drive.google.com>, carpeta
  "Postulaciones Limly Labs 2026". En la hoja, las dos últimas columnas traen
  el enlace directo al CV y al portafolio de cada persona.

¿Perdiste las direcciones exactas? En el editor de Apps Script elige la función
**`enlaces`** y pulsa Ejecutar: las vuelve a imprimir en el panel de ejecución,
junto con la clave del panel y el número de postulaciones recibidas.

### El panel del sitio

<https://limly-labs.vercel.app/panel> lee las postulaciones en vivo y las
muestra en una lista buscable, con descarga a CSV y enlace al CV de cada
persona. Pide la clave que imprime `enlaces`; la clave queda guardada en tu
navegador, no en el sitio.

La página es pública pero **sin la clave no muestra nada, y el sitio de Vercel
nunca llega a ver los datos**: es HTML estático, la petición sale del navegador
directa a Google Apps Script. Los datos siguen viviendo solo en tu Google Sheet.
No pongas la clave en el sitio ni la compartas fuera del equipo: detrás hay
nombres, correos, teléfonos y CVs de gente real.

### Si algo falla

- **El formulario muestra error al enviar** → casi siempre la implementación
  quedó como "Solo yo". Cámbiala a *Cualquier usuario* y vuelve a implementar.
- **No aparece la fila** → en el editor de Apps Script, panel **Ejecuciones**:
  ahí sale el error exacto de cada intento.
- **Los enlaces de CV no abren para tu equipo** → tu cuenta de Workspace
  prohíbe compartir con "cualquiera con el enlace". Los archivos están
  guardados igual; compártelos desde la carpeta.

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
