import { starterBlocks } from "@/lib/pageBlocks";
import type { EditorialArticle } from "@/lib/editorial";

const hero = "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=90";
const silhouette = "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=1200&q=90";
const portrait = "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=1100&q=90";
const beauty = "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=1100&q=90";
const culture = "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1200&q=90";

const seeds = [
  { slug: "vestirse-de-futuro", title: "Vestirse de futuro.", category: "Moda", excerpt: "Las prendas ya no siguen una sola dirección. Un armario más libre mezcla memoria, tecnología y una nueva idea de lo que significa estar bien vestido.", lead: "El futuro no llega con una silueta única. Llega en capas, en decisiones pequeñas, en la libertad de usar lo que ya existe de una manera distinta.", image: hero, featuredOrder: 1 },
  { slug: "el-gesto-propio", title: "El gesto propio", category: "Sociedad", excerpt: "Cinco creadoras hablan de la intuición como una forma de poder.", lead: "La identidad también se construye en los gestos pequeños: una elección, una pausa, una forma de mirar.", image: portrait, featuredOrder: 2 },
  { slug: "piel-real-luz-propia", title: "Piel real, luz propia", category: "Belleza", excerpt: "El nuevo lenguaje del cuidado empieza por escuchar.", lead: "Cuidarse no es corregir el cuerpo, sino aprender a leerlo con más atención.", image: beauty, featuredOrder: 3 },
  { slug: "arquitecturas-intimas", title: "Arquitecturas íntimas", category: "Cultura", excerpt: "Los espacios que habitamos también cuentan quiénes somos.", lead: "Una habitación puede guardar una memoria, una época y la manera en que imaginamos el futuro.", image: culture, featuredOrder: 4 },
  { slug: "la-forma-de-lo-nuevo", title: "La forma de lo nuevo", category: "Moda", excerpt: "Una mirada a las siluetas que están cambiando el armario.", lead: "Lo nuevo aparece cuando una forma conocida encuentra otra manera de moverse.", image: silhouette, featuredOrder: 5 },
];

export function legacyStories(author: string): EditorialArticle[] {
  const now = new Date().toISOString();
  return seeds.map((seed) => ({ id: crypto.randomUUID(), slug: seed.slug, eyebrow: `${seed.category} / PORTADA`, title: seed.title, category: seed.category, excerpt: seed.excerpt, lead: seed.lead, readingTime: "8 min de lectura", date: "2026-10-24", body: "", blocks: starterBlocks(), image: seed.image, imageCaption: "Archivo LIGHT · Fotografía editorial", status: "published", isVisible: true, isFeatured: true, featuredOrder: seed.featuredOrder, author, updatedAt: now }));
}
