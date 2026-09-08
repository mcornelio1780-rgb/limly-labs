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
 *    Copia su ID: está en la URL, entre /d/ y /edit
 *    https://docs.google.com/spreadsheets/d/ESTE_ES_EL_ID/edit
 *
 * 2. Crea una carpeta en Google Drive: "Postulaciones 2026".
 *    Copia su ID desde la URL:
 *    https://drive.google.com/drive/folders/ESTE_ES_EL_ID
 *
 * 3. En la hoja: Extensiones → Apps Script.
 *    Borra lo que haya y pega todo este archivo.
 *
 * 4. Reemplaza los dos valores de abajo por tus IDs.
 *
 * 5. Implementar → Nueva implementación → tipo "Aplicación web".
 *    Ejecutar como: Yo
 *    Quién tiene acceso: Cualquier usuario
 *    Implementar → autoriza → copia la URL que termina en /exec
 *
 * 6. Abre postular.html y pega esa URL en:
 *      var CONFIG = { endpoint: "AQUI_LA_URL", ... }
 *
 * Cada vez que cambies este código tienes que volver a
 * "Implementar → Administrar implementaciones → editar → Nueva versión".
 */

var SHEET_ID  = "PEGA_AQUI_EL_ID_DE_TU_HOJA";
var FOLDER_ID = "PEGA_AQUI_EL_ID_DE_TU_CARPETA";

var HEADERS = [
  "Fecha", "Idioma", "Nombres", "Apellidos", "Correo", "Teléfono",
  "País", "Ciudad", "Universidad", "Carrera", "Ciclo", "Horas/semana",
  "Squad", "Perfiles", "Frente a cámara", "Enlace portafolio",
  "Motivación", "Cómo se enteró", "CV", "Portafolio"
];

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    var folder = DriveApp.getFolderById(FOLDER_ID);
    var base = (d.apellidos || "") + "-" + (d.nombres || "") + "-" + Date.now();
    var cvUrl = guardarArchivo(folder, d.cv_base64, d.cv_tipo, base + "-CV-" + (d.cv_nombre || "cv.pdf"));
    var pfUrl = guardarArchivo(folder, d.portafolio_base64, d.portafolio_tipo, base + "-PORTAFOLIO-" + (d.portafolio_nombre || "portafolio"));

    sheet.appendRow([
      new Date(), d.idioma || "", d.nombres || "", d.apellidos || "", d.email || "",
      d.telefono || "", d.pais || "", d.ciudad || "", d.universidad || "",
      d.carrera || "", d.ciclo || "", d.horas || "", d.squad || "",
      d.perfiles || "", d.camara || "", d.enlace || "", d.motivacion || "",
      d.fuente || "", cvUrl, pfUrl
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function guardarArchivo(folder, b64, tipo, nombre) {
  if (!b64) return "";
  var blob = Utilities.newBlob(Utilities.base64Decode(b64), tipo || "application/octet-stream", nombre);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Prueba manual: ejecuta esta función una vez para autorizar los permisos. */
function probar() {
  doPost({ postData: { contents: JSON.stringify({
    idioma: "es", nombres: "Prueba", apellidos: "De Sistema",
    email: "prueba@ejemplo.com", telefono: "+51 999999999",
    pais: "Perú", ciudad: "Lima", universidad: "UPC", carrera: "Comunicaciones",
    ciclo: "5", horas: "12-15", squad: "limly", perfiles: "limly:any",
    camara: "si", enlace: "https://ejemplo.com", motivacion: "Fila de prueba.",
    fuente: "linkedin"
  })}});
}
