import type { Meta, StoryObj } from "@storybook/react";

import { ExportPdfButton } from "./ExportPdfButton";
import { PageShell } from "./PageShell";

const meta: Meta<typeof PageShell> = {
  title: "UI/PageShell",
  component: PageShell,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-5xl">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PageShell>;

export const Padrao: Story = {
  args: {
    badge: "Monitor",
    title: "Painel Escatológico",
    subtitle: "Convergência de sinais históricos em tempo real.",
    children: (
      <p className="text-slate-400 text-sm mt-6">
        Conteúdo da página renderizado dentro do shell.
      </p>
    ),
  },
};

export const ComAcoes: Story = {
  args: {
    badge: "Área restrita",
    title: "Histórico",
    subtitle: "Série temporal da convicção escatológica.",
    actions: <ExportPdfButton />,
    children: <div className="card-interactive mt-6 p-4 text-sm text-slate-400">Card de exemplo</div>,
  },
};
