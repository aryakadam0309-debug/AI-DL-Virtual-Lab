'use client'

import { FormEvent, useState } from 'react'
import LabApp from '@/components/lab-app'

export default function ContactPage() {
  const [status, setStatus] = useState<'idle' | 'success'>('idle')
  const [error, setError] = useState('')
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const name = String(data.get('name') || '').trim()
    const email = String(data.get('email') || '').trim()
    const subject = String(data.get('subject') || '').trim()
    const message = String(data.get('message') || '').trim()
    if (!name || !subject || !message) return setError('Please complete all required fields.')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter a valid email address.')
    setError('')
    setStatus('success')
    form.reset()
  }
  return <><LabApp view="contact" /><section className="mx-auto max-w-3xl px-5 pb-20 lg:px-8"><div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm md:p-8"><h2 className="font-serif text-2xl font-semibold">Send feedback</h2><p className="mt-2 text-sm leading-6 text-slate-600">The form is ready for review, but delivery is not configured yet. Your message is not sent or stored.</p>{status === 'success' && <p role="status" className="mt-5 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">Thanks. Your feedback was validated locally. Delivery is not configured, so no message was sent.</p>}{error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}<form onSubmit={submit} className="mt-6 flex flex-col gap-5"><label className="flex flex-col gap-2 text-sm font-medium">Full name<input name="name" required className="rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20" /></label><label className="flex flex-col gap-2 text-sm font-medium">Email address<input name="email" type="email" required className="rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20" /></label><label className="flex flex-col gap-2 text-sm font-medium">Subject<input name="subject" required className="rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20" /></label><label className="flex flex-col gap-2 text-sm font-medium">Reason (optional)<select name="reason" className="rounded-lg border border-stone-300 bg-white px-3 py-2.5"><option>General enquiry</option><option>Simulation issue</option><option>Content correction</option><option>Accessibility or usability feedback</option><option>Feature suggestion</option><option>Other</option></select></label><label className="flex flex-col gap-2 text-sm font-medium">Message<textarea name="message" required rows={6} className="resize-y rounded-lg border border-stone-300 px-3 py-2.5 outline-none focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/20" /></label><div className="flex flex-wrap gap-3"><button type="submit" className="rounded-lg bg-[#800000] px-5 py-3 text-sm font-semibold text-white hover:bg-[#990000]">Validate feedback</button>{status === 'success' && <button type="button" onClick={() => setStatus('idle')} className="rounded-lg border border-stone-300 px-5 py-3 text-sm font-semibold">Reset status</button>}</div></form></div></section></>
}

