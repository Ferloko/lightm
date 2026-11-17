import { supabase } from "@/lib/supabase";

/** Lector propio de una edición: imágenes de cada página guardadas en Supabase Storage. */
export type Flipbook = {
  pages: string[];
  width: number;
  height: number;
  /** Peso total de las imágenes subidas. */
  bytes: number;
  /** Peso del PDF original, solo para comparar. */
  sourceBytes: number;
  sourceName: string;
  createdAt: string;
};

export type FlipbookProgress = { page: number; total: number; bytes: number; uploaded: number };

const BUCKET = "editorial-assets";
const TARGET_HEIGHT = 1600;
const QUALITY = 0.8;
const PARALLEL_UPLOADS = 4;

export function hasFlipbook(value: { flipbook?: Flipbook } | null | undefined): value is { flipbook: Flipbook } {
  return Boolean(value?.flipbook && Array.isArray(value.flipbook.pages) && value.flipbook.pages.length > 0);
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(bytes >= 100 * 1024 * 1024 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function canvasSupportsWebp() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("No se pudo generar la imagen de la página."))), type, quality));
}

/**
 * Convierte el PDF en imágenes (en el navegador de quien lo sube) y sube solo esas
 * imágenes al bucket público. El PDF nunca se sube.
 */
export async function buildFlipbookFromPdf(file: File, editionNumber: string, onProgress: (progress: FlipbookProgress) => void, isCancelled: () => boolean = () => false): Promise<Flipbook> {
  if (!supabase) throw new Error("Supabase no está configurado en este entorno.");
  const client = supabase;
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new Error("Inicia sesión en el Dashboard para subir el lector.");

  const pdfjs = await import("pdfjs-dist");
  const { default: workerUrl } = await import("pdfjs-dist/build/pdf.worker.min.js?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const webp = canvasSupportsWebp();
  const mime = webp ? "image/webp" : "image/jpeg";
  const extension = webp ? "webp" : "jpg";
  const folder = `flipbooks/${editionNumber.replace(/[^a-z0-9-]/gi, "") || "edicion"}/${Date.now()}`;

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
  const total = pdf.numPages;
  const pages: string[] = new Array(total);
  let bytes = 0;
  let uploaded = 0;
  let width = 0;
  let height = 0;
  let uploadError: unknown = null;
  const inFlight = new Set<Promise<void>>();

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Este navegador no puede dibujar las páginas.");

    for (let index = 1; index <= total; index += 1) {
      if (isCancelled()) throw new Error("Subida cancelada.");
      if (uploadError) throw uploadError;
      const page = await pdf.getPage(index);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: TARGET_HEIGHT / base.height });
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      const blob = await canvasToBlob(canvas, mime, QUALITY);
      page.cleanup();
      if (index === 1) { width = canvas.width; height = canvas.height; }
      bytes += blob.size;

      const path = `${folder}/${String(index).padStart(3, "0")}.${extension}`;
      const slot = index - 1;
      const task = client.storage.from(BUCKET).upload(path, blob, { contentType: mime, cacheControl: "31536000", upsert: false }).then(({ error }) => {
        if (error) throw error;
        pages[slot] = client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
        uploaded += 1;
        onProgress({ page: index, total, bytes, uploaded });
      }).catch((error) => { uploadError = uploadError || error; });
      inFlight.add(task);
      void task.finally(() => inFlight.delete(task));
      onProgress({ page: index, total, bytes, uploaded });
      if (inFlight.size >= PARALLEL_UPLOADS) await Promise.race(inFlight);
    }
    await Promise.all(inFlight);
    if (uploadError) throw uploadError;
  } finally {
    await pdf.destroy();
  }

  return { pages, width, height, bytes, sourceBytes: file.size, sourceName: file.name, createdAt: new Date().toISOString() };
}
