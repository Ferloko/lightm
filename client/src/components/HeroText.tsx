import { Fragment } from "react";

/** Texto de una cabecera editable en Banners: cada salto de línea es un salto y *así* va en cursiva. */
export default function HeroText({ value }: { value: string }) {
  return <>{value.split("\n").map((line, index) => <Fragment key={index}>{index > 0 && <br />}{line.split(/\*([^*]+)\*/).map((part, partIndex) => partIndex % 2 ? <em key={partIndex}>{part}</em> : part)}</Fragment>)}</>;
}
