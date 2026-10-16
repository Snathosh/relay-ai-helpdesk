import { useEffect, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import AuthScreen from './AuthScreen'
import type { Account, AuthMode } from './AuthScreen'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown,
  CircleHelp, Clock3, FileText, Headphones, LifeBuoy, LoaderCircle,
  MessageCircle, Paperclip, Plus, Search, Send, ShieldCheck, Sparkles, Ticket,
  Upload, X,
} from 'lucide-react'

type View = 'assistant' | 'tickets' | 'knowledge'
type Message = { role: 'user' | 'assistant'; text: string; time: string }
type HelpTicket = { id: string; title: string; status: 'Open' | 'In progress' | 'Resolved'; updated: string }

const prompts = [
  { icon: ShieldCheck, title: 'Account & access', detail: 'Reset a password or manage permissions' },
  { icon: FileText, title: 'Billing question', detail: 'Plans, invoices, and payment details' },
  { icon: LifeBuoy, title: 'Something is broken', detail: 'Troubleshoot a product issue' },
]

function currentTime() {
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date())
}

function App() {
  const [account, setAccount] = useState<Account | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [csrfToken, setCsrfToken] = useState('')
  const [authError, setAuthError] = useState('')
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [view, setView] = useState<View>('assistant')
  const [messages, setMessages] = useState<Message[]>([])
  const [question, setQuestion] = useState('')
  const [tickets, setTickets] = useState<HelpTicket[]>([])
  const [activeFile, setActiveFile] = useState<File | null>(null)
  const [uploadName, setUploadName] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [ticketTitle, setTicketTitle] = useState('')
  const [ticketDetails, setTicketDetails] = useState('')
  const [notice, setNotice] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const docsInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let mounted = true
    Promise.all([
      fetch('/api/auth/csrf').then(async (response) => response.ok ? await response.json() as { token: string } : null),
      fetch('/api/auth/me').then(async (response) => response.ok ? await response.json() as Account : null),
    ]).then(([csrf, currentAccount]) => {
      if (!mounted) return
      setCsrfToken(csrf?.token ?? '')
      setAccount(currentAccount)
      if (!csrf) setAuthError('Cannot reach the helpdesk API. Start the backend and try again.')
    }).catch(() => {
      if (mounted) setAuthError('Cannot reach the helpdesk API. Start the backend and try again.')
    }).finally(() => {
      if (mounted) setAuthReady(true)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    if (!account) return
    let mounted = true
    fetch('/api/tickets')
      .then(async (response) => response.ok ? await response.json() as HelpTicket[] : null)
      .then((savedTickets) => { if (mounted && savedTickets) setTickets(savedTickets) })
      .catch(() => undefined)
    return () => { mounted = false }
  }, [account])

  async function authenticate(mode: AuthMode, details: { name: string; email: string; password: string }) {
    setIsAuthenticating(true)
    setAuthError('')
    try {
      const response = await fetch(`/api/auth/${mode === 'register' ? 'register' : 'login'}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
        body: JSON.stringify(details),
      })
      const payload = await response.json() as Account & { detail?: string; message?: string }
      if (!response.ok) throw new Error(payload.detail ?? payload.message ?? 'Sign in failed. Check your details and try again.')
      setAccount(payload)
      setTickets([])
      setMessages([])
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Sign in failed. Please try again.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'X-XSRF-TOKEN': csrfToken },
      })
    } finally {
      setAccount(null)
      setTickets([])
      setMessages([])
      setView('assistant')
    }
  }

  async function submitQuestion(event?: FormEvent) {
    event?.preventDefault()
    const text = question.trim()
    if (!text || isSending) return
    setMessages((current) => [...current, { role: 'user', text, time: currentTime() }])
    setQuestion('')
    setIsSending(true)
    let answer = ''

    try {
      const body = new FormData()
      body.append('question', text)
      if (activeFile) body.append('file', activeFile)
      const response = await fetch('/api/chat/ask', {
        method: 'POST',
        credentials: 'same-origin',
        headers: activeFile
          ? { 'X-XSRF-TOKEN': csrfToken }
          : { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
        body: activeFile ? body : JSON.stringify({ question: text }),
      })
      if (!response.ok) throw new Error('API unavailable')
      const payload = await response.json() as { answer?: string; message?: string }
      answer = payload.answer ?? payload.message ?? 'I could not find an answer for that yet.'
      setActiveFile(null)
    } catch {
      answer = activeFile
        ? `Relay could not read “${activeFile.name}.” Check that it is a valid PDF and try again.`
        : 'Relay could not generate an answer. Please try again in a moment.'
    }
    setMessages((current) => [...current, { role: 'assistant', text: answer, time: currentTime() }])
    setIsSending(false)
  }

  async function createTicket(event: FormEvent) {
    event.preventDefault()
    const title = ticketTitle.trim()
    if (!title) return
    const details = ticketDetails.trim()
    try {
      const response = await fetch('/api/tickets', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-XSRF-TOKEN': csrfToken },
        body: JSON.stringify({ title, description: details }),
      })
      if (!response.ok) throw new Error('Request failed')
      const created = await response.json() as HelpTicket
      created.updated = 'Just now'
      setTickets((current) => [created, ...current])
      setTicketTitle('')
      setTicketDetails('')
      setModalOpen(false)
      setView('tickets')
      setNotice(`${created.id} created`)
    } catch {
      setNotice('Ticket could not be created. Check your connection and try again.')
    }
    window.setTimeout(() => setNotice(''), 3200)
  }

  function usePrompt(title: string) {
    setQuestion(title === 'Something is broken' ? 'I’m having trouble with ' : `I have a question about ${title.toLowerCase()}: `)
    document.querySelector<HTMLTextAreaElement>('.composer textarea')?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void submitQuestion()
    }
  }

  function handleFile(file?: File) {
    if (!file) return
    if (file.type !== 'application/pdf') {
      setNotice('Please choose a PDF file')
      window.setTimeout(() => setNotice(''), 2800)
      return
    }
    setActiveFile(file)
  }

  if (!authReady) return <main className="auth-loading"><span className="brand-mark"><span /></span><span>Connecting to Relay...</span></main>
  if (!account) return <AuthScreen error={authError} isSubmitting={isAuthenticating} csrfReady={Boolean(csrfToken)} onSubmit={(mode, details) => void authenticate(mode, details)} />

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home" onClick={() => setView('assistant')} aria-label="Relay home">
          <span className="brand-mark"><span /></span><span>relay<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-switcher">
          <div className="workspace-icon">N</div>
          <div className="workspace-copy"><strong>Northstar Studio</strong><span>Support workspace</span></div>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="main-nav" aria-label="Main navigation">
          <button className={view === 'assistant' ? 'nav-item active' : 'nav-item'} onClick={() => setView('assistant')}><MessageCircle size={17} /><span>Assistant</span><span className="nav-shortcut">⌘ 1</span></button>
          <button className={view === 'tickets' ? 'nav-item active' : 'nav-item'} onClick={() => setView('tickets')}><Ticket size={17} /><span>My tickets</span><span className="nav-count">{tickets.filter((item) => item.status !== 'Resolved').length}</span></button>
          <button className={view === 'knowledge' ? 'nav-item active' : 'nav-item'} onClick={() => setView('knowledge')}><FileText size={17} /><span>Knowledge base</span></button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-help"><div className="help-orbit"><Headphones size={19} /></div><strong>Need a human?</strong><p>Create a ticket to get help from the support team.</p><button onClick={() => setModalOpen(true)}>Contact support <ArrowUpRight size={14} /></button></div>
        <button className="profile-button" onClick={() => void logout()} title="Sign out"><div className="avatar">{account.initials}</div><span className="profile-copy"><strong>{account.name}</strong><small>{account.email}</small></span></button>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-divider">/</span><strong>{view === 'assistant' ? 'Assistant' : view === 'tickets' ? 'My tickets' : 'Knowledge base'}</strong></div>
          <div className="topbar-actions"><span className="online-status"><i /> {account.email}</span><button className="icon-button search-button" aria-label="Search"><Search size={17} /></button><button className="top-avatar" aria-label="Sign out" onClick={() => void logout()}>{account.initials}</button></div>
        </header>

        {view === 'assistant' && <section className="assistant-view">
          <div className="conversation-column">
            <div className="conversation-heading"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR AI SUPPORT PARTNER</div><h1>How can we help?</h1><p>Ask a question, share a document, or tell us what’s going on.</p></div><button className="new-chat-button" onClick={() => { setMessages([]); setActiveFile(null) }}><Plus size={15} /> New chat</button></div>
            <div className="conversation-scroll">
              {messages.length === 0 ? <div className="welcome-block">
                <div className="welcome-art"><div className="art-ring ring-one" /><div className="art-ring ring-two" /><div className="art-spark"><Sparkles size={24} /></div><div className="art-stem" /><div className="art-base" /></div>
                <div className="welcome-caption"><span className="small-kicker">A LITTLE HELP GOES A LONG WAY</span><h2>Good morning, {account.name}<span>.</span></h2><p>I’m Relay, your support assistant. What can I take off your plate?</p></div>
                <div className="prompt-grid">{prompts.map(({ icon: Icon, title, detail }) => <button className="prompt-card" key={title} onClick={() => usePrompt(title)}><span className="prompt-icon"><Icon size={17} /></span><span className="prompt-content"><strong>{title}</strong><small>{detail}</small></span><ArrowRight className="prompt-arrow" size={15} /></button>)}</div>
              </div> : <div className="message-list" aria-live="polite">{messages.map((message, index) => <article className={`message-row ${message.role}`} key={`${message.time}-${index}`}><div className={message.role === 'assistant' ? 'message-avatar bot-avatar' : 'message-avatar user-avatar'}>{message.role === 'assistant' ? <Sparkles size={15} /> : account.initials}</div><div className="message-body"><div className="message-meta"><strong>{message.role === 'assistant' ? 'Relay' : 'You'}</strong><time>{message.time}</time></div><p>{message.text}</p>{message.role === 'assistant' && <div className="message-foot"><span><ShieldCheck size={13} /> Relay response</span></div>}</div></article>)}{isSending && <div className="thinking"><span className="message-avatar bot-avatar"><Sparkles size={15} /></span><span><LoaderCircle size={14} className="spin" /> Relay is thinking</span></div>}</div>}
            </div>
            <form className="composer" onSubmit={(event) => void submitQuestion(event)}>
              {activeFile && <div className="attachment-chip"><FileText size={14} /><span>{activeFile.name}</span><button type="button" aria-label="Remove attachment" onClick={() => setActiveFile(null)}><X size={13} /></button></div>}
              <textarea aria-label="Ask Relay a question" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={handleKeyDown} placeholder="Ask anything about your account or product..." rows={2} />
              <div className="composer-tools"><div className="composer-left"><button type="button" className="attach-button" onClick={() => fileInput.current?.click()}><Paperclip size={15} /> Attach PDF</button><span className="composer-hint">Shift + Enter for a new line</span><input ref={fileInput} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => handleFile(event.target.files?.[0])} /></div><button type="submit" className="send-button" disabled={!question.trim() || isSending} aria-label="Send message"><span>Send</span><Send size={14} /></button></div>
            </form>
            <div className="privacy-note"><ShieldCheck size={12} /> Avoid sharing sensitive information in this demo</div>
          </div>
          <aside className="right-rail">
            <div className="rail-heading"><span>YOUR SUPPORT</span><button className="icon-button" aria-label="Support information"><CircleHelp size={16} /></button></div>
            <div className="support-card"><div className="support-card-top"><span className="support-icon"><Ticket size={17} /></span><span className="support-label">OPEN TICKETS</span></div><strong className="support-number">{tickets.filter((ticket) => ticket.status !== 'Resolved').length.toString().padStart(2, '0')}</strong><span className="support-caption">Ticket updates appear here.</span><button className="text-link" onClick={() => setView('tickets')}>View your tickets <ArrowRight size={14} /></button></div>
            <div className="rail-section"><div className="rail-section-heading"><h3>Recent activity</h3><button onClick={() => setView('tickets')}>View all</button></div><div className="activity-list">{tickets.slice(0, 3).map((ticket, index) => <button className="activity-item" key={ticket.id} onClick={() => setView('tickets')}><span className={`activity-marker marker-${index}`}><Ticket size={13} /></span><span className="activity-copy"><strong>{ticket.title}</strong><small>{ticket.id} <i /> {ticket.updated}</small></span></button>)}</div></div>
            <div className="rail-divider" />
            <button className="upload-callout" onClick={() => fileInput.current?.click()}><span className="upload-icon"><Upload size={16} /></span><span><strong>Ask about a document</strong><small>Upload a PDF for a tailored answer</small></span><ArrowUpRight size={15} /></button>
            <div className="agent-card"><div className="agent-card-head"><span className="agent-status"><i /> TICKET SUPPORT</span><span className="agent-dots">···</span></div><div className="agent-face">M</div><strong>Reach the support team</strong><p>Create a ticket and the team can follow up with you.</p><button onClick={() => setModalOpen(true)}>Create a ticket <ArrowRight size={14} /></button></div>
            <div className="rail-footer"><Clock3 size={13} /> Support channel <strong>Tickets</strong></div>
          </aside>
        </section>}

        {view === 'tickets' && <section className="page-view"><div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> SUPPORT CENTER</div><h1>Your tickets</h1><p>Track requests and follow up with our support team.</p></div><button className="primary-button" onClick={() => setModalOpen(true)}><Plus size={16} /> New ticket</button></div><div className="ticket-toolbar"><div className="filter-label">ALL REQUESTS <span>{tickets.length}</span></div><button className="filter-button">Recently updated <ChevronDown size={14} /></button></div><div className="ticket-table"><div className="ticket-table-head"><span>REQUEST</span><span>STATUS</span><span>LAST UPDATED</span><span /></div>{tickets.map((ticket) => <button className="ticket-row" key={ticket.id} onClick={() => setNotice(`${ticket.id}: ${ticket.title} — ${ticket.status}`)}><span className="ticket-subject"><span className="ticket-file-icon"><Ticket size={16} /></span><span><strong>{ticket.title}</strong><small>{ticket.id}</small></span></span><span><span className={`status-pill ${ticket.status.toLowerCase().replace(' ', '-')}`}><i />{ticket.status}</span></span><span className="ticket-updated">{ticket.updated}</span><ArrowUpRight size={16} className="ticket-open" /></button>)}</div><div className="ticket-empty-note"><div className="empty-note-icon"><MessageCircle size={17} /></div><div><strong>Looking for something specific?</strong><p>Tell us what you need and we’ll get the right person on it.</p></div><button onClick={() => setModalOpen(true)}>Contact support <ArrowRight size={14} /></button></div></section>}

        {view === 'knowledge' && <section className="page-view knowledge-view"><div className="page-title-row"><div><div className="eyebrow"><span className="eyebrow-dot" /> YOUR DOCUMENTS</div><h1>Knowledge base</h1><p>Share a PDF and ask Relay questions grounded in its contents.</p></div></div><div className="knowledge-drop"><div className="drop-icon"><Upload size={22} /></div><h2>Bring your documents into the conversation</h2><p>Upload a product guide, invoice, or policy PDF. Relay can use it to answer your question.</p><button className="primary-button" onClick={() => docsInput.current?.click()}><Plus size={16} /> Choose a PDF</button><input ref={docsInput} type="file" accept="application/pdf,.pdf" hidden onChange={(event) => { const file = event.target.files?.[0]; handleFile(file); if (file) { setUploadName(file.name); setView('assistant') } }} /><small>PDF files · 20 MB max</small></div>{uploadName && <div className="document-row"><span className="document-icon"><FileText size={17} /></span><span><strong>{uploadName}</strong><small>Ready to use in your next conversation</small></span><Check size={16} className="document-check" /></div>}<div className="knowledge-footnote"><ShieldCheck size={14} /> Documents are only used to answer your questions.</div></section>}
      </main>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalOpen(false) }}><section className="ticket-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div className="modal-head"><div><span className="modal-kicker">SUPPORT REQUEST</span><h2 id="modal-title">Let’s get this sorted.</h2></div><button className="icon-button" onClick={() => setModalOpen(false)} aria-label="Close"><X size={18} /></button></div><form onSubmit={(event) => void createTicket(event)}><label htmlFor="ticket-title">What do you need help with?</label><input id="ticket-title" value={ticketTitle} onChange={(event) => setTicketTitle(event.target.value)} placeholder="A short summary" required autoFocus /><label htmlFor="ticket-details">A few more details <span>OPTIONAL</span></label><textarea id="ticket-details" value={ticketDetails} onChange={(event) => setTicketDetails(event.target.value)} placeholder="What happened? What did you expect?" rows={4} /><div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setModalOpen(false)}>Cancel</button><button type="submit" className="primary-button">Create ticket <ArrowRight size={14} /></button></div></form></section></div>}
      {notice && <div className="toast"><span><Check size={15} /></span>{notice}<button onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button></div>}
      <button className="mobile-back" onClick={() => setView('assistant')} aria-label="Back to assistant"><ArrowLeft size={17} /></button>
    </div>
  )
}

export default App
