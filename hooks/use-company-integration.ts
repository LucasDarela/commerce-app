'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Database } from '@/components/types/supabase'

export function useCompanyIntegration(provider: string) {
  const supabase = createClientComponentClient<Database>()
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchIntegration() {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()

      const { data: companyUser } = await supabase
        .from('company_users')
        .select('company_id')
        .eq('user_id', user?.id)
        .single()

      if (!companyUser) {
        setError('Empresa não encontrada.')
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('company_integrations')
        .select('access_token')
        .eq('company_id', companyUser.company_id)
        .eq('provider', provider)
        .single()

      if (error || !data) {
        setError('Integração não encontrada.')
      } else {
        setAccessToken(data.access_token)
      }

      setLoading(false)
    }

    fetchIntegration()
  }, [provider])

  return { accessToken, loading, error }
}
