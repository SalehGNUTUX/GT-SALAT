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

1. **AlAdhan API** — تُخزَّن النتيجة في `userData/timetables/timetable_YYYY_MM_mMETHOD_sSCHOOL_lLAT_LON.json`.
   **مفتاح الكاش يشمل الطريقة والمذهب والموقع** (منذ 2.0) فيبطل تلقائياً عند تغيير أيٍّ منها —
   قبلها كان يشمل الطريقة وحدها، فكان تغيير المدينة يُبقي مواقيت المدينة القديمة أسبوعاً.
   الكاش صالح 7 أيام. `pruneTimetableCache()` تحذف المنصرم وما لا يطابق الإعدادات الحالية.
2. **حساب محلي** (مكتبة `adhan`) — بديل offline كامل عبر `computeLocal()`. يُستعمل وحده عند
   إطفاء `useApiTimetables` في «إعدادات إضافية».

المذهب (`madhab`) يُمرَّر إلى `Madhab.Shafi/Hanafi` محلياً وإلى `&school=0/1` في الـAPI — يؤثّر في العصر فقط.

حقل `DayTimetable.hijri` يأتي من API فقط (الحساب المحلي لا يُولّده).

`suggestMethodByCountry(country)` تعيد رقم الطريقة المناسبة (1–22) بناءً على اسم البلد — تُستدعى في `autoDetectLocation()` وتُضاف `suggestedMethodId` للنتيجة.

### المحتوى الإسلامي (2.0)

`resources/content/*.json` — **الملفات نفسها المستعملة في نسخة الهاتف** (`../GT-SALAT-PHONE/app/src/main/assets/content/`)
بلا تعديل، كي تبقى النسختان متطابقتَي المحتوى ويكفي نسخُها عند تحديث أيٍّ منهما:
`asma` (100 اسم) · `hadith` (90 حديثاً في مجموعتَين) · `duas` (28) · `hikam` (32) · `hisn` (132 باباً، 267 ذكراً) ·
`tafsir` (114 سورة، 6236 آية بنصّها العثماني وتفسيرها، ~4 ميغابايت) · `quran_meta` · `daily_ayat` (45) ·
`events` (59) · `radios` (36) · `adhkar_me` (أذكار الصباح/المساء، مُولَّد من `MorningEveningAdhkar.kt`).

`electron/content.ts` يقرأها كسولاً ويُخزّنها في الذاكرة مرة واحدة.
**قاعدة حاسمة:** لا يمرّ `tafsir.json` كاملاً عبر IPC أبداً — `getTafsirIndex()` يعيد فهرساً بلا آيات،
و`getTafsirSurah(n)` سورةً واحدة. نفس المبدأ في حصن المسلم (`getHisnIndex` / `getHisnCategory`).
البحث الشامل (`searchAyat`, `searchHisn`) يجري في العملية الرئيسية لا في الواجهة.

### التاريخ الهجري

`electron/hijri.ts` — وحدةٌ **بلا تبعيات** تشترك فيها العملية الرئيسية (تذكير الأيام البيض)
والواجهة (`src/utils/format.ts` يعيد تصديرها عبر `@electron/hijri`)، فلا يتفرّق الحساب بين الطرفين.
التحويل بـ`Intl` بتقويم `islamic-umalqura`، والإزاحة (±3 أيام) تُطبَّق على **مكوّنات التاريخ الميلادي**
قبل التحويل — لا على الطوابع الزمنية (يفسدها التوقيت الصيفي) ولا على رقم اليوم الهجري (يتجاوز نهاية الشهر).

### الصوت

`electron/audio.ts`:
- عند أول استدعاء تكشف `getAvailablePlayers()` المشغّلات المتاحة عبر `which` وتُخزّنها في `cachedPlayers` — لن تُجرَّب برامج غير مثبّتة.
- ترتيب المشغّلات: `mpv → ffplay → cvlc → paplay → play(sox) → ogg123`.
- **مستوى الصوت** (`adhanVolume`) يُترجَم لوسيطٍ خاصٍّ بكل مشغّل في `volumeArgs()`:
  mpv/ffplay بالنسبة المئوية، paplay بمقياس PulseAudio (65536 = 100٪)، cvlc بمعامل تضخيم، sox بمعامل ضرب.
  ogg123 لا يدعمه فيُتجاهَل.
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
- **أنماط التنبيه (2.0):** `alertModeFor(id, s)` بأسبقيةٍ معلَنة — `systemSalatNotify` مطفأ ← `silent` دائماً،
  ثم `perPrayerAlerts` مطفأ ← `adhan`، وإلا `prayerAlerts[i]`. النمط `tone` يشغّل `approaching` بدل الأذان.
- **التذكيرات اليومية (2.0):** `checkDailyReminders()` تعمل حتى لو أُطفئت إشعارات الصلاة.
  تُطلَق مرةً في اليوم عند بلوغ ساعتها بنافذة سماحٍ **ساعةً واحدة** (`REMINDER_GRACE_MS`) — فلو كان
  الحاسوب مطفأً لحظةَ الموعد وصل التذكير عند أول تشغيلٍ خلالها، ولا يصل متأخراً بساعاتٍ فيفقد معناه.

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

