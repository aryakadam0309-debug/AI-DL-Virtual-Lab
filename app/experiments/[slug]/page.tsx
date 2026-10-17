import LabApp from '@/components/lab-app'

export default async function ExperimentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return <LabApp view="experiment" slug={slug} />
}
