import { useState } from "react";
import { ArrowUpRight, X } from "lucide-react";

const categories = ["Moda", "Belleza", "Cultura", "Living", "Sociedad", "Archivo"];
export default function ArticleCategoryDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (category: string) => void }) {
  const [category, setCategory] = useState("Moda");
  return <div className="article-category-backdrop" role="presentation"><section className="article-category-dialog" role="dialog" aria-modal="true" aria-labelledby="new-page-category-title"><button className="article-category-dialog__close" onClick={onClose} aria-label="Cerrar"><X size={18} /></button><p className="eyebrow">LIGHT / Nueva página</p><h2 id="new-page-category-title">¿En qué sección<br /><em>vivirá?</em></h2><p>Elige la categoría antes de abrir la vista previa editorial.</p><div className="article-category-options">{categories.map((item) => <button key={item} type="button" className={category === item ? "is-active" : ""} onClick={() => setCategory(item)}><span>{item}</span>{category === item && <ArrowUpRight size={16} />}</button>)}</div><button className="admin-primary" onClick={() => onCreate(category)}>Crear página en {category} <ArrowUpRight size={15} /></button></section></div>;
}
