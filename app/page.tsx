import LabApp from '@/components/lab-app'

export default function Page() { return <LabApp /> }

export const metadata = { title: 'AI-DL Virtual Lab | SPIT Mumbai', description: 'Interactive artificial intelligence and deep learning experiments for SPIT students.' }

export const dynamic = 'force-static'

export function generateViewport() { return { themeColor: '#800000' } }

// Routes are kept in dedicated App Router segments while sharing the same product shell.

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _route = true
