import type { AxiosResponse } from "axios";

const MIME_PDF = "application/pdf";
const MIME_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type OpenReportOptions = {
  /** Nombre sugerido al guardar el .xlsx (solo si tipo === "excel") */
  excelFileName?: string;
};

function openPdfPreview(res: AxiosResponse<Blob>): boolean {
  const raw = res.data;
  const headerType = String(res.headers["content-type"] ?? "")
    .split(";")[0]
    .trim();
  const mime =
    headerType && headerType !== "application/octet-stream"
      ? headerType
      : MIME_PDF;
  const blob =
    raw.type && raw.type !== "application/octet-stream"
      ? raw
      : new Blob([raw], { type: mime });

  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (w) {
    setTimeout(() => URL.revokeObjectURL(url), 180_000);
    return true;
  }
  URL.revokeObjectURL(url);
  return false;
}

function downloadExcelBlob(res: AxiosResponse<Blob>, fileName: string): void {
  const raw = res.data;
  const headerType = String(res.headers["content-type"] ?? "")
    .split(";")[0]
    .trim();
  const mime =
    headerType && headerType !== "application/octet-stream"
      ? headerType
      : MIME_XLSX;
  const blob =
    raw.type && raw.type !== "application/octet-stream"
      ? raw
      : new Blob([raw], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  window.URL.revokeObjectURL(url);
}

/**
 * PDF: nueva pestaña con visor. Excel: descarga con el nombre indicado.
 */
export function openReportBlobInNewTab(
  res: AxiosResponse<Blob>,
  tipo: "excel" | "pdf",
  options?: OpenReportOptions
): boolean {
  if (tipo === "excel") {
    const name = options?.excelFileName?.trim() || "ventas.xlsx";
    downloadExcelBlob(res, name);
    return true;
  }
  return openPdfPreview(res);
}
