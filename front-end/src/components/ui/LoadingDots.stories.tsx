import type { Meta, StoryObj } from "@storybook/react";

import { LoadingDots } from "./LoadingDots";

const meta: Meta<typeof LoadingDots> = {
  title: "UI/LoadingDots",
  component: LoadingDots,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof LoadingDots>;

export const Padrao: Story = {};
