import { redirect } from 'next/navigation'
import { createAuthenticatedClient } from '@/lib/supabase/server'
import { OnboardingForm } from './onboarding-form'

export const metadata = {
  title: 'Get Started — FutureSelf',
}

export default async function OnboardingPage() {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createAuthenticatedClient()
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: existing } = await supabase
          .from('futureself_profiles')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle()

        if (existing) {
          redirect('/me')
        }
      }
    }
  }

  return <OnboardingForm />
}
