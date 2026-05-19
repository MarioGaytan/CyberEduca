# CiberEduca v2

Plataforma educativa interactiva de ciberseguridad para secundaria — Guadalajara, México.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite 6 + React Router v7 |
| Estilos | Tailwind CSS v4 |
| Estado global | Zustand |
| Base de datos | Firebase Firestore (offline-first) |
| Autenticación | Firebase Auth + Google OAuth |
| Almacenamiento | Firebase Storage |
| Desktop | Electron 33 → genera `.exe` para Windows |
| Offline | Firestore IndexedDB persistence |

## Inicio rápido

### Prerequisitos
- Node.js 20+
- Proyecto Firebase creado en [console.firebase.google.com](https://console.firebase.google.com)
- Google OAuth habilitado en Firebase Console > Authentication > Sign-in method

### Configuración

```bash
# 1. Clonar e instalar
git clone <repo-url>
cd cibereduca-v2
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con los valores de tu proyecto Firebase

# 3. Configurar el admin inicial en Firebase Console
#    Crear documento manualmente:
#    app_settings/global { adminEmails: ["tu@escuela.edu.mx"] }
```

### Desarrollo

```bash
# App web (browser)
npm run dev

# App Electron (abre ventana de escritorio)
npm run dev:electron
```

### Build de producción

```bash
# Build web (para Firebase Hosting)
npm run build

# Build ejecutable Windows (.exe)
npm run build:electron
# Genera: dist-electron/CiberEduca-Setup-1.0.0.exe
```

### Deploy Firebase

```bash
# Instalar Firebase CLI (una sola vez)
npm install -g firebase-tools
firebase login

# Deploy reglas y hosting
firebase deploy --only firestore:rules
firebase deploy --only hosting
```

## Estructura del proyecto

```
cibereduca-v2/
├── electron/                   # Capa Electron (proceso principal)
│   ├── main.js                 # Entry point Electron, gestión de ventana
│   ├── preload.js              # Bridge seguro renderer ↔ main (contextBridge)
│   └── auth-handler.js         # Documentación del flujo OAuth en Electron
├── src/
│   ├── main.jsx                # Entry point React
│   ├── App.jsx                 # Router raíz y rutas principales
│   ├── index.css               # Tailwind + variables de diseño global
│   ├── firebase/
│   │   ├── config.js           # Inicialización Firebase (singleton)
│   │   ├── auth.js             # signInWithGoogle, signOut, onAuthChange
│   │   ├── firestore.js        # Re-export de db + helpers genéricos
│   │   ├── offline.js          # db + initOfflinePersistence()
│   │   └── audit.js            # logAction() para audit_logs
│   ├── store/
│   │   ├── authStore.js        # user, firebaseUser, loading, error
│   │   ├── groupStore.js       # grupos del docente/estudiante
│   │   └── uiStore.js          # sidebar, toasts
│   ├── hooks/                  # Custom hooks reutilizables
│   ├── components/
│   │   ├── ui/                 # Átomos: Button, Input, Modal, Badge...
│   │   ├── layout/             # Navbar, Sidebar, PageWrapper
│   │   └── shared/             # ProtectedRoute, RoleGuard, OfflineBanner
│   ├── pages/
│   │   ├── auth/               # Login, PendingApproval, Unauthorized
│   │   ├── admin/              # Dashboard, Users, Groups, Content, Settings, Logs, Games
│   │   ├── teacher/            # Dashboard, MisTemas, CrearTema, GrupoResultados, CrearQuiz
│   │   ├── student/            # Inicio, Temas, Quiz, Juegos, Perfil, Rankings
│   │   └── shared/             # NotFound
│   ├── features/               # Lógica de dominio por módulo
│   │   ├── auth/               # userProfile.js
│   │   ├── groups/             # groupService.js
│   │   ├── topics/             # topicService.js
│   │   ├── quizzes/            # quizService.js
│   │   ├── results/            # resultService.js
│   │   ├── rankings/           # updateRanking.js
│   │   └── games/              # hangman.js, memorama.js
│   └── assets/                 # Imágenes, íconos, fuentes
├── firestore.rules             # Reglas de seguridad Firestore
├── firestore.indexes.json      # Índices compuestos
├── firebase.json               # Configuración Firebase CLI
├── vite.config.js
├── electron-builder.config.js  # Build .exe Windows (NSIS installer)
├── .env.example                # Variables de entorno requeridas
└── package.json
```

## Plan de sprints

| Sprint | Bloques | Qué construye |
|---|---|---|
| 1 — Crítico | 0 → 1 → 2 | Repo base + Auth Google + Panel Admin completo |
| 2 — Core | 3 → 4 → 5 | Grupos para docentes + Temas + Quizzes con revisión |
| 3 — Valor | 6 → 7 → 8 → 10 | Rankings + Ahorcado + Memorama + Offline |
| 4 — Final | 9 → 11 → 12 | Home alumno + .exe Electron + UI/UX |
| 5 — Opcional | 13 | ByteDefender |

## Roles de usuario

| Rol | Acceso |
|---|---|
| `admin` | Panel completo: usuarios, grupos, contenido, configuración |
| `docente` | Crear temas y quizzes, ver resultados de sus grupos |
| `estudiante` | Leer temas, tomar quizzes, jugar, ver ranking |

## Seguridad — reglas críticas

- Solo correos del dominio institucional configurado (`VITE_ALLOWED_EMAIL_DOMAIN`) pueden iniciar sesión
- Ningún documento es legible por usuarios no autenticados
- El `role` del usuario solo lo asigna el admin — nunca el propio usuario
- `contextIsolation: true` y `nodeIntegration: false` en Electron — nunca cambiar
- `dangerouslySetInnerHTML` solo con `DOMPurify.sanitize()` — sin excepción

## Variables de entorno

Ver [.env.example](.env.example). Crear `.env` local copiando el ejemplo y completando los valores de Firebase Console.

## Estado de bloques

| Bloque | Descripción | Estado |
|---|---|---|
| 0 | Fundamentos del Repositorio | ✅ DONE |
| 1 | Autenticación y Seguridad | ✅ DONE |
| 2 | Panel de Administración | ✅ DONE |
| 3 | Sistema de Grupos para Docentes | 🔴 PENDIENTE |
| 4 | Temas Educativos | 🔴 PENDIENTE |
| 5 | Quizzes y Evaluación | 🔴 PENDIENTE |
| 6 | Rankings y Competitividad | 🔴 PENDIENTE |
| 7 | Juego: Ahorcado | 🔴 PENDIENTE |
| 8 | Juego: Memorama | 🔴 PENDIENTE |
| 9 | Experiencia del Alumno | 🔴 PENDIENTE |
| 10 | Offline y Sincronización | 🔴 PENDIENTE |
| 11 | Electron — App de Escritorio | 🔴 PENDIENTE |
| 12 | UI/UX y Sistema de Diseño | 🔴 PENDIENTE |
| 13 | ByteDefender (Opcional) | 🔴 PENDIENTE |

---

Ver [PLAN_CIBEREDUCA_V2.md](../PLAN_CIBEREDUCA_V2.md) para el plan completo con instrucciones por bloque.
