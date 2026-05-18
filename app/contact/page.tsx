'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useSettings } from '@/components/providers/settings-provider';
import { Phone, MessageSquare, Clock, MapPin, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ContactPage() {
  const { settings } = useSettings();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.subject.length < 5) {
      toast.error("Subject must be at least 5 characters long");
      return;
    }

    if (formData.message.length < 10) {
      toast.error("Message must be at least 10 characters long");
      return;
    }

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setSubmitted(false), 5000);
      } else {
        if (response.status === 429) {
          toast.error("Too many requests. Please try again later.");
        } else {
          toast.error("Failed to send message. Please try again.");
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error("An error occurred while sending the message.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-taxi-gold-gradient bg-clip-text text-transparent">Contact Us</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Have a question? We'd love to hear from you. Send us a message and we'll get back to you as soon as possible.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="md:col-span-2">
          {submitted && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-200">
                ✓ Thank you for your message! We'll get back to you soon.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6 bg-white/5 p-8 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-md">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Your name"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-taxi-gold/50"
              />
              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-taxi-gold/50"
              />
            </div>
            <Input
              label="Subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              placeholder="What is this about?"
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-taxi-gold/50"
            />
            <Textarea
              label="Message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              placeholder="Tell us more about your inquiry..."
              rows={6}
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-taxi-gold/50"
            />
            <Button type="submit" className="w-full bg-taxi-gold-gradient hover:opacity-90 text-taxi-dark-navy font-bold py-4 rounded-2xl transition-all duration-300 shadow-lg shadow-taxi-gold/20">
              Send Message
            </Button>
          </form>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold mb-6">Contact Information</h3>
            <div className="space-y-6">
              {settings?.phoneNumber && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-taxi-gold/10 flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-taxi-gold" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Phone</p>
                    <a href={`tel:${settings.phoneNumber}`} className="text-lg hover:text-taxi-gold transition-colors">
                      {settings.phoneNumber}
                    </a>
                  </div>
                </div>
              )}

              {settings?.whatsappNumber && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">WhatsApp</p>
                    <a
                      href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg hover:text-green-500 transition-colors"
                    >
                      {settings.whatsappNumber}
                    </a>
                  </div>
                </div>
              )}

              {settings?.storeEmail && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Email</p>
                    <a href={`mailto:${settings.storeEmail}`} className="text-lg hover:text-blue-500 transition-colors">
                      {settings.storeEmail}
                    </a>
                  </div>
                </div>
              )}

              {settings?.workingHours && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Working Hours</p>
                    <p className="text-lg">{settings.workingHours}</p>
                  </div>
                </div>
              )}

              {settings?.serviceArea && (
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold">Service Area</p>
                    <p className="text-lg">{settings.serviceArea}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
