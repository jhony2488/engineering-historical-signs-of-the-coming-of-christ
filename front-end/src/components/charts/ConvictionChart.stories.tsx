import type { Meta, StoryObj } from "@storybook/react";

import { generateMockHistorico } from "@/lib/mock";

import { ConvictionChart } from "./ConvictionChart";

const meta: Meta<typeof ConvictionChart> = {
  title: "Charts/ConvictionChart",
  component: ConvictionChart,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ConvictionChart>;

export const Ultimos30Dias: Story = {
  args: {
    historico: generateMockHistorico(30),
  },
  decorators: [
    (Story) => (
      <div className="card-interactive h-80">
        <Story />
      </div>
    ),
  ],
};
