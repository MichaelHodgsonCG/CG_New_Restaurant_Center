import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { consumeCgopsSsoHandoff } from './cgopsSso'
import { APP_ROLES, type AppRole, type Profile } from '../../types'

// Session + CGOPS profile in one hook. Role detection reads the CGOPS master
// profile (public.user_profiles) through ONE call — the SECURITY DEFINER RPC
// restaurant_center_current_profile() — and nothing else. That RPC is the
// single seam onto CGOPS identity: New Restaurant Center never stores its own
// role table (no duplicate People Center) and the database, not the client,
// decides who is an admin. If the CGOPS profile can't be read the RPC fails
// safe to a read-only 'viewer', which is surfaced in the user menu.
export function useSession() {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    // Consume a CGOPS SSO handoff fragment (if present) BEFORE reading the
    // session, so first render after a CGOPS launch is already signed in.
    consumeCgopsSsoHandoff()
      .then(() => supabase.auth.getSession())
      .then(({ data }) => {
        if (cancelled) return
        setSession(data.session)
        setLoading(false)
      })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!session) {
      setProfile(null)
      setProfileError(null)
      return
    }
    let cancelled = false
    supabase
      .rpc('restaurant_center_current_profile')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) {
          setProfile(null)
          setProfileError(error.message)
          return
        }
        const row = Array.isArray(data) ? data[0] : data
        setProfile(normalizeProfile(row, session))
        setProfileError(null)
      })
    return () => {
      cancelled = true
    }
  }, [session])

  return { session, profile, profileError, loading }
}

function normalizeProfile(
  row: {
    role?: string | null
    email?: string | null
    display_name?: string | null
    person_id?: string | null
    is_admin?: boolean | null
  } | null,
  session: Session,
): Profile {
  const role = coerceRole(row?.role)
  return {
    role,
    email: row?.email ?? session.user.email ?? null,
    display_name: row?.display_name ?? session.user.email ?? null,
    person_id: row?.person_id ?? null,
    is_admin: row?.is_admin ?? role === 'admin',
  }
}

function coerceRole(role: string | null | undefined): AppRole {
  return (APP_ROLES as readonly string[]).includes(role ?? '')
    ? (role as AppRole)
    : 'viewer'
}

export async function signOut() {
  await supabase.auth.signOut()
}
