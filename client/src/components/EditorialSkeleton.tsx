/** Editorial placeholders shown while content arrives. They mirror the final layout so nothing jumps when it loads. */

export function StoryCardsSkeleton({ count = 3, label = "Cargando historias" }: { count?: number; label?: string }) {
  return <div className="sk-cards" role="status" aria-label={label}>{Array.from({ length: count }, (_, index) => <div className="sk-card" key={index} style={{ animationDelay: `${index * 90}ms` }}><span className="sk sk-card__image" /><span className="sk sk-line sk-line--kicker" /><span className="sk sk-line sk-line--title" /><span className="sk sk-line sk-line--title sk-line--short" /><span className="sk sk-line sk-line--meta" /></div>)}<span className="sr-only">{label}…</span></div>;
}

export function ArticleSkeleton({ label = "Cargando historia" }: { label?: string }) {
  return <div className="sk-article" role="status" aria-label={label}>
    <div className="sk-article__bar"><span className="sk sk-line sk-line--meta" /><span className="sk-article__brand">LIGHT</span><span className="sk sk-line sk-line--meta" /></div>
    <div className="sk-article__hero">
      <div className="sk-article__copy"><span className="sk sk-line sk-line--kicker" /><span className="sk sk-line sk-line--display" /><span className="sk sk-line sk-line--display sk-line--short" /><span className="sk sk-line sk-line--dek" /><span className="sk sk-line sk-line--dek sk-line--medium" /><span className="sk sk-line sk-line--meta" /></div>
      <span className="sk sk-article__image" />
    </div>
    <div className="sk-article__body">{[100, 96, 88, 100, 64].map((width, index) => <span className="sk sk-line sk-line--text" style={{ width: `${width}%` }} key={index} />)}</div>
    <span className="sr-only">{label}…</span>
  </div>;
}

export function PageSkeleton({ label = "Cargando" }: { label?: string }) {
  return <div className="sk-page" role="status" aria-label={label}><span className="sk sk-line sk-line--kicker" /><span className="sk sk-line sk-line--display" /><span className="sk sk-line sk-line--display sk-line--medium" /><div className="sk-page__grid"><span className="sk sk-page__tile" /><span className="sk sk-page__tile" /><span className="sk sk-page__tile" /></div><span className="sr-only">{label}…</span></div>;
}
