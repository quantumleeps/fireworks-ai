import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { source } from "@/app/lib/source";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.getPageTree()}
      nav={{
        title: "neeter",
      }}
      links={[
        {
          text: "GitHub",
          url: "https://github.com/quantumleeps/neeter",
          external: true,
        },
      ]}
    >
      {children}
    </DocsLayout>
  );
}
