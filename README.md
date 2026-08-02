<div dir="rtl" align="center">

![GT-SALAT](https://github.com/SalehGNUTUX/GT-SALAT/blob/main/icon/icon-152x152.png?raw=true)

# GT-SALAT

### الجيل الجديد من GT-salat-dikr

**تطبيق إسلامي شامل: مواقيت الصلاة والأذان والأذكار والقرآن الكريم على غنو/لينكس**

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL--3.0-blue.svg)](LICENSE)
[![Platform: GNU/Linux](https://img.shields.io/badge/Platform-GNU%2FLinux-green.svg)]()
[![Built with: Electron + React](https://img.shields.io/badge/Stack-Electron%20%2B%20React-61dafb.svg)]()
[![Release: 2.0.0](https://img.shields.io/badge/Release-2.0.0-teal.svg)](https://github.com/SalehGNUTUX/GT-SALAT/releases/tag/GT-SALAT-2.0.0)
[![Android: GT-SALAT-PHONE](https://img.shields.io/badge/%D9%86%D8%B3%D8%AE%D8%A9%20%D8%A7%D9%84%D9%87%D8%A7%D8%AA%D9%81-Android-3ddc84.svg)](https://salehgnutux.github.io/GT-SALAT-PHONE/)

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
![GT-SALAT](https://github.com/SalehGNUTUX/GT-SALAT/blob/main/%D9%84%D9%82%D8%B7%D8%A7%D8%AA%20%D8%A7%D9%84%D8%B4%D8%A7%D8%B4%D8%A9/Screenshot_%D9%84%D9%88%D8%AD%D8%A9_%D8%A7%D9%84%D8%AA%D8%AD%D9%83%D9%85.png?raw=true)


## 📱 نسخة الهاتف

GT-SALAT متوفّر لأندرويد بنفس المحتوى، مع الأذان في وقته والقبلة والودجت، وبنكهة حرّة بلا خدمات Google:

**[salehgnutux.github.io/GT-SALAT-PHONE](https://salehgnutux.github.io/GT-SALAT-PHONE/)** — [المستودع](https://github.com/SalehGNUTUX/GT-SALAT-PHONE)

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

### 📖 المحتوى الإسلامي — قسم «المزيد» (جديد في 2.0)
- **القرآن الكريم**: 114 سورة بالرسم العثماني، بحث شامل في 6236 آية بتطبيع عربي، إشارات مرجعية، متابعة موضع القراءة، وتمرير تلقائي بمهلة تناسب طول كل آية
- **التفسير الميسّر**: تفسير كل آية يظهر تحتها
- **حصن المسلم**: 132 باباً و267 ذكراً ببحث وعدّاد تكرار
- **أذكار الصباح والمساء**: جلسة بعدّاد وشريط تقدّم يُحفظ ليومه
- **التسبيح** · **الأدعية المأثورة** (28) · **الأحاديث** (90) · **أسماء الله الحسنى** (100) · **الحِكَم** (32) · **الأحداث التاريخية** (59)
- **الإذاعات**: 36 إذاعة قرآنية مباشرة، قابلة للتحرير والإضافة، بمشغّل لا ينقطع عند التنقّل
- **إمساكية رمضان**: الإمساك والفجر والمغرب طوال الشهر
- المحتوى كلّه مُضمَّن في الحزمة ويعمل دون إنترنت، ومشترك حرفياً مع [نسخة الهاتف](https://salehgnutux.github.io/GT-SALAT-PHONE/)

### ⚙️ الإعدادات الإضافية (جديد في 2.0)
- مذهب حساب العصر (الجمهور/الحنفي) · مستوى صوت الأذان مع معاينة كل صوت
- **نمط تنبيه لكل صلاة على حدة**: أذان كامل أو رنّة قصيرة أو إشعار صامت
- تذكيرات يومية (أذكار الصباح والمساء، الأيام البيض) · نظام 12/24 ساعة
- **إزاحة التاريخ الهجري ±3 أيام** · أسماء الأشهر: قياسية أو مغاربية أو شامية
- سِمة فاتحة/داكنة ولون مميّز مخصّص · العمل دون إنترنت كلياً

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

### 📥 روابط التحميل المباشر (الإصدار 2.0.0)

| الصيغة | التوزيعات المدعومة | الرابط | الحجم | المجموع الاختباري (SHA256) |
|--------|-------------------|--------|-------|---------------------------|
| **AppImage** | جميع التوزيعات | [GT-SALAT-2.0.0-x86_64.AppImage](https://github.com/SalehGNUTUX/GT-SALAT/releases/download/GT-SALAT-2.0.0/GT-SALAT-2.0.0-x86_64.AppImage) | 105 MB | `f7adfc14a71394ce315e908601c5004299abdcd6cfeac07e108d0d92e6b5e038` |
| **DEB** | Debian / Ubuntu / Linux Mint | [GT-SALAT_2.0.0_amd64.deb](https://github.com/SalehGNUTUX/GT-SALAT/releases/download/GT-SALAT-2.0.0/GT-SALAT_2.0.0_amd64.deb) | 73 MB | `e9793c29adcb6e5733e1f0b6cffe891ac8a4edf732955b4e4f5670a94e07b55c` |
| **RPM** | Fedora / RHEL / Rocky Linux | [gt-salat-2.0.0-2.x86_64.rpm](https://github.com/SalehGNUTUX/GT-SALAT/releases/download/GT-SALAT-2.0.0/gt-salat-2.0.0-2.x86_64.rpm) | 103 MB | `5421b87a23d0c61b596f4c64b0d1c869d53112bfc93c439494ea1ba937b32b2f` |

> 🏷️ [صفحة الإصدارات الكاملة على GitHub](https://github.com/SalehGNUTUX/GT-SALAT/releases/tag/GT-SALAT-2.0.0)

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
sha256sum GT-SALAT-2.0.0-x86_64.AppImage
sha256sum GT-SALAT_2.0.0_amd64.deb
sha256sum gt-salat-2.0.0-2.x86_64.rpm
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
