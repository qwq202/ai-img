# AI Image Generator

Un outil élégant de génération d'images AI basé sur l'API Google Gemini, supportant la conversion texte-vers-image, l'édition d'images et l'optimisation intelligente des prompts.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Fonctionnalités principales

### Texte vers Image
Entrez une description et générez des images étonnantes. Supporte various styles et descriptions de scènes.

### Optimisation intelligente des prompts
L'IA optimise automatiquement vos prompts pour des résultats de génération plus précis.

### Ajustement flexible des paramètres
- **Multiples rapports d'aspect**: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- **Multiples résolutions**: 1K, 2K, 4K
- **Images de référence**: Téléchargez des images de référence pour guider la direction de génération

### Amélioration de recherche en temps réel
Connectez-vous à Google Search pour obtenir des informations en temps réel pour assister la génération d'images.

### Support multilingue
Support de 7 langues: English, 简体中文, 日本語, 한국어, **Français**, Deutsch, Español. La langue peut être changée dans les paramètres, et l'optimisation des prompts produira dans la langue correspondante.

## Aperçu de l'interface

**Accueil** - Entrez des descriptions, ajustez les paramètres, téléchargez des images de référence et générez des images AI en un clic.

![Accueil](https://github.com/qwq202/ai-img/blob/main/image/首页.png)

**Historique** - Enregistre automatiquement tous les enregistrements de génération pour une révision et gestion faciles des œuvres passées.

![Historique](https://github.com/qwq202/ai-img/blob/main/image/历史.png)

**Paramètres** - Configurez la clé API et les préférences pour personnaliser votre expérience de génération.

![Paramètres](https://github.com/qwq202/ai-img/blob/main/image/设置.png)

## Déploiement Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/qunqin45/ai-img)

Cliquez sur le bouton ci-dessus pour un déploiement gratuit en un clic sur Vercel.

## Déploiement Docker

Optimisé pour l'architecture Linux x86_64, déploiement en un clic:

```bash
docker run -d --name ai-img --restart unless-stopped -p 3000:3000 qunqin45/ai-img:latest
```

Accédez à `http://<votre-ip-serveur>:3000` après le déploiement.

Commandes courantes:
```bash
docker logs -f ai-img   # Voir les logs
docker restart ai-img   # Redémarrer
docker stop ai-img && docker rm ai-img  # Arrêter et supprimer
```

## Démarrage rapide

```bash
# Cloner le projet
git clone https://github.com/qunqin45/ai-img.git
cd ai-img

# Installer les dépendances
pnpm install

# Démarrer le serveur de développement
pnpm dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) pour commencer.

## Configuration

Remplissez dans les paramètres (en haut à droite):
- **Clé API**: Votre clé API Gemini
- **URL API**: Adresse de l'API Gemini (optionnel)

Les clés API sont uniquement stockées dans votre navigateur local.

## Stack technique

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js) ![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4?style=flat-square&logo=tailwindcss) ![shadcn/ui](https://img.shields.io/badge/shadcn/ui-gray?style=flat-square)

## Licence

[MIT License](../LICENSE)
