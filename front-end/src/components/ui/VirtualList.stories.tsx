import type { Meta, StoryObj } from "@storybook/react";

import { VirtualList } from "./VirtualList";

const meta: Meta<typeof VirtualList> = {
  title: "UI/VirtualList",
  component: VirtualList,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof VirtualList>;

const items = Array.from({ length: 40 }, (_, i) => `Evento ${i + 1}`);

export const ListaLonga: Story = {
  args: {
    items,
    itemHeight: 48,
    height: 240,
    renderItem: (item, _index) => (
      <div className="px-3 py-2 border-b border-ink-700/40 text-sm">{String(item)}</div>
    ),
  },
};
