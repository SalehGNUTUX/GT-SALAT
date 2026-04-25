# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# التطوير (Vite + Electron مع hot-reload)
npm run dev
./scripts/dev.sh        # نفس الشيء

# فحص TypeScript — الفحص الوحيد، لا يوجد linter ولا test runner
npm run typecheck

# بناء الحزم
./scripts/build-all.sh            # الثلاثة: AppImage + DEB + RPM
./scripts/build-all.sh appimage   # AppImage فقط
./scripts/build-all.sh deb        # DEB فقط
./scripts/build-all.sh rpm        # RPM (يتحول تلقائياً لـ alien على Debian)
```

---

## Architecture

### IPC Bridge

التدفق: `src/` (React) ←→ `electron/preload.ts` (contextBridge) ←→ `electron/ipc.ts` (ipcMain handlers)

- `electron/preload.ts` يُعرِّف كائن `gtSalat` الكامل — كل استدعاء من renderer يمر عبره.
- `src/types.d.ts` يُصرّح بنوع `window.gtSalat` مستنداً إلى `GtSalatApi` المُصدَّر من preload (لا تكرار يدوي).
- `electron/ipc.ts` يسجّل ~35 معالج `ipcMain.handle` في دالة واحدة `registerIpc()`.
- **لإضافة ميزة جديدة**: أضف المعالج في `ipc.ts` + أضف الاستدعاء في `preload.ts` + استخدمه في `src/`.

### طبقتا مواقيت الصلاة

`electron/prayer.ts` تستخدم مصدرَين بالتسلسل:

1. **AlAdhan API** — تُخزَّن النتيجة في `userData/timetables/timetable_YYYY_MM_mMETHOD.json`. اسم الملف يتضمن `methodId` لإبطال الكاش تلقائياً عند تغيير طريقة الحساب. الكاش صالح 7 أيام.
2. **حساب محلي** (مكتبة `adhan`) — بديل offline كامل عبر `computeLocal()`.

حقل `DayTimetable.hijri` يأتي من API فقط (الحساب المحلي لا يُولّده).

`suggestMethodByCountry(country)` تعيد رقم الطريقة المناسبة (1–22) بناءً على اسم البلد — تُستدعى في `autoDetectLocation()` وتُضاف `suggestedMethodId` للنتيجة.

### الصوت

`electron/audio.ts`:
- عند أول استدعاء تكشف `getAvailablePlayers()` المشغّلات المتاحة عبر `which` وتُخزّنها في `cachedPlayers` — لن تُجرَّب برامج غير مثبّتة.
- ترتيب المشغّلات: `mpv → ffplay → cvlc → paplay → play(sox) → ogg123`.
- `play(kind, onFinished?)` — للملفات المُضمَّنة في resources.
- `playFile(filePath, onFinished?)` — للأذان المخصص الذي يختاره المستخدم.
- `onFinished` callback يُستدعى عند انتهاء العملية، يستخدمه `scheduler.ts` لتشغيل دعاء الأذان مباشرةً بعد انتهاء الأذان.

### المجدول

`electron/scheduler.ts` — Main Process فقط:
- يفحص المواقيت كل **30 ثانية**.
- يتتبع الإعلانات بـ `Set<string>` بمفاتيح `"prayerId@YYYY-MM-DD"`.
- يكتب `~/.gt-salat/status` (صيغة bash قابلة للـ source) بعد كل tick للاستخدام في الطرفية.
- تسلسل الأحداث: تنبيه الاقتراب → أذان (افتراضي أو مخصص) → دعاء الأذان (onFinished) → أذكار بعد الصلاة (setTimeout بعد N دقيقة).
- `useCustomAdhan && customAdhanPath` يُفعَّل في `announcePrayer()` ليستبدل الأذان الافتراضي بملف المستخدم.

### تكامل الطرفية

`electron/shell-hook.ts`:
- يحقن سطراً في `.bashrc`/`.zshrc`/`config.fish` يستدعي `~/.gt-salat/terminal-hook.sh`.
- `ensureHookScript()` تُولّد السكربت — يُستدعى من `applyShellIntegration()` (واجهة المستخدم) ومن `main.ts` عند بدء التشغيل إذا كان التكامل مُفعَّلاً.
- السكربت يقرأ ملف الحالة `~/.gt-salat/status` ويحسب الوقت المتبقي بـ `$(date +%s)` لحظياً.
- **تنبيه escaping**: في TypeScript template literals — `\${VAR}` → متغير bash، `${TSVar}` → TypeScript interpolation، `\\n` → `\n` في الملف الناتج.

### RTL Layout

الجسم يحمل `direction: rtl`. بسبب هذا في flex containers:
- `flexDirection: 'row'` يُرتّب العناصر من اليمين إلى اليسار — **الأول في DOM = يمين**.
- **لا تستخدم `row-reverse`** — يعكس الترتيب مرتين فيُفسد التخطيط.
- الشريط الجانبي (`Sidebar`) هو **أول عنصر في DOM** ليظهر على اليمين.

### الإعدادات

- `electron/types.ts` — تعريف `AppSettings` (المصدر الرئيسي).
- `src/hooks/useSettings.ts` — **نسخة مطابقة** يجب إبقاؤها متزامنة يدوياً عند إضافة حقول جديدة.
- `electron/settings.ts` — القيم الافتراضية في `DEFAULT_SETTINGS`. الخزين عبر `electron-store` في `userData/settings.json`.
- الإعدادات تُرسَل للـ renderer عبر حدث `settings:changed` بعد كل تعديل.

### Content Security Policy

لا توجد CSP في `index.html` (محذوفة لتجنّب تعارضها مع inline scripts الخاصة بـ Vite/React Refresh).
CSP مُطبَّقة في `electron/main.ts` عبر `session.webRequest.onHeadersReceived`:
- **تطوير**: تشمل `unsafe-inline`، `unsafe-eval`، `ws:` لنظام HMR.
- **إنتاج** (`app.isPackaged`): صارمة (`default-src 'self'`).

### الموارد وقت التشغيل

`resources/` يُحزَّم كـ `extraResources` في electron-builder:
- تطوير: `app.getAppPath() + '/resources/'`
- إنتاج: `process.resourcesPath`

`src/assets/` تُدار بـ Vite (أيقونة الشريط الجانبي + خطوط Ubuntu Arabic و Amiri Quran).

### بناء RPM على Debian

`scripts/build-all.sh` يتبع هذا التسلسل للـ RPM:
1. يحاول `electron-builder --linux rpm` (يفشل على Debian لأن `rpmbuild` ينقصه ماكروات البناء).
2. يتحول إلى `alien`: يحوّل DEB → RPM.
   - **مشكلة**: الوصف العربي يجعل حقل `Summary:` فارغاً — الحل في `package.json` بحقل `linux.synopsis` الإنجليزي.
   - alien يضع الـ RPM الناتج في مجلد الأب نسبةً لـ CWD، لذا تحتاج البحث بـ `find` لا افتراض المسار.
3. إن غاب كلاهما يشرح للمستخدم: `sudo apt install alien` أو `sudo apt install rpm-build`.
