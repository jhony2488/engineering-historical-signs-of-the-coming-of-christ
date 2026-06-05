import type { Meta, StoryObj } from "@storybook/react";

import { SNAPSHOT_NIVEL2, SNAPSHOT_NIVEL3 } from "@/components/__tests__/fixtures";

import { SynthesisPanel } from "./SynthesisPanel";

const meta: Meta<typeof SynthesisPanel> = {
  title: "Historico/SynthesisPanel",
  component: SynthesisPanel,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SynthesisPanel>;

export const Nivel2: Story = {
  args: {
    snapshot: SNAPSHOT_NIVEL2,
    hybrid: null,
    motorLabel: "Nível 2 — Mensal",
  },
};

export const Hibrido: Story = {
  args: {
    snapshot: SNAPSHOT_NIVEL2,
    hybrid: SNAPSHOT_NIVEL3,
    motorLabel: "Nível 3 — Anual",
  },
};

export const Carregando: Story = {
  args: {
    snapshot: null,
    hybrid: null,
    loading: true,
  },
};
