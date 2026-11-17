import SiteMenuOverlay from "@/components/SiteMenuOverlay";
import { ArrowLeft, ArrowUpRight, Menu, Search, X } from "lucide-react";
import { ImageUrlFrame, InlineText } from "@/components/InlineEditing";
import { useCallback, useEffect, useState } from "react";
import { fetchRemoteRunwayBrands, getRunwayBrands, useRunwayCategories, type RunwayBrand, type RunwayCategory } from "@/lib/runway";
import { Link, useRoute } from "wouter";
import { RunwayFooter } from "./RunwayPage";
import EditorialAccessLink from "@/components/EditorialAccessLink";

/** El contenido de la hoja de una firma: lo usan la página pública y la vista previa del Dashboard. */
export function BrandView({ brand, category, edit }: { brand: RunwayBrand; category: RunwayCategory | null; edit?: (patch: Partial<RunwayBrand>) => void }) {
  /** En el editor del Dashboard cada texto se escribe encima. */
  const text = (key: "brand" | "deck" | "text" | "city" | "season", placeholder: string, multiline = false) => edit ? <InlineText multiline={multiline} value={brand[key]} onChange={(value) => edit({ [key]: value })} placeholder={placeholder} ariaLabel={placeholder} /> : brand[key];
  const [tag, setTag] = useState("");
  const addTag = () => { const next = tag.split(",").map((item) => item.trim()).filter((item) => item && !brand.tags.some((current) => current.toLowerCase() === item.toLowerCase())); if (next.length && edit) edit({ tags: [...brand.tags, ...next] }); setTag(""); };
  return <main><section className="brand-hero"><div className="brand-hero__copy"><Link className="brand-back" href="/runway"><ArrowLeft size={15} /> {edit ? text("season", "Temporada") : brand.season}</Link><p className="eyebrow">{[category?.label, brand.city, brand.brand].filter(Boolean).join(" / ")}</p><h1>{text("brand", "Nombre de la firma", true)}</h1><p className="brand-dek">{text("deck", "Una frase que resume la colección.", true)}</p><div className="brand-tags">{brand.tags.map((item) => <span key={item}>{item}{edit && <button type="button" className="brand-tags__remove" onClick={() => edit({ tags: brand.tags.filter((current) => current !== item) })} aria-label={`Quitar ${item}`}><X size={10} /></button>}</span>)}{edit && <input className="brand-tags__add" value={tag} onChange={(event) => setTag(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addTag(); } }} onBlur={addTag} placeholder="+ etiqueta" aria-label="Añadir etiqueta" />}</div></div><div className="brand-hero__image">{edit ? <ImageUrlFrame className="brand-edit-image" src={brand.image} onChange={(image) => edit({ image })} emptyLabel="Haz clic para añadir la foto de pasarela (vertical, 3:4)" /> : brand.image ? <img src={brand.image} alt={`Pasarela de ${brand.brand}`} /> : <span className="brand-hero__empty">Añade una imagen</span>}<span>RUNWAY / 06</span></div></section><section className="brand-editorial"><div className="brand-editorial__intro"><p className="eyebrow">La mirada LIGHT</p><p>{text("text", "Qué propone la colección, cómo se mueve, qué la hace distinta.", true)}</p></div><div className="brand-editorial__facts"><span>Marca</span><strong>{brand.brand}</strong><span>Ciudad</span><strong>{text("city", "Paris")}</strong><span>Temporada</span><strong>{text("season", "Spring 2027 Ready-to-Wear")}</strong>{category && <><span>Categoría</span><strong>{category.label}</strong></>}</div></section><section className="brand-next"><Link href="/runway"><span>Explorar todas las marcas</span><ArrowUpRight size={18} /></Link></section></main>;
}

export default function BrandPage() {
  const [, params] = useRoute("/runway/:brand");
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = useCallback(() => setMenuOpen(false), []);
  const [brands, setBrands] = useState<RunwayBrand[]>(getRunwayBrands());
  useEffect(() => { void fetchRemoteRunwayBrands().then(setBrands); }, []);
  const [categories] = useRunwayCategories();
  const brand = params?.brand ? brands.find((item) => item.slug === params.brand) : undefined;
  if (!brand) return <div className="site-shell brand-page"><main className="brand-missing"><p>Esta marca aún no está en el archivo.</p><Link href="/runway">Volver a Runway <ArrowUpRight size={16} /></Link></main></div>;
  return <div className="site-shell brand-page"><header className="site-header"><div className="topline"><button className="header-action" type="button" onClick={() => setMenuOpen(true)}><Menu size={20} /><span>Menú</span></button><p>Antes de que esté de moda, está en LIGHT</p><span className="topline__actions"><EditorialAccessLink /><button className="header-action" type="button" onClick={() => window.dispatchEvent(new Event("light:open-search"))}><Search size={19} strokeWidth={1.4} /><span>Buscar</span></button></span></div><div className="brand-row"><Link href="/" className="wordmark">LIGHT</Link></div><nav className="main-nav"><Link href="/moda">Moda</Link><Link href="/belleza">Belleza</Link><Link href="/eventos">Eventos</Link><Link href="/living">Living</Link><Link className="nav-active" href="/runway">Runway</Link><Link href="/sobre-moda">La revista</Link></nav></header>{menuOpen && <SiteMenuOverlay onClose={closeMenu} />}<BrandView brand={brand} category={categories.find((item) => item.id === brand.categoryId) || null} /><RunwayFooter /></div>;
}
