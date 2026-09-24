import { notFound } from "next/navigation";

import { getPageBySlug } from "@/app/actions/cms";

interface ContentPageProps {
  slug: string;
  fallbackTitle: string;
}

export async function ContentPage({ slug, fallbackTitle }: ContentPageProps) {
  const result = await getPageBySlug(slug);
  const page = result.success ? result.data : null;

  if (!page) notFound();

  return (
    <div className="min-h-screen bg-taxi-dark-navy text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-taxi-gold">
          {page.title || fallbackTitle}
        </h1>
        <div className="prose prose-lg max-w-none prose-invert prose-headings:text-taxi-gold prose-strong:text-taxi-gold-light whitespace-pre-wrap">
          {page.content}
        </div>
      </div>
    </div>
  );
}
