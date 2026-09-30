import { notFound } from 'next/navigation';
import { getPageBySlug } from '@/app/actions/cms';
import ContactContent from '@/components/cms/contact-content';

export default async function ContactPage() {
  const result = await getPageBySlug('contact');
  const page = result.success ? result.data : null;
  if (!page) notFound();
  return <ContactContent title={page.title} content={page.content} />;
}
