# STATE//LESS

> 이 페이지는 당신을 기억한다. 브라우저 흔적을 해석해 기억 관리 AI MORI의 여섯 조각을 복구하는 메타 퍼즐 게임.

`STATE//LESS`는 별도 서버나 API 키 없이 실행되는 정적 웹 게임입니다. 첫 방문에는 게임 상태 쿠키의 보존 기간을 직접 고르고, 이후 방문부터는 방문 횟수·완료 런·보존 정책·이전 결말·최고 점수·기억 조각이 문제와 MORI의 대사에 반영됩니다.

## 플레이

- 온라인 플레이: <https://softkleenex.github.io/state-less-game/>

- 목표: Pretext가 오염 코어 주위로 재배치한 브라우저 흔적을 읽고, 단일 신호 해독부터 복수 필드 체크섬까지 서로 다른 여섯 퍼즐을 해결합니다.
- 문제 풀: 화면·입력·탭·네트워크 같은 브라우저 상태와 조각·완료 런·보존 정책·최고 점수 같은 쿠키 진행도를 합친 14개 신호에서 매 런 다른 문제를 만듭니다.
- 규칙 순서: 기본 규칙 4개와 고난도 규칙 2개의 난이도 곡선은 유지하면서 각 묶음의 순서를 시드별로 바꿉니다.
- 성공: 6개 중 5개 이상을 맞혀 `VERIFIED` 결말에 도달하면 다음 MORI 기억 파일과 조각 1개를 획득합니다.
- 실패: 시간 초과 또는 오답으로 `MEMORY INTEGRITY` 3칸을 모두 잃으면 감사가 중단됩니다.
- 성장: 기억 조각 2개마다 `ARCHIVE LENS` 충전이 늘어납니다. 렌즈는 한 라운드에 한 번 오답 하나를 제거하며 런당 최대 3회 사용할 수 있습니다.
- 위험 선택: 답에 확신이 있으면 `DEEP VERIFY`를 켜 정답 보너스 350점을 걸 수 있습니다. 마지막 6라운드 `FINAL CORE`에서는 보너스가 700점으로 오르며, 실패하면 무결성을 2칸 잃습니다. 무결성이 1칸일 때는 사용할 수 없습니다.
- 컴백: 오답 또는 시간 초과 뒤 3연속 정답을 만들면 `SYNC RECOVERY`가 이전 오류 하나와 무결성 1칸을 복구합니다. 런당 한 번만 발동하며 복구 런의 최고 랭크는 A입니다.
- 런별 요청: 완료 런과 조각 수에 따라 `SYNC CHAIN`, `WAGER PROOF`, `CLEAN ARCHIVE`가 순환합니다. 목표 진행도를 한 판 내내 표시하고 완료 순간 MORI의 `REQUEST SEALED` 반응과 600점 보너스를 지급합니다.
- 런 피드백: 플레이를 시작하면 게임 패널이 전용 화면으로 확장됩니다. `VERIFIED GATE`가 라운드별 성공·실패와 보상까지 남은 정답 수를 표시하고, 숫자 타이머·MORI 판정 컷인·상태색·사운드가 함께 반응합니다. 마지막 고난도 문제는 전용 경로·MORI 대사·코어 색상·2배 승부수를 가진 `FINAL CORE`로 전환됩니다.
- 재방문: 저장한 결말·최고 점수·성공으로 얻은 조각과 MORI 기록이 다음 플레이의 일지와 문제에 반영됩니다. 실패 기록은 남지만 조각은 지급되지 않습니다.
- 완성 후: 여섯 파일을 모두 복구하면 인트로 목표가 다음 파일에서 최고 점수와 6연속 SYNC 도전으로 전환됩니다.

### 키보드만 사용

- `←` / `→`: 선택 이동
- `Space` / `Enter`: 선택 확정
- `D`: 현재 라운드의 `DEEP VERIFY` 위험 보상 켜기/끄기
- `F`: `ARCHIVE LENS` 충전 1개를 사용해 오답 하나 제거
- 판정 후 `Space` / `Enter`: 자동 진행을 기다리지 않고 다음 라운드로 이동
- 시작·결말 화면에서도 방향키로 버튼을 이동하고 `Space` 또는 `Enter`로 실행할 수 있습니다.

### 마우스만 사용

- 원하는 기억 방식, 문장, `DEEP VERIFY`, `ARCHIVE LENS`, 결말 버튼을 클릭합니다.
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

개발 서버가 열린 상태에서 키보드·마우스 단독 완주를 각각 녹화하고 검증할 수 있습니다. 기본 완벽 런은 마지막 `FINAL CORE`에서 `DEEP VERIFY`를 직접 켜고 +700점 판정까지 확인합니다.

