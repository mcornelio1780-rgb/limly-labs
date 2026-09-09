/**
 * LIMLY LABS — Receptor de postulaciones
 * =====================================
 * Guarda cada postulación como una fila en una Google Sheet
 * y sube el CV y el portafolio a una carpeta de Google Drive.
 *
 * INSTALACIÓN (10 minutos, gratis)
 * --------------------------------
 * 1. Crea una hoja nueva en https://sheets.new
 *    Nómbrala "Postulaciones Limly Labs 2026".
 *
 * 2. En esa hoja: Extensiones → Apps Script.
 *    Borra lo que haya y pega todo este archivo. Guarda (Ctrl+S).
 *
 * 3. Arriba, en el selector de función, elige "instalar" y pulsa Ejecutar.
 *    Google pedirá autorización: Revisar permisos → tu cuenta →
 *    "Configuración avanzada" → "Ir a (nombre del proyecto)" → Permitir.
 *    (La pantalla de "app no verificada" es normal: la app es tuya.)
 *
 *    Al terminar, en el panel de Ejecución verás los enlaces a la hoja
 *    y a la carpeta de Drive que se acaban de crear. Guárdalos.
 *
 * 4. Implementar → Nueva implementación → engranaje → "Aplicación web".
 *      Descripción:        v1
 *      Ejecutar como:      Yo
 *      Quién tiene acceso: Cualquier usuario     ← importante
 *    Implementar → copia la URL que termina en /exec
 *
 * 5. Pega esa URL en el navegador. Si responde
 *    {"ok":true,"servicio":"limly-labs-postulaciones",...} está listo.
 *
 * 6. Abre postular.html y pega la URL en la línea del CONFIG:
 *      var CONFIG = { endpoint: "AQUI_LA_URL", maxCvMB: 5, maxPfMB: 10 };
 *    Haz commit y push: Vercel redespliega solo.
 *
 * IMPORTANTE
 * ----------
 * Cada vez que cambies este código: Implementar → Administrar implementaciones
 * → editar (lápiz) → Versión: "Nueva versión" → Implementar.
 * Si creas una implementación nueva en vez de editar la existente, la URL
 * cambia y el formulario deja de enviar.
 */

/* ─── Configuración ───────────────────────────────────────────────────────
   Los IDs los rellena "instalar" automáticamente y quedan guardados en las
   propiedades del proyecto. Solo toca esto si quieres apuntar a una hoja o
   carpeta que ya existían: pega los IDs aquí y vuelve a ejecutar "instalar".
   El ID de una hoja está en su URL entre /d/ y /edit; el de una carpeta,
   en /folders/…                                                          */

var SHEET_ID   = "";              // vacío = usa la hoja a la que está unido el script
var FOLDER_ID  = "";              // vacío = "instalar" crea la carpeta en tu Drive
var NOTIFICAR_A = "";             // opcional: tu correo, para recibir un aviso por postulación

var NOMBRE_CARPETA = "Postulaciones Limly Labs 2026";

var HEADERS = [
  "Fecha", "Idioma", "Nombres", "Apellidos", "Correo", "Teléfono",
  "País", "Ciudad", "Universidad", "Carrera", "Ciclo", "Horas/semana",
  "Squad", "Perfiles", "Frente a cámara", "Enlace portafolio",
  "Motivación", "Cómo se enteró", "Consentimiento", "CV", "Portafolio"
];

