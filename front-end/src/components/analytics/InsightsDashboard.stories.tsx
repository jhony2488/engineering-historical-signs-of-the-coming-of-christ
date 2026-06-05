import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";

import { installMockFetch } from "@/stories/mockFetch";
import { withAdminLayout } from "@/stories/decorators";

import { InsightsDashboard } from "./InsightsDashboard";

const meta: Meta<typeof InsightsDashboard> = {
  title: "Analytics/InsightsDashboard",
  component: InsightsDashboard,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    withAdminLayout,
    (Story) => {
      useEffect(() => installMockFetch(), []);
      return <Story />;
    },
  ],
};

export default meta;
type Story = StoryObj<typeof InsightsDashboard>;

export const ComMetricas: Story = {};
