export type PageBlockType = "heading" | "paragraph" | "image" | "quote" | "divider" | "button";

export type PageBlock = {
  id: string;
  type: PageBlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  caption?: string;
  color?: string;
  fontSize?: number;
};

export const CANVAS_WIDTH = 900;

export function makeBlock(type: PageBlockType, index = 0): PageBlock {
  const defaults: Record<PageBlockType, Pick<PageBlock, "width" | "height" | "content" | "fontSize">> = {
    heading: { width: 620, height: 120, content: "Un nuevo título editorial", fontSize: 58 },
    paragraph: { width: 520, height: 120, content: "Escribe una entrada, una observación o el comienzo de una historia.", fontSize: 18 },
    image: { width: 420, height: 280, content: "", fontSize: 16 },
    quote: { width: 500, height: 130, content: "Una frase que merece espacio.", fontSize: 30 },
    divider: { width: 620, height: 2, content: "", fontSize: 16 },
    button: { width: 180, height: 44, content: "Leer más", fontSize: 12 },
  };
  const preset = defaults[type];
  return { id: `${type}-${Date.now()}-${index}`, type, x: 80 + (index % 2) * 40, y: 70 + index * 150, color: "#171717", ...preset };
}

export function starterBlocks(): PageBlock[] {
  return [makeBlock("heading", 0), makeBlock("paragraph", 1), makeBlock("image", 2), makeBlock("quote", 3)];
}

export function blocksHeight(blocks: PageBlock[]) {
  return Math.max(920, ...blocks.map((block) => block.y + block.height + 100));
}
