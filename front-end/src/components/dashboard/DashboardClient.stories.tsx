import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";

import { installMockFetch } from "@/stories/mockFetch";

import { DashboardClient } from "./DashboardClient";

const meta: Meta<typeof DashboardClient> = {
  title: "Dashboard/DashboardClient",
  component: DashboardClient,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => {
      useEffect(() => installMockFetch(), []);
      return <Story />;
    },
  ],
};

export default meta;
type Story = StoryObj<typeof DashboardClient>;

export const ComDadosMock: Story = {};
