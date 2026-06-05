import type { Preview } from "@storybook/react";
import React from "react";

import "../src/app/globals.css";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/",
      },
    },
    backgrounds: {
      default: "ink-950",
      values: [
        { name: "ink-950", value: "#0a0c10" },
        { name: "ink-900", value: "#11141c" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-ink-950 text-slate-200 font-sans antialiased">
        <Story />
      </div>
    ),
  ],
};

export default preview;
