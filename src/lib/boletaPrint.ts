/**
 * Genera el HTML de una boleta/factura para impresión (estilo comprobante electrónico Perú).
 */

export interface VentaParaBoleta {
  id: number;
  tipoDocumento: string | null;
  numeroDocumento: string | null;
  fecha: string;
  clienteNombre: string;
  usuarioNombre: string;
  sectorNombre: string | null;
  metodoPagoNombre: string | null;
  total: number;
  moneda: string;
  items: { productoNombre: string; cantidad: number; precioUnitario: number; subtotal: number }[];
}

const ESC = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function formatNum(n: number): string {
  return n.toFixed(2);
}

function letras0a99(n: number): string {
  const unidades = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const especiales = ["DIEZ", "ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECISEIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE"];
  const decenas = ["", "", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  if (n < 10) return unidades[n];
  if (n < 20) return especiales[n - 10];
  return decenas[Math.floor(n / 10)] + (n % 10 ? " Y " + unidades[n % 10] : "");
}

function numeroALetra(valor: number): string {
  const enteros = Math.floor(valor);
  const centavos = Math.round((valor - enteros) * 100);
  const frac = `${String(centavos).padStart(2, "0")}/100`;
  if (enteros === 0 && centavos === 0) return "CERO Y 00/100";
  if (enteros === 0) return `CERO Y ${frac}`;
  const centenas = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
  let parteEntera: string;
  if (enteros === 100) parteEntera = "CIEN";
  else if (enteros < 100) parteEntera = letras0a99(enteros);
  else if (enteros < 1000) {
    const c = Math.floor(enteros / 100);
    const rest = enteros % 100;
    parteEntera = (c === 1 && rest === 0 ? "CIEN" : centenas[c] + (rest > 0 ? " " + letras0a99(rest) : ""));
  } else {
    parteEntera = `${enteros}`;
  }
  return `${parteEntera} Y ${frac}`;
}

const SIMBOLO: Record<string, string> = { PEN: "S/", USD: "$" };
const MONEDA_NOMBRE: Record<string, string> = { PEN: "SOLES", USD: "DÓLARES" };

export function getBoletaHtml(venta: VentaParaBoleta, config?: { nombreEmpresa?: string; ruc?: string; direccion?: string }): string {
  const nombreEmpresa = config?.nombreEmpresa ?? "ANTECSIS";
  const ruc = config?.ruc ?? "";
  const direccion = config?.direccion ?? "";
  const tipoDoc = venta.tipoDocumento === "FACTURA" ? "FACTURA ELECTRÓNICA" : "BOLETA DE VENTA ELECTRÓNICA";
  const simbolo = SIMBOLO[venta.moneda] ?? "S/";
  const monedaNombre = MONEDA_NOMBRE[venta.moneda] ?? "SOLES";
  const fecha = venta.fecha ? new Date(venta.fecha) : new Date();
  const fechaStr = fecha.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const horaStr = fecha.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const opGravadas = venta.total / 1.18;
  const igv = venta.total - opGravadas;

  const itemsRows = venta.items
    .map(
      (i) =>
        `<tr>
          <td style="padding:4px 6px;border-bottom:1px solid #eee;">${ESC(i.productoNombre)}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right;">${i.cantidad}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right;">${simbolo} ${formatNum(i.precioUnitario)}</td>
          <td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right;">${simbolo} 0.00</td>
          <td style="padding:4px 6px;border-bottom:1px solid #eee;text-align:right;">${simbolo} ${formatNum(i.subtotal)}</td>
        </tr>`
    )
    .join("");

  const totalLetra = numeroALetra(venta.total);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${ESC(tipoDoc)} ${ESC(venta.numeroDocumento ?? "")}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 12px; line-height: 1.35; color: #000; max-width: 320px; margin: 0 auto; padding: 12px; }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .small { font-size: 10px; }
    table { width: 100%; border-collapse: collapse; }
    .totales { margin-top: 8px; border-top: 1px dashed #000; padding-top: 6px; }
    .leyenda { margin-top: 12px; font-size: 9px; color: #444; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="center bold" style="font-size:14px; margin-bottom:4px;">${ESC(nombreEmpresa)}</div>
  ${ruc ? `<div class="center small">RUC ${ESC(ruc)}</div>` : ""}
  ${direccion ? `<div class="center small" style="margin-bottom:6px;">${ESC(direccion)}</div>` : ""}
  <div class="center bold" style="margin:8px 0; text-decoration:underline;">${ESC(tipoDoc)}</div>
  <div class="center bold" style="font-size:16px; margin-bottom:8px;">${ESC(venta.numeroDocumento ?? "")}</div>
  <table class="small">
    <tr><td>Fecha:</td><td>${ESC(fechaStr)}</td></tr>
    <tr><td>Hora:</td><td>${ESC(horaStr)}</td></tr>
    <tr><td>Cajero/a:</td><td>${ESC(venta.usuarioNombre)}</td></tr>
    <tr><td>Cliente:</td><td>${ESC(venta.clienteNombre)}</td></tr>
    ${venta.sectorNombre ? `<tr><td>Sede:</td><td>${ESC(venta.sectorNombre)}</td></tr>` : ""}
  </table>
  <table style="margin-top:10px; font-size:11px;">
    <thead>
      <tr style="border-bottom:1px solid #000;">
        <th style="text-align:left; padding:4px 6px;">DESCRIPCIÓN</th>
        <th style="text-align:right; padding:4px 6px;">CANT.</th>
        <th style="text-align:right; padding:4px 6px;">P.UNIT.</th>
        <th style="text-align:right; padding:4px 6px;">DSCTO</th>
        <th style="text-align:right; padding:4px 6px;">TOTAL</th>
      </tr>
    </thead>
    <tbody>${itemsRows}</tbody>
  </table>
  <div class="totales">
    <table class="small">
      <tr><td>OP GRAVADAS</td><td style="text-align:right;">${simbolo} ${formatNum(opGravadas)}</td></tr>
      <tr><td>IGV (18%)</td><td style="text-align:right;">${simbolo} ${formatNum(igv)}</td></tr>
      <tr class="bold" style="font-size:13px;"><td>TOTAL A PAGAR</td><td style="text-align:right;">${simbolo} ${formatNum(venta.total)}</td></tr>
    </table>
  </div>
  <p class="small" style="margin-top:6px;">Son: ${ESC(totalLetra)} ${monedaNombre}</p>
  ${venta.metodoPagoNombre ? `<p class="small">PAGO: ${ESC(venta.metodoPagoNombre)} - ${simbolo} ${formatNum(venta.total)}</p>` : ""}
  <div class="center bold" style="margin-top:14px;">GRACIAS POR SU COMPRA</div>
  <div class="leyenda center">
    Esta es una representación impresa del comprobante electrónico.<br>
    ANTECSIS - Punto de Venta
  </div>
</body>
</html>`;
}
