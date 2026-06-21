#!/usr/bin/env bash
# 더미 nva 샘플 클립 생성 — 박스/선 캐릭터. 품질 0, 구조 증명용.
# 알파: ffmpeg 8.1 libvpx 알파가 동작 안 해(yuv420p로 드롭) 크로마키 방식 사용.
#   캐릭터를 크로마 색(#00b140) 배경에 렌더 → 뷰어가 canvas에서 크로마 제거 후 배경에 합성.
#   (실제 배포는 trt가 VP9 yuva420p 알파 생성 — 포맷은 알파/크로마 둘 다 수용.)
# 다양성: 2 talking 포즈(서기/앉기) + 3 animation(춤/인사/끄덕임) + 2 transition.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$HERE/demo.nva"
CLIPS="$OUT/clips"
mkdir -p "$CLIPS"
W=360; H=640; R=25
CHROMA="#00b140"   # 크로마키 색 (캐릭터 색과 구분)

FONT=""
for f in \
  /usr/share/fonts/google-noto/NotoSans-Bold.ttf \
  /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf \
  /usr/share/fonts/dejavu/DejaVuSans-Bold.ttf ; do
  [ -f "$f" ] && FONT="$f" && break
done
[ -z "$FONT" ] && FONT="$(fc-list : file 2>/dev/null | head -1 | cut -d: -f1 | xargs)" || true
echo "FONT=${FONT:-<none>}  CHROMA=$CHROMA"

label() {
  if [ -n "$FONT" ]; then
    printf ",drawtext=fontfile=%s:text='%s':x=(w-text_w)/2:y=24:fontsize=30:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=10" "$FONT" "$1"
  fi
}

enc() { # $1=vf $2=dur $3=outfile
  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i "color=c=${CHROMA}:s=${W}x${H}:r=${R}:d=${2}" \
    -vf "$1" -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 0 -crf 32 "$CLIPS/$3"
  echo "  ✓ $3"
}

BODY="#3a7afe"; HEAD="#ffce8a"; ARM="#ff5a5a"

echo "[1/7] stand_idle"
enc "drawbox=x=130:y='262+4*sin(2*PI*t)':w=100:h=240:color=${BODY}:t=fill,\
drawbox=x=150:y='150+4*sin(2*PI*t)':w=60:h=80:color=${HEAD}:t=fill$(label STAND)" 2 stand_idle.webm

echo "[2/7] sit_idle"
enc "drawbox=x=130:y='372+3*sin(2*PI*t)':w=100:h=150:color=${BODY}:t=fill,\
drawbox=x=150:y='292+3*sin(2*PI*t)':w=60:h=72:color=${HEAD}:t=fill$(label SIT)" 2 sit_idle.webm

echo "[3/7] sit_down (서기→앉기)"
enc "drawbox=x=130:y='262+(372-262)*t/1.5':w=100:h='240+(150-240)*t/1.5':color=${BODY}:t=fill,\
drawbox=x=150:y='150+(292-150)*t/1.5':w=60:h='80+(72-80)*t/1.5':color=${HEAD}:t=fill$(label 'SIT DOWN')" 1.5 sit_down.webm

echo "[4/7] stand_up (앉기→서기)"
enc "drawbox=x=130:y='372+(262-372)*t/1.5':w=100:h='150+(240-150)*t/1.5':color=${BODY}:t=fill,\
drawbox=x=150:y='292+(150-292)*t/1.5':w=60:h='72+(80-72)*t/1.5':color=${HEAD}:t=fill$(label 'STAND UP')" 1.5 stand_up.webm

echo "[5/7] dance"
enc "drawbox=x='130+45*sin(4*PI*t)':y=262:w=100:h=240:color=${BODY}:t=fill,\
drawbox=x='150+45*sin(4*PI*t)':y='150+10*abs(sin(4*PI*t))':w=60:h=80:color=${HEAD}:t=fill$(label DANCE)" 2 dance.webm

echo "[6/7] wave"
enc "drawbox=x=130:y=262:w=100:h=240:color=${BODY}:t=fill,\
drawbox=x=150:y=150:w=60:h=80:color=${HEAD}:t=fill,\
drawbox=x='228+18*sin(6*PI*t)':y='150-10*sin(6*PI*t)':w=24:h=90:color=${ARM}:t=fill$(label WAVE)" 2 wave.webm

echo "[7/7] nod"
enc "drawbox=x=130:y=262:w=100:h=240:color=${BODY}:t=fill,\
drawbox=x=150:y='150+16*abs(sin(3*PI*t))':w=60:h=80:color=${HEAD}:t=fill$(label NOD)" 2 nod.webm

echo "완료 → $CLIPS"; ls "$CLIPS"
