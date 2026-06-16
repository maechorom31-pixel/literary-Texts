#!/bin/bash
# 더블클릭 한 번으로 로컬 미리보기 서버를 띄우는 스크립트 (macOS).
# 첫 실행 시 Finder에서 마우스 우클릭 → 열기 → 열기 한 번 해 주시면
# 이후로는 그냥 더블클릭만 하셔도 됩니다.

cd "$(dirname "$0")"
PORT=8000

# 이미 다른 프로세스가 같은 포트를 쓰고 있으면 다음 빈 포트로 옮김
while lsof -i ":$PORT" -sTCP:LISTEN >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

URL="http://localhost:$PORT/"
echo "============================================="
echo " 수능특강 독서 도식 자율학습 - 로컬 미리보기"
echo "============================================="
echo " 폴더: $(pwd)"
echo " 주소: $URL"
echo
echo " 종료하려면 이 창을 닫거나 Ctrl+C 를 누르세요."
echo "============================================="

# 잠시 후 브라우저 자동 열기
( sleep 1; open "$URL" ) &

# Python 3 표준 라이브러리 서버
exec python3 -m http.server "$PORT" --bind 127.0.0.1
