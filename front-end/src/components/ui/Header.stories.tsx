import type { Meta, StoryObj } from "@storybook/react";

import { Header } from "./Header";

const meta: Meta<typeof Header> = {
  title: "UI/Header",
  component: Header,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Header>;

export const Publico: Story = {
  args: { variant: "public" },
};

export const Admin: Story = {
  args: {
    variant: "admin",
    dataReferencia: "2026-06-04",
    fromCache: true,
    dataSource: "db",
  },
};

export const ComDemo: Story = {
  args: {
    variant: "public",
    dataReferencia: "2026-06-04",
    isMock: true,
    fromCache: false,
    dataSource: "fastapi",
  },
};
