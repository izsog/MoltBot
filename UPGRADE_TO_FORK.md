# Átállás az eredeti MoltBot-ról a javított fork verzióra

Ez az útmutató lépésről-lépésre megmutatja, hogyan válthatsz át az eredeti MoltBot-ról a saját biztonsági javításokkal rendelkező fork verzióra.

---

## 🔍 1. lépés: Ellenőrizd a jelenlegi telepítést

Először is, tudd meg, hogyan telepítetted az eredeti MoltBot-ot:

```bash
# Ellenőrizd, hogy globálisan van-e telepítve
npm list -g moltbot

# vagy pnpm esetén
pnpm list -g moltbot

# Nézd meg, honnan fut
which moltbot
# Windows-on: where moltbot
```

---

## 📦 2. Átállási módszerek

### **Módszer A: NPM Global Install (Ajánlott gyors átálláshoz)**

Ha az eredeti MoltBot-ot `npm install -g moltbot` paranccsal telepítetted:

```bash
# 1. Távolítsd el az eredeti verziót
npm uninstall -g moltbot

# 2. Klónozd a fork repót
cd ~
git clone https://github.com/izsog/MoltBot.git
cd MoltBot

# 3. Telepítsd a függőségeket
pnpm install
# vagy: npm install

# 4. Build-eld a projektet
pnpm ui:build
pnpm build

# 5. Telepítsd globálisan a fork-ot
npm link
# vagy: pnpm link --global

# 6. Ellenőrizd a verziót
moltbot --version
```

**✅ Előnyök:**
- Gyors
- Egyszerű
- A config fájlok megmaradnak (`~/.clawdbot/`)

**⚠️ Hátrányok:**
- Kézi frissítés szükséges (`git pull`)

---

### **Módszer B: Forrásból futtatás (Fejlesztéshez ajánlott)**

Ha közvetlenül a forráskódból szeretnél futtatni:

```bash
# 1. Állítsd le a jelenlegi MoltBot szolgáltatást
moltbot gateway stop
# vagy ha daemon-ként fut:
# macOS/Linux: launchctl unload ~/Library/LaunchAgents/com.moltbot.gateway.plist
# Linux systemd: systemctl --user stop moltbot-gateway

# 2. Klónozd a fork repót
cd ~/projects  # vagy tetszőleges könyvtár
git clone https://github.com/izsog/MoltBot.git
cd MoltBot

# 3. Telepítsd a függőségeket
pnpm install

# 4. Build-eld a projektet
pnpm ui:build
pnpm build

# 5. Futtasd közvetlenül
pnpm run moltbot gateway --port 18789
# vagy
./bin/moltbot.js gateway --port 18789
```

**✅ Előnyök:**
- Teljes kontroll a forráskód felett
- Egyszerű debugolás
- `git pull` frissítés

**⚠️ Hátrányok:**
- Minden alkalommal build szükséges frissítés után

---

### **Módszer C: Docker (Izolált környezet)**

Ha Docker-rel szeretnéd futtatni:

```bash
# 1. Állítsd le az eredeti MoltBot-ot
moltbot gateway stop

# 2. Klónozd a fork repót
git clone https://github.com/izsog/MoltBot.git
cd MoltBot

# 3. Build-eld a Docker image-et
docker build -t moltbot-fork:latest .

# 4. Futtasd Docker Compose-zal
docker-compose up -d

# 5. Ellenőrizd a logokat
docker-compose logs -f moltbot-gateway
```

**✅ Előnyök:**
- Izolált környezet
- A biztonsági javítások (P0) Docker-specifikusak is
- Reprodukálható deployment

---

## 🔐 3. Config fájlok megőrzése

A konfigurációs fájlok alapértelmezetten itt találhatók:

```bash
~/.clawdbot/config.yaml
~/.clawdbot/oauth.json
~/.clawdbot/state/
```

