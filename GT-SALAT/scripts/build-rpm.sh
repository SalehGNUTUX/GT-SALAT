#!/usr/bin/env bash
# يبني حزمة RPM (x86_64) بـrpmbuild مباشرةً من محتوى حزمة DEB المبنيّة — بلا alien ولا fpm.
# على Debian يفشل fpm (electron-builder) في rpmbuild، وalien يُسقط سكربتات ما بعد التثبيت.
# الاستعمال: scripts/build-rpm.sh   (بعد بناء release/GT-SALAT_<version>_amd64.deb)
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./package.json').version")
DEB="release/GT-SALAT_${VERSION}_amd64.deb"
[ -f "$DEB" ] || { echo "❌ لا توجد $DEB — ابنِ DEB أوّلاً"; exit 1; }
T="$(mktemp -d)"; trap 'rm -rf "$T"' EXIT
mkdir -p "$T"/{SPECS,RPMS,BUILD,root}
dpkg-deb -x "$DEB" "$T/root"
cat > "$T/SPECS/gt-salat.spec" <<SPEC
%global debug_package %{nil}
%global __os_install_post %{nil}
%define _build_id_links none
%define _binary_payload w9.xzdio
Name:           gt-salat
Version:        ${VERSION}
Release:        1
Summary:        Prayer times and dhikr reminders for Linux
License:        GPL-3.0
URL:            https://github.com/SalehGNUTUX/GT-SALAT
BuildArch:      x86_64
AutoReqProv:    no
Requires:       gtk3, libnotify, nss, alsa-lib

%description
GT-SALAT — واجهة رسومية حديثة لتذكير الصلاة والأذكار والقرآن والمحتوى الإسلامي

%install
mkdir -p %{buildroot}
cp -a %{_srcroot}/. %{buildroot}/

%post
ln -sf /opt/GT-SALAT/gt-salat /usr/bin/gt-salat
chmod 4755 /opt/GT-SALAT/chrome-sandbox || true
if command -v update-desktop-database >/dev/null 2>&1; then update-desktop-database /usr/share/applications || true; fi

%postun
if [ "\$1" = "0" ]; then rm -f /usr/bin/gt-salat; fi

%files
%defattr(-,root,root,-)
/opt/GT-SALAT
/usr/share/applications/gt-salat.desktop
/usr/share/icons/hicolor/*/apps/gt-salat.png
/usr/share/doc/gt-salat
SPEC
rpmbuild -bb --define "_topdir $T" --define "_srcroot $T/root" "$T/SPECS/gt-salat.spec" >/dev/null
cp "$T"/RPMS/x86_64/gt-salat-"${VERSION}"-1.x86_64.rpm release/
echo "✅ release/gt-salat-${VERSION}-1.x86_64.rpm"
