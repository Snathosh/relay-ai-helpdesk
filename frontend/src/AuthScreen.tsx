import { useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Sparkles } from 'lucide-react'

export type Account = { name: string; email: string; initials: string }
export type AuthMode = 'login' | 'register'

interface AuthScreenProps {
  error: string
  isSubmitting: boolean
  csrfReady: boolean
  onSubmit: (mode: AuthMode, details: { name: string; email: string; password: string }) => void
}

export default function AuthScreen({ error, isSubmitting, csrfReady, onSubmit }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('register')
  const [name, setName] = useState('Santhosh')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function submit(event: FormEvent) {
    event.preventDefault()
    onSubmit(mode, { name: name.trim(), email: email.trim(), password })
  }

  return (
    <main className="auth-page">
      <section className="auth-aside">
        <a className="auth-brand" href="#home" aria-label="Relay home"><span className="brand-mark"><span /></span><span>relay<span className="brand-period">.</span></span></a>
        <div className="auth-message">
          <span className="auth-overline"><i /> SUPPORT, WITH CONTEXT</span>
          <h1>Less waiting.<br />More <em>solved.</em></h1>
          <p>Your support conversations, documents, and requests, all moving in one direction.</p>
        </div>
        <div className="auth-quote"><Sparkles size={16} /><span>Good support starts with<br />being heard.</span><i /></div>
        <span className="auth-aside-foot">RELAY SUPPORT WORKSPACE · 2026</span>
      </section>
      <section className="auth-main">
        <div className="auth-form-wrap">
          <div className="auth-heading"><span className="auth-kicker">{mode === 'register' ? 'YOUR SUPPORT DESK' : 'WELCOME BACK'}</span><h2>{mode === 'register' ? 'Create your account' : 'Sign in to Relay'}</h2><p>{mode === 'register' ? 'A better support experience starts here.' : 'Pick up where you left off.'}</p></div>
          <div className="auth-tabs" role="tablist" aria-label="Account access"><button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'selected' : ''} onClick={() => setMode('register')}>Create account</button><button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'selected' : ''} onClick={() => setMode('login')}>Sign in</button></div>
          <form className="auth-form" onSubmit={submit}>
            {mode === 'register' && <label className="auth-field"><span>Your name</span><div className="auth-input-wrap"><input autoComplete="name" minLength={2} maxLength={80} required value={name} onChange={(event) => setName(event.target.value)} placeholder="Santhosh" /></div></label>}
            <label className="auth-field"><span>Email address</span><div className="auth-input-wrap"><Mail size={16} /><input type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></div></label>
            <label className="auth-field"><span>Password</span><div className="auth-input-wrap"><LockKeyhole size={16} /><input type={showPassword ? 'text' : 'password'} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} minLength={mode === 'register' ? 10 : undefined} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === 'register' ? 'At least 10 characters' : 'Your password'} /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <button className="auth-submit" type="submit" disabled={!csrfReady || isSubmitting}><span>{isSubmitting ? 'Please wait...' : mode === 'register' ? 'Create account' : 'Sign in'}</span>{!isSubmitting && <ArrowRight size={16} />}</button>
            {mode === 'register' && <p className="auth-terms">By creating an account, you agree to keep your password private and use this workspace responsibly.</p>}
          </form>
          <div className="auth-security"><LockKeyhole size={13} /><span>Passwords are encrypted before they are stored.</span></div>
        </div>
        <span className="auth-mobile-brand">RELAY SUPPORT WORKSPACE</span>
      </section>
    </main>
  )
}
