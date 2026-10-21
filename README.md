# Gderma - 다중 사용자 치료실 / 검사실 Todo 및 통계 프로그램

데스크탑 및 안드로이드(모바일 웹/PWA) 겸용으로 최적화된 병원/클리닉 치료실 및 검사실 업무 할당, 실시간 처리, 통계 관리 풀스택 솔루션입니다.

---

## 📌 주요 기능

1. **회원가입 및 인증 (Supabase Auth 연동)**:
   - 이메일/비밀번호 기반 로그인 및 회원가입.
   - 회원가입 시 이름 및 소속 부서(`치료실` / `검사실`)를 선택받아 `profiles` 테이블에 자동 연동 저장.
2. **업무 등록 화면 (데스크탑 관제 뷰)**:
   - 요청 실(치료실/검사실) 선택, 업무 내용 입력, 가입된 담당 직원 선택.
   - 다빈도 임상/치료 업무 원클릭 퀵 프리셋 버튼 제공.
3. **업무 확인 및 완료 처리 화면 (안드로이드 모바일 웹/PWA 뷰)**:
   - 로그인한 담당 직원에게 할당된 업무를 **Supabase Realtime** 웹소켓으로 실시간 수신.
   - 현장에서 이동 중에도 한 손으로 터치하기 편한 대형 원터치 `[시행 완료]` 버튼.
   - 시행 완료 시 즉시 상태가 `완료`로 변경되고 완료 시각이 정밀하게 기록됨.
4. **통계 및 이력 대시보드 (관리자 뷰)**:
   - **월말 실별 통계**: 치료실 vs 검사실 월별 누적 처리 건수 및 완료율 비교 차트.
   - **사람별 통계**: 직원별 업무 처리 완료 건수 집계 랭킹 및 진행률.
   - **상세 수행 이력**: 특정 직원, 부서, 상태별 타임라인 필터링 및 **UTF-8 BOM 한글 지원 엑셀 CSV 다운로드**.

---

## 🛠 기술 스택

- **프론트엔드**: React 18, Vite, Tailwind CSS, Lucide React Icons
- **백엔드 & 데이터베이스**: Supabase (PostgreSQL), Supabase Auth, Row Level Security (RLS)
- **실시간 통신**: Supabase Realtime (`postgres_changes` 웹소켓 채널)
- **모바일 지원**: 반응형 웹 디자인 + PWA (Progressive Web App, Web App Manifest)

---

## 🚀 빠른 시작 가이드 (Quick Start)

### 1. 패키지 설치
```bash
npm install
```

### 2. 환경변수 확인 (`.env`)
프로젝트 루트 디렉토리의 `.env` 파일에 발급된 Supabase 키가 설정되어 있는지 확인합니다:
```env
VITE_SUPABASE_URL=https://guoswbxavlkygcmvxkua.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1b3N3YnhhdmxreWdjbXZ4a3VhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0Njc2NDUsImV4cCI6MjEwODA0MzY0NX0.WpNVql9H8oct9KkaDHW7s1jD7phaXlyjtCjU-TVo5tk
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_aBcugbzzE0JMNiTbm1uNyQ_BbR46W1H
```

### 3. Supabase 데이터베이스 테이블 및 RLS 설정
1. [Supabase Dashboard](https://supabase.com/dashboard/project/guoswbxavlkygcmvxkua)에 접속합니다.
2. 좌측 메뉴에서 **SQL Editor**로 이동합니다.
3. 본 프로젝트의 `supabase/schema.sql` 파일 내용을 복사하여 붙여넣고 **Run**을 실행합니다.
   - `profiles`, `todos`, `todo_logs` 테이블 생성
   - 회원가입 시 자동 프로필 생성 트리거 (`handle_new_user`)
   - Todo 상태 변경 시 완료 시각 및 이력 로그 자동 기록 트리거 (`log_todo_activity`)
   - Row Level Security (RLS) 정책 활성화
   - Supabase Realtime publication 등록

### 4. 로컬 개발 서버 실행
```bash
npm run dev
```
브라우저에서 `http://localhost:3000` 으로 접속하여 사용할 수 있습니다.

---

## 📱 안드로이드 모바일 PWA 설치 방법

1. 스마트폰 안드로이드 크롬(Chrome) 브라우저로 배포된 웹사이트 주소에 접속합니다.
2. 브라우저 우측 상단 메뉴(점 3개)를 터치합니다.
3. **[홈 화면에 추가]** 또는 **[앱 설치]**를 선택합니다.
4. 홈 화면에 생성된 `Gderma` 앱 아이콘을 터치하여 네이티브 앱과 동일한 전체화면 모드로 사용합니다.

---

## 📂 프로젝트 폴더 구조

```
Gderma/
├── index.html                 # HTML 엔트리포인트 및 PWA 메타 태그
├── package.json               # 의존성 및 실행 스크립트
├── vite.config.js             # Vite 번들러 설정
├── tailwind.config.js         # Tailwind CSS 커스텀 테마 설정
├── postcss.config.js          # PostCSS 플러그인 설정
├── public/
│   ├── favicon.svg            # 파비콘 & 앱 아이콘
│   └── manifest.json          # PWA 웹 앱 매니페스트
├── supabase/
│   └── schema.sql             # Supabase DDL, RLS, 트리거 전체 SQL
└── src/
    ├── App.jsx                # 메인 뷰 라우팅 및 세션 관리
    ├── index.css              # 글로벌 스타일 및 테마
    ├── main.jsx               # React 돔 마운트
    ├── supabaseClient.js      # Supabase 클라이언트 인스턴스 초기화
    └── components/
        ├── Auth.jsx           # 로그인 및 회원가입 (소속 실 선택)
        ├── Navbar.jsx         # 상단 헤더 & 모바일 뷰 토글
        ├── TodoRegister.jsx   # 업무 등록 화면 (데스크탑 최적화)
        ├── MobileTodoList.jsx # 업무 확인 및 [시행 완료] (모바일 최적화)
        └── Dashboard.jsx      # 통계 및 타임라인 이력, CSV 다운로드
```
