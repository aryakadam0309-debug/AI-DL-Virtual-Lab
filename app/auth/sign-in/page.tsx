'use client'

import Link from 'next/link'
import { FormEvent, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LockKeyhole } from 'lucide-react'

export default function SignInPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitted(false)
    setError('Authentication is not connected yet. Connect a provider before signing in.')
  }

  return <main className="auth-page"><div className="auth-shell"><Link href="/" className="auth-back"><ArrowLeft aria-hidden="true" /> Back to lab</Link><section className="auth-card"><div className="auth-mark"><LockKeyhole aria-hidden="true" /></div><p className="auth-kicker">SPIT · AI-DL VIRTUAL LAB</p><h1>Welcome back</h1><p className="auth-copy">Sign in to save your profile and keep a record of your experiments.</p>{error && <p className="auth-message auth-error" role="alert">{error}</p>}{submitted && <p className="auth-message auth-success" role="status">Signed in successfully.</p>}<form onSubmit={handleSubmit} className="auth-form"><label>Email<input name="email" type="email" autoComplete="email" required placeholder="you@example.com" /></label><label>Password<span className="auth-password"><input name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required minLength={8} placeholder="At least 8 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></span></label><button className="auth-submit" type="submit">Sign In</button></form><p className="auth-switch">New to the lab? <Link href="/auth/register">Create Account</Link></p><p className="auth-note">This screen is ready for a real authentication provider. No credentials are stored or simulated in this frontend.</p></section></div><style>{styles}</style></main>
}

const styles = `*{box-sizing:border-box}.auth-page{min-height:100vh;background:#faf7f2;color:#1f2937;padding:28px 20px}.auth-shell{max-width:460px;margin:0 auto}.auth-back{display:inline-flex;align-items:center;gap:8px;color:#800000;font-size:14px;font-weight:600}.auth-back svg{width:16px}.auth-card{margin-top:44px;border:1px solid #e5ded5;background:#fff;padding:36px;border-radius:18px;box-shadow:0 18px 50px rgba(128,0,0,.08)}.auth-mark{display:grid;place-items:center;width:48px;height:48px;border-radius:12px;background:#800000;color:#fff}.auth-mark svg{width:21px}.auth-kicker{margin:20px 0 10px;color:#800000;font-size:11px;font-weight:700;letter-spacing:.16em}.auth-card h1{margin:0;font-family:Georgia,serif;font-size:38px;letter-spacing:-.04em}.auth-copy{margin:10px 0 24px;color:#667085;line-height:1.6}.auth-form{display:flex;flex-direction:column;gap:16px}.auth-form label{display:flex;flex-direction:column;gap:7px;color:#344054;font-size:13px;font-weight:600}.auth-form input{width:100%;border:1px solid #ded7ce;border-radius:8px;background:#fff;padding:12px;font:inherit;font-weight:400;outline:none}.auth-form input:focus{border-color:#800000;box-shadow:0 0 0 3px rgba(128,0,0,.1)}.auth-password{position:relative}.auth-password button{position:absolute;right:8px;top:8px;border:0;background:transparent;color:#667085;padding:4px;cursor:pointer}.auth-password svg{width:18px}.auth-submit{margin-top:4px;border:0;border-radius:8px;background:#800000;color:#fff;padding:13px;font:inherit;font-weight:700;cursor:pointer}.auth-submit:hover{background:#990000}.auth-switch{margin:22px 0 0;text-align:center;color:#667085;font-size:14px}.auth-switch a{color:#800000;font-weight:700}.auth-note{margin:20px 0 0;border-top:1px solid #eee7df;padding-top:16px;color:#98a2b3;font-size:12px;line-height:1.6}.auth-message{border-radius:8px;padding:10px 12px;font-size:13px;line-height:1.5}.auth-error{background:#fff1f0;color:#a33a2e}.auth-success{background:#effaf3;color:#217346}@media(max-width:520px){.auth-page{padding:20px 16px}.auth-card{margin-top:28px;padding:26px 20px}}`
