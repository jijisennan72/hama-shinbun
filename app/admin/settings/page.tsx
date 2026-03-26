'use client'

import { useState } from 'react'
import { KeyRound, CheckCircle } from 'lucide-react'
import { changeAdminPin } from './actions'

export default function AdminSettingsPage() {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (currentPin.length !== 6 || newPin.length !== 6 || confirmPin.length !== 6) {
      setError('すべてのPINは6桁で入力してください')
      return
    }
    if (newPin !== confirmPin) {
      setError('新しいPINと確認用PINが一致しません')
      return
    }

    setPending(true)
    try {
      const result = await changeAdminPin(currentPin, newPin)
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/40 rounded-full flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900 dark:text-gray-100">管理者設定</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">PINコードの変更</p>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg p-3 mb-4 text-sm">
            <CheckCircle className="w-4 h-4 shrink-0" />
            PINコードを変更しました
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              現在のPIN（6桁）
            </label>
            <input
              type="password"
              value={currentPin}
              onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              maxLength={6}
              autoComplete="current-password"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              新しいPIN（6桁）
            </label>
            <input
              type="password"
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              maxLength={6}
              autoComplete="new-password"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              新しいPIN（確認）
            </label>
            <input
              type="password"
              value={confirmPin}
              onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="••••••"
              inputMode="numeric"
              maxLength={6}
              autoComplete="new-password"
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full bg-violet-700 hover:bg-violet-800 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-colors mt-2"
          >
            {pending ? '変更中...' : 'PINを変更する'}
          </button>
        </form>
      </div>
    </div>
  )
}
