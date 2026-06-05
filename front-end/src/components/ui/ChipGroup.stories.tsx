import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { ChipGroup } from "./ChipGroup";

const JANELAS = [
  { id: "weekly", label: "Semanal" },
  { id: "monthly", label: "Mensal" },
  { id: "quarterly", label: "Trimestral" },
  { id: "annual", label: "Anual" },
] as const;

const meta: Meta<typeof ChipGroup> = {
  title: "UI/ChipGroup",
  component: ChipGroup,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ChipGroup>;

function ChipGroupInteractive() {
  const [value, setValue] = useState<(typeof JANELAS)[number]["id"]>("monthly");
  return <ChipGroup options={JANELAS} value={value} onChange={setValue} />;
}

export const Interativo: Story = {
  render: () => <ChipGroupInteractive />,
};
