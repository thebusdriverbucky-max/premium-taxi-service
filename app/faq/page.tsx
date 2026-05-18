import { db } from "@/lib/db";

export default async function FaqPage() {
  const items = await db.faqItem.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    const cat = item.category || "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-taxi-gold-gradient bg-clip-text text-transparent">
          Frequently Asked Questions
        </h1>
        <p className="text-gray-400">Everything you need to know about our taxi service</p>
      </div>

      {Object.entries(grouped).map(([category, faqs]) => (
        <div key={category} className="mb-10">
          {Object.keys(grouped).length > 1 && (
            <h2 className="text-sm font-bold uppercase tracking-widest text-taxi-gold mb-4 pb-2 border-b border-taxi-gold/20">
              {category}
            </h2>
          )}
          <div className="space-y-3">
            {faqs.map(faq => (
              <details
                key={faq.id}
                className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
              >
                <summary className="flex items-center justify-between cursor-pointer p-5 font-medium text-white list-none">
                  <span>{faq.question}</span>
                  <span className="text-taxi-gold transition-transform group-open:rotate-45 text-xl leading-none ml-4 shrink-0">+</span>
                </summary>
                <div className="px-5 pb-5 text-gray-400 text-sm leading-relaxed whitespace-pre-wrap">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      ))}

      {items.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          No FAQ items yet.
        </div>
      )}
    </div>
  );
}
