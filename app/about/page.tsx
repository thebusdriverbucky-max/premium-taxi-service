export default function AboutPage() {
  return (
    <div className="min-h-screen bg-taxi-dark-navy text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-taxi-gold">About Us</h1>

        <div className="space-y-12">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-taxi-gold-light">Our Story</h2>
            <p className="text-gray-300 mb-4 leading-relaxed">
              Founded in 2024, our taxi service was built with a simple mission: to provide high-quality
              transportation and exceptional customer service. We believe in transparency, reliability, and passenger satisfaction.
            </p>
            <p className="text-gray-300 leading-relaxed">
              What started as a small project has grown into a thriving transportation network serving thousands of passengers.
              We're committed to continuous improvement and innovation in urban mobility.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-taxi-gold-light">Our Mission</h2>
            <p className="text-gray-300 mb-6">
              To make urban travel easy, affordable, and enjoyable for everyone. We strive to offer:
            </p>
            <ul className="space-y-3">
              {[
                { title: "Modern Fleet", desc: "Carefully maintained selection of vehicles" },
                { title: "Competitive Rates", desc: "Best value for your trip" },
                { title: "Fast Pickup", desc: "Quick arrival to your location" },
                { title: "Professional Drivers", desc: "Experienced and polite staff" },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="text-taxi-gold font-bold text-xl">•</span>
                  <span className="text-gray-300">
                    <strong className="text-taxi-gold-light">{item.title}:</strong> {item.desc}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-6 text-taxi-gold-light">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { title: "Integrity", desc: "We believe in honest communication and transparent pricing with our passengers." },
                { title: "Excellence", desc: "We strive for excellence in everything we do, from vehicle maintenance to customer support." },
                { title: "Innovation", desc: "We continuously improve and innovate to better serve our passengers." },
                { title: "Community", desc: "We value our passengers and aim to build a thriving community around our service." },
              ].map((value, i) => (
                <div key={i} className="bg-slate-900/50 rounded-lg border border-taxi-gold/20 p-6 hover:border-taxi-gold/40 transition-colors">
                  <h3 className="font-semibold mb-2 text-taxi-gold">{value.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {value.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-6 text-taxi-gold-light">By The Numbers</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              {[
                { label: "Happy Passengers", value: "10K+" },
                { label: "Vehicles in Fleet", value: "50+" },
                { label: "Service Availability", value: "24/7" },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-900/80 rounded-lg p-8 border border-taxi-gold/10">
                  <p className="text-4xl font-bold text-taxi-gold mb-2">{stat.value}</p>
                  <p className="text-gray-400 uppercase tracking-wider text-xs font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-taxi-gold/5 rounded-2xl p-8 border border-taxi-gold/20 text-center">
            <h2 className="text-2xl font-semibold mb-4 text-taxi-gold">Get In Touch</h2>
            <p className="text-gray-300 mb-8 max-w-lg mx-auto">
              Have questions about our company? We'd love to hear from you!
            </p>
            <a
              href="/contact"
              className="inline-block px-8 py-4 bg-taxi-gold text-taxi-dark-navy font-bold rounded-lg hover:bg-taxi-gold-light transition-colors shadow-lg shadow-taxi-gold/20"
            >
              Contact Us
            </a>
          </section>
        </div>
      </div>
    </div>
  );
}
