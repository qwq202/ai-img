# AI Image Generator

Una herramienta elegante de generación de imágenes IA basada en la API de Google Gemini, que soporta conversión de texto a imagen, edición de imágenes y optimización inteligente de prompts.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Funcionalidades principales

### Texto a imagen
Ingrese una descripción y genere imágenes impresionantes. Soporta varios estilos y descripciones de escenas.

### Optimización inteligente de prompts
La IA optimiza automáticamente sus prompts para resultados de generación más precisos.

### Ajuste flexible de parámetros
- **Múltiples relaciones de aspecto**: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
- **Múltiples resoluciones**: 1K, 2K, 4K
- **Imágenes de referencia**: Cargue imágenes de referencia para guiar la dirección de generación

### Mejora de búsqueda en tiempo real
Conéctese a Google Search para obtener información en tiempo real para asistir la generación de imágenes.

### Soporte multilingüe
Soporte de 7 idiomas: English, 简体中文, 日本語, 한국어, Français, Deutsch, **Español**. El idioma se puede cambiar en la configuración, y la optimización de prompts se mostrará en el idioma correspondiente.

## Vista previa de la interfaz

**Inicio** - Ingrese descripciones, ajuste parámetros, cargue imágenes de referencia y genere imágenes IA con un clic.

![Inicio](https://github.com/qwq202/ai-img/blob/main/image/首页.png)

**Historial** - Guarda automáticamente todos los registros de generación para revisión y gestión fácil de trabajos anteriores.

![Historial](https://github.com/qwq202/ai-img/blob/main/image/历史.png)

**Configuración** - Configure la clave API y preferencias para personalizar su experiencia de generación.

![Configuración](https://github.com/qwq202/ai-img/blob/main/image/设置.png)

## Despliegue en Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/qunqin45/ai-img)

Haga clic en el botón anterior para un despliegue gratuito en un clic en Vercel.

## Despliegue con Docker

Optimizado para arquitectura Linux x86_64, despliegue en un clic:

```bash
docker run -d --name ai-img --restart unless-stopped -p 3000:3000 qunqin45/ai-img:latest
```

Acceda a `http://<su-ip-del-servidor>:3000` después del despliegue.

Comandos comunes:
```bash
docker logs -f ai-img   # Ver logs
docker restart ai-img   # Reiniciar
docker stop ai-img && docker rm ai-img  # Detener y eliminar
```

## Inicio rápido

```bash
# Clonar el proyecto
git clone https://github.com/qunqin45/ai-img.git
cd ai-img

# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000) para comenzar.

## Configuración

Complete en la configuración (arriba a la derecha):
- **Clave API**: Su clave API de Gemini
- **URL de API**: Dirección de API de Gemini (opcional)

Las claves API solo se almacenan en su navegador local.

## Stack tecnológico

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js) ![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4?style=flat-square&logo=tailwindcss) ![shadcn/ui](https://img.shields.io/badge/shadcn/ui-gray?style=flat-square)

## Licencia

[MIT License](../LICENSE)
