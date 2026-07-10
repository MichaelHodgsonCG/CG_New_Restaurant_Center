import { useState } from 'react'
import { useSession } from './features/auth/useSession'
import { RedirectToCgops } from './features/auth/RedirectToCgops'
import { AppShell, type View } from './components/AppShell'
import { SessionTimeoutManager } from './components/SessionTimeoutManager'
import { DashboardView } from './features/dashboard/DashboardView'
import { SitesView } from './features/sites/SitesView'
import { SiteDetailView } from './features/sites/SiteDetailView'
import { PlaybooksView } from './features/playbooks/PlaybooksView'
import { ReadinessView } from './features/readiness/ReadinessView'
import { can, toPermissionUser } from './permissions'

// Top-level view + selected-site state lives here (house convention — no
// router library; the platform apps keep navigation state in App until a
// deep-linking need appears).
export default function App() {
  const { session, profile, profileError, loading } = useSession()
  const [view, setView] = useState<View>('dashboard')
  const [siteId, setSiteId] = useState<string | null>(null)
  const [startCreating, setStartCreating] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-charcoal/50">Loading…</p>
      </div>
    )
  }

  // No standalone login — unauthenticated visits (and sign-outs) go to CGOPS,
  // which relaunches with the SSO handoff fragment.
  if (!session) return <RedirectToCgops />

  const user = profile ? toPermissionUser(profile) : null
  const canManage = can(user, 'create', 'sites')

  function openSite(id: string) {
    setSiteId(id)
  }

  function navigate(next: View) {
    setSiteId(null)
    setView(next)
  }

  function newOpening() {
    setSiteId(null)
    setStartCreating(true)
    setView('sites')
  }

  return (
    <>
      {/* Platform inactivity timeout (CGOPS authority): mounted once for the
          signed-in app; on timeout it signs out and the no-session branch
          above returns the user to the CGOPS login. */}
      <SessionTimeoutManager />
      <AppShell
        session={session}
        profile={profile}
        profileError={profileError}
        view={view}
        onNavigate={navigate}
      >
        {siteId ? (
          <SiteDetailView
            siteId={siteId}
            canManage={canManage}
            onBack={() => setSiteId(null)}
          />
        ) : view === 'dashboard' ? (
          <DashboardView
            canManage={canManage}
            onOpenSite={openSite}
            onNewSite={newOpening}
          />
        ) : view === 'sites' ? (
          <SitesView
            canManage={canManage}
            startCreating={startCreating}
            onCreateHandled={() => setStartCreating(false)}
            onOpenSite={openSite}
          />
        ) : view === 'playbooks' ? (
          <PlaybooksView canManage={canManage} />
        ) : (
          <ReadinessView onOpenSite={openSite} />
        )}
      </AppShell>
    </>
  )
}
