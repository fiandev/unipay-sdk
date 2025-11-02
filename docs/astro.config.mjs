// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  vite: {
    server: {
      allowedHosts: ["https://unipay.fiandev.com"],
    },
  },

  site: "https://unipay.fiandev.com",

  server: {
    port: 3521,
    host: "0.0.0.0",
  },

  integrations: [
    starlight({
      title: "UniPay SDK",
      favicon: "/favicon.svg",
      locales: {
        root: {
          lang: "en",
          label: "English",
        },
      },
      social: [
        {
          icon: "github",
          label: "Github",
          href: "https://github.com/fiandev/unipay-sdk",
        },
      ],
      sidebar: [
        {
          label: "Getting Started",
          items: [
            {
              link: "/docs",
              label: "Introduction",
            },
            {
              link: "/docs/getting-started",
              label: "Getting Started",
            },
          ],
        },
        {
          label: "API Reference",
          items: [
            {
              link: "/docs/api-reference",
              label: "API Reference",
            },
          ],
        },
        {
          label: "Providers",
          items: [
            {
              link: "/docs/providers",
              label: "Payment Providers",
            },
          ],
        },
        {
          label: "Guides",
          collapsed: true,
          items: [
            {
              link: "/docs/examples",
              label: "Examples",
            },
            {
              link: "/docs/configuration",
              label: "Configuration",
            },
            {
              link: "/docs/error-handling",
              label: "Error Handling",
            },
            {
              link: "/docs/migration",
              label: "Migration & Upgrades",
            },
          ],
        },
      ],
    }),
    tailwind(),
    sitemap(),
  ],

  adapter: node({
    mode: "standalone",
  }),
});