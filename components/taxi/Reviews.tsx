import { db as prisma } from "@/lib/db";
import { ReviewCard } from "./ReviewCard";
import { ScrollContainer } from "@/components/ui/ScrollContainer";

export async function Reviews() {
  const reviews = await prisma.taxiReview.findMany({
    where: { isApproved: true },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  if (reviews.length === 0) return null;

  return (
    <section className="py-24 bg-taxi-dark-navy relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-taxi-gold/5 rounded-full blur-[100px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-taxi-gold/5 rounded-full blur-[100px] -ml-48 -mb-48" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-taxi-gold-gradient bg-clip-text text-transparent inline-block">
            What Our Clients Say
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            Real feedback from our valued passengers. We take pride in every journey.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[#0d1424] to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[#0d1424] to-transparent z-10 pointer-events-none" />

          <ScrollContainer className="flex gap-6 pb-4 px-2 snap-x snap-mandatory">
            {reviews.map((review) => (
              <div key={review.id}
                className="flex-shrink-0 w-[85vw] sm:w-[70vw] snap-center md:w-[450px] md:snap-none">
                <ReviewCard review={review} />
              </div>
            ))}
          </ScrollContainer>
        </div>
      </div>
    </section>
  );
}
