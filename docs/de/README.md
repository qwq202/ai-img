# AI Image Generator

Ein elegantes KI-Bildgenerierungstool basierend auf der Google Gemini API, das Text-zu-Bild, Bildbearbeitung und intelligente Prompt-Optimierung unterstützt.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Kernfunktionen

### Text zu Bild
Geben Sie eine Beschreibung ein und erzeugen Sie atemberaubende Bilder. Unterstützt verschiedene Stile und Szenenbeschreibungen.

### Intelligente Prompt-Optimierung
KI optimiert Ihre Prompts automatisch für genauere Generierungsergebnisse.

### Flexible Parameteranpassung
- **Mehrere Seitenverhältnisse**: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- **Mehrere Auflösungen**: 1K, 2K, 4K
- **Referenzbilder**: Referenzbilder hochladen, um die Generierungsrichtung zu lenken

### Echtzeit-Suche-Verbesserung
Verbindung zu Google Search für Echtzeit-Informationen zur Unterstützung der Bildgenerierung.

## Schnittstellen-Vorschau

**Startseite** - Beschreibungen eingeben, Parameter anpassen, Referenzbilder hochladen und mit einem Klick KI-Bilder generieren.

![Startseite](../image/首页.png)

**Verlauf** - Alle Generierungsaufzeichnungen werden automatisch gespeichert für einfache Überprüfung und Verwaltung vergangener Werke.

![Verlauf](../image/历史.png)

**Einstellungen** - API-Schlüssel und Präferenzen konfigurieren, um Ihr Generierungserlebnis anzupassen.

![Einstellungen](../image/设置.png)

## Vercel Deployment

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/qunqin45/ai-img)

Klicken Sie auf die Schaltfläche oben für ein Klick-freies Deployment auf Vercel.

## Docker Deployment

Optimiert für Linux x86_64 Architektur, Klick-Deployment:

```bash
docker run -d --name ai-img --restart unless-stopped -p 3000:3000 qunqin45/ai-img:latest
```

Greifen Sie nach dem Deployment auf `http://<ihre-server-ip>:3000` zu.

Häufige Befehle:
```bash
docker logs -f ai-img   # Logs anzeigen
docker restart ai-img   # Neustart
docker stop ai-img && docker rm ai-img  # Stoppen und entfernen
```

## Schnellstart

```bash
# Projekt klonen
git clone https://github.com/qunqin45/ai-img.git
cd ai-img

# Abhängigkeiten installieren
pnpm install

# Entwicklungsserver starten
pnpm dev
```

Öffnen Sie [http://localhost:3000](http://localhost:3000) um zu beginnen.

## Konfiguration

Füllen Sie in den Einstellungen (oben rechts) aus:
- **API-Schlüssel**: Ihr Gemini API-Schlüssel
- **API-URL**: Gemini API-Adresse (optional)

API-Schlüssel werden nur in Ihrem lokalen Browser gespeichert.

## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js) ![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4?style=flat-square&logo=tailwindcss) ![shadcn/ui](https://img.shields.io/badge/shadcn/ui-gray?style=flat-square)

## Lizenz

[MIT License](../LICENSE)
