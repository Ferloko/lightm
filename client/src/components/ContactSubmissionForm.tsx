import { ArrowUpRight, LoaderCircle } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "wouter";
import { createContactSubmission } from "@/lib/contactSubmissions";

export default function ContactSubmissionForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setNotice(null);
    try {
      await createContactSubmission({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), comment: comment.trim() });
      setNotice({ type: "success", text: "Gracias. Tu mensaje ya llegó al equipo LIGHT." });
      setFirstName("");
      setLastName("");
      setEmail("");
      setComment("");
    } catch (error) {
      setNotice({ type: "error", text: error instanceof Error ? `No pudimos enviar tu mensaje: ${error.message}` : "No pudimos enviar tu mensaje. Inténtalo de nuevo." });
    } finally {
      setSending(false);
    }
  };

  return <section className="business-contact-form-section" id="colaboraciones" aria-labelledby="business-contact-title">
    <div className="business-contact-form-section__intro">
      <p className="eyebrow">Business / Colaboraciones</p>
      <h2 id="business-contact-title">Cuéntanos tu<br /><em>idea.</em></h2>
      <p>Comparte tu propuesta editorial, comercial, de prensa o de colaboración con el equipo LIGHT.</p>
    </div>
    <form className="business-contact-form" onSubmit={(event) => void submit(event)}>
      <div className="business-contact-form__fields">
        <label><span>Nombre</span><input autoComplete="given-name" name="firstName" required maxLength={120} value={firstName} onChange={(event) => setFirstName(event.target.value)} placeholder="Tu nombre" /></label>
        <label><span>Apellido</span><input autoComplete="family-name" name="lastName" required maxLength={120} value={lastName} onChange={(event) => setLastName(event.target.value)} placeholder="Tu apellido" /></label>
        <label className="business-contact-form__email"><span>Correo</span><input autoComplete="email" name="email" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nombre@correo.com" /></label>
        <label className="business-contact-form__comment"><span>Comentario</span><textarea name="comment" required minLength={5} maxLength={5000} rows={5} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Cuéntanos un poco más sobre tu propuesta…" /></label>
      </div>
      <div className="business-contact-form__bottom"><p>Al enviar, el equipo LIGHT recibirá tus datos para responder. Consulta nuestra <Link href="/privacidad">política de privacidad</Link>.</p><button type="submit" disabled={sending}>{sending ? <><LoaderCircle className="business-contact-form__spinner" size={15} /> Enviando…</> : <>Enviar mensaje <ArrowUpRight size={16} /></>}</button></div>
      {notice && <p className={`business-contact-form__notice business-contact-form__notice--${notice.type}`} role="status" aria-live="polite">{notice.text}</p>}
    </form>
  </section>;
}
