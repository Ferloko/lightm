import { Globe, MessagesSquare } from "lucide-react";
import { lightFacebrowserUrl } from "@/lib/facebrowser";

/** Hilo de LIGHT Magazine en el foro de GTA World. */
export const GTAW_FORUM_TOPIC = "https://foro-es.gta.world/topic/2424-light-magazine";

/** "Síguenos": Facebrowser (red social de GTA World) y el hilo de LIGHT en el foro de GTAW. */
export default function FollowLinks() {
  return <>
    {lightFacebrowserUrl
      ? <a href={lightFacebrowserUrl} target="_blank" rel="noreferrer"><Globe size={15} /> Facebrowser</a>
      : <span className="footer-social-pending"><Globe size={15} /> Facebrowser</span>}
    <a href={GTAW_FORUM_TOPIC} target="_blank" rel="noreferrer"><MessagesSquare size={15} /> Foro de GTAW</a>
  </>;
}
