#!/usr/bin/env bash
# GT-SALAT — بناء تلقائي لجميع حزم Linux (AppImage + DEB + RPM)
set -uo pipefail

cd "$(dirname "$0")/.."

echo "══════════════════════════════════════════════════════════"
echo "   GT-SALAT — سكربت البناء التلقائي"
echo "══════════════════════════════════════════════════════════"

# ١. التحقق من المتطلبات
if ! command -v node >/dev/null 2>&1; then
    echo "❌ Node.js غير مثبّت. يتطلب المشروع Node.js v18 أو أحدث."
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ إصدار Node.js قديم جداً ($NODE_VERSION). يلزم v18 أو أحدث."
    exit 1
fi

echo "✅ Node.js: $(node -v)"
echo "✅ npm: $(npm -v)"
echo ""

# ٢. تثبيت الاعتماديات
if [ ! -d node_modules ]; then
    echo "📦 تثبيت اعتماديات npm..."
    npm install
else
    echo "📦 اعتماديات npm موجودة — تخطي التثبيت"
fi
echo ""

# ٣. بناء Vite + TypeScript (مرة واحدة لكل الأهداف)
echo "🔨 Vite build (renderer + main)..."
npm run typecheck 2>&1 | tail -5 || true
npx tsc -b || true
npx vite build
echo ""

# ٤. دالة بناء هدف واحد مع متابعة الحالة
BUILT=()
FAILED=()

build_target() {
    local target="$1"
    echo "📦 جاري بناء: $target ..."
    if npx electron-builder --linux "$target" 2>&1; then
        echo "✅ نجح بناء: $target"
        BUILT+=("$target")
    else
        echo "⚠️  فشل بناء: $target (تابع البناء للأهداف الأخرى)"
        FAILED+=("$target")
    fi
    echo ""
}

# ٥. اختيار الأهداف
TARGETS="${1:-all}"
case "$TARGETS" in
    all)
        build_target AppImage
        build_target deb
        build_target rpm
        ;;
    appimage) build_target AppImage ;;
    deb)      build_target deb ;;
    rpm)      build_target rpm ;;
    *)        echo "الاستخدام: $0 [all|appimage|deb|rpm]"; exit 1 ;;
esac

# ٦. تقرير النتائج
echo "══════════════════════════════════════════════════════════"
if [ ${#BUILT[@]} -gt 0 ]; then
    echo "   ✅ أهداف نجحت: ${BUILT[*]}"
fi
if [ ${#FAILED[@]} -gt 0 ]; then
    echo "   ❌ أهداف فشلت: ${FAILED[*]}"
    echo "   (تحقق من تثبيت: rpmbuild للـ rpm)"
fi
echo "══════════════════════════════════════════════════════════"
echo ""
echo "الحزم الجاهزة في مجلد release/:"
ls -lh release/*.AppImage release/*.deb release/*.rpm 2>/dev/null || echo "(لا توجد مخرجات)"
echo ""
echo "💡 لتثبيت DEB:    sudo dpkg -i release/*.deb"
echo "💡 لتثبيت RPM:    sudo rpm -i release/*.rpm"
echo "💡 لتشغيل AppImage: chmod +x release/*.AppImage && ./release/*.AppImage"
echo ""
echo "🔊 ملاحظة: يتطلب تشغيل الأصوات وجود أحد: mpv أو ffplay أو cvlc أو paplay"

# إرجاع كود خطأ إذا فشل كل شيء
if [ ${#BUILT[@]} -eq 0 ]; then exit 1; fi
