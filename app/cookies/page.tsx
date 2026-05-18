export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-taxi-dark-navy text-white">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold mb-8 text-taxi-gold">Cookie Policy</h1>
        <div className="prose prose-lg max-w-none prose-invert prose-headings:text-taxi-gold prose-strong:text-taxi-gold-light">
          <p className="text-gray-300">Last updated: {new Date().toLocaleDateString('en-GB')}</p>

          <h2>1. What Are Cookies</h2>
          <p>Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the owners of the site.</p>

          <h2>2. How We Use Cookies</h2>
          <p>We use cookies for the following purposes:</p>
          <ul>
            <li><strong>Essential/Session Cookies:</strong> These cookies are necessary for the website to function properly. They enable you to log in, book rides, and securely access your account.</li>
            <li><strong>Analytics Cookies:</strong> We use these cookies to understand how visitors interact with our website, helping us improve our services and user experience.</li>
          </ul>

          <h2>3. Managing Cookies</h2>
          <p>Most web browsers allow you to control cookies through their settings preferences. However, if you limit the ability of websites to set cookies, you may worsen your overall user experience, since it will no longer be personalized to you.</p>

          <h2>4. Contact Us</h2>
          <p>If you have any questions about our use of cookies, please contact us at [Email].</p>
        </div>
      </div>
    </div>
  );
}
