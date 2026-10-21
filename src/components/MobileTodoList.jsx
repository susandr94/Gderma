import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import {
  CheckCircle,
  Clock,
  Filter,
  Check,
  RotateCcw,
  AlertCircle,
  Sparkles,
  Wifi,
  User,
  Layers,
  ChevronRight,
} from 'lucide-react'

export default function MobileTodoList({ user, profile }) {
  const [todos, setTodos] = useState([])
  const [filterStatus, setFilterStatus] = useState('대기') // '대기' | '완료' | '전체'
  const [onlyMyTasks, setOnlyMyTasks] = useState(true)
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  // Todo 목록 조회
  const fetchTodos = useCallback(async () => {
    try {
      let query = supabase
        .from('todos')
        .select(`
          id,
          room,
          title,
          status,
          assignee_id,
          created_at,
          completed_at,
          assignee:profiles!todos_assignee_id_fkey(name, room)
        `)
        .order('created_at', { ascending: false })

      // 내 업무 필터링 조건
      if (onlyMyTasks && user?.id) {
        query = query.eq('assignee_id', user.id)
      }

      // 상태 필터링 조건
      if (filterStatus !== '전체') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) {
        // Fallback without relation if needed
        let fallbackQuery = supabase
          .from('todos')
          .select('id, room, title, status, assignee_id, created_at, completed_at')
          .order('created_at', { ascending: false })

        if (onlyMyTasks && user?.id) {
          fallbackQuery = fallbackQuery.eq('assignee_id', user.id)
        }
        if (filterStatus !== '전체') {
          fallbackQuery = fallbackQuery.eq('status', filterStatus)
        }

        const { data: fallbackData } = await fallbackQuery
        setTodos(fallbackData || [])
      } else {
        setTodos(data || [])
      }
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Todo 목록 불러오기 실패:', err)
    } finally {
      setLoading(false)
    }
  }, [filterStatus, onlyMyTasks, user?.id])

  useEffect(() => {
    fetchTodos()

    // Supabase Realtime 채널 구독
    const channel = supabase
      .channel('mobile-live-todos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
        },
        (payload) => {
          console.log('Realtime change received:', payload)
          // 스마트폰 진동 피드백 (새 업무 알림)
          if (payload.eventType === 'INSERT' && typeof navigator !== 'undefined' && navigator.vibrate) {
            try {
              navigator.vibrate([80, 50, 80])
            } catch (e) {}
          }
          fetchTodos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchTodos])

  // [시행 완료] 원터치 처리
  const handleMarkComplete = async (todoId) => {
    setActionLoadingId(todoId)
    try {
      // 햅틱 진동 피드백
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(50)
        } catch (e) {}
      }

      const nowIso = new Date().toISOString()
      const { error } = await supabase
        .from('todos')
        .update({
          status: '완료',
          completed_at: nowIso,
        })
        .eq('id', todoId)

      if (error) throw error

      // 낙관적 UI 업데이트
      setTodos((prev) =>
        prev.map((item) =>
          item.id === todoId ? { ...item, status: '완료', completed_at: nowIso } : item
        )
      )
      // 만약 '대기' 탭이면 목록에서 제외되도록 다시 로드
      if (filterStatus === '대기') {
        setTimeout(fetchTodos, 250)
      }
    } catch (err) {
      alert('완료 처리 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  // 완료 취소 (대기 복원)
  const handleRevertWait = async (todoId) => {
    setActionLoadingId(todoId)
    try {
      const { error } = await supabase
        .from('todos')
        .update({
          status: '대기',
          completed_at: null,
        })
        .eq('id', todoId)

      if (error) throw error

      setTodos((prev) =>
        prev.map((item) =>
          item.id === todoId ? { ...item, status: '대기', completed_at: null } : item
        )
      )
      if (filterStatus === '완료') {
        setTimeout(fetchTodos, 250)
      }
    } catch (err) {
      alert('상태 복원 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setActionLoadingId(null)
    }
  }

  // 시간 포맷 헬퍼
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return ''
    const diff = Math.floor((new Date() - new Date(dateStr)) / 1000)
    if (diff < 60) return '방금 전'
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`
    return `${Math.floor(diff / 3600)}시간 전`
  }

  // 대기 중인 할당 건수 계산
  const pendingCount = todos.filter((t) => t.status === '대기').length

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24 bg-slate-100 flex flex-col shadow-2xl rounded-none sm:rounded-3xl overflow-hidden border-x border-slate-200">
      {/* 스마트폰 상단 상태바 & 헤더 영역 */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 text-white pt-6 pb-5 px-5 shadow-lg">
        {/* 상단 기기 연결 인디케이터 */}
        <div className="flex items-center justify-between text-xs text-teal-200 mb-3">
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white">모바일 실시간 동기화</span>
          </div>
          <span className="text-[11px] opacity-80">
            {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>

        {/* 사용자 인사말 및 미완료 알림 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight">
              {profile?.name || '직원'} 님의 업무함
            </h1>
            <p className="text-xs text-teal-100/90 mt-0.5">
              소속: <span className="font-bold underline">{profile?.room || '미지정'}</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-teal-200">대기 중</span>
            <div className="text-2xl font-black text-white">{pendingCount}건</div>
          </div>
        </div>

        {/* 필터 탭 (대기 중 / 완료됨 / 전체) */}
        <div className="grid grid-cols-3 gap-1.5 mt-5 bg-teal-950/40 p-1 rounded-xl backdrop-blur-md border border-white/10">
          <button
            onClick={() => setFilterStatus('대기')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              filterStatus === '대기'
                ? 'bg-white text-teal-900 shadow-sm'
                : 'text-teal-200 hover:text-white'
            }`}
          >
            대기 중 ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus('완료')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              filterStatus === '완료'
                ? 'bg-white text-teal-900 shadow-sm'
                : 'text-teal-200 hover:text-white'
            }`}
          >
            완료됨
          </button>
          <button
            onClick={() => setFilterStatus('전체')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${
              filterStatus === '전체'
                ? 'bg-white text-teal-900 shadow-sm'
                : 'text-teal-200 hover:text-white'
            }`}
          >
            전체 보기
          </button>
        </div>
      </div>

      {/* 서브 필터 (내 업무만 vs 전체 실 업무) */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">보기 필터:</span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setOnlyMyTasks(true)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              onlyMyTasks
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            내 담당 업무만
          </button>
          <button
            onClick={() => setOnlyMyTasks(false)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
              !onlyMyTasks
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            실 전체 업무
          </button>
        </div>
      </div>

      {/* 메인 Todo 리스트 영역 */}
      <div className="flex-1 p-4 space-y-3 overflow-y-auto">
        {loading ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-500 font-medium">업무 목록을 동기화하는 중...</p>
          </div>
        ) : todos.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-2xl border border-slate-200/80 p-8 shadow-xs">
            <CheckCircle className="w-12 h-12 text-teal-500/40 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 text-base">할당된 업무가 없습니다</h3>
            <p className="text-xs text-slate-400 mt-1">
              현재 필터 조건에 해당하는 업무가 없습니다. 새로운 업무가 등록되면 즉시 알림이 표시됩니다.
            </p>
          </div>
        ) : (
          todos.map((todo) => {
            const isCompleted = todo.status === '완료'
            const isActionBusy = actionLoadingId === todo.id

            return (
              <div
                key={todo.id}
                className={`bg-white rounded-2xl p-4 border transition-all duration-200 shadow-sm ${
                  isCompleted
                    ? 'border-slate-200 opacity-80 bg-slate-50/70'
                    : 'border-teal-100 shadow-md ring-1 ring-teal-500/10'
                }`}
              >
                {/* 상단 메타 태그 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        todo.room === '치료실'
                          ? 'bg-teal-100 text-teal-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {todo.room}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(todo.created_at)}
                    </span>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                      isCompleted ? 'bg-slate-200 text-slate-700' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {isCompleted ? '시행완료' : '진행대기'}
                  </span>
                </div>

                {/* 업무 제목 */}
                <h2
                  className={`text-base font-bold leading-snug mb-2 ${
                    isCompleted ? 'text-slate-500 line-through' : 'text-slate-900'
                  }`}
                >
                  {todo.title}
                </h2>

                {/* 담당자 정보 */}
                <div className="text-xs text-slate-500 flex items-center gap-1.5 mb-3.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>담당: {todo.assignee?.name || '담당자'}</span>
                  {isCompleted && todo.completed_at && (
                    <span className="text-teal-700 font-semibold ml-auto">
                      ✓ {new Date(todo.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 완료
                    </span>
                  )}
                </div>

                {/* 원터치 시행 완료 버튼 (모바일 최적화 대형 터치 영역) */}
                {!isCompleted ? (
                  <button
                    onClick={() => handleMarkComplete(todo.id)}
                    disabled={isActionBusy}
                    className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-extrabold text-sm rounded-xl shadow-md shadow-teal-600/30 flex items-center justify-center space-x-2 active-press transition disabled:opacity-50"
                  >
                    {isActionBusy ? (
                      <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5 stroke-[2.5]" />
                        <span>[시행 완료] 터치</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => handleRevertWait(todo.id)}
                    disabled={isActionBusy}
                    className="w-full py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs rounded-xl flex items-center justify-center space-x-1.5 transition active-press"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>완료 취소 (대기 상태로 복원)</span>
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* 안드로이드 PWA 하단 알림 바 */}
      <div className="bg-white border-t border-slate-200 p-3 text-center text-xs text-slate-400">
        안드로이드 Chrome '홈 화면에 추가'를 통해 전용 앱으로 구동할 수 있습니다.
      </div>
    </div>
  )
}
