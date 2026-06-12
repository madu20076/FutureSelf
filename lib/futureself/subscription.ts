import type { SupabaseClient } from '@supabase/supabase-js'

export type Plan = 'free' | 'premium'

type ProfileSubscription = {
  plan: string | null
  subscription_status: string | null
}

export async function getUserPlan(
  userId: string,
  supabase: SupabaseClient
): Promise<Plan> {
  try {
    const { data } = await supabase
      .from('futureself_profiles')
      .select('plan, subscription_status')
      .eq('user_id', userId)
      .single<ProfileSubscription>()

    if (data?.plan === 'premium' && data?.subscription_status === 'active') {
      return 'premium'
    }
  } catch {
    // Default to free on any error
  }
  return 'free'
}

export function isPremium(plan: Plan): boolean {
  return plan === 'premium'
}

export function canUseVoiceConversation(plan: Plan): boolean {
  return plan === 'premium'
}

export function canUseAdvancedMemory(plan: Plan): boolean {
  return plan === 'premium'
}

export function canUseAvatar(plan: Plan): boolean {
  return plan === 'premium'
}

export function canUseVoiceCloning(plan: Plan): boolean {
  return plan === 'premium'
}
