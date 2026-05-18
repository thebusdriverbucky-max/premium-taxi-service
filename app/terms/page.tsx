export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-taxi-dark-navy text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-taxi-gold">Terms of Service</h1>
        <div className="prose prose-lg max-w-none prose-invert prose-headings:text-taxi-gold prose-strong:text-taxi-gold-light">
          <p className="text-gray-300">Last updated: {new Date().toLocaleDateString('en-GB')}</p>

          <h2>1. Acceptance of Terms</h2>
          <p>By accessing and using [Company Name]'s taxi service, you agree to be bound by these Terms of Service.</p>

          <h2>2. Use of Service</h2>
          <p>You must be at least 18 years old to use our service. You agree to provide accurate information when booking a ride and to comply with all applicable laws.</p>

          <h2>3. Booking and Cancellation Policy</h2>
          <ul>
            <li>You can book a ride through our website or app.</li>
            <li><strong>Cancellation:</strong> You may cancel your ride without charge up to 5 minutes after booking or before the driver is dispatched. Cancellations made after this period may incur a cancellation fee.</li>
          </ul>

          <h2>4. Payment</h2>
          <p>All payments are processed securely via Stripe. By booking a ride, you authorize us to charge your selected payment method for the estimated fare, tolls, and any applicable fees.</p>

          <h2>5. Liability</h2>
          <p>[Company Name] is not liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the service. We do not guarantee the availability of rides at all times.</p>

          <h2>6. Contact Information</h2>
          <p>For any questions regarding these terms, please contact us at [Email] or visit our office in [City].</p>
        </div>
      </div>
    </div>
  );
}
