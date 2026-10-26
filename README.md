# Phyx Blockly

upstream Blockly에 최소 패치를 적용해 `@cp949/phyx-blockly`로 npm 배포하는 저장소입니다.

**현재 패치:** JavaScript procedure generator를 `async`/`await` 기반으로 변경

---

## 13.x 사용 시 주의사항

`13.4.0-patch.1`부터 upstream Blockly 13.x 기반입니다. 12.x에서 올리면 아래를 확인합니다.
전체 변경 목록: [blockly-v13.0.0 릴리스 노트](https://github.com/RaspberryPiFoundation/blockly/releases/tag/blockly-v13.0.0)

### 설치 환경

| 항목 | 내용 |
| ---- | ---- |
| Node | 22 이상 |
| `jsdom` | peerDependency (`>=27.4.0 <31.0.0`). Node 환경에서는 직접 설치 |
| 브라우저 | Safari 15.4 이상 |

```sh
npm install @cp949/phyx-blockly jsdom
```

### 동작 변경

- 키보드 탐색과 스크린리더 지원이 기본으로 켜집니다.
- 기존 단축키와 충돌하면 한쪽을 바꿔야 합니다.
- `@blockly/keyboard-navigation` 플러그인은 제거합니다. 13.x에 내장되었습니다.
- 기본 renderer가 `thrasos`로 바뀝니다. renderer를 명시하면 영향이 없습니다.
- 기본 sound 위치가 `blockly.com/media`로 바뀝니다. 새 drop sound도 추가되었습니다.
- 커스텀 블록과 필드는 aria 역할과 라벨을 추가해야 합니다.

### API 변경

- `Block.getVars()`가 제거되었습니다. `Block.getVarModels()`를 사용합니다.
- 이 저장소의 `procedures.ts` 패치도 같은 이유로 `getVarModels()`와 `getId()`로 바꿨습니다.

### 12.x에 머무르기

`latest`는 13.x를 가리킵니다. 12.x는 버전을 고정합니다.

```sh
npm install @cp949/phyx-blockly@12.5.1-p1
```

---

## 한 줄 요약

```text
src/ 패치 파일  →  build.sh로 blockly-src에 적용 및 빌드  →  dist/ 생성  →  release.sh로 배포
```

---

## 주요 파일

| 파일 | 역할 |
| ---- | ---- |
| `UPSTREAM_REF.txt` | 빌드할 upstream Blockly 태그/hash |
| `src/` | 로컬 패치 파일 (upstream과 동일한 경로 구조) |
| `build.sh` | 패치 적용 + 빌드 + `dist/` 생성 |
| `build-and-test.sh` | build.sh + 앞뒤 테스트 |
| `release.sh` | 테스트 + npm publish |
| `scripts/` | 내부 헬퍼 (직접 호출 불필요) |

---

## 워크플로우

### 평소 작업

```sh
# 1. src/ 패치 파일 수정
# 2. 빌드 및 테스트
npm run build:test

# 3. dist/ 확인 후 배포
npm run release
```

### upstream 버전 업그레이드

```sh
# 1. UPSTREAM_REF.txt 수정
echo "blockly-v13.5.0" > UPSTREAM_REF.txt

# 2. 새 버전으로 빌드. 패치한 파일을 upstream이 바꿨으면 여기서 실패하고 변경 diff를 보여준다
npm run build

# 3. 실패했다면 src/ 패치 파일을 수정하고 기준을 갱신한다
npm run patch:diff     # src/ 와 upstream 파일의 차이 확인
npm run patch:accept   # src-base.json 갱신

# 4. 문제 없으면 package.json 버전도 올리고 배포
npm run release
```

`src-base.json`은 패치 기준이 된 upstream 파일의 해시를 기록한다.
`src/` 파일은 upstream 파일을 통째로 덮어쓰므로, 이 기록이 upstream 변경을 놓치지 않게 한다.

### 처음 설정

```sh
npm install
git submodule update --init --recursive
```

---

## 버전 규칙

upstream 버전 뒤에 `-patch.N` 접미사:

```text
upstream 12.5.1  →  package 12.5.1-patch.1, 12.5.1-patch.2, ...
```

`package.json`의 버전만 올리면 됩니다.

- `N`은 점으로 분리합니다. semver가 숫자로 비교하므로 `patch.10`이 `patch.2`보다 높습니다.
- `-pN`(점 없음)은 `p10 < p2`로 정렬되어 쓰지 않습니다.
- 이미 발행된 `12.5.1-p1`은 유지합니다. `patch.N`이 `p1`보다 높게 정렬됩니다.
- prerelease이므로 `^12.5.1` 범위에는 매칭되지 않습니다. 사용하는 쪽에서 정확한 버전을 고정해야 합니다.

---

## 현재 패치 위치

```text
src/packages/blockly/generators/javascript/procedures.ts
```

- `function` → `async function`
- `foo()` → `await foo()`
- `Order.FUNCTION_CALL` → `Order.AWAIT`

upstream 업데이트 시 이 파일 먼저 확인. `npm run patch:diff`로 차이를 본다.
