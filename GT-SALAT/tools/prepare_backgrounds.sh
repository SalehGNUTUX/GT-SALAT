#!/usr/bin/env bash
# يوضّب صور خلفيّات المساجد (مصدرها مجلّد «خلفيات/» في نسخة الهاتف) إلى لوحاتٍ أفقيّة 1920×1080 (WebP)
# مع مصغّراتٍ في src/assets/backgrounds/. الصور المصدريّة طوليّة، فتُوضَع الصورة حادّةً بكامل الارتفاع
# فوق امتدادٍ مموَّهٍ منها، بحافّتين متدرّجتين فلا يظهر حدّها.
# الاستعمال: tools/prepare_backgrounds.sh   (من جذر المشروع؛ يتطلّب ImageMagick)
set -euo pipefail
SRC="${SRC:-../GT-SALAT-PHONE/خلفيات}"; OUT="src/assets/backgrounds"; W=1920; H=1080; FEATHER=160
# موضع مركز الصورة من يسار اللوحة: المحتوى يسار الشريط الجانبيّ في RTL.
CENTER_PCT=42
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT/thumb"

# المعرّف | الملفّ | بكسلاتٌ تُقَصّ من أسفل المصدر (اختياريّ)
while IFS='|' read -r id file chop; do
  convert "$SRC/$file" -gravity south -chop "0x${chop:-0}" +repage -gravity northwest "PNG24:$TMP/src.png"
  convert "$TMP/src.png" -resize "x${H}" -unsharp 0x0.8+0.5+0.02 "PNG24:$TMP/fg.png"
  w=$(identify -format '%w' "$TMP/fg.png")
  x=$(( W * CENTER_PCT / 100 - w / 2 )); (( x < 0 )) && x=0
  right=$(( W - x - w ))
  # الامتداد من شريط الحافّة المجاورة فقط (لا من الصورة كلّها) فلا تظهر أشباح الكعبة أو المآذن:
  # يُصغَّر الشريط إلى عمودٍ من الألوان يحفظ تدرّج السماء والأرض، ثمّ يُمدّ أفقيّاً.
  strip=$(( w / 14 ))
  convert -size "${W}x${H}" xc:black -colorspace sRGB -type TrueColor "PNG24:$TMP/bg.png"
  convert "$TMP/fg.png" -crop "${strip}x${H}+0+0" +repage -resize 1x32! -blur 0x3 -resize "$(( x + FEATHER ))x${H}!" -modulate 92 "PNG24:$TMP/l.png"
  convert "$TMP/bg.png" "$TMP/l.png" -gravity northwest -geometry +0+0 -compose over -composite "PNG24:$TMP/bg.png"
  convert "$TMP/fg.png" -gravity east -crop "${strip}x${H}+0+0" +repage -resize 1x32! -blur 0x3 -resize "$(( right + FEATHER ))x${H}!" -modulate 92 "PNG24:$TMP/r.png"
  convert "$TMP/bg.png" "$TMP/r.png" -gravity northeast -geometry +0+0 -compose over -composite -gravity northwest "PNG24:$TMP/bg.png"
  # قناعٌ معتمٌ في الوسط يتلاشى عند الحافّتين اليمنى واليسرى
  convert -size "${H}x${w}" gradient:white-white "$TMP/m.png"
  convert -size "${H}x${FEATHER}" gradient:black-white "$TMP/f1.png"
  convert -size "${H}x${FEATHER}" gradient:white-black "$TMP/f2.png"
  convert "$TMP/m.png" "$TMP/f1.png" -gravity north -compose multiply -composite \
          "$TMP/f2.png" -gravity south -compose multiply -composite -rotate -90 "$TMP/mask.png"
  convert "$TMP/fg.png" "$TMP/mask.png" -alpha off -compose CopyOpacity -composite "$TMP/fgm.png"
  convert "$TMP/bg.png" "$TMP/fgm.png" -gravity northwest -geometry "+${x}+0" -compose over -composite "PNG24:$TMP/out.png"
  convert "$TMP/out.png" -strip -define webp:method=6 -quality 78 "$OUT/$id.webp"
  convert "$TMP/out.png" -strip -resize 320x180 -define webp:method=6 -quality 72 "$OUT/thumb/$id.webp"
done <<'LIST'
haram|المسجد الحرام.jpeg|0
nabawi|المسجد النبوي.jpeg|0
aqsa|المسجد الأقصى.jpeg|0
hassan2_sea|مسجد الحسن الثاني 2.jpeg|0
hassan2_sunset|مسجد الحسن الثاني.jpeg|0
hassan_day|مسجد حسان.jpeg|0
hassan_night|مسجد حسان 2.jpeg|0
qarawiyyin|مسجد القرويين.jpeg|72
LIST
