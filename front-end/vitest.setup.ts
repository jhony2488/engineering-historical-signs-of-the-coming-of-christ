import "@testing-library/jest-dom/vitest";
import React from "react";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

vi.stubEnv("AUTH_SECRET", "vitest-auth-secret-with-32-chars-minimum");

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.stubEnv("AUTH_SECRET", "vitest-auth-secret-with-32-chars-minimum");  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
});

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => React.createElement("a", { href, ...props }, children),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));
