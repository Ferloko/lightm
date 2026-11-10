import { Globe } from "lucide-react";
import { lightFacebrowserUrl } from "@/lib/facebrowser";

/** "Síguenos" → Facebrowser, la red social de GTA World. Sin perfil configurado se muestra sin enlace. */
export default function FacebrowserLink() {
  return lightFacebrowserUrl
    ? <a href={lightFacebrowserUrl} target="_blank" rel="noreferrer"><Globe size={15} /> Facebrowser</a>
    : <span className="footer-social-pending"><Globe size={15} /> Facebrowser</span>;
}
