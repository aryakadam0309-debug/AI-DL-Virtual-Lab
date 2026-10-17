import Link from 'next/link'
import { ArrowRight, BrainCircuit, Calculator, ChartNoAxesCombined, Compass, FlaskConical, Sparkles } from 'lucide-react'
import { Header } from '@/components/lab-app'
import { domainDescriptions, experiments, type Domain } from '@/lib/experiments'

const domainIcons: Record<Domain, typeof Calculator> = {
  Mathematics: Calculator,
  Statistics: ChartNoAxesCombined,
  'Machine Learning': Compass,
  'Deep Learning': BrainCircuit,
  'Artificial Intelligence': Sparkles,
}

const domainSlugs: Record<Domain, string> = {
  Mathematics: 'mathematics',
  Statistics: 'statistics',
  'Machine Learning': 'machine-learning',
  'Deep Learning': 'deep-learning',
  'Artificial Intelligence': 'artificial-intelligence',
}

const recommendations = experiments.filter((experiment) => experiment.implementationStatus === 'Interactive').slice(0, 3)

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="profile-empty"><p>{children}</p></div>
}

export default function ProfilePage() {
  return (
    <>
      <Header />
      <main className="profile-page">
        <div className="profile-shell">
          <section className="profile-header" aria-labelledby="profile-title">
            <div className="profile-avatar" aria-hidden="true">?</div>
            <div className="profile-identity">
              <p className="profile-kicker">STUDENT PROFILE</p>
              <h1 id="profile-title">Guest learner</h1>
              <p className="profile-muted">No account or profile information is connected yet.</p>
              <div className="profile-tags"><span>Course not set</span><span>Branch not set</span><span>Academic year not set</span></div>
            </div>
            <div className="profile-auth-actions"><Link className="profile-button profile-primary" href="/auth/sign-in">Sign In</Link><Link className="profile-button" href="/auth/register">Create Account</Link><p id="profile-edit-note">Sign in to edit your profile and save learning progress.</p></div>
          </section>

          <section className="profile-section" aria-labelledby="stats-title">
            <div className="profile-section-heading"><div><p className="profile-kicker">LEARNING SNAPSHOT</p><h2 id="stats-title">Your statistics</h2></div><p>Start an experiment to begin building a learning record.</p></div>
            <div className="profile-stats">
              {['Experiments attempted', 'Experiments completed', 'Learning time', 'Achievements earned'].map((label) => <div className="profile-stat" key={label}><strong>—</strong><span>{label}</span></div>)}
            </div>
            <p className="profile-helper">Activity tracking is not connected in this frontend-only version, so no progress or completion is being guessed.</p>
          </section>

          <section className="profile-section" aria-labelledby="continue-title">
            <div className="profile-section-heading"><div><p className="profile-kicker">CONTINUE LEARNING</p><h2 id="continue-title">Recommended experiments</h2></div><Link className="profile-text-link" href="/experiments">Browse all <ArrowRight aria-hidden="true" /></Link></div>
            <div className="recommendation-grid">
              {recommendations.map((experiment) => <Link className="recommendation-card" href={`/experiments/${experiment.slug}`} key={experiment.code}><div className="recommendation-top"><span>{experiment.code}</span><span className="status-pill">{experiment.implementationStatus}</span></div><h3>{experiment.title}</h3><p>{experiment.domain} · {experiment.level}</p><ArrowRight aria-hidden="true" /></Link>)}
            </div>
          </section>

          <section className="profile-section" aria-labelledby="domains-title">
            <div className="profile-section-heading"><div><p className="profile-kicker">MY LEARNING DOMAINS</p><h2 id="domains-title">Choose a direction</h2></div><p>Five connected ways into AI and data learning.</p></div>
            <div className="domain-grid">{(Object.keys(domainDescriptions) as Domain[]).map((domain) => { const Icon = domainIcons[domain]; return <Link className="domain-card" href={`/domains/${domainSlugs[domain]}`} key={domain}><Icon aria-hidden="true" /><h3>{domain}</h3><p>{domainDescriptions[domain]}</p><ArrowRight aria-hidden="true" /></Link> })}</div>
          </section>

          <div className="profile-columns">
            <section className="profile-panel" aria-labelledby="activity-title"><p className="profile-kicker">LEARNING ACTIVITY</p><h2 id="activity-title">Recent activity</h2><EmptyState>Activity will appear here after tracking is connected. <Link href="/experiments">Explore experiments</Link> to get started.</EmptyState></section>
            <section className="profile-panel" aria-labelledby="achievements-title"><p className="profile-kicker">ACHIEVEMENTS</p><h2 id="achievements-title">Milestones</h2><EmptyState>Achievements unlock when supported learning activity is recorded.</EmptyState></section>
          </div>

          <section className="profile-settings" aria-labelledby="settings-title"><div><p className="profile-kicker">PROFILE SETTINGS</p><h2 id="settings-title">Private by default</h2><p>Your profile is currently a guest view. Sign in when authentication is connected to personalize this space and save learning progress.</p></div><Link className="profile-outline-link" href="/contact"><FlaskConical aria-hidden="true" />Contact the lab team</Link></section>
        </div>
      </main>
      <style>{`*{box-sizing:border-box}.profile-page{min-height:100vh;background:#faf7f2;color:#1f2937}.profile-shell{max-width:1180px;margin:0 auto;padding:48px 32px 100px}.profile-header{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:24px;padding:32px 0 44px;border-bottom:1px solid #e5ded5}.profile-avatar{display:grid;place-items:center;width:76px;height:76px;border-radius:50%;background:#800000;color:#fff;font-size:30px;font-weight:500}.profile-identity h1{margin:0 0 6px;font-size:clamp(32px,5vw,52px);letter-spacing:-.04em;font-weight:500}.profile-kicker{margin:0 0 10px;color:#800000;font-size:11px;font-weight:700;letter-spacing:.16em}.profile-muted,.profile-section-heading>p,.profile-settings p,.profile-helper{color:#667085;line-height:1.6}.profile-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.profile-tags span,.status-pill{border:1px solid #ded7ce;border-radius:999px;padding:6px 10px;color:#667085;font-size:12px}.profile-auth-actions{display:flex;flex-direction:column;align-items:flex-end;gap:10px}.profile-auth-actions>p{max-width:220px;margin:0;color:#667085;font-size:12px;line-height:1.5;text-align:right}.profile-button{display:inline-flex;align-items:center;justify-content:center;border:1px solid #800000;border-radius:8px;background:#fff;color:#800000;padding:11px 16px;font:inherit;font-size:14px;text-decoration:none}.profile-primary{background:#800000;color:#fff}.profile-primary:hover{background:#990000}.profile-section{padding:44px 0;border-bottom:1px solid #e5ded5}.profile-section-heading{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:20px}.profile-section-heading h2,.profile-panel h2,.profile-settings h2{margin:0;color:#1f2937;font-size:28px;letter-spacing:-.03em;font-weight:500}.profile-section-heading>p{max-width:380px;margin:0;text-align:right}.profile-stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #e5ded5;background:#fff}.profile-stat{display:flex;flex-direction:column;gap:8px;padding:22px;border-right:1px solid #e5ded5}.profile-stat:last-child{border-right:0}.profile-stat strong{color:#800000;font-size:34px;font-weight:500}.profile-stat span{color:#667085;font-size:13px}.profile-helper{margin:14px 0 0;font-size:13px}.profile-text-link,.profile-outline-link{display:inline-flex;align-items:center;gap:8px;color:#800000;font-size:14px;text-decoration:none}.recommendation-grid,.domain-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.recommendation-card,.domain-card{position:relative;display:flex;flex-direction:column;gap:12px;border:1px solid #e5ded5;background:#fff;padding:20px;text-decoration:none;transition:border-color .2s,transform .2s}.recommendation-card:hover,.domain-card:hover{border-color:#800000;transform:translateY(-2px)}.recommendation-top{display:flex;justify-content:space-between;color:#800000;font-size:12px;font-weight:700;letter-spacing:.1em}.recommendation-card h3,.domain-card h3{margin:8px 0 0;color:#1f2937;font-size:18px;font-weight:500}.recommendation-card p,.domain-card p{margin:0;color:#667085;font-size:13px;line-height:1.5}.recommendation-card>svg,.domain-card>svg:last-child{align-self:flex-end;color:#800000}.status-pill{color:#166534;border-color:#bbf7d0;background:#f0fdf4;font-weight:500;letter-spacing:0}.domain-grid{grid-template-columns:repeat(5,1fr)}.domain-card>svg:first-child{color:#800000}.domain-card h3{font-size:16px}.domain-card>svg:last-child{margin-top:auto}.profile-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:44px 0}.profile-panel{min-height:230px;border:1px solid #e5ded5;background:#fff;padding:24px}.profile-empty{display:flex;flex-direction:column;align-items:flex-start;gap:12px;margin-top:24px;color:#667085;font-size:14px;line-height:1.6}.profile-empty svg{color:#800000}.profile-empty p{margin:0}.profile-empty a{color:#800000;text-decoration:underline}.profile-settings{display:flex;justify-content:space-between;align-items:center;gap:24px;border:1px solid #e5ded5;background:#fff;padding:28px}.profile-settings p{max-width:650px;margin:10px 0 0}.profile-outline-link{flex:none;border:1px solid #800000;border-radius:8px;padding:11px 14px}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}@media(max-width:800px){.profile-shell{padding:28px 18px 72px}.profile-header{grid-template-columns:auto 1fr}.profile-button{grid-column:2;justify-self:start}.profile-section-heading{display:block}.profile-section-heading>p{text-align:left;margin-top:8px}.profile-stats,.recommendation-grid,.domain-grid,.profile-columns{grid-template-columns:1fr 1fr}.profile-stat:nth-child(2){border-right:0}.profile-stat:nth-child(-n+2){border-bottom:1px solid #e5ded5}.domain-grid{grid-template-columns:repeat(2,1fr)}.profile-settings{display:block}.profile-outline-link{margin-top:20px}}@media(max-width:480px){.profile-header{grid-template-columns:1fr}.profile-button{grid-column:auto}.profile-stats,.recommendation-grid,.profile-columns,.domain-grid{grid-template-columns:1fr}.profile-stat{border-right:0!important;border-bottom:1px solid #e5ded5}.profile-stat:last-child{border-bottom:0}.profile-section-heading h2,.profile-panel h2,.profile-settings h2{font-size:24px}}`}</style>
    </>
  )
}
