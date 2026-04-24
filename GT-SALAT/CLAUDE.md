# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# التطوير (Vite + Electron مع hot-reload)
npm run dev
# أو عبر السكربت
./scripts/dev.sh

# فحص TypeScript بدون بناء
npm run typecheck

# بناء الحزم
npm run build:appimage   # AppImage فقط
npm run build:deb        # Debian/Ubuntu
npm run build:rpm        # Fedora/RHEL
npm run build:all        # الثلاثة معاً
./scripts/build-all.sh   # نفس الشيء مع تثبيت الاعتماديات تلقائياً
```

لا يوجد لinter مستقل ولا test runner — `typecheck` هو الفحص الوحيد.

---

## Architecture

### IPC Bridge (التواصل بين Renderer و Main)

التدفق: `src/` (React) ←→ `electron/preload.ts` (contextBridge) ←→ `electron/ipc.ts` (ipcMain handlers)

- **`electron/preload.ts`** يُعرِّف كائن `gtSalat` الكامل عبر `contextBridge.exposeInMainWorld`.
- **`src/types.d.ts`** يُصرّح بنوع `window.gtSalat` مستنداً إلى `GtSalatApi` المُصدَّر من preload.
- **`electron/ipc.ts`** يسجّل جميع ~35 معالج `ipcMain.handle` في دالة واحدة `registerIpc()`.
- لإضافة ميزة جديدة: أضف المعالج في `ipc.ts` + أضف الاستدعاء في `preload.ts` + أضف الاستخدام في `src/`.

### طبقتا حساب مواقيت الصلاة

`electron/prayer.ts` تستخدم مصدرَين بالتسلسل:

1. **AlAdhan API** (`api.aladhan.com/v1/calendar/…`) — تُخزَّن النتيجة في `userData/timetables/timetable_YYYY_MM_mMETHOD.json` (يشمل `methodId` في الاسم لتجنّب الكاش القديم عند تغيير الطريقة)، تُعاد للاستخدام إذا كان الكاش أقل من 7 أيام.
2. **حساب محلي** (مكتبة `adhan`) — بديل كامل بدون إنترنت عبر `computeLocal()`.

عند الجلب من API يتضمن الكاش التاريخ الهجري المنسَّق (`DayTimetable.hijri`). الحساب المحلي لا يُولّد `hijri`.

### تشغيل الصوت المتسلسل

`electron/audio.ts` — دالة `play(kind, onFinished?)`:
- تكشف المشغّلات المتاحة مرةً واحدة عبر `which` وتخزّنها في `cachedPlayers` — تتجنّب محاولة برنامج غير مثبّت.
- ترتيب الأولوية: `mpv → ffplay → cvlc → paplay → play(sox) → ogg123`.
- `onFinished` callback يُستدعى عند انتهاء العملية — يستخدمه `scheduler.ts` لتشغيل دعاء الأذان مباشرةً بعد انتهاء الأذان.

### المجدول (Scheduler)

`electron/scheduler.ts` — يعمل في Main Process:
- يفحص المواقيت كل **30 ثانية** عبر `setInterval`.
- يتتبع الإعلانات التي صدرت بـ `Set<string>` (مفتاح: `"prayerId@YYYY-MM-DD"`).
- عند انتهاء وقت اليوم يُنظّف المجموعتين `announcedForPrayer` و`announcedApproaching`.
- تتابع الأحداث: تنبيه الاقتراب → أذان → دعاء الأذان (بعد انتهائه) → أذكار بعد الصلاة (بعد N دقيقة).

### التخطيط RTL

الجسم (`body`) يحمل `direction: rtl`. بسبب هذا:
- `flexDirection: 'row'` يُرتّب العناصر من اليمين إلى اليسار (الأول يظهر يميناً).
- **لا تستخدم `row-reverse`** مع RTL — سيعكس الترتيب المتوقع ويضع العناصر في الجانب الخطأ.
- الشريط الجانبي يجب أن يكون **أول عنصر** في DOM داخل flex-row ليظهر على اليمين (الأول في RTL = يمين).

### التاريخ الهجري بأرقام مغربية

`src/components/TopBar.tsx` — دالة `toWesternDigits()` تحوّل أي أرقام عربية-هندية (٠-٩) إلى لاتينية (0-9). يُستخدم `ar-MA-u-ca-islamic-nu-latn` locale كمحاولة أولى، مع احتياطي على تحويل يدوي. إذا توفّر `hijri` من API يُعرض مباشرةً (أدق من الحساب المحلي).

### Content Security Policy

**لا** توجد CSP في `index.html` (محذوفة لتجنّب تعارضها مع inline scripts الخاصة بـ Vite/React Refresh).  
CSP مُطبَّقة في `electron/main.ts` عبر `session.webRequest.onHeadersReceived`:
- **التطوير**: مرنة (تشمل `unsafe-inline`، `unsafe-eval`، `ws:`) لنظام HMR.
- **الإنتاج** (`app.isPackaged`): صارمة (`default-src 'self'`).

### الموارد وقت التشغيل

مجلد `resources/` يُحزَّم بـ `electron-builder extraResources`:
- `resources/audio/` — ملفات OGG (adhan, short_adhan, approaching, dua_after_adhan, post_prayer_dhikr)
- `resources/azkar.txt` — قاعدة الأذكار (فصل بين الأذكار بـ `\n%\n`)
- `resources/icons/` — أيقونات التطبيق بمقاسات مختلفة

في التطوير: `app.getAppPath() + '/resources/'`. في الإنتاج: `process.resourcesPath`.

مجلد `src/assets/` يُدار بـ Vite (أيقونة الشريط الجانبي + خطوط Ubuntu Arabic و Amiri Quran).

### الإعدادات

`electron/settings.ts` — تُخزَّن عبر `electron-store` في `userData/settings.json`.  
`AppSettings` مُعرَّفة في `electron/types.ts` ومكرَّرة في `src/hooks/useSettings.ts` (يجب إبقاؤهما متزامنتَين عند إضافة حقول جديدة).

الإعدادات تُرسَل للـ renderer عبر `settings:changed` event في كل تعديل.

### ضبط طريقة الحساب تلقائياً

`electron/prayer.ts` — دالة `suggestMethodByCountry(country)` تعيد رقم الطريقة (1-22) بناءً على اسم البلد.  
تُستدعى في `autoDetectLocation()` التي تُضيف `suggestedMethodId` إلى نتيجتها — يُطبَّق مباشرةً في `Settings.tsx` و `Welcome.tsx`.
