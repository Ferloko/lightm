import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useRoute } from "wouter";
import { fetchRemoteArticles, type EditorialArticle } from "@/lib/editorial";
import type { PageBlock } from "@/lib/pageBlocks";

export default function DynamicArticlePage() {
  const [, params] = useRoute<{ slug: string }>("/historias/:slug");
  const [article, setArticle] = useState<EditorialArticle | null>(null);
  useEffect(() => { fetchRemoteArticles().then((articles) => setArticle(articles.find((item) => item.status === "published" && (item.slug === params?.slug || item.id === params?.slug)) || null)); }, [params?.slug]);
  if (!article) return <div className="dynamic-article-empty"><p className="eyebrow">MODA / Página</p><h1>Esta historia todavía no existe.</h1><Link href="/">Volver a la revista <ArrowUpRight size={15} /></Link></div>;
  const blocks = article.blocks || [];
  return <div className="site-shell dynamic-article"><header className="dynamic-article__header"><Link href="/" className="wordmark">MODA</Link><Link href="/archivo" className="article-back"><ArrowLeft size={16} /> Archivo</Link></header><main className="public-article-paper"><div className="public-article-hero-split"><div className="dynamic-article__intro"><p className="eyebrow">{article.eyebrow || `${article.category} / Historia`}</p><h1>{article.title}</h1><p>{article.excerpt}</p><div className="dynamic-article__meta"><span>Por {article.author}</span><span>{article.readingTime || "8 min de lectura"}</span><span>{article.date || new Date(article.updatedAt).toLocaleDateString("es-ES")}</span></div></div>{article.image && <figure className="public-hero-figure"><img src={article.image} alt={article.title} /><figcaption>{article.imageCaption}</figcaption></figure>}</div>{article.lead && <p className="public-lead">{article.lead}</p>}<div className="public-article-blocks">{blocks.map((block) => <PublicBlock key={block.id} block={block} />)}</div></main><footer className="dynamic-article__footer"><Link href="/">MODA</Link><Link href="/archivo">Más historias <ArrowUpRight size={15} /></Link></footer></div>;
}

function PublicBlock({ block }: { block: PageBlock }) {
  if (block.type === "image") return <figure className="public-block public-block--image">{block.content && <img src={block.content} alt="" />}<figcaption>{block.caption}</figcaption></figure>;
  if (block.type === "divider") return <div className="public-block public-block--divider"><hr /></div>;
  if (block.type === "button") return <div className="public-block public-block--button">{block.content}</div>;
  if (block.type === "quote") return <blockquote className="public-block public-block--quote">“{block.content}”</blockquote>;
  if (block.type === "heading") return <h2 className="public-block public-block--heading">{block.content}</h2>;
  return <p className="public-block public-block--paragraph">{block.content}</p>;
}
