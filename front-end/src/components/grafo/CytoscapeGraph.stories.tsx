import type { Meta, StoryObj } from "@storybook/react";

import { MOCK_CENARIOS, MOCK_NOS_GRAFO, buildGrafoArestas } from "@/lib/mock-cenarios";

import { CytoscapeGraph } from "./CytoscapeGraph";

const meta: Meta<typeof CytoscapeGraph> = {
  title: "Grafo/CytoscapeGraph",
  component: CytoscapeGraph,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CytoscapeGraph>;

export const GrafoDemo: Story = {
  args: {
    nos: MOCK_NOS_GRAFO,
    cenarios: MOCK_CENARIOS.map((c) => ({ id: c.id, titulo: c.titulo })),
    arestas: buildGrafoArestas(),
    ativos: new Set(["macro-cbdc", "evt-cbdc-obrigatoria"]),
    height: 400,
  },
};
