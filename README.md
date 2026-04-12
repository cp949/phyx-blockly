# Phyx Blockly

upstream Blockly에 최소 패치를 적용해 `@cp949/phyx-blockly`로 npm 배포하는 저장소입니다.

**현재 패치:** JavaScript procedure generator를 `async`/`await` 기반으로 변경

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
echo "blockly-v13.0.0" > UPSTREAM_REF.txt

# 2. 새 버전으로 먼저 테스트
npm run build -- --ref blockly-v13.0.0

# 3. 문제 없으면 package.json 버전도 올리고 배포
npm run release
```

### 처음 설정

```sh
npm install
git submodule update --init --recursive
```

---

## 버전 규칙

upstream 버전 뒤에 `-pN` 접미사:

```text
upstream 12.5.1  →  package 12.5.1-p1, 12.5.1-p2, ...
```

`package.json`의 버전만 올리면 됩니다.

---

## 현재 패치 위치

```text
src/packages/blockly/generators/javascript/procedures.ts
```

- `function` → `async function`
- `foo()` → `await foo()`
- `Order.FUNCTION_CALL` → `Order.AWAIT`

upstream 업데이트 시 이 파일 먼저 확인.