/* ─── Punto de entrada del formulario ─────────────────────────────────── */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // Sin el lock, dos postulaciones simultáneas pueden pisarse la misma fila.
    lock.waitLock(30000);

    var d = JSON.parse(e.postData.contents);
    var sheet = hoja();
    prepararCabecera(sheet);

    var folder = carpeta();
    var base = limpiar((d.apellidos || "") + "-" + (d.nombres || "")) + "-" + Date.now();
    var cvUrl = guardarArchivo(folder, d.cv_base64, d.cv_tipo, base + "-CV-" + (d.cv_nombre || "cv.pdf"));
    var pfUrl = guardarArchivo(folder, d.portafolio_base64, d.portafolio_tipo, base + "-PORTAFOLIO-" + (d.portafolio_nombre || "portafolio"));

    sheet.appendRow([
      d.enviado_en ? new Date(d.enviado_en) : new Date(),
      d.idioma || "", d.nombres || "", d.apellidos || "", d.email || "",
      d.telefono || "", d.pais || "", d.ciudad || "", d.universidad || "",
      d.carrera || "", d.ciclo || "", d.horas || "", d.squad || "",
      d.perfiles || "", d.camara || "", d.enlace || "", d.motivacion || "",
      d.fuente || "", d.consent ? "sí" : "", cvUrl, pfUrl
    ]);

    avisar(d, sheet);
    return json({ ok: true });
  } catch (err) {
    // La fila no se guardó: dejamos rastro en el log de ejecuciones.
    console.error(err);
    return json({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Abrir la URL /exec en el navegador cae aquí: sirve para comprobar que vive.
 *
 * Con ?panel=TU_CLAVE devuelve además los enlaces a la hoja y a la carpeta.
 * Con ?panel=TU_CLAVE&datos=1 devuelve todas las filas: es lo que lee
 * /panel del sitio.
 *
 * La clave la imprime instalar(). Sin ella no se revela nada, porque esta URL
 * es pública —va dentro del HTML del formulario— y ahí dentro hay nombres,
 * correos, teléfonos y CVs de gente real.
 */
function doGet(e) {
  var estado = { ok: true, servicio: "limly-labs-postulaciones" };
  try {
    var sheet = hoja();
    estado.postulaciones = Math.max(0, sheet.getLastRow() - 1);

    var clave = PropertiesService.getScriptProperties().getProperty("CLAVE_PANEL");
    if (!clave || !e || !e.parameter || e.parameter.panel !== clave) return json(estado);

    estado.hoja = sheet.getParent().getUrl();
    estado.carpeta = carpeta().getUrl();

    if (e.parameter.datos) {
      estado.columnas = HEADERS;
      estado.filas = sheet.getLastRow() < 2 ? [] :
        sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getDisplayValues();
    }
  } catch (err) {
    estado.ok = false;
    estado.error = String(err);
  }
  return json(estado);
}

/* ─── Instalación ─────────────────────────────────────────────────────── */

/**
 * Ejecútala una vez desde el editor. Crea la carpeta de Drive, prepara la
 * cabecera de la hoja, guarda los IDs y autoriza los permisos.
 */
function instalar() {
  var props = PropertiesService.getScriptProperties();

  var sheet = hoja();
  prepararCabecera(sheet);
  props.setProperty("SHEET_ID", sheet.getParent().getId());

  var folder;
  if (FOLDER_ID) {
    folder = DriveApp.getFolderById(FOLDER_ID);
  } else if (props.getProperty("FOLDER_ID")) {
    folder = DriveApp.getFolderById(props.getProperty("FOLDER_ID"));
  } else {
    folder = DriveApp.createFolder(NOMBRE_CARPETA);
  }
  props.setProperty("FOLDER_ID", folder.getId());

  if (!props.getProperty("CLAVE_PANEL")) {
    props.setProperty("CLAVE_PANEL", Utilities.getUuid().replace(/-/g, "").slice(0, 16));
  }

  var resumen = enlaces() +
    "\nSiguiente paso: Implementar → Nueva implementación → Aplicación web\n" +
    "(Ejecutar como: Yo · Quién tiene acceso: Cualquier usuario)\n";
  console.log(resumen);
  return resumen;
}

/**
 * ¿Perdiste las direcciones? Ejecuta esta función desde el editor y las vuelve
 * a imprimir. No crea nada: solo lee lo que instalar() dejó guardado.
 */
function enlaces() {
  var props = PropertiesService.getScriptProperties();
  var sheet = hoja();
  var url = "";
  try { url = ScriptApp.getService().getUrl() || ""; } catch (err) { url = ""; }

  var resumen =
    "\n╭─ Limly Labs · postulaciones ─────────────────────────\n" +
    "│ Hoja:    " + sheet.getParent().getUrl() + "\n" +
    "│ Carpeta: " + carpeta().getUrl() + "\n" +
    "│ Filas:   " + Math.max(0, sheet.getLastRow() - 1) + "\n" +
    (url ? "│ Panel:   " + url + "?panel=" + props.getProperty("CLAVE_PANEL") + "\n" : "") +
    "╰─ Guarda la hoja y la carpeta: son tu panel de la convocatoria.\n";
  console.log(resumen);
  return resumen;
}

/** Escribe una fila de prueba de punta a punta, con un PDF diminuto de mentira. */
function probar() {
  var r = doPost({ postData: { contents: JSON.stringify({
    enviado_en: new Date().toISOString(),
    idioma: "es", nombres: "Prueba", apellidos: "De Sistema",
    email: "prueba@ejemplo.com", telefono: "+51 999999999",
    pais: "Perú", ciudad: "Lima", universidad: "UPC", carrera: "Comunicaciones",
    ciclo: "5", horas: "12-15", squad: "limly", perfiles: "limly:any",
    camara: "si", enlace: "https://ejemplo.com", motivacion: "Fila de prueba.",
    fuente: "linkedin", consent: "on",
    cv_nombre: "prueba.txt", cv_tipo: "text/plain",
    cv_base64: Utilities.base64Encode("archivo de prueba")
  })}});
  console.log(r.getContent());
}

/* ─── Auxiliares ──────────────────────────────────────────────────────── */

function hoja() {
  var id = SHEET_ID || PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  var ss = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error("No encuentro la hoja: pega su ID en SHEET_ID y ejecuta instalar().");
  return ss.getSheets()[0];
}

function carpeta() {
  var id = FOLDER_ID || PropertiesService.getScriptProperties().getProperty("FOLDER_ID");
  if (!id) throw new Error("No encuentro la carpeta de Drive: ejecuta instalar().");
  return DriveApp.getFolderById(id);
}

function prepararCabecera(sheet) {
  if (sheet.getLastRow() !== 0) return;
  sheet.appendRow(HEADERS);
  sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);
}

function guardarArchivo(folder, b64, tipo, nombre) {
  if (!b64) return "";
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), tipo || "application/octet-stream", limpiar(nombre));
  var file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (err) {
    // Algunas cuentas de Workspace prohíben compartir con "cualquiera con el
    // enlace". El archivo queda guardado igual; se abre desde tu propia cuenta.
    console.warn("No se pudo hacer público " + nombre + ": " + err);
  }
  return file.getUrl();
}

function avisar(d, sheet) {
  if (!NOTIFICAR_A) return;
  try {
    MailApp.sendEmail({
      to: NOTIFICAR_A,
      subject: "Nueva postulación · " + (d.nombres || "") + " " + (d.apellidos || ""),
      body: [
        (d.nombres || "") + " " + (d.apellidos || "") + " — " + (d.email || ""),
        (d.universidad || "") + " · " + (d.carrera || "") + " · ciclo " + (d.ciclo || ""),
        "Squad: " + (d.squad || "") + " · Perfiles: " + (d.perfiles || ""),
        "",
        sheet.getParent().getUrl()
      ].join("\n")
    });
  } catch (err) {
    // Un fallo del correo nunca debe tumbar la postulación, que ya está guardada.
    console.warn("No se pudo enviar el aviso: " + err);
  }
}

/** Quita de los nombres de archivo lo que Drive o el sistema no digieren bien. */
function limpiar(s) {
  return String(s || "").replace(/[\/\\:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 120);
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
