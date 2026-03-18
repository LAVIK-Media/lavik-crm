# Deployment & Ersteinrichtung (LAVIK-CRM)

## Ist das neue Login-System schon live?

**Wenn du dich auf der Live-Seite (lavik-crm.vercel.app) noch mit dem alten gemeinsamen Passwort anmelden kannst und NICHT zur Seite „Set your password“ weitergeleitet wirst, läuft dort noch die alte Version.**

Das neue System (persönliche Passwörter, Erst-Login → Passwort setzen) ist erst aktiv, wenn:

1. Der **neueste Code** auf GitHub ist und Vercel einen neuen Build gemacht hat.
2. In Vercel die **neuen Env-Variablen** gesetzt sind.
3. Die **User-Tabelle** in Turso angelegt wurde (Migration einmal ausgeführt).

---

## Checkliste: Neues Auth-System live schalten

### 1. Code auf den Server bringen

- Änderungen committen und nach GitHub pushen (z.B. `main`).
- Vercel baut automatisch neu. Im Vercel-Dashboard unter „Deployments“ prüfen, ob der letzte Build erfolgreich und aktuell ist.

### 2. Env-Variablen in Vercel setzen

Im Vercel-Projekt: **Settings → Environment Variables** (für Production):

| Variable | Wert | Bedeutung |
|---------|------|-----------|
| `AUTH_ALLOWED_EMAIL_DOMAIN` | `lavik-media.com` | Nur E-Mails mit dieser Domain dürfen sich anmelden. |
| `AUTH_INITIAL_PASSWORD` | **ein sicheres Passwort, das du dir ausdenkst** | Das **Einmal-Passwort für den ersten Login**. Nur du kennst es (steht nur auf dem Server), du gibst es z.B. deinem Team einmal mündlich oder per sicherem Kanal. Nach dem ersten Login setzt jeder sein eigenes Passwort. |

- `AUTH_JWT_SECRET` und `TURSO_*` solltet ihr schon haben.
- Nach dem Speichern der neuen Variablen: **Redeploy** auslösen (z.B. „Redeploy“ beim letzten Deployment), damit sie im Build geladen werden.

### 3. User-Tabelle in Turso anlegen

Die neue Tabelle `User` muss einmal in eurer Turso-Datenbank existieren. Lokal (oder in einer Umgebung, wo `TURSO_*` gesetzt ist):

```bash
# TURSO_DATABASE_URL und TURSO_AUTH_TOKEN z.B. in .env oder exportiert
node scripts/apply-turso-user-migration.mjs
```

Wenn das ohne Fehler durchläuft, ist die User-Tabelle angelegt.

### 4. Ablauf danach

- **Erster Login:** E-Mail (z.B. `deinname@lavik-media.com`) + **AUTH_INITIAL_PASSWORD** (das, was du in Vercel eingetragen hast).
- Du wirst zur Seite **„Set your password“** weitergeleitet und setzt dein **persönliches Passwort** (min. 8 Zeichen).
- **Alle weiteren Logins:** Nur noch E-Mail + dein persönliches Passwort. Das Einmal-Passwort aus der Env wird für dich nicht mehr genutzt (nur noch für weitere neue Nutzer beim ersten Login).

---

## Woher kommt das „erste“ Passwort?

- Es ist **nicht** im Code und **nicht** in der App sichtbar.
- Du legst es fest, indem du in Vercel die Variable **AUTH_INITIAL_PASSWORD** setzt (z.B. ein langes, sicheres Passwort).
- Du (oder ein Admin) teilt es den Nutzern **einmal** für den ersten Login mit (mündlich, Signal, etc.). Danach nutzt jeder nur noch sein eigenes Passwort.

---

## Sicherheit – Kurzüberblick

- **Keine Passwörter oder Tokens im Frontend** – nur E-Mail + Passwort werden beim Login an den Server geschickt; das Initial-Passwort und alle Secrets liegen nur in den Env-Variablen auf dem Server.
- **Session:** Cookie ist `httpOnly`, in Production `secure`, Passwörter werden mit bcrypt gehasht gespeichert.
- **Backend:** Login und Set-Password laufen nur serverseitig; keine API-Keys oder Passwörter im Client-Code.

Wenn du willst, können wir als Nächstes Schritt für Schritt durchgehen: „Bin ich schon auf dem neuen Build?“ (z.B. anhand des letzten Deploy-Zeitstempels und der Env-Variablen).