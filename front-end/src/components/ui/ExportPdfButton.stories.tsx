import type { Meta, StoryObj } from "@storybook/react";

import { ExportPdfButton } from "./ExportPdfButton";

const meta: Meta<typeof ExportPdfButton> = {
  title: "UI/ExportPdfButton",
  component: ExportPdfButton,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ExportPdfButton>;

export const Padrao: Story = {};
