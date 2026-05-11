import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { isLocale } from "@/i18n/routing";

export type LegalKind = "terms" | "privacy" | "cookies";

async function readContent(kind: LegalKind, locale: string): Promise<string> {
  const file = path.join(
    process.cwd(),
    "src",
    "content",
    "legal",
    kind,
    `${locale}.md`
  );
  return fs.readFile(file, "utf8");
}

export async function LegalPage({
  kind,
  locale,
}: {
  kind: LegalKind;
  locale: string;
}) {
  if (!isLocale(locale)) notFound();

  const markdown = await readContent(kind, locale);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 md:py-16">
      <article className="prose prose-slate dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
      </article>
    </div>
  );
}
