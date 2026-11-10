import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import type { CSSProperties } from "react";
import { Link } from "wouter";
import ArticleEngagement from "@/components/ArticleEngagement";
import type { EditorialArticle } from "@/lib/editorial";
import type { PageBlock } from "@/lib/pageBlocks";

/**
 * The public body of a story. Used by the published page and by the editor's clean preview,
 * so what editors preview is literally what readers get.
 */
export default function PublicArticleView({ article, preview = false }: { article: EditorialArticle; preview?: boolean }) {
  const [heroImageWide, setHeroImageWide] = useState<boolean | null>(null);
  const [heroImageVertical, setHeroImageVertical] = useState(false);
  const blocks = article.blocks || [];
  const placed = new Set(blocks.flatMap((block) => block.type === "grid" && block.gridColumns ? [...block.gridColumns.left, ...block.gridColumns.right] : []));
  return <main className="public-article-paper">
    <div className="public-article-breadcrumb">{preview ? <span><ArrowLeft size={14} /> Archivo</span> : <Link href="/archivo"><ArrowLeft size={14} /> Archivo</Link>}<span>LIGHT / {article.category}</span></div>
    <div className={`public-article-hero-split${heroImageWide ? " public-article-hero-split--wide" : ""}${heroImageVertical ? " public-article-hero-split--vertical" : ""}`}>
      <div className="dynamic-article__intro"><p className="eyebrow">{article.eyebrow || `${article.category} / Historia`}</p><h1>{article.title || "Sin título"}</h1><p>{article.excerpt}</p><div className="dynamic-article__meta"><span>Por {article.author}</span><span>{article.readingTime || "8 min de lectura"}</span><span>{article.date || new Date(article.updatedAt).toLocaleDateString("es-ES")}</span></div></div>
      {article.image && <figure className="public-hero-figure"><img src={article.image} alt={article.title} onLoad={(event) => { const image = event.currentTarget; const ratio = image.naturalWidth / image.naturalHeight; setHeroImageWide(ratio > 4 / 3); setHeroImageVertical(ratio < 3 / 4); }} /><figcaption>{article.imageCaption}</figcaption></figure>}
    </div>
    {article.lead && <p className="public-lead">{article.lead}</p>}
    <div className="public-article-blocks">{blocks.filter((block) => !placed.has(block.id)).map((block) => <PublicBlock key={block.id} block={block} blocks={blocks} />)}</div>
    {!preview && <div className="public-article-end"><ArticleEngagement articleKey={article.id} /><Link href="/archivo">Más historias <ArrowUpRight size={15} /></Link></div>}
  </main>;
}

export function PublicBlock({ block, blocks = [] }: { block: PageBlock; blocks?: PageBlock[] }) {
  if (block.type === "grid") { const split = Math.min(78, Math.max(22, block.gridSplit || (block.gridLayout === "left" ? 58 : 42))); return <section className={`public-grid public-grid--${block.gridLayout || "left"}`} style={{ "--grid-split": `${split}%` } as CSSProperties}><div className="public-grid__cell public-grid__cell--left">{(block.gridColumns?.left || []).map((id) => { const item = blocks.find((candidate) => candidate.id === id); return item ? <PublicBlock block={item} blocks={blocks} key={id} /> : null; })}</div><div className="public-grid__cell public-grid__cell--right">{(block.gridColumns?.right || []).map((id) => { const item = blocks.find((candidate) => candidate.id === id); return item ? <PublicBlock block={item} blocks={blocks} key={id} /> : null; })}</div></section>; }
  if (block.type === "image") return <figure className={`public-block public-block--image public-block--image-${block.imageAlign || "full"}`}>{block.content && <img src={block.content} alt="" />}<figcaption>{block.caption}</figcaption></figure>;
  if (block.type === "divider") return <div className="public-block public-block--divider"><hr /></div>;
  if (block.type === "button") return <div className="public-block public-block--button">{block.content}</div>;
  if (block.type === "quote") return <blockquote className="public-block public-block--quote">“{block.content}”</blockquote>;
  if (block.type === "heading") return <h2 className="public-block public-block--heading">{block.content}</h2>;
  return <p className="public-block public-block--paragraph">{block.content}</p>;
}
