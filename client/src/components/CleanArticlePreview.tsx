import { ArrowUpRight, X } from "lucide-react";
import { useEffect } from "react";
import type { CSSProperties } from "react";
import type { EditorialArticle } from "@/lib/editorial";
import type { PageBlock } from "@/lib/pageBlocks";

function Block({ block, blocks }: { block: PageBlock; blocks: PageBlock[] }) {
  if (block.type === "divider") return <hr />;
  if (block.type === "image") return block.content || block.caption ? <figure className={`clean-preview-image clean-preview-image--${block.imageAlign || "full"}`}>{block.content && <img src={block.content} alt="" />}{block.caption && <figcaption>{block.caption}</figcaption>}</figure> : null;
  if (block.type === "grid") {
    const split = Math.min(78, Math.max(22, block.gridSplit || (block.gridLayout === "left" ? 58 : 42)));
    const column = (ids: string[] = []) => ids.map((id) => blocks.find((item) => item.id === id)).filter((item): item is PageBlock => Boolean(item)).map((item) => <Block block={item} blocks={blocks} key={item.id} />);
    return <div className="clean-preview-grid" style={{ "--grid-split": `${split}%` } as CSSProperties}><div>{column(block.gridColumns?.left)}</div><div>{column(block.gridColumns?.right)}</div></div>;
  }
  if (!block.content.trim()) return null;
  if (block.type === "heading") return <h2>{block.content}</h2>;
  if (block.type === "quote") return <blockquote>{block.content}</blockquote>;
  if (block.type === "button") return <p><span className="clean-preview-link">{block.content} <ArrowUpRight size={15} /></span></p>;
  return <p>{block.content}</p>;
}

export default function CleanArticlePreview({ article, onClose }: { article: EditorialArticle; onClose: () => void }) {
  useEffect(() => { const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.stopPropagation(); onClose(); } }; window.addEventListener("keydown", onKey, true); return () => window.removeEventListener("keydown", onKey, true); }, [onClose]);
  // Blocks placed inside a grid render only inside that grid, exactly as on the public page.
  const placed = new Set(article.blocks.flatMap((block) => block.type === "grid" && block.gridColumns ? [...block.gridColumns.left, ...block.gridColumns.right] : []));
  return <div className="clean-preview-backdrop" role="dialog" aria-modal="true" aria-label="Vista previa limpia"><div className="clean-preview-toolbar"><span>Vista previa real / {article.category}</span><button type="button" onClick={onClose} aria-label="Cerrar vista previa" title="Cerrar (Esc)"><X size={19} /></button></div><article className="clean-preview-paper"><div className="clean-preview-hero"><div><p className="eyebrow">{article.eyebrow || `${article.category} / HISTORIA`}</p><h1>{article.title || "Sin título"}</h1><p>{article.excerpt}</p><div className="clean-preview-meta"><span>Por {article.author || "LIGHT"}</span><span>{article.readingTime || "8 min de lectura"}</span><span>{article.date}</span></div></div>{article.image && <img src={article.image} alt={article.title} />}</div>{article.lead && <p className="clean-preview-lead">{article.lead}</p>}<div className="clean-preview-body">{article.blocks.filter((block) => !placed.has(block.id)).map((block) => <Block block={block} blocks={article.blocks} key={block.id} />)}</div></article></div>;
}
