<div dir="rtl" align="center">

![GT-SALAT](https://github.com/SalehGNUTUX/GT-SALAT/blob/main/icon/icon-152x152.png?raw=true)

# GT-SALAT

### الجيل الجديد من GT-salat-dikr

**واجهة رسومية متكاملة لمواقيت الصلاة والأذكار على غنو/لينكس**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![Platform: GNU/Linux](https://img.shields.io/badge/Platform-GNU%2FLinux-green.svg)]()
[![Built with: Electron + React](https://img.shields.io/badge/Stack-Electron%20%2B%20React-61dafb.svg)]()
[![Release: 1.0.0](https://img.shields.io/badge/Release-1.0.0-teal.svg)](https://github.com/SalehGNUTUX/GT-SALAT/releases/tag/GT-SALAT-1.0.0)

---

## نبذة عن المشروع

**GT-SALAT** هو الجيل الجديد من مشروع
[GT-salat-dikr](https://github.com/SalehGNUTUX/GT-salat-dikr)
بقلم **SalehGNUTUX**، مُعاد بناؤه من الصفر كتطبيق سطح مكتب كامل يعمل
بتقنيات الويب (React + TypeScript + Electron) مع الحفاظ على جميع ميزات
النسخة الأصلية وإضافة واجهة رسومية تفاعلية حديثة.

> النسخة الأصلية كانت أداة طرفية (Bash/Python). هذه النسخة تستهدف مستخدمي
> الواجهة الرسومية، مع بقاء التكامل مع الطرفية خياراً اختيارياً من الإعدادات.

---

## المزايا

### 🕌 الصلاة والمواقيت
- حساب مواقيت الصلاة الخمس بـ 22 طريقة حسابية (ISNA، أم القرى، MWL، الجزائر، المغرب…)
- ضبط تلقائي لطريقة الحساب بناءً على البلد المكتشف جغرافياً
- مصدر مزدوج: AlAdhan API أولاً ← حساب محلي احتياطي (مكتبة adhan) يعمل دون إنترنت
- جدول المواقيت بثلاثة أوضاع: **أسبوعي — نصف شهري — شهري**، يبدأ من تاريخ اليوم دائماً
- عداد تنازلي حي لوقت الصلاة القادمة
- التاريخ الهجري (من API) بجانب التاريخ الميلادي بأرقام لاتينية (0-9)

### 🔊 الإشعارات والصوت
- إشعار نظام قبل الصلاة بفترة قابلة للضبط (1–60 دقيقة)
- إشعار عند دخول وقت الصلاة مع تشغيل الأذان
- **أذان مخصص**: رفع ملف صوتي خاص (OGG / MP3 / WAV) يُستخدم بدلاً من الأذان الافتراضي
- نوعان من الأذان الافتراضي: الكامل والقصير
- **دعاء بعد الأذان**: يُشغَّل تلقائياً فور انتهاء الأذان
- **أذكار وأدعية بعد الصلاة**: تُشغَّل بعد فترة قابلة للضبط من دخول الوقت
- تنبيه الاقتراب (صوت منفصل)
- نغمة تذكير الأذكار على فترات منتظمة
- وضع "لا إزعاج" بزر واحد

### 📿 الأذكار
- قاعدة بيانات الأذكار الكاملة (azkar.txt)
- بحث فوري في النصوص
- عداد لكل ذكر محفوظ محلياً
- عرض ذكر عشوائي في لوحة التحكم

### 💻 التكامل مع الطرفية
- عند فتح أي طرفية جديدة يظهر تلقائياً:
  - ترويسة "بسم الله الرحمن الرحيم — GT-SALAT" بحدود مزدوجة
  - ذكر عشوائي من قاعدة الأذكار
  - اسم الصلاة القادمة ووقتها والوقت المتبقي (محسوب لحظياً)
- يدعم bash و zsh و fish
- يُحدَّث السكربت تلقائياً عند كل تشغيل للتطبيق
- يمكن تفعيله/إلغاؤه في أي وقت من الإعدادات

### ⚙️ التكامل مع النظام
- أيقونة شريط المهام مع قائمة سياق
- تصغير إلى شريط المهام بدلاً من الإغلاق
- بدء تشغيل تلقائي مع الجهاز
- فتح مجلد جداول المواقيت مباشرة من الإعدادات

### 🧭 إعداد أولي وترحيل
- معالج إعداد خطوة بخطوة (5 خطوات)
- اكتشاف تلقائي للموقع الجغرافي مع اقتراح طريقة الحساب المناسبة
- استيراد إعدادات GT-salat-dikr القديمة تلقائياً

### 🎨 الواجهة
- خطوط Ubuntu Arabic + Amiri Quran مضمّنة (بلا اتصال إنترنت)
- وضع مظلم وفاتح
- واجهة عربية RTL كاملة
- لوحة الحالة لمتابعة سجل الإشعارات وصحة المكونات

---

## متطلبات النظام

| المتطلب | الحد الأدنى |
|--------|------------|
| نظام التشغيل | GNU/Linux (x86_64) |
| معالج | أي معالج حديث |
| ذاكرة | 256 ميغابايت |
| مكتبات النظام | libnotify، GTK3، ALSA |
| مشغّل صوت | mpv أو ffplay أو cvlc أو paplay أو sox (أحدها كافٍ) |

> **ملاحظة الصوت:** يكتشف التطبيق المشغّل المتاح تلقائياً. يُنصح بتثبيت **mpv** للحصول على أفضل توافق:
> ```bash
> sudo apt install mpv        # Debian/Ubuntu
> sudo dnf install mpv        # Fedora
> sudo pacman -S mpv          # Arch
> ```

---

## التحميل والتثبيت

### 📥 روابط التحميل المباشر (الإصدار 1.0.0)

| الصيغة | التوزيعات المدعومة | الرابط | الحجم | المجموع الاختباري (SHA256) |
|--------|-------------------|--------|-------|---------------------------|
| **AppImage** | جميع التوزيعات | [GT-SALAT-1.0.0-x86_64.AppImage](https://github.com/SalehGNUTUX/GT-SALAT/releases/download/GT-SALAT-1.0.0/GT-SALAT-1.0.0-x86_64.AppImage) | 104 MB | `cff08aa797f0061afe1ab0f614fee1e7f276400d4283f2985cfa9da1b04f8f85` |
| **DEB** | Debian / Ubuntu / Linux Mint | [GT-SALAT_1.0.0_amd64.deb](https://github.com/SalehGNUTUX/GT-SALAT/releases/download/GT-SALAT-1.0.0/GT-SALAT_1.0.0_amd64.deb) | 72.4 MB | `eb212278879743695dc78df61da65323eee2ba9631ec3e86138c29b4ae5e2847` |
| **RPM** | Fedora / RHEL / Rocky Linux | [gt-salat-1.0.0.x86_64.rpm](https://github.com/SalehGNUTUX/GT-SALAT/releases/download/GT-SALAT-1.0.0/gt-salat-1.0.0.x86_64.rpm) | 102 MB | `66cf5e98c252515404bae4b747e19b6dc4ddcc20b97147d0498d47c2c9d50591` |

> 🏷️ [صفحة الإصدارات الكاملة على GitHub](https://github.com/SalehGNUTUX/GT-SALAT/releases/tag/GT-SALAT-1.0.0)

### Debian / Ubuntu / Linux Mint

```bash
sudo dpkg -i GT-SALAT_*.deb
sudo apt-get install -f   # لحل الاعتماديات إن وُجدت
```

### Fedora / RHEL / Rocky Linux

```bash
sudo rpm -i gt-salat-*.rpm
```

### AppImage (جميع التوزيعات)

```bash
chmod +x GT-SALAT_*.AppImage
./GT-SALAT_*.AppImage
```

### التحقق من المجموع الاختباري (اختياري)

```bash
# بعد التحميل، تحقق من سلامة الملف
sha256sum GT-SALAT-1.0.0-x86_64.AppImage
sha256sum GT-SALAT_1.0.0_amd64.deb
sha256sum gt-salat-1.0.0.x86_64.rpm
```

---

## البناء من المصدر

### 1. تثبيت اعتماديات البناء

```bash
./scripts/install-deps-host.sh
```

يدعم السكربت: Ubuntu/Debian/Mint، Fedora/RHEL/Rocky، Arch/Manjaro، openSUSE.

### 2. بناء جميع الحزم

```bash
./scripts/build-all.sh
```

أو بناء حزمة محددة:

```bash
./scripts/build-all.sh appimage   # AppImage فقط
./scripts/build-all.sh deb        # DEB فقط
./scripts/build-all.sh rpm        # RPM فقط
```

يبني السكربت كل هدف على حدة ويُبلّغ عن نتيجة كل منها دون إيقاف البناء عند فشل أحدها.  
الحزم الناتجة في مجلد `release/`.

---

## وضع التطوير

```bash
./scripts/dev.sh
# أو
npm run dev
```

يشغّل Vite dev server + Electron مع hot-reload للواجهة.

```bash
npm run typecheck   # فحص TypeScript بدون بناء
```

---

## بنية المشروع

```
GT-SALAT/
├── electron/           # العملية الرئيسية (Node.js / Electron)
│   ├── main.ts         # نقطة الدخول، دورة حياة التطبيق
│   ├── preload.ts      # جسر IPC الآمن (contextBridge)
│   ├── settings.ts     # إدارة الإعدادات (electron-store)
│   ├── prayer.ts       # حساب المواقيت + واجهة AlAdhan API
│   ├── dhikr.ts        # تحليل قاعدة الأذكار
│   ├── audio.ts        # تشغيل الصوت (mpv/ffplay/cvlc/paplay/sox)
│   ├── notifier.ts     # الإشعارات وسجلها
│   ├── scheduler.ts    # مجدول المواقيت (فحص كل 30 ثانية)
│   ├── tray.ts         # أيقونة شريط المهام
│   ├── shell-hook.ts   # حقن كود الطرفية (bashrc/zshrc/fish)
│   ├── autostart.ts    # ملف .desktop للبدء التلقائي
│   └── ipc.ts          # تسجيل جميع معالجات IPC (~35 معالج)
├── src/                # واجهة المستخدم (React + TypeScript)
│   ├── pages/          # الصفحات الخمس
│   ├── components/     # مكونات مشتركة
│   ├── hooks/          # React hooks مخصصة
│   ├── styles/         # ثيم CSS وخطوط
│   └── assets/         # خطوط + أيقونات
├── resources/          # ملفات وقت التشغيل
│   ├── azkar.txt       # قاعدة الأذكار
│   ├── audio/          # ملفات الصوت (ogg)
│   └── icons/          # أيقونات التطبيق
└── scripts/            # سكربتات البناء والتطوير
```

---

## الفرق بين GT-SALAT و GT-salat-dikr

| الجانب | GT-salat-dikr (الأصل) | GT-SALAT (هذه النسخة) |
|--------|----------------------|----------------------|
| الواجهة | طرفية (Bash) | ★ رسومية كاملة (Electron + React) |
| التكامل مع الطرفية | افتراضي | ★ اختياري من الإعدادات |
| التثبيت | bash script | ★ AppImage / DEB / RPM |
| الخطوط | خطوط النظام | ★ Ubuntu Arabic + Amiri Quran مضمّنة |
| الإعداد | متغيرات بيئة / CLI | ★ معالج رسومي 5 خطوات |
| الأذان | ملف صوتي ثابت | ★ افتراضي (كامل/قصير) + مخصص |
| المواقيت | حساب محلي | ★ API + حساب محلي احتياطي |
| الحالة | النسخة الأصلية | ★ الجيل الجديد |

---

## الترخيص

هذا المشروع مرخص بموجب
[رخصة GNU العامة الإصدار 3](LICENSE) (GPL-3.0).

Copyright &copy; 2026 **SalehGNUTUX**

---

## الفضل والشكر

- **SalehGNUTUX** — مؤلف المشروع الأصلي GT-salat-dikr الذي شكّل الأساس لهذا العمل
- **AlAdhan.com** — واجهة برمجية مجانية لمواقيت الصلاة
- **مشروع Adhan** — مكتبة حساب المواقيت المحلية
- **مشروع Electron** — إطار العمل لتطبيقات سطح المكتب

---

<div align="center">

[![GT-SALAT](https://raw.githubusercontent.com/SalehGNUTUX/GT-SALAT/main/icons/icon-192x192.png)](https://github.com/SalehGNUTUX/GT-SALAT)

**🕌 GT-SALAT — الجيل الجديد من GT-salat-dikr**

[🌐 الموقع الرسمي](https://salehgnutux.github.io/GT-SALAT/) &nbsp;|&nbsp;
[📦 التحميل](https://github.com/SalehGNUTUX/GT-SALAT/releases/tag/GT-SALAT-1.0.0) &nbsp;|&nbsp;
[💻 المستودع](https://github.com/SalehGNUTUX/GT-SALAT)

</div>

</div>
