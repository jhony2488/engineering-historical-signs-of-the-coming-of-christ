import type { Decorator } from "@storybook/react";

import { Header } from "@/components/ui/Header";

/** Layout admin com Header — para stories de páginas internas. */
export const withAdminLayout: Decorator = (Story) => (
  <>
    <Header variant="admin" dataReferencia="2026-06-04" dataSource="db" />
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Story />
    </div>
  </>
);

/** Layout público com Header visitante. */
export const withPublicLayout: Decorator = (Story) => (
  <>
    <Header variant="public" />
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Story />
    </div>
  </>
);
