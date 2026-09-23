import { defineCollection } from "astro:content";
import { z } from "zod";
import { glob } from "astro/loaders";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    code: z.string().length(3),
    client: z.string(),
    name: z.string(),
    year: z.string(),
    tags: z.array(z.string()).min(3).max(5),
    accentColor: z.string().optional(),
    repo: z.url().optional(),
    live: z.url().optional(),
    summary: z.string(),
    stack: z.array(z.string()),
    metrics: z
      .array(z.object({ label: z.string(), value: z.string() }))
      .optional(),
    order: z.number(),
  }),
});

const services = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/services" }),
  schema: z.object({
    code: z.string(),
    abbr: z.string().length(3),
    name: z.string(),
    skills: z.array(z.string()).min(3).max(6),
    from: z.string().length(3),
    to: z.string().length(3),
    order: z.number(),
  }),
});

export const collections = { projects, services };
