import type { Meta, StoryObj } from "@storybook/react";

import { LazySplineScene } from "./LazySplineScene";
import { SplineSceneFallback } from "./SplineSceneFallback";

const meta: Meta<typeof LazySplineScene> = {
  title: "Spline/LazySplineScene",
  component: LazySplineScene,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [
    (Story) => {
      const original = globalThis.IntersectionObserver;

      class StoryIntersectionObserver implements IntersectionObserver {
        readonly root = null;
        readonly rootMargin = "0px";
        readonly thresholds = [0];

        disconnect(): void {}
        observe(): void {}
        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }
        unobserve(): void {}
      }

      globalThis.IntersectionObserver = StoryIntersectionObserver;
      try {
        return (
          <div className="h-[240px] w-[180px]">
            <Story />
          </div>
        );
      } finally {
        globalThis.IntersectionObserver = original;
      }
    },
  ],
  args: {
    scene: "/biblically_accurate_angel_eyes_and_rings.spline",
  },
};

export default meta;
type Story = StoryObj<typeof LazySplineScene>;

export const DeferredFallback: Story = {};

export const FallbackOnly: Story = {
  name: "SplineSceneFallback",
  render: () => (
    <div className="h-[240px] w-[180px]">
      <SplineSceneFallback />
    </div>
  ),
};