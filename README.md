# STATE//LESS

> 이 페이지는 당신을 기억한다. 브라우저의 실제 상태를 근거로 AI가 만든 세 문장 중 단 하나의 거짓을 지우는 메타 퍼즐 게임.

`STATE//LESS`는 별도 서버나 API 키 없이 실행되는 정적 웹 게임입니다. 첫 방문에는 게임 상태 쿠키의 보존 기간을 직접 고르고, 이후 방문부터는 방문 횟수·이전 결말·최고 점수가 문제와 대사에 반영됩니다.

## 플레이

- 목표: 각 라운드 상단의 실제 브라우저 상태와 다른 문장 하나를 제한 시간 안에 선택합니다.
- 성공: 최대 6개의 기억 패킷을 검증하고 랭크를 획득합니다.
- 실패: 시간 초과 또는 오답으로 `MEMORY INTEGRITY` 3칸을 모두 잃으면 감사가 중단됩니다.
- 재방문: 결말을 기억하도록 선택하면 다음 플레이의 문장에 이전 상태가 포함됩니다.

### 키보드만 사용

- `←` / `→`: 선택 이동
- `Space` / `Enter`: 선택 확정
- 시작·결말 화면에서도 방향키로 버튼을 이동하고 `Space` 또는 `Enter`로 실행할 수 있습니다.

### 마우스만 사용

- 원하는 기억 방식, 문장, 결말 버튼을 클릭합니다.
- 키보드 입력은 필요하지 않습니다.

## 로컬 실행

Node.js 20.19 이상 또는 22.12 이상이 필요합니다. Node.js 24 사용을 권장합니다.

```bash
npm install
npm run dev
```

터미널에 표시되는 로컬 주소(기본값 `http://localhost:5173`)를 브라우저에서 엽니다.

```bash
npm test       # 순수 게임 로직 테스트
npm run build  # dist/ 정적 배포본 생성
npm run preview
```

전체 검증은 다음 한 줄로 실행할 수 있습니다.

```bash
npm run check
```

## GitHub Pages 배포

이 폴더를 GitHub 저장소 루트로 사용하면 [deploy-pages.yml](.github/workflows/deploy-pages.yml)이 `main` 브랜치 푸시마다 테스트·빌드·배포를 수행합니다.

1. GitHub 저장소의 **Settings → Pages**에서 Source를 **GitHub Actions**로 선택합니다.
2. 이 폴더의 파일을 저장소 루트에 커밋하고 `main`으로 푸시합니다.
3. Actions의 `Deploy STATE LESS to GitHub Pages` 작업이 끝난 뒤 제공된 URL을 확인합니다.

Vite의 `base`를 상대 경로로 설정했으므로 사용자/프로젝트 Pages 경로 모두에서 정적 자산을 불러올 수 있습니다.

## 사용한 웹 기술

- **Pretext 0.0.8**: 문장 칩의 폭과 줄바꿈을 DOM 텍스트 측정 없이 계산해 실제 게임 보드를 구성합니다.
- **Cookie Store API**: 게임 전용 1st-party 쿠키를 비동기로 읽고 씁니다. 미지원 환경에서는 `document.cookie`로 자동 전환합니다.
- **View Transition API**: 인트로·플레이·결말 화면을 문맥을 유지하며 전환합니다. 미지원 또는 움직임 감소 환경에서는 즉시 전환합니다.
- **Page Visibility API**: 플레이 도중 탭을 떠나면 시간을 멈추고, 그 사실을 다음 문제 상태에 반영합니다.
- **BroadcastChannel**: 같은 출처에서 게임을 두 탭에 열면 `OTHER SELF` 상태와 문제 내용이 바뀝니다.
- **ResizeObserver + CSS Container Queries**: 뷰포트가 아니라 게임 패널의 실제 크기에 맞춰 레이아웃을 다시 계산합니다.
- **Web Audio API**: 외부 음원 없이 선택·정답·오답 사운드를 실시간 합성합니다.

런타임에서 외부 AI 서버를 호출하지 않습니다. “AI의 추론”은 현재 브라우저 상태와 검증 가능한 규칙으로 로컬에서 생성되어, 심사 중 네트워크 상태와 비용에 영향을 받지 않습니다.

## 개인정보와 쿠키

쿠키 이름은 `state_less_memory_v1`이며 다음 게임 데이터만 저장합니다.

- 방문 횟수
- 완료한 플레이 횟수
- 최고 점수
- 이전 결말
- 사용자가 고른 세션/7일 보존 정책

이름, 계정, 위치, 브라우징 기록 등 개인정보는 수집하거나 전송하지 않습니다. 결말 화면의 **쿠키를 지우고 처음으로** 버튼으로 언제든 게임 상태를 삭제할 수 있습니다.

## 프로젝트 구조

```text
.
├── index.html
├── src/
│   ├── main.js             # 화면 전환, 입력, 게임 루프
│   ├── game-logic.js       # 문제 생성, 점수, 결과 판정
│   ├── state-store.js      # Cookie Store와 폴백
│   ├── pretext-layout.js   # Pretext 기반 문장 배치
│   ├── audio.js            # Web Audio 합성음
│   └── styles.css
├── tests/
│   └── game-logic.test.js
├── docs/
│   ├── 게임_소개.md
│   └── AI_활용_기술.md
└── .github/workflows/deploy-pages.yml
```

## 제출 전 남은 외부 작업

- GitHub Pages URL을 발급하고 `docs/게임_소개.md`의 플레이 링크를 교체합니다.
- 실제 플레이 화면을 30~60초로 녹화해 YouTube에 올린 뒤 문서의 영상 링크를 교체합니다.
- `docs/게임_소개.md`와 `docs/AI_활용_기술.md`를 PDF로 내보냅니다.

## 라이선스와 에셋

- `@chenglou/pretext`: MIT License, <https://github.com/chenglou/pretext>
- Vite: MIT License, 빌드 도구로만 사용
- 외부 이미지·아이콘·음원·폰트 파일: 사용하지 않음
- 게임의 배경, 아이콘, 전환 효과, 효과음: HTML/CSS/Web Audio로 직접 생성
