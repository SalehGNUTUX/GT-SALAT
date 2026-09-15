// فحص وحدة التحديث (`electron/updates.ts`) بمعزلٍ عن Electron: تُحزَم بـesbuild
// ويُستبدَل `electron` بأثوابٍ عبر `Module._load` — كما اختُبر `backup.ts` قبل إصداره.
//
//   npm run test:updates
//
// يختبر **الوحدة الحيّة لا نسخةً يدويّة**، ويصل إلى GitHub فعلاً: الفحص والبصمات
// والتنزيل والاستئناف والإلغاء كلّها على المستودع المنشور. أمّا تحليل الوسوم فيُختبَر
// على وسومٍ مكتوبةٍ هنا لا على ما يصادف أن يكون أحدث إصدارٍ يوم التشغيل.
//
// وما يمسّ النظام لا يُنفَّذ: تثبيت DEB/RPM يمرّ بـ`pkexec` فلا يُختبَر هنا (يُجرَّب
// على حزمةٍ مثبَّتة)، والمُختبَر منه استبدالُ صورة AppImage لنفسها في مجلّدٍ مؤقّت.
const Module = require('module');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const io_read = (f) => fs.readFileSync(f, 'utf8');

const USER_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'gtsalat-upd-'));
const PKG_VERSION = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'package.json'), 'utf8')).version;
let FAKE_VERSION = PKG_VERSION;
let PACKAGED = true;

const orig = Module._load;
Module._load = function (req) {
  if (req === 'electron') {
    return {
      app: {
        getVersion: () => FAKE_VERSION,
        get isPackaged() { return PACKAGED; },
        getPath: () => USER_DATA,
        relaunch: () => {},
        exit: () => {},
      },
      net: { fetch: (...a) => fetch(...a) },
      shell: { showItemInFolder: () => {} },
    };
  }
  return orig.apply(this, arguments);
};

const up = require(process.env.UPDATES_BUNDLE || '/tmp/gt-salat-updates.cjs');
const { parseVersion, versionText, compareVersion, pickAsset } = up._internals;

let pass = 0, fail = 0;
const check = (label, ok, extra = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  — ' + extra : ''}`);
};

const ASSETS_2_2_0 = [
  { name: 'GT-SALAT-2.2.0-x86_64.AppImage', size: 138385623, browser_download_url: 'u1' },
  { name: 'GT-SALAT_2.2.0_amd64.deb', size: 105512994, browser_download_url: 'u2' },
  { name: 'gt-salat-2.2.0-2.x86_64.rpm', size: 136375087, browser_download_url: 'u3' },
  { name: 'GT-SALAT-2.2.0-arm64.AppImage', size: 138761623, browser_download_url: 'u4' },
  { name: 'GT-SALAT_2.2.0_arm64.deb', size: 100862104, browser_download_url: 'u5' },
  { name: 'GT-SALAT-2.2.0-armv7l.AppImage', size: 126888561, browser_download_url: 'u6' },
  { name: 'GT-SALAT_2.2.0_armv7l.deb', size: 98954442, browser_download_url: 'u7' },
];

