import type { Meta, StoryObj } from "@storybook/react";

import { NavLinks } from "./NavLinks";

const PUBLIC_LINKS = [
  { href: "/", label: "Painel" },
  { href: "/rankings", label: "Rankings" },
] as const;

const ADMIN_LINKS = [
  { href: "/historico", label: "Histórico" },
  { href: "/simulador", label: "Simulador" },
  { href: "/grafo", label: "Grafo" },
  { href: "/insights", label: "Insights" },
  { href: "/revisao", label: "Revisão" },
] as const;

const meta: Meta<typeof NavLinks> = {
  title: "UI/NavLinks",
  component: NavLinks,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof NavLinks>;

export const Publico: Story = {
  args: { links: PUBLIC_LINKS },
  parameters: { nextjs: { navigation: { pathname: "/" } } },
  decorators: [
    (Story) => (
      <nav className="flex gap-4">
        <Story />
      </nav>
    ),
  ],
};

export const AdminAtivo: Story = {
  args: { links: ADMIN_LINKS },
  parameters: { nextjs: { navigation: { pathname: "/grafo" } } },
  decorators: [
    (Story) => (
      <nav className="flex flex-wrap gap-4">
        <Story />
      </nav>
    ),
  ],
};
