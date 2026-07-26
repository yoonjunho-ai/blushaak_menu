# 💙 Blu Shaak Digital Signage & WAS Multi-Display System

블루샥(Blu Shaak) 멀티 디스플레이 디지털 메뉴판 및 실시간 WAS 동기화 제어 시스템입니다.

## ✨ 주요 기능 (Key Features)

- **🖥️ 4개 화면 독립/동기화 멀티 디스플레이**: (Display #1 커피, #2 음료/에이드, #3 티/블렌디드, #4 쉐이크/디저트)
- **⚡ 실시간 WebSocket 중앙 제어**: 4개 디스플레이의 재생 상태, 일시정지, 배속 조절, 긴급 공지 바(Ticker Banner) 실시간 릴레이.
- **🎬🖼️ 멀티 미디어 플레이리스트 순서 엔진 (Playlist Engine)**:
  - 메뉴판, 포스터 이미지 1, 프로모션 동영상, 포스터 이미지 2 자유 조합 순서 스위처 (4가지 프리셋 제공)
- **🥤 50인치 TV 시인성 최적화 레이아웃**:
  - 좌측 대형 순수 음료 비주얼 이미지 (크기 극대화, 노 박스)
  - Flexbox 가변 자동 계산을 통한 하단 공지사항 바 위 카드 잘림 없음 (Zero Clipping)
  - 수량에 따른 동적 반응형 그리드 시스템 (`12개 (4x3)`, `15개 (5x3)`, `18개 (6x3)`)
- **📁 미디어 매니저**: 각 디스플레이별 동영상/포스터 이미지 개별 업로드 및 즉시 반영.

## 🚀 실행 방법 (Getting Started)

```bash
# 패키지 설치
npm install

# 서버 실행
node server.js
```

- **디스플레이 화면**: `http://localhost:3000/display?id=1..4`
- **관리자 대시보드**: `http://localhost:3000/admin`
