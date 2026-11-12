import { ArrowLeft, ArrowUpRight, Images, Menu, BookOpen, CalendarDays, Clock3, Eye, FileText, LayoutDashboard, LayoutList, LogOut, Mail, Megaphone, MessageSquareText, PanelLeftClose, PanelLeftOpen, Plus, ShieldCheck, Target, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import ArticleDraftEditor from "@/components/ArticleDraftEditor";
import ArticleCategoryDialog from "@/components/ArticleCategoryDialog";
import RunwayManager from "@/components/RunwayManager";
import ComingSoonManager from "@/components/ComingSoonManager";
import HomepageFeatureManager from "@/components/HomepageFeatureManager";
import CalendarBoard from "@/components/CalendarBoard";
import CampaignBoard from "@/components/CampaignBoard";
import PerformanceOverview, { type OverviewTarget } from "@/components/PerformanceOverview";
import MagazineManager from "@/components/MagazineManager";
import ArchivePlacementDialog from "@/components/ArchivePlacementDialog";
import ArticleDeletionRequestDialog from "@/components/ArticleDeletionRequestDialog";
import ArticleDeletionRequestsManager from "@/components/ArticleDeletionRequestsManager";
import MastheadManager from "@/components/MastheadManager";
import CommentsManager from "@/components/CommentsManager";
import TeamManager from "@/components/TeamManager";
import { fetchArticleDeletionRequests, type ArticleDeletionRequest } from "@/lib/articleDeletion";
import { campaignStatus, fetchCampaigns, sortCampaigns, type Campaign } from "@/lib/campaigns";
import { fetchCalendarEvents, type CalendarEvent } from "@/lib/calendar";
import { createArticle, deleteRemoteArticle, fetchRemoteArticles, getEditorialUser, resolveArticleSlug, saveRemoteArticle, type EditorialArticle, type EditorialUser } from "@/lib/editorial";
import { deleteNewsletterSubscriber, fetchNewsletterSubscriberCount, fetchNewsletterSubscribers, type NewsletterSubscriber } from "@/lib/newsletter";
import { fetchMagazineEditions, getMagazineEditions } from "@/lib/magazineCatalog";
import type { MagazineEdition } from "@/lib/magazines";
import { removeArchivePlacement, type ArchivePlacement } from "@/lib/archivePlacements";
import { starterBlocks } from "@/lib/pageBlocks";
import { fetchRemoteRunwayBrands, getRunwayBrands, type RunwayBrand } from "@/lib/runway";
import { describeError, subscribeToTable, supabase } from "@/lib/supabase";
import { fetchMyPermissions, type DashboardPermissions, type DashboardSection } from "@/lib/team";
import { resetEditorialAccess } from "@/components/EditorialAccessLink";
import BannersManager from "@/components/BannersManager";
import ArticleStatsPanel, { ArticleRowStats } from "@/components/ArticleStatsPanel";
import { useArticleStats } from "@/lib/articleAnalytics";
import { resolveReadingTime } from "@/lib/readingTime";


function SubscribersView({ subscribers, canEdit, onDelete }: { subscribers: NewsletterSubscriber[]; canEdit: boolean; onDelete: (subscriber: NewsletterSubscriber) => void }) {
  return <section className="admin-subscribers"><div className="admin-section-heading"><div><p>Correspondencia LIGHT</p><h2>Personas suscritas.</h2></div><span className="admin-section-count">{subscribers.length} registros</span></div><p className="admin-subscribers__intro">Consulta los correos que dejaron sus datos desde la página de inicio y la fecha en que se incorporaron a las novedades.</p>{subscribers.length ? <div className="subscriber-table"><div className="subscriber-table__row subscriber-table__row--head"><span>Correo electrónico</span><span>Fecha de alta</span><span>Origen</span>{canEdit && <span />}</div>{subscribers.map((subscriber) => <div className="subscriber-table__row" key={subscriber.id}><strong><Mail size={14} />{subscriber.email}</strong><span>{new Date(subscriber.subscribedAt).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</span><span>{subscriber.source === "home" ? "Página de inicio" : subscriber.source === "newsletter" ? "Página Newsletter" : subscriber.source}</span>{canEdit && <button className="subscriber-table__delete" type="button" onClick={() => onDelete(subscriber)} aria-label={`Eliminar ${subscriber.email}`}><Trash2 size={14} /></button>}</div>)}</div> : <div className="admin-empty admin-empty--subscribers"><Mail size={24} /><p className="eyebrow">Todavía no hay suscriptores</p><h2>La lista empieza aquí.</h2></div>}</section>;
}

function ReadOnlyBanner() { return <p className="admin-readonly-banner" role="status"><Eye size={14} /> Modo lectura: puedes ver este apartado, pero tu rol no puede editarlo. Un Owner puede cambiarlo en Equipo.</p>; }

const tabTitles: Record<string, string> = { overview: "Performance dashboard", pages: "Páginas", editions: "Ediciones", runway: "Runway", masthead: "Masthead", "homepage-feature": "Destacado", banners: "Banners", "coming-soon": "Próximamente", calendar: "Calendario", campaigns: "Campañas", subscribers: "Suscriptores", comments: "Comentarios", "deletion-requests": "Solicitudes de borrado", team: "Equipo y permisos" };

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [session, setCurrentSession] = useState<EditorialUser | null>(null);
  const [articles, setArticles] = useState<EditorialArticle[]>([]);
  const [activeTab, setActiveTab] = useState<DashboardSection | "pages" | "editor">("pages");
  const [permissions, setPermissions] = useState<DashboardPermissions | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Mobile drawer: closes on any section change (nav, sidebar campaigns, "Crear página") and with Escape.
  useEffect(() => { setMobileNavOpen(false); }, [activeTab]);
  useEffect(() => { if (!mobileNavOpen) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setMobileNavOpen(false); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [mobileNavOpen]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [editing, setEditing] = useState<EditorialArticle | null>(null);
  const [notice, setNotice] = useState("");
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [campaignFocus, setCampaignFocus] = useState<{ id: string | null; nonce: number } | null>(null);
  const [magazineEditions, setMagazineEditions] = useState<MagazineEdition[]>(getMagazineEditions());
  const [placementArticle, setPlacementArticle] = useState<EditorialArticle | null>(null);
  const [deletionRequestArticle, setDeletionRequestArticle] = useState<EditorialArticle | null>(null);
  const [pendingDeletionIds, setPendingDeletionIds] = useState<Set<string>>(new Set());
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [runwayBrands, setRunwayBrands] = useState<RunwayBrand[]>(getRunwayBrands());

  const loadArticles = useCallback(async () => { const remoteArticles = await fetchRemoteArticles(); setArticles(remoteArticles.map(normalizeArticle)); }, []);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const current = await getEditorialUser();
      if (!current) { navigate("/"); return; }
      const access = await fetchMyPermissions(current.role);
      if (!active) return;
      setCurrentSession(current); setPermissions(access);
      if (access.overview.view) setActiveTab("overview");
      const can = (section: DashboardSection) => access[section].view;
      const safe = <T,>(promise: Promise<T>, fallback: T) => promise.catch((error) => { console.warn("[LIGHT]", describeError(error)); return fallback; });
      const [remoteArticles, subscriberTotal, subscriberRows, nextCampaigns, nextEvents, deletionRequests, editions, brands] = await Promise.all([
        fetchRemoteArticles(),
        can("subscribers") || can("overview") ? safe(fetchNewsletterSubscriberCount(), 0) : Promise.resolve(0),
        can("subscribers") || can("overview") ? safe(fetchNewsletterSubscribers(), [] as NewsletterSubscriber[]) : Promise.resolve([] as NewsletterSubscriber[]),
        can("campaigns") || can("overview") ? safe(fetchCampaigns(), [] as Campaign[]) : Promise.resolve([] as Campaign[]),
        can("calendar") || can("overview") ? safe(fetchCalendarEvents(), [] as CalendarEvent[]) : Promise.resolve([] as CalendarEvent[]),
        safe(fetchArticleDeletionRequests(), [] as ArticleDeletionRequest[]),
        safe(fetchMagazineEditions(), getMagazineEditions()),
        safe(fetchRemoteRunwayBrands(), getRunwayBrands()),
      ]);
      if (!active) return;
      setArticles(remoteArticles.map(normalizeArticle)); setSubscriberCount(subscriberTotal); setSubscribers(subscriberRows); setCampaigns(nextCampaigns); setCalendarEvents(nextEvents); setMagazineEditions(editions); setRunwayBrands(brands);
      setPendingDeletionIds(new Set(deletionRequests.filter((request) => request.status === "pending" && request.articleId).map((request) => request.articleId as string)));
    };
    void load();
    // Live updates from the rest of the team.
    const unsubscribers = [
      subscribeToTable("articles", () => { void loadArticles(); }),
      subscribeToTable("campaigns", () => { void fetchCampaigns().then(setCampaigns).catch(() => undefined); }),
      subscribeToTable("calendar_events", () => { void fetchCalendarEvents().then(setCalendarEvents).catch(() => undefined); }),
      subscribeToTable("runway_brands", () => { void fetchRemoteRunwayBrands().then(setRunwayBrands); }),
      subscribeToTable("site_settings", () => { void fetchMagazineEditions().then(setMagazineEditions).catch(() => undefined); }, "key=eq.public:magazine-editions"),
    ];
    return () => { active = false; unsubscribers.forEach((unsubscribe) => unsubscribe()); };
  }, [navigate, loadArticles]);
  const published = useMemo(() => articles.filter((article) => article.status === "published"), [articles]);
  const [statsDays, setStatsDays] = useState(30);
  const statsResult = useArticleStats(published, statsDays, Boolean(permissions?.overview?.view) && activeTab === "pages");
  if (!session || !permissions) return <div className="admin-loading" aria-busy="true"><span>LIGHT</span><small>Cargando el estudio…</small></div>;
  const can = (section: DashboardSection) => permissions[section].view;
  const canEdit = (section: DashboardSection) => permissions[section].edit;

  const beginArticle = () => setCategoryDialogOpen(true);
  const createArticleInCategory = (category: string) => { setCategoryDialogOpen(false); const article = normalizeArticle({ ...createArticle(session.displayName), category, eyebrow: `${category} / HISTORIA` }); setEditing(article); setActiveTab("editor"); setNotice(""); };
  const openArticle = (article: EditorialArticle) => { setEditing(normalizeArticle(article)); setActiveTab("editor"); setNotice(""); };
  const update = (patch: Partial<EditorialArticle>) => setEditing((current) => current ? { ...current, ...patch } : current);
  const save = async (status: EditorialArticle["status"]) => {
    if (!editing?.title.trim()) { setNotice("Añade un título antes de guardar."); return; }
    if (!session.canPublish && editing.status === "published") { setNotice("Solo Owner y Admin pueden editar una página ya publicada."); return; }
    if (status === "published" && !session.canPublish) { setNotice("Solo Owner y Admin pueden publicar páginas."); return; }
    const stored = articles.find((article) => article.id === editing.id);
    const wasPublished = Boolean(stored?.publishedAt || stored?.status === "published");
    const next = { ...editing, readingTime: resolveReadingTime(editing), slug: resolveArticleSlug(editing, wasPublished), status, updatedAt: new Date().toISOString() };
    try {
      const saved = await saveRemoteArticle(next);
      if (!saved) { setNotice(status === "published" ? "No se pudo publicar la página." : "No se pudo guardar la edición."); return; }
      setArticles((current) => [saved, ...current.filter((article) => article.id !== saved.id)]); setEditing(saved);
      setNotice(supabase ? (status === "published" ? `Página publicada en /historias/${saved.slug}.` : "Borrador guardado. Owner y Admin ya pueden verlo.") : (status === "published" ? "Página publicada en este navegador de demostración." : "Edición guardada en este navegador de demostración."));
    } catch (error) { setNotice(`No se pudo guardar en Supabase: ${describeError(error)}`); }
  };
  const remove = async (id: string) => { const target = articles.find((article) => article.id === id); if (!target || !session.canPublish) return; if (!window.confirm(`¿Eliminar “${target.title || "Sin título"}” definitivamente?`)) return; try { await deleteRemoteArticle(id); void removeArchivePlacement(id).catch(() => undefined); setArticles((current) => current.filter((article) => article.id !== id)); if (editing?.id === id) { setEditing(null); setActiveTab("pages"); } setPendingDeletionIds((current) => { const next = new Set(current); next.delete(id); return next; }); setNotice("Artículo eliminado."); } catch (error) { setNotice(`No se pudo eliminar: ${describeError(error)}`); } };
  const updateArticleFlags = async (id: string, patch: Partial<Pick<EditorialArticle, "isVisible" | "isFeatured" | "featuredOrder">>) => {
    const previous = articles;
    const changed = articles.find((article) => article.id === id);
    if (!changed) return;
    const next = { ...changed, ...patch, updatedAt: new Date().toISOString() };
    setArticles(articles.map((article) => article.id === id ? next : article));
    try { await saveRemoteArticle(next); }
    catch (error) { setArticles(previous); setNotice(`No se pudo actualizar “${changed.title || "Sin título"}”: ${describeError(error)}`); }
  };
  const removeSubscriber = async (subscriber: NewsletterSubscriber) => { if (!window.confirm(`¿Eliminar ${subscriber.email} de la newsletter?`)) return; try { await deleteNewsletterSubscriber(subscriber.id); setSubscribers((current) => current.filter((item) => item.id !== subscriber.id)); setSubscriberCount((count) => Math.max(0, count - 1)); } catch (error) { setNotice(`No se pudo eliminar: ${describeError(error)}`); } };
  const navButton = (section: DashboardSection | "pages", label: string, icon: React.ReactNode, badge?: React.ReactNode) => <button key={section} title={label} className={activeTab === section ? "is-active" : ""} onClick={() => { setActiveTab(section); setMobileNavOpen(false); }}>{icon}<span>{label}</span>{badge !== undefined && <b>{badge}</b>}</button>;

  // Sidebar groups up to three campaigns: active ones first, then the next scheduled ones.
  const sidebarCampaigns = sortCampaigns(campaigns.filter((campaign) => campaignStatus(campaign) !== "ended"));
  const sidebarActiveCount = sidebarCampaigns.filter((campaign) => campaignStatus(campaign) === "active").length;
  const openCampaign = (campaign: Campaign | null) => { if (!can("campaigns")) return; setCampaignFocus({ id: campaign?.id ?? null, nonce: Date.now() }); setActiveTab("campaigns"); };
  const overviewTargets: Record<OverviewTarget, DashboardSection | "pages"> = { campaigns: "campaigns", subscribers: "subscribers", calendar: "calendar", pages: "pages" };
  const canOpen = (target: OverviewTarget) => target === "pages" || can(target);
  const formatSidebarDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }).replace(".", "");
  const onPlacementSaved = (placement: ArchivePlacement) => { if (!placementArticle) return; const active = placement.spotlight || placement.mustRead || placement.latest || placement.homeHero || placement.homeFeature || placement.homeSelection; void updateArticleFlags(placementArticle.id, { isFeatured: active, featuredOrder: placement.order }); };
  return <div className={`admin-shell${sidebarCollapsed ? " admin-shell--collapsed" : ""}${mobileNavOpen ? " admin-shell--nav-open" : ""}`}><div className="admin-mobilebar"><button type="button" className="admin-mobilebar__menu" onClick={() => setMobileNavOpen(true)} aria-label="Abrir navegación" aria-expanded={mobileNavOpen}><Menu size={19} /></button><Link className="admin-mobilebar__brand" href="/">LIGHT <small>Studio</small></Link><span className="admin-mobilebar__section">{activeTab === "editor" ? "Editor" : tabTitles[activeTab]}</span></div><button type="button" className="admin-mobile-scrim" aria-label="Cerrar navegación" onClick={() => setMobileNavOpen(false)} tabIndex={mobileNavOpen ? 0 : -1} /><aside className="admin-sidebar"><div className="admin-sidebar__top"><Link className="admin-brand" href="/"><span>LIGHT</span><small>Performance studio</small></Link><button className="admin-collapse" type="button" onClick={() => setSidebarCollapsed((value) => !value)} aria-label={sidebarCollapsed ? "Expandir menú" : "Colapsar menú"}>{sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}</button></div><div className="admin-user"><span className="admin-avatar">{session.displayName.slice(0, 1)}</span><div><strong>{session.displayName}</strong><small>{session.role}</small></div></div><p className="admin-nav-label">Campaign navigation</p><nav className="admin-nav">{can("overview") && navButton("overview", "Resumen", <LayoutDashboard size={15} />, "↗")}{navButton("pages", "Páginas", <LayoutList size={15} />, articles.length)}{can("editions") && navButton("editions", "Ediciones", <BookOpen size={15} />, magazineEditions.length)}{can("runway") && navButton("runway", "Runway", <Target size={15} />, runwayBrands.length)}{can("masthead") && navButton("masthead", "Masthead", <Users size={15} />)}{can("deletion-requests") && navButton("deletion-requests", "Solicitudes", <Trash2 size={15} />)}{can("homepage-feature") && navButton("homepage-feature", "Destacado", <ArrowUpRight size={15} />, "↗")}{can("banners") && navButton("banners", "Banners", <Images size={15} />)}{can("coming-soon") && navButton("coming-soon", "Próximamente", <Clock3 size={15} />, "↗")}{can("campaigns") && navButton("campaigns", "Campañas", <Megaphone size={15} />, campaigns.length)}{can("subscribers") && navButton("subscribers", "Suscriptores", <Mail size={15} />, subscriberCount)}{can("comments") && navButton("comments", "Comentarios", <MessageSquareText size={15} />)}{can("calendar") && navButton("calendar", "Calendario", <CalendarDays size={15} />, "↗")}{can("team") && navButton("team", "Equipo", <ShieldCheck size={15} />)}<button title="Crear página" className={activeTab === "editor" ? "is-active" : ""} onClick={beginArticle}><Plus size={15} /><span>Crear página</span></button></nav>{sidebarCampaigns.length > 0 && <div className="admin-sidebar__campaigns"><small>{sidebarActiveCount === 1 ? "Campaña activa" : sidebarActiveCount > 1 ? `${sidebarActiveCount} campañas activas` : "Próximas campañas"}</small>{sidebarCampaigns.slice(0, 3).map((campaign) => { const status = campaignStatus(campaign); return <button type="button" key={campaign.id} className={`admin-sidebar__campaign admin-sidebar__campaign--${campaign.color}${status === "scheduled" ? " is-scheduled" : ""}`} onClick={() => openCampaign(campaign)} title={can("campaigns") ? `Abrir “${campaign.name}”` : campaign.name}><strong>{campaign.name}</strong><span><i /> {status === "scheduled" ? "Empieza" : "Hasta"} {formatSidebarDate(status === "scheduled" ? campaign.startDate : campaign.endDate)}</span></button>; })}{sidebarCampaigns.length > 3 && can("campaigns") && <button type="button" className="admin-sidebar__campaigns-more" onClick={() => setActiveTab("campaigns")}>+{sidebarCampaigns.length - 3} más</button>}</div>}<button className="admin-logout" onClick={() => { try { localStorage.removeItem("light.demo.editorial-auth"); } catch { /* ignore */ } const done = () => { resetEditorialAccess(); navigate("/"); }; if (supabase) void supabase.auth.signOut().finally(done); else done(); }}><LogOut size={15} /><span>Salir</span></button></aside><main className="admin-main"><header className="admin-topbar"><div><p className="eyebrow">LIGHT / Studio</p><h1>{activeTab === "editor" ? (editing?.id && articles.some((article) => article.id === editing.id) ? "Editar página" : "Nueva página") : tabTitles[activeTab]}</h1></div><Link href="/" className="admin-back"><ArrowLeft size={15} /> Ver revista</Link></header>{activeTab !== "pages" && activeTab !== "editor" && !can(activeTab) && <p className="admin-notice">No tienes acceso a este apartado.</p>}{activeTab !== "pages" && activeTab !== "editor" && activeTab !== "team" && can(activeTab) && !canEdit(activeTab) && <ReadOnlyBanner />}{activeTab === "overview" && can("overview") && <PerformanceOverview articles={articles} subscriberCount={subscriberCount} subscribers={subscribers} campaigns={campaigns} calendarEvents={calendarEvents} canOpen={canOpen} onNavigate={(target) => setActiveTab(overviewTargets[target])} onOpenCampaign={openCampaign} onOpenArticle={openArticle} onNew={beginArticle} />}{activeTab === "campaigns" && can("campaigns") && <CampaignBoard campaigns={campaigns} onChange={setCampaigns} readOnly={!canEdit("campaigns")} focus={campaignFocus} onFocusHandled={() => setCampaignFocus(null)} />}{activeTab === "calendar" && can("calendar") && <CalendarBoard readOnly={!canEdit("calendar")} events={calendarEvents} onEventsChange={setCalendarEvents} campaigns={campaigns} onOpenCampaign={can("campaigns") ? openCampaign : undefined} />}{activeTab === "subscribers" && can("subscribers") && <SubscribersView subscribers={subscribers} canEdit={canEdit("subscribers")} onDelete={(subscriber) => void removeSubscriber(subscriber)} />}{activeTab === "comments" && can("comments") && <CommentsManager canDelete={canEdit("comments")} />}{activeTab === "team" && can("team") && <TeamManager canEdit={canEdit("team")} currentUserId={session.id || null} isOwner={session.role === "Owner"} />}{activeTab === "deletion-requests" && can("deletion-requests") && <ArticleDeletionRequestsManager canResolve={session.canPublish && canEdit("deletion-requests")} onArticleDeleted={(id) => { setArticles((current) => current.filter((article) => article.id !== id)); setPendingDeletionIds((current) => { const next = new Set(current); next.delete(id); return next; }); }} />}{activeTab === "editions" && can("editions") && <MagazineManager editions={magazineEditions} onChange={setMagazineEditions} readOnly={!canEdit("editions")} />}{activeTab === "runway" && can("runway") && <RunwayManager brands={runwayBrands} onChange={setRunwayBrands} readOnly={!canEdit("runway")} />}{activeTab === "masthead" && can("masthead") && <MastheadManager readOnly={!canEdit("masthead")} />}{activeTab === "homepage-feature" && can("homepage-feature") && <HomepageFeatureManager readOnly={!canEdit("homepage-feature")} />}{activeTab === "banners" && can("banners") && <BannersManager readOnly={!canEdit("banners")} />}{activeTab === "coming-soon" && can("coming-soon") && <ComingSoonManager readOnly={!canEdit("coming-soon")} />}{activeTab === "pages" && <section className="admin-articles"><div className="admin-section-heading"><div><p>Contenido editorial</p><h2>Tu archivo de páginas.</h2></div><div className="admin-section-heading__actions"><button className="admin-primary" onClick={beginArticle}><Plus size={15} /> Crear página</button></div></div>{notice && <p className="admin-notice" role="status">{notice}</p>}{can("overview") && published.length > 0 && <ArticleStatsPanel articles={published} result={statsResult} days={statsDays} onDaysChange={setStatsDays} />}{articles.length === 0 ? <div className="admin-empty"><FileText size={24} /><p className="eyebrow">Todavía no hay páginas</p><h2>La primera empieza contigo.</h2><button className="admin-primary" onClick={beginArticle}>Abrir borrador <ArrowUpRight size={15} /></button></div> : <div className="admin-article-list">{articles.map((article) => <article className="admin-page-row" key={article.id}><div className="admin-page-row__status"><span className={`status-pill status-pill--${article.status}`}>{article.status === "published" ? "Publicado" : "Borrador"}</span><small>{article.isFeatured ? "Destacada" : article.isVisible ? "Visible" : "Oculta"}</small></div><div className="admin-page-row__copy"><h2>{article.title || "Sin título"}</h2><p>{article.excerpt || "Sin bajada todavía."}</p><small>Por {article.author || "LIGHT"} · {article.slug ? `/historias/${article.slug}` : "Todavía no tiene URL"}</small>{article.status === "published" && statsResult?.status === "ok" && <ArticleRowStats stats={statsResult.stats[article.id]} />}</div><div className="admin-article-actions">{article.status === "published" && <a className="admin-article-actions__link" href={`/historias/${article.slug || article.id}`} target="_blank" rel="noreferrer" title="Abrir página publicada"><ArrowUpRight size={14} /></a>}{session.canPublish && canEdit("homepage-feature") && <button onClick={() => setPlacementArticle(article)}><Target size={14} /> {article.isFeatured ? "Editar destacada" : "Destacar"}</button>}{session.canPublish && <button onClick={() => void updateArticleFlags(article.id, { isVisible: !article.isVisible })}>{article.isVisible ? "Ocultar" : "Mostrar"}</button>}{(session.canPublish || article.status === "draft") && <button onClick={() => openArticle(article)}><FileText size={14} /> Editar</button>}{session.canPublish ? pendingDeletionIds.has(article.id) && article.status === "draft" ? <button onClick={() => setActiveTab("deletion-requests")} aria-label="Revisar solicitud de borrado"><Clock3 size={14} /> Revisar solicitud</button> : <button onClick={() => void remove(article.id)} aria-label="Eliminar artículo"><Trash2 size={15} /></button> : article.status === "draft" ? <button onClick={() => setDeletionRequestArticle(article)} disabled={pendingDeletionIds.has(article.id)} title={pendingDeletionIds.has(article.id) ? "Solicitud pendiente" : "Solicitar borrado del borrador"} aria-label={pendingDeletionIds.has(article.id) ? "Solicitud de borrado pendiente" : "Solicitar borrado del borrador"}>{pendingDeletionIds.has(article.id) ? <Clock3 size={15} /> : <Trash2 size={15} />}{pendingDeletionIds.has(article.id) && <span>Solicitado</span>}</button> : null}</div></article>)}</div>}</section>}{activeTab === "editor" && editing && <ArticleDraftEditor article={editing} canPublish={session.canPublish} notice={notice} onChange={update} onSaveDraft={() => save("draft")} onPublish={() => save("published")} onBack={() => { setActiveTab("pages"); setNotice(""); }} />}</main>{categoryDialogOpen && <ArticleCategoryDialog onClose={() => setCategoryDialogOpen(false)} onCreate={createArticleInCategory} />}{placementArticle && <ArchivePlacementDialog article={placementArticle} onClose={() => setPlacementArticle(null)} onSaved={onPlacementSaved} />}{deletionRequestArticle && <ArticleDeletionRequestDialog article={deletionRequestArticle} onClose={() => setDeletionRequestArticle(null)} onSubmitted={(request: ArticleDeletionRequest) => { const articleId = request.articleId || deletionRequestArticle.id; setPendingDeletionIds((current) => new Set([...current, articleId])); setDeletionRequestArticle(null); setNotice("Solicitud enviada a Owner/Admin."); }} />}</div>;
}

function normalizeArticle(article: EditorialArticle): EditorialArticle { return { ...article, eyebrow: article.eyebrow || `${article.category || "Moda"} / PORTADA`, lead: article.lead || "", readingTime: article.readingTime || "", date: article.date || new Date().toISOString().slice(0, 10), imageCaption: article.imageCaption || "", isVisible: article.isVisible !== false, isFeatured: article.isFeatured === true, featuredOrder: article.featuredOrder ?? 99, blocks: article.blocks?.length ? article.blocks : starterBlocks() }; }

