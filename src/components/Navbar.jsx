import React from 'react'
import { CheckCircle2, ClipboardList, BarChart3, Smartphone, Monitor, LogOut, Radio } from 'lucide-react'

export default function Navbar({
  user,
  profile,
  activeTab,
  setActiveTab,
  isMobilePreview,
  setIsMobilePreview,
  onLogout,
  realtimeStatus,
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* 로고 & 실시간 상태 */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20 font-black text-xl tracking-wider">
              G
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">Gderma</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  치료·검사 Todo
                </span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                <span
                  className={`inline-block w-2 h-2 rounded-full ${
                    realtimeStatus === 'CONNECTED' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{realtimeStatus === 'CONNECTED' ? 'Realtime 실시간 연결됨' : '연결 준비 중'}</span>
              </div>
            </div>
          </div>

          {/* 중앙 네비게이션 탭 */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('register')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'register'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              <span>업무 등록 (데스크탑)</span>
            </button>

            <button
              onClick={() => setActiveTab('mobile-todos')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'mobile-todos'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              <span>모바일 업무함</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>통계 & 이력 (관리자)</span>
            </button>
          </nav>

          {/* 우측 사용자 프로필 & 기기 뷰 토글 & 로그아웃 */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* 데스크탑에서 모바일 프레임 시뮬레이션 토글 버튼 */}
            <button
              onClick={() => setIsMobilePreview(!isMobilePreview)}
              title={isMobilePreview ? '데스크탑 전체화면으로 보기' : '안드로이드 모바일 화면 모드로 보기'}
              className={`hidden lg:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                isMobilePreview
                  ? 'bg-teal-50 border-teal-300 text-teal-800'
                  : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {isMobilePreview ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
              <span>{isMobilePreview ? '일반 뷰' : '모바일 폰 뷰'}</span>
            </button>

            {/* 사용자 정보 배지 */}
            {profile && (
              <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
                <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  {profile.name?.charAt(0) || '직'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>{profile.name}</span>
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded font-medium ${
                        profile.room === '치료실'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {profile.room}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* 로그아웃 버튼 */}
            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              title="로그아웃"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 모바일 하단 네비게이션 바 (작은 화면용) */}
        <div className="flex md:hidden border-t border-slate-100 py-2 justify-around">
          <button
            onClick={() => setActiveTab('register')}
            className={`flex flex-col items-center text-xs font-semibold py-1 px-3 rounded-lg ${
              activeTab === 'register' ? 'text-teal-700 font-bold' : 'text-slate-500'
            }`}
          >
            <ClipboardList className="w-5 h-5 mb-0.5" />
            <span>업무 등록</span>
          </button>
          <button
            onClick={() => setActiveTab('mobile-todos')}
            className={`flex flex-col items-center text-xs font-semibold py-1 px-3 rounded-lg ${
              activeTab === 'mobile-todos' ? 'text-teal-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Smartphone className="w-5 h-5 mb-0.5" />
            <span>모바일 Todo</span>
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center text-xs font-semibold py-1 px-3 rounded-lg ${
              activeTab === 'dashboard' ? 'text-teal-700 font-bold' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-5 h-5 mb-0.5" />
            <span>통계 대시보드</span>
          </button>
        </div>
      </div>
    </header>
  )
}
