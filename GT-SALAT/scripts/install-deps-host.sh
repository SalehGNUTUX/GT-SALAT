#!/usr/bin/env bash
# GT-SALAT — تثبيت متطلبات البناء (Node.js + نظام) على توزيعات لينكس الشائعة
set -e

echo "🔍 اكتشاف التوزيعة..."

if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO="$ID"
else
    echo "❌ تعذّر اكتشاف التوزيعة"
    exit 1
fi

install_debian() {
    sudo apt-get update
    sudo apt-get install -y curl build-essential libnotify4 libgtk-3-0 libasound2 \
        rpm dpkg fakeroot
    if ! command -v node >/dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
}

install_fedora() {
    sudo dnf install -y curl gcc-c++ make libnotify gtk3 alsa-lib \
        rpm-build dpkg fakeroot nodejs npm
}

install_arch() {
    sudo pacman -Syu --needed --noconfirm nodejs npm libnotify gtk3 alsa-lib \
        rpm-tools dpkg fakeroot base-devel
}

install_suse() {
    sudo zypper install -y nodejs20 npm20 libnotify-tools gtk3 alsa \
        rpm-build dpkg fakeroot gcc-c++ make
}

case "$DISTRO" in
    ubuntu|debian|linuxmint|pop) install_debian ;;
    fedora|rhel|centos|rocky|almalinux) install_fedora ;;
    arch|manjaro|endeavouros) install_arch ;;
    opensuse-leap|opensuse-tumbleweed|sled|sles) install_suse ;;
    *)
        echo "⚠️  توزيعة غير مدعومة تلقائياً: $DISTRO"
        echo "   الرجاء تثبيت يدوياً: node.js (20+), npm, libnotify, gtk3, rpm, dpkg, fakeroot"
        exit 1
        ;;
esac

echo ""
echo "✅ المتطلبات جاهزة. شغّل:  ./scripts/build-all.sh"
