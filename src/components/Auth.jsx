import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Lock, Mail, User, Building2, ArrowRight, Activity, CheckCircle } from 'lucide-react'

export default function Auth({ onAuthSuccess }) {
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [room, setRoom] = useState('치료실') // '치료실' | '검사실'
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [infoMsg, setInfoMsg] = useState('')

  // 로그인 핸들러
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setInfoMsg('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) throw error

      if (data?.user) {
        onAuthSuccess && onAuthSuccess(data.user)
      }
    } catch (err) {
      setErrorMsg(err.message || '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  // 회원가입 핸들러
  const handleSignup = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    setInfoMsg('')

    if (!name.trim()) {
      setErrorMsg('이름을 입력해주세요.')
      setLoading(false)
      return
    }

    try {
      // 1. Supabase Auth 계정 생성 (메타데이터에 name과 room 포함)
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: name.trim(),
            room: room,
          },
        },
      })

      if (error) throw error

      if (data?.user) {
        // 2. profiles 테이블에 직접 upsert 백업 (트리거가 설정되어 있어도 안전하게 보장)
        try {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            name: name.trim(),
            room: room,
          })
        } catch (profileErr) {
          console.warn('Profile upsert notice:', profileErr)
        }

        setInfoMsg('회원가입이 완료되었습니다! 로그인 상태로 자동 전환됩니다.')
        setTimeout(() => {
          onAuthSuccess && onAuthSuccess(data.user)
        }, 1000)
      }
    } catch (err) {
      setErrorMsg(err.message || '회원가입 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 테스트 계정 빠른 채우기
  const handleFillDemo = (demoEmail, demoRoom) => {
    setEmail(demoEmail)
    setPassword('Test1234!')
    setName(demoEmail.startsWith('nurse') ? '김치료 간호사' : '이검사 임상병리사')
    setRoom(demoRoom)
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 overflow-hidden">
        {/* 상단 배너 */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 p-8 text-white text-center relative">
          <div className="inline-flex p-3 bg-white/10 rounded-2xl mb-3 backdrop-blur-md">
            <Activity className="w-8 h-8 text-teal-200" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Gderma 시스템</h1>
          <p className="text-teal-100 text-xs mt-1 font-medium">치료실 & 검사실 다중 사용자 Todo 및 통계 플랫폼</p>

          <div className="absolute -bottom-px left-0 right-0 flex border-t border-white/10 bg-teal-900/40">
            <button
              onClick={() => {
                setMode('login')
                setErrorMsg('')
                setInfoMsg('')
              }}
              className={`flex-1 py-3 text-sm font-bold text-center transition-all ${
                mode === 'login'
                  ? 'bg-white text-teal-800 rounded-t-xl'
                  : 'text-teal-200 hover:text-white'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => {
                setMode('signup')
                setErrorMsg('')
                setInfoMsg('')
              }}
              className={`flex-1 py-3 text-sm font-bold text-center transition-all ${
                mode === 'signup'
                  ? 'bg-white text-teal-800 rounded-t-xl'
                  : 'text-teal-200 hover:text-white'
              }`}
            >
              회원가입
            </button>
          </div>
        </div>

        {/* 폼 본문 */}
        <div className="p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          {infoMsg && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={mode === 'login' ? handleLogin : handleSignup} className="space-y-4">
            {/* 회원가입 시 추가 필드: 이름 및 소속 실 */}
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">이름 (성명)</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="예: 김간호, 이임상"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">소속 실 (부서)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRoom('치료실')}
                      className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-bold border transition ${
                        room === '치료실'
                          ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-500/30'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                      <span>치료실</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRoom('검사실')}
                      className={`flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-bold border transition ${
                        room === '검사실'
                          ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-500/30'
                          : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                      <span>검사실</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">이메일 주소</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@gderma.clinic"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">비밀번호</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (6자 이상)"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-bold rounded-xl shadow-md shadow-teal-700/20 active-press transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? '로그인하기' : '회원가입 완료 및 시작'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 간편 테스트용 프리셋 */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500 mb-2 font-medium">빠른 테스트용 계정 자동 입력</p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('nurse1@gderma.clinic', '치료실')}
                className="text-xs px-2.5 py-1 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 transition"
              >
                치료실 직원 입력
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('lab1@gderma.clinic', '검사실')}
                className="text-xs px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
              >
                검사실 직원 입력
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
