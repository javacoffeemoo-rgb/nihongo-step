# 🚀 인터넷 배포 가이드 (Render 무료)

폰에서도 접속되고, **HTTPS라서 녹음·앱 설치·오프라인이 모두 동작**하는 주소를 만드는 방법입니다.
Python 표준 라이브러리만 쓰기 때문에 빌드 설정이 거의 없습니다.

---

## 방법 1. Render 블루프린트 (가장 쉬움, 3분)

준비된 파일: `render.yaml`, `requirements.txt`, `Procfile` → 저장소에 이미 포함됨.

| 항목 | 링크 |
|---|---|
| GitHub 저장소 | https://github.com/javacoffeemoo-rgb/nihongo-step |
| **원클릭 배포** | https://render.com/deploy?repo=https://github.com/javacoffeemoo-rgb/nihongo-step |

> 원클릭 링크는 **Render 로그인 후** 파란 화면에서 `Apply`만 누르면 됩니다.
> (GitHub 계정으로 로그인 — 소스가 공개 저장소라 별도 권한 설정 불필요)

1. https://render.com 접속 → **GitHub로 로그인**
2. **New +** → **Blueprint**
3. 저장소 목록에서 **`nihongo-step`** 선택 → **Connect**
4. 서비스 이름/플랜(Free) 확인 → **Apply**
5. 1~2분 뒤 `https://nihongo-step-xxxx.onrender.com` 주소가 나옵니다

> 저장소가 공개(public)라서 Render가 바로 읽을 수 있습니다.
> 비공개로 바꾸면 Render에 GitHub 앱 접근 권한을 한 번 허용해야 합니다.

### 배포 후 확인

- `https://...onrender.com/health` → `{"status": "ok"}`
- 폰에서 접속 → 닉네임 입력 → 6문장 학습 → **🎤 녹음**까지 동작
- 주소창 메뉴 → **홈 화면에 추가** (빨간 あ 아이콘, 전체 화면)
- `python tools/smoke_test.py` 는 로컬용이라 배포 서버에는 필요 없음

---

## ⚠️ 무료 플랜의 2가지 제약 (꼭 읽기)

| 제약 | 내용 | 영향 |
|---|---|---|
| **슬립** | 15분 정도 접속이 없으면 잠들고, 다음 접속 때 깨어나는 데 30~60초 | 첫 접속이 느릴 수 있음 (그 뒤엔 빠름) |
| **휘발성 디스크** | 재배포·재시작 때 `data/progress/` 가 초기화됨 | 닉네임별 진도가 사라질 수 있음 |

### 진도를 영구 보존하려면 (유료, 월 $7 수준)

1. Render 대시보드 → 서비스 → **Settings → Instance Type** → **Starter**
2. **Disks → Add Disk**
   - Name: `progress`
   - Mount Path: `/var/data`
   - Size: 1GB
3. **Environment → Add Environment Variable**
   - `PROGRESS_DIR` = `/var/data/progress`
4. 저장 → 재배포

> 서버는 `PROGRESS_DIR` 환경변수를 자동으로 읽습니다 (`webstore.py`).
> 무료로 쓰면서 기록을 남기려면, 가끔 `/api/progress?user=닉네임` 응답을 파일로 저장해두는 방법도 있습니다.

---

## 방법 2. Railway / Fly.io

| 서비스 | 특징 |
|---|---|
| **Railway** | GitHub 저장소 연결 → 자동 감지. `Procfile` 그대로 사용. 무료 체험 크레딧 후 유료 |
| **Fly.io** | `fly launch` → 볼륨(`fly volumes create`)으로 진도 영구 보존 가능. 카드 등록 필요 |

공통: 시작 명령은 `python server.py`, 포트는 `PORT` 환경변수를 자동으로 읽습니다.

---

## 방법 3. 배포 없이 잠깐 확인 (터널)

```text
run_tunnel.bat        ← 더블클릭 (서버 + 터널 동시에)
```

콘솔에 나오는 `https://xxxx.trycloudflare.com` 주소로 폰에서 접속.
주소는 실행할 때마다 바뀌고, PC 창을 닫으면 사라집니다. (테스트용)

---

## 배포 후 점검 체크리스트

- [ ] `/health` 200
- [ ] 닉네임 "준"으로 진도 불러오기 (로컬 데이터는 자동 이전되지 않음 — 새로 시작)
- [ ] TTS 일본어 음성 재생
- [ ] 🎤 3초 녹음 → A/B 비교 (HTTPS라서 동작해야 정상)
- [ ] 홈 화면에 추가 → standalone 실행
- [ ] 비행기 모드 → 앱 껍데기 열림 (문장은 서버 필요)
- [ ] 새 닉네임으로 진도 저장 → 새로고침 후 유지

---

## 참고: 로컬 데이터 옮기기

로컬에서 쓰던 진도(`data/progress/p_xxxx.json`)를 배포 서버로 옮기려면:
1. 로컬 파일 내용을 복사
2. 배포 서버에서 같은 닉네임으로 한 번 저장해 파일을 만든 뒤, 유료 디스크/SSH로 교체
   (무료 플랜은 파일 접근이 어려워 실질적으로 새로 시작하는 것이 simplest)