- `electron/types.ts` — تعريف `AppSettings` (**المصدر الوحيد**).
- `src/hooks/useSettings.ts` — يُعيد تصدير النوع بـ`import type … from '@electron/types'` (استيراد أنواعٍ
  يُمحى وقت البناء فلا تتسرّب شيفرة العملية الرئيسية إلى حزمة الواجهة). **لا تكرار يدوي بعد الآن** —
  كان يُكرَّر نسخاً قبل 2.0 فتفرّقت النسختان.
- `electron/settings.ts` — القيم الافتراضية في `DEFAULT_SETTINGS`. الخزين عبر `electron-store` في `userData/settings.json`.
- الإعدادات تُرسَل للـ renderer عبر حدث `settings:changed` بعد كل تعديل.

### صفحتا الإعدادات (2.0)

الإعدادات موزّعةٌ على صفحتين، و**القسمة بالحقول لا بالمواضيع**:

- `src/pages/Settings.tsx` — الأساسية، بقيت كما كانت في 1.0 بلا مساس (الموقع · الإشعارات ·
  تكامل الطرفية · النظام · إجراءات) + بطاقةٌ في ذيلها تفتح الصفحة الإضافية.
- `src/pages/AdvancedSettings.tsx` — «إعدادات إضافية»، أكورديون أقسامه محفوظةٌ في `advancedOpenSection`:
  حساب المواقيت · الأذان والتنبيهات · بطاقات لوحة التحكم · التذكيرات اليومية · التقويم والتواريخ ·
  المظهر · المصادر المعتمَدة · حول.

**قواعد لا تُخالَف:**
1. كل حقلٍ يُحرَّر في صفحةٍ واحدةٍ فقط — لا يظهر حقلٌ في الصفحتين.
2. المزامنة مضمونةٌ عبر `settings:set` (تعديل جزئي `patch`) ثم بثّ `settings:changed`. لا كتابة كائنٍ كامل.
3. عند التداخل الدلالي فمفاتيح الصفحة الأساسية هي الأعلى، ويُكتَب ذلك نصّاً تحت الخيار.
   مثال: `alertModeFor()` في `scheduler.ts` تُرجع `silent` دائماً إن أُطفئ `systemSalatNotify`.

### أقسام «المزيد» (2.0)

`src/pages/More.tsx` شبكة بطاقات، وشاشاتها في `src/pages/more/`. التنقّل في `App.tsx` بحالتين:
`page` (الشريط الجانبي) + `sub` (القسم الفرعي)، وزرّ الرجوع يظهر في `TopBar` متى كان `sub` غير فارغ.
القرآن والتفسير **شاشةٌ واحدة** (`more/Quran.tsx`) بوضعين، لأن النصّ والتفسير في ملفٍّ واحد.

### المشغّل العالمي (2.0)

`src/hooks/usePlayer.tsx` — مزوّدٌ يلفّ التطبيق كلّه في `App`، يملك **عنصر `<audio>` وحيداً**.
**لا تضع عنصر صوتٍ داخل صفحة**: تفكيك المكوّنات عند التنقّل يقطع البثّ. المقطع يحمل `section`
(«page/sub») فيعيد `MiniPlayer` المستخدمَ إلى قسمه بنقرة. تشغيل مقطعٍ جديد يوقف السابق تلقائياً.
تلاوة القرآن (2.1) تستعمل المزوّد نفسه بلا تغييرٍ في البنية.

الإذاعات تُشغَّل بهذا المشغّل لا بمشغّلات النظام الخارجية — البثّ المتواصل يحتاج تحكّماً
بالإيقاف ومستوى الصوت وحالةً ظاهرة. **لهذا وُسِّع `media-src` في الـCSP** ليشمل http/https.
(أصوات الأذان تبقى على مشغّلات النظام في `audio.ts` — تعمل والنافذة مغلقة.)

### وجهات الإشعارات (2.0)

`notify({ route })` في `notifier.ts` يجعل النقر على الإشعار يُظهر النافذة وينتقل إلى القسم:
`main.ts` يضبط `setNavHandler` ← يبثّ `nav:go` ← `App.goTo()` يفكّ «page/sub».
أمثلة: تذكير أذكار المساء ← `more/adhkar-evening` · الأذان ← `dashboard` · ذكرٌ دوري ← `dhikr`.
**عند إضافة إشعارٍ جديد أعطِه `route`** — إشعارٌ بلا وجهةٍ يترك المستخدم يبحث عن القسم بنفسه.

### تحرير الإذاعات

**لا يُعدَّل `resources/content/radios.json` أبداً** — تعديلات المستخدم طبقةٌ فوقه في الإعدادات:
`radioEdits` (مفتاحها **الاسم الأصلي** لا المعروض، فلا تنكسر بتغيير الاسم) و`customRadios`.
هكذا تُحدَّث القائمة الافتراضية مع التطبيق دون ضياع تعديلات المستخدم، ويمكنه استعادة الأصل.
نفس المبدأ يُتَّبع لأي محتوىً افتراضيٍّ يُتاح تعديله لاحقاً.