(async () => {
  // ── تحليل الوسوم: تُكتَب هنا لا تُؤخَذ من أحدث إصدارٍ منشور (فذاك يتبدّل بكل نشر)
  const v = (t) => versionText(parseVersion(t));
  check('وسم «GT-SALAT-2.2.0» يُقرأ 2.2.0', v('GT-SALAT-2.2.0') === '2.2.0', v('GT-SALAT-2.2.0'));
  check('وسم «v2.3» يُقرأ 2.3.0', v('v2.3') === '2.3.0', v('v2.3'));
  check('لاحقة التجريبيّ تبقى', v('GT-SALAT-2.3.0-beta.2') === '2.3.0-beta.2', v('GT-SALAT-2.3.0-beta.2'));
  check('المستقرّ أحدث من تجريبيّه', compareVersion(parseVersion('2.3.0'), parseVersion('2.3.0-beta.9')) > 0);
  check('beta.10 بعد beta.9', compareVersion(parseVersion('2.3.0-beta.10'), parseVersion('2.3.0-beta.9')) > 0);
  check('2.10.0 أحدث من 2.9.0', up.isNewer('2.10.0', '2.9.0'));
  check('لا تحديث إلى نفس النسخة', !up.isNewer('GT-SALAT-2.2.0', '2.2.0'));
  check('لا تحديث إلى أقدم', !up.isNewer('GT-SALAT-2.1.0', '2.2.0'));

  // ── اختيار الحزمة: كلّ معمارية تأخذ حزمتها هي، لا حزمة جارتها
  const archCases = [
    ['x64', '.AppImage', 'GT-SALAT-2.2.0-x86_64.AppImage'],
    ['x64', '.deb', 'GT-SALAT_2.2.0_amd64.deb'],
    ['x64', '.rpm', 'gt-salat-2.2.0-2.x86_64.rpm'],
    ['arm64', '.AppImage', 'GT-SALAT-2.2.0-arm64.AppImage'],
    ['arm64', '.deb', 'GT-SALAT_2.2.0_arm64.deb'],
    ['arm', '.AppImage', 'GT-SALAT-2.2.0-armv7l.AppImage'],
    ['arm', '.deb', 'GT-SALAT_2.2.0_armv7l.deb'],
  ];
  const realArch = process.arch;
  for (const [arch, ext, want] of archCases) {
    Object.defineProperty(process, 'arch', { value: arch, configurable: true });
    const got = pickAsset(ASSETS_2_2_0, ext);
    check(`${arch} + ${ext} ← ${want}`, got && got.name === want, got ? got.name : 'null');
  }
  // لا حزمة RPM لـarm — ولا يُسلَّم بديلٌ بمعمارية أخرى
  Object.defineProperty(process, 'arch', { value: 'arm64', configurable: true });
  check('arm64 لا يُعطى RPM معماريتُه x86', pickAsset(ASSETS_2_2_0, '.rpm') === null,
        String(pickAsset(ASSETS_2_2_0, '.rpm') && pickAsset(ASSETS_2_2_0, '.rpm').name));
  check('شجرة التطوير (بلا امتداد) لا تُعطى حزمة', pickAsset(ASSETS_2_2_0, null) === null);
  Object.defineProperty(process, 'arch', { value: realArch, configurable: true });

  // ── كشف الصيغة
  PACKAGED = false;
  delete process.env.APPIMAGE;
  check('شجرة التطوير تُكشَف dev', (await up.detectChannel()).kind === 'dev');
  const fakeImage = path.join(USER_DATA, 'GT-SALAT-fake.AppImage');
  fs.writeFileSync(fakeImage, 'x');
  process.env.APPIMAGE = fakeImage;
  const chImg = await up.detectChannel();
  check('APPIMAGE يُكشَف appimage بامتداده', chImg.kind === 'appimage' && chImg.ext === '.AppImage', chImg.kind);

  // ── فحصٌ حيٌّ على المستودع الحقيقيّ
  FAKE_VERSION = PKG_VERSION;
  let r = await up.checkForUpdate();
  check('الفحص يصل إلى GitHub', r.checked === true, r.checked ? '' : 'لم يصل');
  check('النسخة الحالية لا يُعرَض عليها أقدمُ منها', r.available === false, `${r.current} مقابل ${r.latest}`);
  check('الوسم يُقرأ نسخةً قابلةً للمقارنة', /^\d+\.\d+\.\d+/.test(r.latest), 'latest=' + r.latest);

  FAKE_VERSION = '2.0.0';
  r = await up.checkForUpdate();
  check('نسخةٌ أقدم يُعرَض عليها التحديث', r.available === true, 'current=' + r.current);
  check('تُختار حزمةُ AppImage لنسخةٍ من صورة', !!r.asset && /\.AppImage$/.test(r.asset.name), r.asset && r.asset.name);
  check('الحزمة تحمل حجماً حقيقياً يُتحقَّق به', !!r.asset && r.asset.size > 1e8, r.asset && String(r.asset.size));
  check('البصمة المنشورة تُجلَب من README الوسم',
        !!r.asset && /^[0-9a-f]{64}$/.test(r.asset.sha256 || ''), r.asset && r.asset.sha256);
  check('ملاحظات الإصدار ورابطه موجودان', typeof r.notes === 'string' && /github\.com/.test(r.url));
  check('لا تُعرَض تجريبيّةٌ في القناة المستقرّة', r.prerelease === false);

  // البصمة المجلوبة هي التي يُعلنها README هذا المشروع لتلك الحزمة — تُقرأ من
  // الملفّ المحلّيّ لا من قائمةٍ مكتوبةٍ هنا، فلا يسقط الفحص مع كلّ إصدارٍ جديد.
  if (r.asset) {
    const readme = io_read(path.join(__dirname, '..', '..', 'README.md'));
    const line = readme.split('\n').find((l) => l.includes(r.asset.name) && /[0-9a-f]{64}/.test(l));
    check('البصمة المجلوبة تطابق ما يُعلنه README لهذه الحزمة',
          !!line && line.includes(r.asset.sha256),
          line ? r.asset.sha256 : 'لا سطرَ لهذه الحزمة في README');
  }

  // ── تنزيلٌ حقيقيٌّ كامل الطريق (ملفٌّ صغير بدل مئة ميغابايت):
  //    بثٌّ ← تحقّقٌ من الحجم ← تحقّقٌ من البصمة ← نقلٌ إلى اسمه النهائيّ
  const smallUrl = 'https://raw.githubusercontent.com/SalehGNUTUX/GT-SALAT/GT-SALAT-2.2.0/LICENSE';
  const bytes = Buffer.from(await (await fetch(smallUrl)).arrayBuffer());
  const sha = crypto.createHash('sha256').update(bytes).digest('hex');
  const asset = { name: 'probe.deb', size: bytes.length, url: smallUrl, sha256: sha };

  let seen = 0;
  let dl = await up.downloadUpdate(asset, (p) => { seen = Math.max(seen, p.percent); });
  check('التنزيل ينجح ويصل إلى ملفّه', dl.ok === true && fs.existsSync(dl.file || ''), dl.error || '');
  check('التقدّم يُبَثّ إلى 100٪', seen === 100, 'أقصى ما بُثّ=' + seen);
  check('المنزَّل مطابقٌ بايتاً ببايت', dl.ok && fs.readFileSync(dl.file).equals(bytes));
  check('لا يبقى ملفٌّ جزئيّ', !fs.existsSync(path.join(USER_DATA, 'updates', 'probe.deb.part')));

  dl = await up.downloadUpdate(asset, () => {});
  check('المنزَّل سابقاً لا يُعاد تنزيله', dl.ok === true && dl.reused === true);

  // بصمةٌ لا تطابق ⇒ تُرفَض الحزمة وتُحذَف، فلا تُثبَّت حزمةٌ مشبوهة
  const bad = { ...asset, sha256: 'f'.repeat(64) };
  dl = await up.downloadUpdate(bad, () => {});
  check('بصمةٌ مخالفة تُرفَض', dl.ok === false && /البصمة/.test(dl.error || ''), dl.error || '');
  check('الحزمة المرفوضة لا تبقى على القرص', !fs.existsSync(path.join(USER_DATA, 'updates', 'probe.deb')));

  // حجمٌ مخالف يُرفَض كذلك
  dl = await up.downloadUpdate({ ...asset, sha256: undefined, size: bytes.length + 5 }, () => {});
  check('حجمٌ مخالف يُرفَض', dl.ok === false && /الحجم/.test(dl.error || ''), dl.error || '');

  // حزمةٌ ثانيةٌ تُنزَّل ⇒ تُحذَف الأولى فلا تتراكم مئات الميغابايت
  await up.downloadUpdate(asset, () => {});
  await up.downloadUpdate({ ...asset, name: 'probe2.deb' }, () => {});
  const left = fs.readdirSync(path.join(USER_DATA, 'updates'));
  check('الحزم القديمة تُنظَّف عند تنزيل غيرها', left.length === 1 && left[0] === 'probe2.deb', left.join(','));

  // ── الاستئناف: جزءٌ منزَّلٌ سابقاً يُطلَب ما بعده بترويسة المدى لا من الصفر
  up.clearPackages();
  const partPath = path.join(USER_DATA, 'updates', 'probe.deb.part');
  fs.mkdirSync(path.dirname(partPath), { recursive: true });
  const half = Math.floor(bytes.length / 2);
  fs.writeFileSync(partPath, bytes.subarray(0, half));
  let firstPercent = null;
  dl = await up.downloadUpdate(asset, (p) => { if (firstPercent === null) firstPercent = p.percent; });
  check('التنزيل المنقطع يُستأنَف فيخرج سليماً',
        dl.ok === true && fs.readFileSync(dl.file).equals(bytes), dl.error || '');
  check('الاستئناف يبدأ من حيث وقف لا من الصفر', firstPercent > 40,
        'أوّل تقدّمٍ بُثَّ=' + (firstPercent === null ? 'لا شيء' : firstPercent.toFixed(1) + '٪'));

  // ── الإلغاء: يوقف التنزيل ويترك الجزء ليُستأنَف
  up.clearPackages();
  const bigUrl = 'https://github.com/SalehGNUTUX/GT-SALAT/releases/download/GT-SALAT-2.2.0/GT-SALAT_2.2.0_armv7l.deb';
  const bigAsset = { name: 'big.deb', size: 98954442, url: bigUrl };
  const bigPromise = up.downloadUpdate(bigAsset, () => {});
  await new Promise((r) => setTimeout(r, 2500));
  const cancelled = up.cancelUpdateDownload();
  const bigRes = await bigPromise;
  check('الإلغاء يُوقف التنزيل الجاري', cancelled === true && bigRes.cancelled === true, JSON.stringify(bigRes));
  const partAfter = path.join(USER_DATA, 'updates', 'big.deb.part');
  check('الجزء المنزَّل يبقى بعد الإلغاء ليُستأنَف',
        fs.existsSync(partAfter) && fs.statSync(partAfter).size > 0,
        fs.existsSync(partAfter) ? fs.statSync(partAfter).size + ' بايت' : 'لا ملفّ');
  check('لا تُعَدّ الحزمة الملغاة جاهزةً', !fs.existsSync(path.join(USER_DATA, 'updates', 'big.deb')));
  up.clearPackages();

  await up.downloadUpdate(asset, () => {});
  const size = up.packagesSize();
  check('حجم المنزَّل يُحسَب', size.files === 1 && size.bytes === bytes.length, JSON.stringify(size));
  up.clearPackages();
  check('التفريغ يحذف الحزم', up.packagesSize().files === 0);

  // ── التثبيت
  const miss = await up.installUpdate(path.join(USER_DATA, 'لا-يوجد.AppImage'));
  check('التثبيت يرفض ملفّاً غير موجود', miss.ok === false && /غير موجودة/.test(miss.error));

  // صورةٌ تستبدل نفسها: الجديد يحلّ محلّ القديم بمساره نفسه وبصلاحية التنفيذ
  const image = path.join(USER_DATA, 'app.AppImage');
  fs.writeFileSync(image, 'قديم');
  process.env.APPIMAGE = image;
  const pkg = path.join(USER_DATA, 'new.AppImage');
  fs.writeFileSync(pkg, 'جديد');
  const inst = await up.installUpdate(pkg);
  check('صورة AppImage تستبدل نفسها', inst.ok === true && inst.restart === true, inst.error || '');
  check('الصورة الجديدة في مكان القديمة', fs.readFileSync(image, 'utf8') === 'جديد');
  check('الصورة الجديدة تنفيذيّة', (fs.statSync(image).mode & 0o111) !== 0);
  check('لا يبقى ملفّ وسيط .new', !fs.existsSync(image + '.new'));

  // مجلّدٌ لا يُكتَب فيه ⇒ لا انهيار: الحزمة تبقى ويُعطى المستخدم أمرَها
  const ro = fs.mkdtempSync(path.join(os.tmpdir(), 'gtsalat-ro-'));
  const roImage = path.join(ro, 'app.AppImage');
  fs.writeFileSync(roImage, 'قديم');
  fs.chmodSync(ro, 0o555);
  process.env.APPIMAGE = roImage;
  const roRes = await up.installUpdate(pkg);
  check('مجلّدٌ غير قابلٍ للكتابة يُعطي تثبيتاً يدوياً',
        roRes.ok === false && roRes.manual === true && !!roRes.cmd, JSON.stringify(roRes));
  fs.chmodSync(ro, 0o755);
  fs.rmSync(ro, { recursive: true, force: true });

  fs.rmSync(USER_DATA, { recursive: true, force: true });
  console.log(`\n${pass} نجح، ${fail} فشل`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.log('خطأ في المِنصّة:', e.stack); process.exit(2); });
