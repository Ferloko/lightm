import { ArrowUpRight, FileUp, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { buildFlipbookFromPdf, formatBytes, type Flipbook, type FlipbookProgress } from "@/lib/flipbook";
import { describeError } from "@/lib/supabase";

/** Dashboard → Ediciones: sube un PDF y lo convierte en el lector propio de la edición. */
export default function FlipbookUploader({ value, editionNumber, savedNumber, onChange, readOnly = false }: { value?: Flipbook; editionNumber: string; savedNumber: string | null; onChange: (next: Flipbook | undefined) => void; readOnly?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);
  const [progress, setProgress] = useState<FlipbookProgress | null>(null);
  const [message, setMessage] = useState("");
  const busy = progress !== null;

  const start = async (file: File | undefined) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) { setMessage("Elige un archivo PDF."); return; }
    cancelRef.current = false;
    setMessage("");
    setProgress({ page: 0, total: 0, bytes: 0, uploaded: 0 });
    try {
      const flipbook = await buildFlipbookFromPdf(file, editionNumber, setProgress, () => cancelRef.current);
      onChange(flipbook);
      setMessage(`Listo: ${flipbook.pages.length} páginas, ${formatBytes(flipbook.bytes)} (el PDF pesaba ${formatBytes(flipbook.sourceBytes)}). Pulsa «Guardar edición» para publicarlo.`);
    } catch (error) {
      setMessage(cancelRef.current ? "Subida cancelada." : `No se pudo crear el lector: ${describeError(error)}`);
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const percent = progress && progress.total ? Math.round((progress.uploaded / progress.total) * 100) : 0;

  return <fieldset className="edition-panel__group flipbook-uploader" disabled={readOnly}>
    <legend>Lector propio (prueba)</legend>
    <small>Sube el PDF de la edición. Tu navegador lo convierte en imágenes ligeras y solo se suben esas imágenes. Si hay lector propio, se usa en lugar de Heyzine.</small>
    {value && !busy && <div className="flipbook-uploader__summary">
      <img src={value.pages[0]} alt="" />
      <div>
        <strong>{value.pages.length} páginas · {formatBytes(value.bytes)}</strong>
        <span>{value.sourceName} · PDF de {formatBytes(value.sourceBytes)}</span>
        <span>{value.width}×{value.height} px por página</span>
      </div>
    </div>}
    {busy && <div className="flipbook-uploader__progress" role="status">
      <div className="flipbook-uploader__bar"><span style={{ width: `${percent}%` }} /></div>
      <span>{progress.total ? `Página ${progress.page} de ${progress.total} · subidas ${progress.uploaded} · ${formatBytes(progress.bytes)}` : "Abriendo el PDF…"}</span>
      <button type="button" className="admin-secondary" onClick={() => { cancelRef.current = true; }}><X size={13} /> Cancelar</button>
    </div>}
    {message && <p className="flipbook-uploader__message">{message}</p>}
    {!busy && <div className="edition-panel__row">
      <button type="button" className="admin-secondary" onClick={() => inputRef.current?.click()}><FileUp size={13} /> {value ? "Reemplazar PDF" : "Subir PDF"}</button>
      {value && <button type="button" className="admin-secondary" onClick={() => { onChange(undefined); setMessage("Lector propio quitado. Guarda la edición para volver a Heyzine."); }}><Trash2 size={13} /> Quitar</button>}
      {value && savedNumber && <a className="admin-secondary" href={`/revista/${savedNumber}#leer`} target="_blank" rel="noreferrer">Ver <ArrowUpRight size={13} /></a>}
    </div>}
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => void start(event.target.files?.[0])} />
    <small>Usa un ordenador: un PDF de imprenta puede tardar unos minutos. No cierres esta pestaña mientras se sube.</small>
  </fieldset>;
}