### الأقسام المثبَّتة

`favoriteSections` (ثلاثةٌ على الأكثر، `MAX_FAVORITE_SECTIONS`) تظهر في `Sidebar` تحت «المثبَّتة».
تُعرَض بترتيب `MORE_FEATURES` لا بترتيب الإضافة — وإلا قفزت مواضعها كلّما أضاف المستخدم قسماً.

### النسخ الاحتياطي المشترك مع الهاتف (2.0)

`electron/backup.ts` — بنية الحزمة **مطابقةٌ لـ`BackupManager.kt`** في نسخة الهاتف:
`settings.json` (`{app, schema, prefs:{key:{t,v}}}`) · `prayers.json` · `files/` (خاصّة بالهاتف).

**قواعد لا تُخالَف:**
1. المشترك يُكتَب **بأسماء مفاتيح الهاتف** (`method_id`, `adhan_volume`, `prayer_alerts_csv`…)،
   وما يخصّ سطح المكتب بسابقة `gtd_`. عند إضافة حقلٍ جديد: إن كان له نظيرٌ في الهاتف فبمفتاحه،
   وإلّا فبـ`gtd_`. هكذا لا تُفقَد إعدادات طرفٍ عند مرور الحزمة بالطرف الآخر.
2. **الاستيراد يقرأ الإعدادات قبل المواقيت** (لا يعتمد ترتيب مدخلات ZIP): اسم ملفّ كاش الشهر
   يتضمّن رقم المذهب المقروء من الإعدادات، فلو عُكس الترتيب كُتبت المواقيت بمذهبٍ قديمٍ فلا يجدها التطبيق.
3. `locKey` = `%.2f_%.2f` في النسختين — لا تغيّره في أحدهما دون الآخر.
4. القراءة متساهلةٌ في الأنواع (`readBool/readNum/readStr/readSet`) لأنّ الطرف الآخر قد يكتب
   `int` حيث نكتب `long`، ومفاتيح الهاتف الخاصّة به تُتجاهَل بلا انهيار.

### النسخ مع التوقيع

`src/utils/share.ts` يبني المنسوخ: المتن + المصدر + تعريفٌ بالتطبيق ورابطَي النسختين.
**كلّ محتوىً يُنسَخ يمرّ به** — لا `clipboard.writeText` مباشرةً في الصفحات.
النسخ عبر حافظة Electron (`app:copy`) لا واجهة الويب، فلا يشترط سياقاً آمناً.
`CopyButton` يوقف تصاعد الحدث دائماً: بطاقات الأذكار نفسها أزرارُ عدٍّ، فنقرةُ النسخ
كانت ستُحصي ذكراً بلا قصد.

### عدّادات الأذكار

بطاقة الذكر كلّها زرُّ عدٍّ (`onClick` على `Card`) لا زرٌّ صغيرٌ داخلها — الذاكرُ عينه على النصّ.
والشارة داخلها `span` لا `button`، وإلّا احتُسبت النقرة مرّتين (تصاعد الحدث).

### فحص التحديثات ورسالة نسخة الهاتف (2.0)

`electron/updates.ts` يفحص `api.github.com/repos/.../releases/latest` **في العملية الرئيسية** —
فلا حاجة لتوسيع `connect-src` في الـCSP. `isNewer()` مقارنةٌ رقميةٌ جزءاً جزءاً (2.10.0 > 2.9.0).
النتيجة تُبَثّ للواجهة بحدث `update:available` + إشعار نظام، ويعرضها `src/components/UpdateBanner.tsx`.
**لا تنزيل ولا تثبيت تلقائي**: التطبيق يُثبَّت من حزم النظام، فاستبداله لنفسه يتعارض مع مدير الحزم.

رسالتا الشريطين تحترمان قرار المستخدم وتحفظانه في الإعدادات لا في localStorage:
`dismissedUpdateVersion` (نسخةٌ بعينها) · `phonePromoUntil` (صمتٌ أسبوعين) · `phonePromoNever` (للأبد).

### Content Security Policy

لا توجد CSP في `index.html` (محذوفة لتجنّب تعارضها مع inline scripts الخاصة بـ Vite/React Refresh).
CSP مُطبَّقة في `electron/main.ts` عبر `session.webRequest.onHeadersReceived`:
- **تطوير**: تشمل `unsafe-inline`، `unsafe-eval`، `ws:` لنظام HMR.
- **إنتاج** (`app.isPackaged`): صارمة (`default-src 'self'`).
- `media-src` يسمح بـ http/https في الوضعين (قسم الإذاعات). توسيعٌ مقصورٌ على الوسائط:
  السكربتات و`connect-src` تبقى محصورةً في `'self'` وقائمة الخدمات المعروفة.

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
