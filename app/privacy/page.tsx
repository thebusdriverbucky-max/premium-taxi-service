export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-taxi-dark-navy text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-taxi-gold">Privacy Policy</h1>
        <div className="prose prose-lg max-w-none prose-invert prose-headings:text-taxi-gold prose-strong:text-taxi-gold-light">
          <p className="text-gray-300">Last updated: {new Date().toLocaleDateString('en-GB')}</p>

          <h2>1. Information We Collect</h2>
          <p>We collect information to provide better services to our users. This includes:</p>
          <ul>
            <li><strong>Account Data:</strong> When you create an account, we collect your name, email address, and phone number.</li>
            <li><strong>Trip Data:</strong> We collect pickup and dropoff locations, route information, and timestamps for your rides.</li>
            <li><strong>Payment Data:</strong> Payments are processed securely via Stripe. We do not store your full credit card details on our servers.</li>
            <li><strong>Cookies:</strong> We use cookies to maintain your session and improve your experience on our platform.</li>
          </ul>

          <h2>2. How We Use Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our taxi services.</li>
            <li>Process your transactions and send related information.</li>
            <li>Send you technical notices, updates, security alerts, and support messages.</li>
            <li>Respond to your comments, questions, and requests.</li>
          </ul>

          <h2>3. Information Sharing</h2>
          <p>We may share your information with:</p>
          <ul>
            <li>Drivers to facilitate your ride (e.g., pickup location, name).</li>
            <li>Third-party service providers like Stripe for payment processing.</li>
            <li>Law enforcement or other authorities if required by law.</li>
          </ul>

          <h2>4. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at [Email].</p>
        </div>
      </div>
    </div>
  );
}