```bash
STATELESS_GAME_URL=http://127.0.0.1:5173/ STATELESS_INPUT_MODE=keyboard npm run record
STATELESS_GAME_URL=http://127.0.0.1:5173/ STATELESS_INPUT_MODE=mouse npm run record
```

영상 없이 컴백 경로만 빠르게 검증할 때는 `STATELESS_PLAY_STYLE=recovery STATELESS_CAPTURE=false`를 같은 명령에 추가합니다. 첫 라운드를 의도적으로 틀린 뒤 3연속 정답으로 복구하며, A랭크·6/6·복구 1회가 아니면 실패합니다.

## GitHub Pages 배포

이 폴더를 GitHub 저장소 루트로 사용하면 [deploy-pages.yml](.github/workflows/deploy-pages.yml)이 `main` 브랜치 푸시마다 테스트·빌드·배포를 수행합니다.

1. GitHub 저장소의 **Settings → Pages**에서 Source를 **GitHub Actions**로 선택합니다.
2. 이 폴더의 파일을 저장소 루트에 커밋하고 `main`으로 푸시합니다.
3. Actions의 `Deploy STATE LESS to GitHub Pages` 작업이 끝난 뒤 제공된 URL을 확인합니다.

Vite의 `base`를 상대 경로로 설정했으므로 사용자/프로젝트 Pages 경로 모두에서 정적 자산을 불러올 수 있습니다.

## 사용한 웹 기술

화면 아트 디렉션은 `MEMORY:// LOCAL ARCHIVE`입니다. 장식용 SF 터미널 대신 현재 게임 상태를 `memory://local/ledger/...`, `audit/...`, `ending/...` 경로로 표시하고, 괘선·색인 카드·검수 표시가 쿠키와 기억 복구 규칙을 설명합니다.

- **Pretext 0.0.8**: 증거 문장을 중앙 오염 코어의 형상을 피해 줄 단위로 흐르게 하고, 선택지 칩도 DOM 텍스트 측정 없이 재배치합니다. 같은 로그가 데스크톱과 모바일에서 서로 다른 기억 흐름으로 구성됩니다.
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
- 복구한 기억 조각 수(최대 6개)
- 사용자가 고른 세션/7일 보존 정책

이름, 계정, 위치, 브라우징 기록 등 개인정보는 수집하거나 전송하지 않습니다. 결말 화면의 **쿠키를 지우고 처음으로** 버튼으로 언제든 게임 상태를 삭제할 수 있습니다.

## 프로젝트 구조

```text
.
├── index.html
├── public/
│   ├── mori/               # MORI 전신 1장 + 17개 상황별 흉상 웹 최적화본
│   └── fonts/              # 자체 호스팅 JetBrains Mono (OFL)
├── src/
│   ├── main.js             # 화면 전환, 입력, 게임 루프
│   ├── game-logic.js       # 문제 생성, 점수, 결과 판정
│   ├── state-store.js      # Cookie Store와 폴백
│   ├── pretext-layout.js   # Pretext 기반 문장 배치
│   ├── audio.js            # Web Audio 합성음
│   └── styles.css
├── tests/
│   └── game-logic.test.js
├── scripts/
│   └── record-game.mjs      # 키보드·마우스 단독 S랭크 완주 검증과 녹화
├── docs/
│   ├── 게임_소개.md
│   ├── AI_활용_기술.md
│   └── UI_UX_아트디렉션.md
├── 캐릭터/
│   ├── README.md
│   ├── images/             # 사용자가 선택한 기본 PNG 원본
│   ├── MORI_기본이미지_생성_프롬프트.md
│   └── MORI_상황별_캐릭터_설계.md
└── .github/workflows/deploy-pages.yml
```

## 제출 링크와 문서

- 플레이: <https://softkleenex.github.io/state-less-game/>
- 플레이 영상: **업로드 후 YouTube URL 입력**
- 게임 소개: [`docs/게임_소개.pdf`](docs/게임_소개.pdf)
- AI 활용 기술: [`docs/AI_활용_기술.pdf`](docs/AI_활용_기술.pdf)

## 라이선스와 에셋

- `@chenglou/pretext`: MIT License, <https://github.com/chenglou/pretext>
- Vite: MIT License, 빌드 도구로만 사용
- MORI 기본 이미지: ChatGPT Image로 생성한 PNG를 WebP로 최적화해 사용하며, 프롬프트와 선택 과정은 `캐릭터/`에 기록
- 외부 아이콘·음원·폰트 파일: 사용하지 않음
- 게임의 배경, UI 아이콘, 전환 효과, 효과음: HTML/CSS/Web Audio로 직접 생성
