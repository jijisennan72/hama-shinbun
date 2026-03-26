'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminLogin } from './actions'
import { ShieldCheck } from 'lucide-react'

export default function AdminLoginPage() {
  const [username, setUsername] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || pin.length !== 6) {
      setError('管理者IDと6桁のPINを入力してください')
      return
    }
    setPending(true)
    setError('')
    const result = await adminLogin(username, pin)
    if (result?.error) {
      setError(result.error)
      setPending(false)
    } else {
      router.replace('/admin')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-violet-100 rounded-full mb-4">
            <ShieldCheck className="w-8 h-8 text-violet-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">管理者ログイン</h1>
          <p className="text-sm text-gray-500 mt-1">はまアプリ 管理者専用</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">管理者ID</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder=""
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PINコード（6桁）</label>
            <input
              type="password"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500"
              inputMode="numeric"
              maxLength={6}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2 text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2"
          >
            {pending ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-6">
          管理者IDとPINは管理者から付与されたものを使用してください
        </p>
      </div>
    </div>
  )
}
