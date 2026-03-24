import { createClient } from '@/lib/supabase/server'
import AdminSurveyManager from '@/components/admin/AdminSurveyManager'

export default async function AdminSurveysPage() {
  const supabase = await createClient()
  const { data: surveys } = await supabase
    .from('surveys')
    .select('id, title, description, is_active, attachment_url, created_at, starts_at, expires_at, survey_responses(household_id)')
    .order('created_at', { ascending: false })

  const initialSurveys = (surveys || []).map(s => ({
    id: s.id,
    title: s.title,
    description: s.description,
    is_active: s.is_active,
    attachment_url: s.attachment_url,
    created_at: s.created_at,
    starts_at: s.starts_at ?? null,
    expires_at: s.expires_at ?? null,
    respondent_count: new Set((s.survey_responses || []).map((r: { household_id: string }) => r.household_id)).size,
  }))

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">アンケート管理</h1>
      <AdminSurveyManager initialSurveys={initialSurveys} />
    </div>
  )
}
