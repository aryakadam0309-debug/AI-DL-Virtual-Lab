import LabApp from '@/components/lab-app'

export default async function DomainPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <LabApp view="domain" domainSlug={slug} />
}

export function generateStaticParams() {
  return ['mathematics', 'statistics', 'machine-learning', 'deep-learning', 'artificial-intelligence'].map((slug) => ({ slug }))
}
