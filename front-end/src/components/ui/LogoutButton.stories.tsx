import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";

import { installMockFetch } from "@/stories/mockFetch";

import { LogoutButton } from "./LogoutButton";

const meta: Meta<typeof LogoutButton> = {
  title: "UI/LogoutButton",
  component: LogoutButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      useEffect(() => installMockFetch(), []);
      return <Story />;
    },
  ],
};

export default meta;
type Story = StoryObj<typeof LogoutButton>;

export const Padrao: Story = {};
