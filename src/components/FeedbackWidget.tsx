// Global feedback widget (platform standard): a floating launcher on every
// screen that files reports into the CGOPS-owned platform_feedback table.
// Identity is stamped server-side by a DB trigger; the app only attaches
// context (app, screen, device, user agent).

import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { Button, TextArea } from './ui'
import { submitPlatformFeedback } from '../lib/api'

export const APP_NAME = 'restaurant-center'

const TYPES = [
  { value: 'bug', label: 'Bug' },
  { value: 'idea', label: 'Idea' },
  { value: 'question', label: 'Question' },
] as const

type FeedbackType = (typeof TYPES)[number]['value']

function detectDevice(): string {
  const ua = navigator.userAgent
  if (/iPad|Tablet/i.test(ua)) return 'tablet'
  if (/Mobi|Android|iPhone/i.test(ua)) return 'mobile'
  return 'desktop'
}

export function FeedbackWidget({ screen }: { screen: string }) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [type, setType] = useState<FeedbackType | null>(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(toastTimer.current), [])

  async function submit() {
    if (!message.trim() || sending) return
    setSending(true)
    setError(null)
    try {
      await submitPlatformFeedback({
        app_module: APP_NAME,
        screen,
        device: detectDevice(),
        user_agent: navigator.userAgent,
        message: message.trim(),
        type,
      })
      setOpen(false)
      setMessage('')
      setType(null)
      setSent(true)
      toastTimer.current = window.setTimeout(() => setSent(false), 3500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send feedback. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-lg border border-surface-line bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-surface-line px-4 py-3">
            <p className="text-sm font-semibold text-charcoal">Send feedback</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close feedback form"
              className="rounded p-1 text-charcoal/50 hover:bg-surface-muted hover:text-charcoal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-3 px-4 py-3">
            <div className="flex gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(type === t.value ? null : t.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    type === t.value
                      ? 'border-cg-orange bg-cg-orange-soft text-cg-orange'
                      : 'border-surface-line text-charcoal/60 hover:bg-surface-muted'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <TextArea
              rows={4}
              placeholder="What's working? What's broken? What's missing?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {error && <p className="text-xs text-danger">{error}</p>}
            <div className="flex justify-end">
              <Button variant="primary" onClick={submit} disabled={!message.trim() || sending}>
                {sending ? 'Sending…' : 'Send feedback'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {sent && (
        <div className="fixed bottom-20 right-4 z-50 rounded-md bg-charcoal px-4 py-2 text-sm text-white shadow-lg">
          Thanks — your feedback was sent.
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Send feedback"
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-cg-orange text-white shadow-lg transition-colors hover:bg-cg-orange-hover"
      >
        <MessageCircle className="h-5 w-5" />
      </button>
    </>
  )
}
