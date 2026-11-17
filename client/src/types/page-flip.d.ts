declare module "page-flip" {
  export interface PageFlipEvent<T = unknown> { data: T; object: PageFlip }
  export class PageFlip {
    constructor(element: HTMLElement, settings: Record<string, unknown>);
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    on<T = unknown>(event: "flip" | "changeOrientation" | "changeState" | "init" | "update", callback: (event: PageFlipEvent<T>) => void): PageFlip;
    flipNext(corner?: "top" | "bottom"): void;
    flipPrev(corner?: "top" | "bottom"): void;
    flip(page: number, corner?: "top" | "bottom"): void;
    turnToPage(page: number): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getOrientation(): "portrait" | "landscape";
    update(): void;
    destroy(): void;
  }
}
