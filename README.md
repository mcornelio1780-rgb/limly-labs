# Limly Labs — Sitio web + Programa de Pasantías 2026

Sitio estático trilingüe (ES / EN / PT) con un almacén propio de postulaciones
en Vercel Blob. Las páginas no necesitan build; solo las funciones de `api/`.

```
index.html      Sitio del holding: nosotros, portafolio, mapa, pasantías, beneficios
postular.html   Formulario de postulación con subida de CV y portafolio
panel.html      Panel interno para leer las postulaciones (pide clave)
api/            Funciones de Vercel: reciben, guardan y sirven las postulaciones
test/           Pruebas de la API (npm test)
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

## 3. Dónde se guardan las postulaciones

Hay **tres destinos**, por orden. Si uno cae, los otros siguen:

1. **Vercel Blob** — el almacén principal, tuyo, en tu propia cuenta. Es lo que
   decide si una postulación se dio por buena.
2. **Correo** — un aviso por cada postulación (opcional).
3. **Google Sheet** — espejo vía Apps Script (opcional). También es el plan B
   del formulario si la API no responde.

Además, el navegador de quien postula guarda una copia local de último recurso,
recuperable con `postular.html?admin=1` en ese mismo equipo.

### 3.1 Crear el almacén (obligatorio, 2 min)

1. Vercel → tu proyecto → pestaña **Storage** → **Create Database** → **Blob**.
2. Nómbralo `postulaciones`.
3. **Access: Private.** El código guarda con `access: 'private'`; con Public no cuadra.
4. **Custom Environment Variable Prefix: déjalo vacío.** Con un prefijo, las
   variables se llaman distinto y el código no las encuentra.
5. **Marca "Add a read-write token env var to this connection".** Viene
   desmarcada, y sin ella solo se crean `BLOB_STORE_ID` y
   `BLOB_WEBHOOK_PUBLIC_KEY`, que no sirven para escribir: cada postulación
   moriría con *"No blob credentials found"*.
6. Conéctalo al proyecto.

Con la casilla marcada, Vercel inyecta `BLOB_READ_WRITE_TOKEN` solo. No tienes
que copiar nada.

### 3.2 Poner la clave del panel (obligatorio)

Vercel → Settings → **Environment Variables** → añade:

| Variable | Valor |
|---|---|
| `PANEL_PASSWORD` | una contraseña larga que te inventes |

Es la que te pedirá <https://limly-labs.vercel.app/panel>. Sin ella el panel
devuelve 503 y no muestra nada.

### 3.3 Aviso por correo (opcional, recomendado)

1. Crea una cuenta en <https://resend.com> y genera una API key.
2. Añade en Vercel:

| Variable | Valor |
|---|---|
| `RESEND_API_KEY` | la key de Resend |
| `NOTIFY_EMAIL` | tu correo |
| `EMAIL_FROM` | opcional; por defecto `Limly Labs <onboarding@resend.dev>` |

Con el remitente por defecto, Resend **solo entrega a la dirección de tu propia
cuenta**. Para escribir a otras hay que verificar un dominio en Resend.

### 3.4 Espejo a Google Sheet (opcional)

| Variable | Valor |
|---|---|
| `APPS_SCRIPT_URL` | tu URL `/exec` del Apps Script |

Instalación del script: pega `backend/google-apps-script.gs` en la hoja
(Extensiones → Apps Script), ejecuta **`instalar`**, luego **`enlaces`**, y
publica con **Implementar → Aplicación web**, *Ejecutar como:* Yo,
*Quién tiene acceso:* **Cualquier usuario**.

Para que el panel pueda usarlo como plan B, pon la misma cadena en
`PANEL_PASSWORD` y en la propiedad `CLAVE_PANEL` del script (editor → engranaje
**Configuración del proyecto** → Propiedades de la secuencia de comandos).

> **Después de tocar cualquier variable, hay que redesplegar** para que las
> funciones la vean: Vercel → Deployments → ⋯ → Redeploy.

### 3.5 Comprobarlo

1. Postula de prueba en <https://limly-labs.vercel.app/postular>.
2. Ábrela en <https://limly-labs.vercel.app/panel>. Arriba dice de qué fuente
   está leyendo.
3. Descarga el CV desde la ficha y comprueba que se abre.

Si el formulario falla, ahora dice el motivo en pantalla en vez de darlo por
bueno.

## Privacidad de los datos

Los blobs se guardan con `access: 'private'`: no son accesibles por URL, ni
siquiera conociéndola. Solo se leen desde las funciones de `api/`, que usan el
token del almacén y exigen `PANEL_PASSWORD`.

Los archivos que suba el Apps Script a Drive, en cambio, quedan compartidos
"con cualquiera que tenga el enlace" — es la única forma en que Apps Script
puede enlazarlos desde la hoja. Si eso te preocupa, deja `APPS_SCRIPT_URL` sin
poner y usa solo el almacén de Vercel.

`PANEL_PASSWORD` abre todas las postulaciones: nombres, correos, teléfonos y
CVs de gente real. No la pongas en el sitio ni la compartas fuera del equipo.

## Límites

- **4 MB por archivo.** Es el techo de Vercel por petición (4,5 MB) con margen.
  Los portafolios grandes van por el campo de enlace.
- **2000 postulaciones** en el panel. Más allá habría que paginarlo.

## Desarrollo

```bash
npm install
npm test        # pruebas de la API: autenticación, validación y utilidades
```

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
