import { createClient } from '@/lib/supabase/server'
import SurveyList from '@/components/SurveyList'

export default async function SurveysPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: household } = await supabase
    .from('households')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  const { data: surveys } = await supabase
    .from('surveys')
    .select('id, title, description, is_active, attachment_url, starts_at, expires_at, survey_responses(household_id)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const surveysWithStatus = (surveys || []).map(s => ({
    id: s.id,
    title: s.title,
    description: s.description,
    is_active: s.is_active,
    attachment_url: s.attachment_url,
    starts_at: s.starts_at ?? null,
    expires_at: s.expires_at ?? null,
    is_answered: s.survey_responses?.some((r: { household_id: string }) => r.household_id === household?.id) ?? false,
    respondent_count: new Set(s.survey_responses?.map((r: { household_id: string }) => r.household_id) || []).size,
  }))

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">📊 回答するとアンケートの集計結果を閲覧できます</p>
      <SurveyList surveys={surveysWithStatus} householdId={household?.id} />
    </div>
  )
}
