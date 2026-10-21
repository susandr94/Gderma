import React, { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { PlusCircle, Clock, CheckCircle2, User, Building, Sparkles, Send, RefreshCw } from 'lucide-react'

// 자주 쓰이는 병원 치료실/검사실 업무 프리셋
const QUICK_PRESETS = {
  치료실: [
    '환부 드레싱 및 소독 (Dressing)',
    '광선치료(UVB) 3분 조사 진행',
    '수액 세트 교체 및 주입 속도 확인',
    '레이저 시술 후 냉각 진정 관리',
    '국소마취 크림 도포 (30분 후 시술)',
    '상처 부위 발사(Stitch out) 준비',
  ],
  검사실: [
    '일반 혈액검사(CBC) 검체 채취',
    '피부 첩포검사(Patch test) 판독',
    '조직생검(Biopsy) 검체 용기 라벨링',
    '알레르기 MAST 검사 접수',
    '진균 현미경 직접도말검사(KOH)',
    '소변 검사(Urinalysis) 스틱 판독',
  ],
}

export default function TodoRegister({ user, profile }) {
  const [room, setRoom] = useState(profile?.room || '치료실')
  const [title, setTitle] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [fetchingProfiles, setFetchingProfiles] = useState(false)
  const [recentTodos, setRecentTodos] = useState([])
  const [feedbackMsg, setFeedbackMsg] = useState({ type: '', text: '' })

  // 프로필 목록 로드
  const fetchProfiles = async () => {
    setFetchingProfiles(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, room')
        .order('name', { ascending: true })

      if (error) throw error
      setProfiles(data || [])

      // 현재 선택된 실에 맞는 첫 번째 직원 자동 선택 (아직 선택 안 된 경우)
      if (data && data.length > 0 && !assigneeId) {
        const matched = data.find((p) => p.room === room)
        setAssigneeId(matched ? matched.id : data[0].id)
      }
    } catch (err) {
      console.error('프로필 목록 조회 실패:', err)
    } finally {
      setFetchingProfiles(false)
    }
  }

  // 최근 등록된 Todo 목록 로드 (5건)
  const fetchRecentTodos = async () => {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select(`
          id,
          room,
          title,
          status,
          created_at,
          assignee:profiles!todos_assignee_id_fkey(name, room)
        `)
        .order('created_at', { ascending: false })
        .limit(6)

      if (error) {
        // Fallback without join alias if needed
        const { data: simpleData } = await supabase
          .from('todos')
          .select('id, room, title, status, created_at, assignee_id')
          .order('created_at', { ascending: false })
          .limit(6)
        setRecentTodos(simpleData || [])
      } else {
        setRecentTodos(data || [])
      }
    } catch (err) {
      console.warn('최근 업무 조회 실패:', err)
    }
  }

  useEffect(() => {
    fetchProfiles()
    fetchRecentTodos()

    // Realtime 구독으로 최근 등록 목록 자동 업데이트
    const channel = supabase
      .channel('register-recent-todos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, () => {
        fetchRecentTodos()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // 실(room) 변경 시 해당 실의 담당자가 있으면 기본 선택 업데이트
  const handleRoomChange = (selectedRoom) => {
    setRoom(selectedRoom)
    const matched = profiles.find((p) => p.room === selectedRoom)
    if (matched) {
      setAssigneeId(matched.id)
    }
  }

  // 신규 Todo 등록
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setFeedbackMsg({ type: 'error', text: '업무 내용을 입력해주세요.' })
      return
    }
    if (!assigneeId) {
      setFeedbackMsg({ type: 'error', text: '담당 직원을 선택해주세요.' })
      return
    }

    setLoading(true)
    setFeedbackMsg({ type: '', text: '' })

    try {
      const { error } = await supabase.from('todos').insert([
        {
          room,
          title: title.trim(),
          assignee_id: assigneeId,
          status: '대기',
        },
      ])

      if (error) throw error

      setFeedbackMsg({
        type: 'success',
        text: `[${room}] 새로운 업무가 성공적으로 등록 및 전송되었습니다!`,
      })
      setTitle('')
      fetchRecentTodos()
    } catch (err) {
      setFeedbackMsg({
        type: 'error',
        text: `등록 실패: ${err.message || '알 수 없는 오류가 발생했습니다.'}`,
      })
    } finally {
      setLoading(false)
    }
  }

  // 프리셋 클릭 시 제목 자동 채우기
  const handleSelectPreset = (preset) => {
    setTitle(preset)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* 상단 헤더 */}
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <PlusCircle className="w-7 h-7 text-teal-600" />
          <span>업무 등록 (데스크탑 관제 뷰)</span>
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          치료실 또는 검사실 업무를 담당자에게 실시간으로 할당합니다. 등록 즉시 모바일 앱에 수신됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 좌측 메인 등록 폼 (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
          {feedbackMsg.text && (
            <div
              className={`mb-6 p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border border-rose-200'
              }`}
            >
              {feedbackMsg.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-rose-600 shrink-0" />
              )}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 1. 요청 실 선택 */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 tracking-wider uppercase mb-2">
                1. 요청 부서 (실)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleRoomChange('치료실')}
                  className={`py-3.5 px-4 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                    room === '치료실'
                      ? 'border-teal-600 bg-teal-50 text-teal-800 shadow-sm shadow-teal-600/10'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                  <span>치료실 (Treatment Room)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoomChange('검사실')}
                  className={`py-3.5 px-4 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                    room === '검사실'
                      ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm shadow-blue-600/10'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span>검사실 (Lab & Test Room)</span>
                </button>
              </div>
            </div>

            {/* 2. 담당 직원 선택 */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-extrabold text-slate-700 tracking-wider uppercase">
                  2. 담당 직원 (Assignee)
                </label>
                <button
                  type="button"
                  onClick={fetchProfiles}
                  className="text-xs text-slate-400 hover:text-teal-600 flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${fetchingProfiles ? 'animate-spin' : ''}`} />
                  <span>새로고침</span>
                </button>
              </div>

              <div className="relative">
                <select
                  required
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 bg-white"
                >
                  <option value="" disabled>
                    담당 직원을 선택하세요
                  </option>
                  {profiles.length === 0 ? (
                    <option value="" disabled>
                      등록된 직원 프로필이 없습니다 (회원가입 필요)
                    </option>
                  ) : (
                    profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.room || '소속 미지정'})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* 3. 업무 내용 입력 */}
            <div>
              <label className="block text-xs font-extrabold text-slate-700 tracking-wider uppercase mb-2">
                3. 업무 내용 (Task Title)
              </label>
              <textarea
                required
                rows={3}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 3번 베드 환자 광선치료 5분 세팅 및 확인 요망"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-600 transition"
              />
            </div>

            {/* 빠른 입력 템플릿 태그 버튼들 */}
            <div>
              <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-600">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{room} 다빈도 업무 빠른 입력 (원클릭)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_PRESETS[room]?.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-200 transition active-press text-left"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* 등록 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 text-white font-extrabold text-sm rounded-xl shadow-md shadow-teal-700/20 active-press transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>실시간 업무 할당 등록</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* 우측 최근 등록 현황 (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-teal-600" />
                <span>최근 등록된 실시간 업무</span>
              </h3>
              <span className="text-xs text-slate-400 font-medium">최신 6건</span>
            </div>

            <div className="space-y-3">
              {recentTodos.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  등록된 업무가 없습니다.
                </div>
              ) : (
                recentTodos.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.room === '치료실'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {item.room}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === '완료'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.title}</p>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>담당: {item.assignee?.name || '담당자'}</span>
                        <span>•</span>
                        <span>{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 인프라 안내 카드 */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-md">
            <h4 className="font-bold text-sm text-teal-300 flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping" />
              Supabase Realtime 연동 알림
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              본 데스크탑 관제 화면에서 업무를 등록하면, 모바일 앱을 휴대하고 있는 치료실/검사실 담당 직원의 스마트폰에 실시간 웹소켓(WebSocket) 푸시로 즉시 반영됩니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
