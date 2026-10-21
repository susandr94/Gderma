import React, { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Navbar from './components/Navbar'
import Auth from './components/Auth'
import TodoRegister from './components/TodoRegister'
import MobileTodoList from './components/MobileTodoList'
import Dashboard from './components/Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('register') // 'register' | 'mobile-todos' | 'dashboard'
  const [isMobilePreview, setIsMobilePreview] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState('CONNECTING')

  // 사용자 프로필 로드 함수
  const fetchProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.warn('프로필 로드 에러:', error)
      }

      if (data) {
        setProfile(data)
      } else {
        // 프로필이 없는 경우 user_metadata 기반 기본 생성
        const meta = session?.user?.user_metadata || {}
        const fallbackProfile = {
          id: userId,
          name: meta.name || '직원',
          room: meta.room || '치료실',
        }
        setProfile(fallbackProfile)
      }
    } catch (err) {
      console.error('프로필 로드 예외:', err)
    }
  }

  // 초기 인증 상태 확인 및 리스너 등록
  useEffect(() => {
    const initAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession()

        setSession(initialSession)
        setUser(initialSession?.user ?? null)

        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id)
        }
      } catch (err) {
        console.error('인증 세션 초기화 실패:', err)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      if (currentSession?.user) {
        await fetchProfile(currentSession.user.id)
      } else {
        setProfile(null)
      }
    })

    // Realtime 연결 상태 모니터링
    const heartbeatChannel = supabase.channel('system-heartbeat')
    heartbeatChannel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        setRealtimeStatus('CONNECTED')
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setRealtimeStatus('DISCONNECTED')
      }
    })

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(heartbeatChannel)
    }
  }, [])

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      setSession(null)
      setUser(null)
      setProfile(null)
    } catch (err) {
      console.error('로그아웃 에러:', err)
    }
  }

  // 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-700">Gderma 시스템 초기화 중...</p>
      </div>
    )
  }

  // 미로그인 시 Auth 화면 표시
  if (!session || !user) {
    return <Auth onAuthSuccess={(authenticatedUser) => setUser(authenticatedUser)} />
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 글로벌 네비게이션 헤더 */}
      <Navbar
        user={user}
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isMobilePreview={isMobilePreview}
        setIsMobilePreview={setIsMobilePreview}
        onLogout={handleLogout}
        realtimeStatus={realtimeStatus}
      />

      {/* 메인 뷰 컨테이너 */}
      <main className="flex-1">
        {/* 데스크탑에서 모바일 프레임 뷰를 토글한 경우 */}
        {isMobilePreview ? (
          <div className="py-8 px-4 flex flex-col items-center justify-center bg-slate-200/70 min-h-[calc(100vh-64px)]">
            <div className="text-center mb-4">
              <span className="text-xs font-bold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-300 shadow-xs">
                📱 안드로이드 모바일 기기 (PWA 모드) 시뮬레이터 화면
              </span>
            </div>
            {/* 스마트폰 기기 베젤 프레임 */}
            <div className="w-full max-w-[400px] h-[820px] bg-black rounded-[48px] p-3 shadow-2xl ring-12 ring-slate-800 relative">
              {/* 스피커 & 카메라 노치 */}
              <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-700" />
              </div>
              {/* 스마트폰 스크린 내부 */}
              <div className="w-full h-full bg-slate-100 rounded-[38px] overflow-hidden overflow-y-auto">
                <MobileTodoList user={user} profile={profile} />
              </div>
            </div>
          </div>
        ) : (
          /* 일반 반응형 뷰 모드 */
          <>
            {activeTab === 'register' && <TodoRegister user={user} profile={profile} />}
            {activeTab === 'mobile-todos' && <MobileTodoList user={user} profile={profile} />}
            {activeTab === 'dashboard' && <Dashboard user={user} profile={profile} />}
          </>
        )}
      </main>
    </div>
  )
}