**⚠️ FONTOS:** Ezek a fájlok **automatikusan megmaradnak** minden átállási módszernél, mivel a home könyvtárban vannak.

Ha biztosra akarsz menni, készíts backup-ot:

```bash
# Backup készítése
cp -r ~/.clawdbot ~/.clawdbot.backup-$(date +%Y%m%d)

# Visszaállítás szükség esetén
# cp -r ~/.clawdbot.backup-20260131 ~/.clawdbot
```

---

## ✅ 4. Ellenőrizd a biztonsági javításokat

Miután átálltál a fork verzióra, ellenőrizd, hogy a biztonsági javítások működnek:

```bash
# 1. Verzió check - látszódnia kell a fork commit-oknak
moltbot --version

# 2. Futtass security audit-ot
moltbot security audit

# 3. Sandbox check (új alapértelmezés: "all")
# Nézd meg a config-ban:
cat ~/.clawdbot/config.yaml | grep -A 5 "sandbox:"

# 4. Gateway auth check
# Ha nem loopback (127.0.0.1) a bind, erős token kell:
moltbot gateway --bind 0.0.0.0 --port 18789
# Hibát kell dobnia, ha nincs CLAWDBOT_GATEWAY_TOKEN beállítva
```

---

## 🔄 5. Frissítés kezelése

### Fork verzió frissítése:

```bash
cd ~/MoltBot  # vagy ahol a fork van
git pull origin main
pnpm install
pnpm build

# Ha npm link-kel telepítetted, nincs több teendő
# Ha Docker-t használsz:
docker-compose down
docker-compose build
docker-compose up -d
```

### Upstream (eredeti MoltBot) változások szinkronizálása:

```bash
# Egyszeri beállítás:
cd ~/MoltBot
git remote add upstream https://github.com/moltbot/moltbot.git

# Upstream frissítések lehúzása:
git fetch upstream
git merge upstream/main
# vagy: git rebase upstream/main

# Konfliktusok feloldása, ha vannak
git push origin main
```

---

## 🛡️ Biztonsági javítások a fork-ban

A saját fork verzió tartalmazza ezeket a **KRITIKUS** biztonsági javításokat:

### ✅ P0 (2026-01-30):
- Node.js >=22.12.0 kényszerítés (CVE javítások)
- Docker security hardening (no-new-privileges, cap_drop: ALL)
- Filesystem permission protection (chmod 600/700)

### ✅ P1 (2026-01-31):
- **#1 Gateway Auth:** Token strength validation (32+ karakter, complexity check)
- **#2 DM Policy:** Már biztonságos (default="pairing")
- **#3 Sandbox:** Default "all" mode (izolált container végrehajtás)

**Részletek:** [FORK.md](FORK.md), [CHANGELOG.md](CHANGELOG.md), [SECURITY_ROADMAP.md](SECURITY_ROADMAP.md)

---

## ❓ Gyakori problémák

### Problem: `moltbot: command not found`

```bash
# npm link újrafuttatása
cd ~/MoltBot
npm link

# vagy PATH frissítése
export PATH="$HOME/MoltBot/bin:$PATH"
# Tedd ezt a ~/.bashrc vagy ~/.zshrc fájlba
```

### Problem: Config nem található

```bash
# Ellenőrizd, hogy létezik-e
ls -la ~/.clawdbot/

# Ha nem létezik, futtasd az onboarding-ot:
moltbot onboard
```

### Problem: Build hibák

```bash
# Node verzió check
node --version  # Minimum: v22.12.0

# Tisztítás és újraépítés
rm -rf node_modules dist ui/dist
pnpm install
pnpm ui:build
pnpm build
```

---

## 📧 Támogatás

Ha problémád van az átállással:

1. Ellenőrizd a [FORK.md](FORK.md) dokumentációt
2. Nézd meg a [GitHub Issues](https://github.com/izsog/MoltBot/issues)-t
3. Email: izso.gergely@gmail.com

---

**Sikeres átállást! 🦞**
