# 💙 Blu Shaak Digital Signage & WAS Multi-Display System

블루샥(Blu Shaak) 멀티 디스플레이 디지털 메뉴판 및 실시간 WAS 동기화 제어 시스템입니다.
매장 내 PC 한 대에 서버를 띄우고, 같은 매장 네트워크에 연결된 화면(TV/모니터) 여러 대가 그 서버에 접속해 실시간으로 동기화됩니다.

## ✨ 주요 기능 (Key Features)

- **🖥️ 4개 화면 독립/동기화 멀티 디스플레이**: (Display #1 커피, #2 음료/에이드, #3 티/블렌디드, #4 쉐이크/디저트), 화면별 헤더 색상 구분
- **⚡ 실시간 WebSocket 중앙 제어**: 4개 디스플레이의 재생 상태, 일시정지, 배속 조절, 긴급 공지 바(Ticker Banner) 실시간 릴레이.
- **🎬🖼️ 멀티 미디어 플레이리스트 순서 엔진 (Playlist Engine)**:
  - 메뉴판, 포스터 이미지 1, 프로모션 동영상, 포스터 이미지 2 자유 조합 순서 스위처 (4가지 프리셋 제공)
- **🥤 50인치 TV 시인성 최적화 레이아웃**:
  - 좌측 대형 순수 음료 비주얼 이미지 (크기 극대화, 노 박스)
  - Flexbox 가변 자동 계산을 통한 하단 공지사항 바 위 카드 잘림 없음 (Zero Clipping)
  - 수량에 따른 동적 반응형 그리드 시스템 (`12개 (4x3)`, `15개 (5x3)`, `18개 (6x3)`)
- **📁 미디어 매니저**: 각 디스플레이별 동영상/포스터 이미지 개별 업로드 및 즉시 반영.

이 프로젝트는 **매장 로컬 PC에서 상시 구동**하는 것을 기준으로 만들어졌습니다 (Vercel 등 클라우드 서버리스 배포는 실시간 동기화·대용량 영상 업로드와 궁합이 맞지 않아 사용하지 않습니다).

---

## 🚀 매장 PC 설치 방법 (Getting Started)

### 1. Node.js 설치

먼저 서버를 돌릴 PC에 **Node.js 20 LTS**를 설치합니다.

1. https://nodejs.org 접속 → **LTS** 버전 다운로드 (Windows Installer, `.msi`)
2. 다운로드한 설치 파일을 실행하고 기본값으로 계속 "다음" 눌러 설치
3. 설치 확인: 시작 메뉴에서 "명령 프롬프트"(cmd) 실행 후 아래 입력

   ```bash
   node -v
   npm -v
   ```

   버전 번호가 출력되면 설치 완료입니다.

### 2. 프로젝트 파일 받기

이 폴더(`BLUSHAAK_MENU`) 전체를 매장 PC로 복사하거나, git이 설치되어 있다면:

```bash
git clone https://github.com/yoonjunho-ai/blushaak_menu.git
cd blushaak_menu
```

### 3. 패키지 설치 및 서버 실행

프로젝트 폴더에서 명령 프롬프트를 열고:

```bash
npm install
npm start
```

아래처럼 뜨면 정상 실행된 것입니다.

```
🚀 Blu Shaak Signage WAS Server running on port 3000
🖥️  Display screens: http://localhost:3000/display?id=1..4
⚙️  Admin Dashboard: http://localhost:3000/admin
```

이 창을 닫으면 서버가 꺼지므로, 매장 운영 중에는 계속 켜둬야 합니다. (아래 "PC 부팅 시 자동 실행" 참고)

### 4. 화면 접속하기

**서버를 실행한 PC 자체**에서 접속할 때는:

- 디스플레이 1~4번: `http://localhost:3000/display?id=1` ~ `id=4`
- 관리자 대시보드: `http://localhost:3000/admin`

**다른 TV/모니터(별도 PC, 미니PC, 스마트TV 브라우저 등)**에서 접속할 때는 `localhost` 대신 서버 PC의 **매장 내부 IP 주소**를 사용해야 합니다.

1. 서버 PC에서 명령 프롬프트에 `ipconfig` 입력 → "IPv4 주소" 확인 (예: `192.168.0.15`)
2. 다른 화면 기기의 브라우저에서 `http://192.168.0.15:3000/display?id=1` 형태로 접속

> ⚠️ 서버 PC와 화면 기기들은 **같은 공유기(같은 Wi-Fi/네트워크)**에 연결되어 있어야 합니다.

### 5. 방화벽 허용 (다른 화면에서 접속이 안 될 때)

Windows 방화벽이 3000번 포트를 막고 있으면 다른 기기에서 접속이 안 될 수 있습니다.

1. Windows 보안 → 방화벽 및 네트워크 보호 → 앱이 방화벽을 통과하도록 허용
2. Node.js(또는 node.exe) 항목을 찾아 "개인" 및 "공용" 체크 후 저장
3. 목록에 없다면 "다른 앱 허용"에서 `node.exe` 직접 추가 (보통 `C:\Program Files\nodejs\node.exe`)

### 6. TV 화면을 키오스크(전체화면)로 띄우기

각 디스플레이 화면에서 크롬을 전체화면·주소창 없이 띄우려면 바로가기 대상에 아래처럼 `--kiosk` 옵션을 추가합니다.

```
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk http://192.168.0.15:3000/display?id=1
```

디스플레이 화면마다 `id=1`, `id=2`, `id=3`, `id=4`로 바꿔서 각자 다른 바로가기를 만들면 됩니다.

---

## 🔁 PC 부팅 시 서버 자동 실행 (선택)

매장 PC를 켤 때마다 수동으로 `npm start`를 입력하지 않으려면:

1. 프로젝트 폴더에 `start-server.bat` 파일을 만들고 아래 내용을 저장합니다.

   ```bat
   @echo off
   cd /d "%~dp0"
   npm start
   ```

2. `Win + R` → `shell:startup` 입력 → 열린 폴더에 위 `start-server.bat`의 **바로가기**를 복사합니다.
3. 다음 PC 재부팅부터 로그인과 동시에 서버가 자동으로 켜집니다.

---

## ⚙️ 관리자 대시보드 사용법

`http://localhost:3000/admin` (또는 서버 PC IP)로 접속하면:

- 메뉴 항목별 이름/가격/뱃지/품절 여부 수정
- 공지사항(티커) 문구 켜기/끄기 및 수정
- 화면별 프로모션 동영상·포스터 이미지 업로드
- 재생 순서(플레이리스트) 프리셋 변경, 배속·일시정지 제어

수정 사항은 저장 즉시 모든 디스플레이 화면에 실시간으로 반영됩니다.

---

## 🛠️ 문제 해결

- **"port 3000 already in use" 오류**: 이미 서버가 실행 중이라는 뜻입니다. 기존 명령 프롬프트 창을 확인하거나, 작업 관리자에서 `node.exe`를 종료한 뒤 다시 `npm start`.
- **다른 화면에서 안 열림**: 서버 PC의 IP가 바뀌었거나(공유기 재시작 등), 방화벽 문제일 수 있습니다. 위 4~5번 항목을 다시 확인하세요.
- **업로드한 영상이 잘림/느림**: 파일 용량이 너무 크지 않은지 확인하세요 (권장: 1080p, 30초 이내, 30~50MB 이하).

## 📁 프로젝트 구조

```
BLUSHAAK_MENU/
├── server_local.js      # 로컬 매장 PC용 서버 (Express + WebSocket)
├── menu_config.json      # 메뉴/설정 데이터 (관리자 화면에서 수정하면 자동 저장됨)
├── public/                # 정적 화면 (display.html, admin.html, css, js, assets)
├── uploads/                # 업로드된 프로모션 영상 저장 위치
├── api/                    # (참고용) Vercel 서버리스 재배포 시 사용할 백엔드 — 현재 미사용
└── vercel.json             # (참고용) Vercel 재배포 시 라우팅 설정 — 현재 미사용
```
