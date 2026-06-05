declare module "cytoscape" {
  interface Core {
    destroy(): void;
  }

  interface CytoscapeOptions {
    container: HTMLElement;
    elements: unknown[];
    style: unknown[];
    layout: Record<string, unknown>;
    minZoom?: number;
    maxZoom?: number;
  }

  function cytoscape(options: CytoscapeOptions): Core;
  export default cytoscape;
}
