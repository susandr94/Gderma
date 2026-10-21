import React, { useState, useEffect, useMemo } from 'react'
import { supabase } from '../supabaseClient'
import {
  BarChart3,
  Download,
  Users,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  ArrowUpDown,
  FileSpreadsheet,
  TrendingUp,
  Activity,
  Layers,
} from 'lucide-react'

export default function Dashboard({ user, profile }) {
  const [todos, setTodos] = useState([])
  const [logs, setLogs] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)

  // 필터 상태
  const [selectedStaff, setSelectedStaff] = useState('ALL')
  const [selectedRoom, setSelectedRoom] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')
  const [searchKeyword, setSearchKeyword] = useState('')

  // 데이터 로드
  const loadDashboardData = async () => {
    setLoading(true)
    try {
      // 1. 프로필 목록
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true })

      setProfiles(profileData || [])

      // 2. 전체 Todos 목록
      const { data: todosData, error: todosErr } = await supabase
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

      if (todosErr) {
        // relations fallback
        const { data: rawTodos } = await supabase
          .from('todos')
          .select('*')
          .order('created_at', { ascending: false })
        setTodos(rawTodos || [])
      } else {
        setTodos(todosData || [])
      }

      // 3. Todo Logs (이력 테이블)
      try {
        const { data: logData } = await supabase
          .from('todo_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
        setLogs(logData || [])
      } catch (logErr) {
        console.warn('todo_logs 조회 생략:', logErr)
      }
    } catch (err) {
      console.error('대시보드 데이터 조회 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboardData()
  }, [])

  // 1. 실별 누적 통계 계산 (치료실 vs 검사실)
  const roomStats = useMemo(() => {
    const stats = {
      치료실: { total: 0, completed: 0, pending: 0, rate: 0 },
      검사실: { total: 0, completed: 0, pending: 0, rate: 0 },
    }

    todos.forEach((t) => {
      const roomKey = t.room === '검사실' ? '검사실' : '치료실'
      stats[roomKey].total += 1
      if (t.status === '완료') {
        stats[roomKey].completed += 1
      } else {
        stats[roomKey].pending += 1
      }
    })

    stats.치료실.rate =
      stats.치료실.total > 0 ? Math.round((stats.치료실.completed / stats.치료실.total) * 100) : 0
    stats.검사실.rate =
      stats.검사실.total > 0 ? Math.round((stats.검사실.completed / stats.검사실.total) * 100) : 0

    return stats
  }, [todos])

  // 2. 사람별 집계 통계
  const staffStats = useMemo(() => {
    const map = {}

    // 기본 프로필 등록
    profiles.forEach((p) => {
      map[p.id] = {
        id: p.id,
        name: p.name,
        room: p.room,
        total: 0,
        completed: 0,
        pending: 0,
        rate: 0,
      }
    })

    // Todo 기반 카운트
    todos.forEach((t) => {
      const aid = t.assignee_id
      if (!map[aid]) {
        map[aid] = {
          id: aid,
          name: t.assignee?.name || '미등록 직원',
          room: t.room,
          total: 0,
          completed: 0,
          pending: 0,
          rate: 0,
        }
      }
      map[aid].total += 1
      if (t.status === '완료') {
        map[aid].completed += 1
      } else {
        map[aid].pending += 1
      }
    })

    return Object.values(map)
      .map((item) => ({
        ...item,
        rate: item.total > 0 ? Math.round((item.completed / item.total) * 100) : 0,
      }))
      .sort((a, b) => b.completed - a.completed)
  }, [profiles, todos])

  // 3. 상세 업무 이력 필터링
  const filteredTodos = useMemo(() => {
    return todos.filter((item) => {
      if (selectedStaff !== 'ALL' && item.assignee_id !== selectedStaff) return false
      if (selectedRoom !== 'ALL' && item.room !== selectedRoom) return false
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) return false
      if (searchKeyword.trim()) {
        const query = searchKeyword.toLowerCase()
        const titleMatch = item.title?.toLowerCase().includes(query)
        const nameMatch = item.assignee?.name?.toLowerCase().includes(query)
        if (!titleMatch && !nameMatch) return false
      }
      return true
    })
  }, [todos, selectedStaff, selectedRoom, selectedStatus, searchKeyword])

  // 4. CSV 다운로드 핸들러 (Excel 한글 호환 UTF-8 BOM 지원)
  const handleExportCSV = () => {
    if (filteredTodos.length === 0) {
      alert('내보낼 데이터가 없습니다.')
      return
    }

    const headers = [
      '업무ID',
      '요청부서(실)',
      '업무내용',
      '담당직원',
      '상태',
      '등록시각',
      '완료시각',
      '소요시간(분)',
    ]

    const rows = filteredTodos.map((item) => {
      const created = item.created_at ? new Date(item.created_at) : null
      const completed = item.completed_at ? new Date(item.completed_at) : null
      let durationMin = ''
      if (created && completed) {
        durationMin = Math.round((completed - created) / (1000 * 60))
      }

      return [
        `"${item.id}"`,
        `"${item.room}"`,
        `"${item.title.replace(/"/g, '""')}"`,
        `"${item.assignee?.name || item.assignee_id || ''}"`,
        `"${item.status}"`,
        `"${created ? created.toLocaleString('ko-KR') : ''}"`,
        `"${completed ? completed.toLocaleString('ko-KR') : ''}"`,
        `"${durationMin}"`,
      ]
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const todayStr = new Date().toISOString().split('T')[0]
    link.href = url
    link.setAttribute('download', `Gderma_치료검사실_업무통계이력_${todayStr}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const totalAll = todos.length
  const completedAll = todos.filter((t) => t.status === '완료').length
  const overallRate = totalAll > 0 ? Math.round((completedAll / totalAll) * 100) : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 대시보드 헤더 & CSV 내보내기 버튼 */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-teal-600" />
            <span>치료실·검사실 통합 통계 및 수행 이력</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            실별 누적 업무량 비교, 직원별 완료 실적, 상세 수행 타임라인 분석 대시보드입니다.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-sm rounded-xl shadow-md shadow-emerald-600/20 active-press transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>엑셀 CSV 다운로드</span>
        </button>
      </div>

      {/* KPI 카드 요약 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold mb-2">
            <span>전체 등록 업무</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-black text-slate-900">{totalAll}건</div>
          <div className="text-xs text-slate-400 mt-1">대기: {totalAll - completedAll}건</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-teal-600 text-xs font-bold mb-2">
            <span>총 완료 업무</span>
            <CheckCircle2 className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-3xl font-black text-teal-700">{completedAll}건</div>
          <div className="text-xs text-teal-600 mt-1">전체 완료율: {overallRate}%</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-teal-200/60 bg-teal-50/20 shadow-xs">
          <div className="flex items-center justify-between text-teal-800 text-xs font-bold mb-2">
            <span>치료실 처리 실적</span>
            <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {roomStats.치료실.completed} <span className="text-sm font-normal text-slate-500">/ {roomStats.치료실.total}건</span>
          </div>
          <div className="text-xs text-teal-700 mt-1">완료율: {roomStats.치료실.rate}%</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-blue-200/60 bg-blue-50/20 shadow-xs">
          <div className="flex items-center justify-between text-blue-800 text-xs font-bold mb-2">
            <span>검사실 처리 실적</span>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">
            {roomStats.검사실.completed} <span className="text-sm font-normal text-slate-500">/ {roomStats.검사실.total}건</span>
          </div>
          <div className="text-xs text-blue-700 mt-1">완료율: {roomStats.검사실.rate}%</div>
        </div>
      </div>

      {/* 1. 월말 실별 비교 통계 (치료실 vs 검사실) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-600" />
          <span>월별 실별 누적 처리 건수 비교</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 치료실 프로그레스 */}
          <div className="p-5 rounded-xl border border-teal-100 bg-teal-50/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-teal-900">치료실 (Treatment Room)</span>
              <span className="text-xs font-extrabold text-teal-700">
                {roomStats.치료실.completed}건 완료 / {roomStats.치료실.total}건 ({roomStats.치료실.rate}%)
              </span>
            </div>
            <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex">
              <div
                className="bg-teal-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${roomStats.치료실.rate}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-2">
              <span>대기: {roomStats.치료실.pending}건</span>
              <span>완료: {roomStats.치료실.completed}건</span>
            </div>
          </div>

          {/* 검사실 프로그레스 */}
          <div className="p-5 rounded-xl border border-blue-100 bg-blue-50/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-blue-900">검사실 (Lab & Testing)</span>
              <span className="text-xs font-extrabold text-blue-700">
                {roomStats.검사실.completed}건 완료 / {roomStats.검사실.total}건 ({roomStats.검사실.rate}%)
              </span>
            </div>
            <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden flex">
              <div
                className="bg-blue-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${roomStats.검사실.rate}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 mt-2">
              <span>대기: {roomStats.검사실.pending}건</span>
              <span>완료: {roomStats.검사실.completed}건</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 사람별 통계 (직원별 업무 완료 건수 집계 랭킹) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h3 className="text-base font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" />
          <span>직원별 업무 처리 및 완료 건수 집계</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-extrabold text-slate-500 uppercase bg-slate-50/70">
                <th className="py-3 px-4">직원 성명</th>
                <th className="py-3 px-4">소속 실</th>
                <th className="py-3 px-4 text-center">할당 총 건수</th>
                <th className="py-3 px-4 text-center">완료 건수</th>
                <th className="py-3 px-4 text-center">대기 건수</th>
                <th className="py-3 px-4 min-w-[150px]">달성률 (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    직원 데이터가 없습니다.
                  </td>
                </tr>
              ) : (
                staffStats.map((staff) => (
                  <tr key={staff.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                        {staff.name.charAt(0)}
                      </div>
                      <span>{staff.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          staff.room === '치료실'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {staff.room || '미지정'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-semibold text-slate-700">{staff.total}</td>
                    <td className="py-3 px-4 text-center font-extrabold text-teal-600">
                      {staff.completed}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-500">{staff.pending}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-teal-600 h-full rounded-full"
                            style={{ width: `${staff.rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-9 text-right">
                          {staff.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. 사람별 수행 이력 및 상세 타임라인 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              <span>상세 업무 수행 타임라인 & 로그 리스트</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              특정 직원이 언제 어떤 업무를 완료했는지 정밀하게 조회합니다.
            </p>
          </div>

          {/* 검색창 */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="업무명 또는 직원 검색"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/30"
            />
          </div>
        </div>

        {/* 필터 컨트롤 바 */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 font-bold">
            <Filter className="w-3.5 h-3.5" />
            <span>조건 필터:</span>
          </div>

          {/* 직원별 필터 */}
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">전체 직원</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.room})
              </option>
            ))}
          </select>

          {/* 실별 필터 */}
          <select
            value={selectedRoom}
            onChange={(e) => setSelectedRoom(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">전체 실</option>
            <option value="치료실">치료실만</option>
            <option value="검사실">검사실만</option>
          </select>

          {/* 상태 필터 */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white font-medium text-slate-700 focus:outline-none"
          >
            <option value="ALL">전체 상태</option>
            <option value="대기">대기 중</option>
            <option value="완료">완료됨</option>
          </select>

          <span className="text-slate-400 ml-auto font-medium">
            조회 결과: <strong className="text-teal-700">{filteredTodos.length}</strong>건
          </span>
        </div>

        {/* 타임라인 목록 테이블 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase bg-slate-50">
                <th className="py-3 px-4">상태</th>
                <th className="py-3 px-4">실</th>
                <th className="py-3 px-4">업무 내용</th>
                <th className="py-3 px-4">담당 직원</th>
                <th className="py-3 px-4">등록 시각</th>
                <th className="py-3 px-4">완료 시각</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTodos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    조건에 해당하는 수행 이력이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredTodos.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-extrabold px-2 py-0.5 rounded-md ${
                          item.status === '완료'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          item.room === '치료실'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.room}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{item.title}</td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {item.assignee?.name || '담당자'}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-400">
                      {item.created_at ? new Date(item.created_at).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td className="py-3 px-4 text-xs text-teal-700 font-medium">
                      {item.completed_at ? new Date(item.completed_at).toLocaleString('ko-KR') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
