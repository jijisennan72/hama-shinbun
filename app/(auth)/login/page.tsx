'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Newspaper } from 'lucide-react'

function LoginForm() {
  const [householdNumber, setHouseholdNumber] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!householdNumber || pin.length !== 4) {
      setError('利用者IDと4桁のPINを入力してください')
      return
    }
    setLoading(true)
    setError('')
    const email = `${householdNumber}@hama.local`
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password: pin + '@hama' })
    if (authError) {
      setError('利用者IDまたはPINが正しくありません')
      setLoading(false)
      return
    }
    const redirect = searchParams.get('redirect') || '/'
    router.push(redirect)
    router.refresh()
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">利用者ID</label>
        <input
          type="text"
          value={householdNumber}
          onChange={e => setHouseholdNumber(e.target.value)}
          placeholder="例: 101"
          className="input-field"
          autoComplete="username"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">PINコード（4桁）</label>
        <input
          type="password"
          value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
          placeholder="****"
          className="input-field text-center text-2xl tracking-widest"
          inputMode="numeric"
          maxLength={4}
          autoComplete="current-password"
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2 text-center">{error}</p>
      )}
      <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
        {loading ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 to-primary-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <Newspaper className="w-8 h-8 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">浜区公式アプリ</h1>
          <p className="text-sm text-gray-500 mt-1">地域のお知らせポータル</p>
        </div>
        <Suspense fallback={<div className="text-center text-sm text-gray-400">読み込み中...</div>}>
          <LoginForm />
        </Suspense>
        <p className="text-xs text-gray-400 text-center mt-6">
          利用者IDとPINは浜区から配布された書類をご確認ください
        </p>
      </div>
    </div>
  )
}
