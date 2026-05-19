# CyberEduca v2 — Plan de Trabajo Completo

> **Documento de referencia para agentes de IA y equipo de desarrollo.**
> Cada bloque es independiente y puede asignarse a un agente o desarrollador distinto.
> Los bloques están ordenados por prioridad y dependencia. No comenzar un bloque sin que sus prerequisitos estén en estado ✅ DONE.

---

## Contexto del Proyecto

**CyberEduca** es una plataforma educativa interactiva para una secundaria en Guadalajara, México. Los usuarios son alumnos adolescentes y sus maestros. La aplicación se usa principalmente en el laboratorio de cómputo de la escuela durante clases.

### Decisiones arquitectónicas ya tomadas

| Decisión | Elección | Razón |
|---|---|---|
| Base de datos | Firebase Firestore | Compatible con Google Workspace for Education, offline-first, sin servidor propio |
| Autenticación | Firebase Auth + Google OAuth | La escuela tiene correos institucionales Google |
| Frontend | React 19 + Vite | Stack conocido por el equipo |
| App de escritorio | Electron | Genera `.exe` instalable para el laboratorio |
| Hosting (opcional) | Firebase Hosting | Mismo ecosistema, gratis para escala de una secundaria |
| Backend | Sin servidor propio | Firestore Security Rules reemplazan los guards de NestJS |
| Offline | Firestore IndexedDB persistence | Internet inestable en el laboratorio |

### Lo que NO se necesita
- `school_id` — la plataforma es exclusiva de esta secundaria
- Servidor NestJS — Firestore + Firebase Functions cubren la lógica
- MongoDB — reemplazado por Firestore
- Registro manual con usuario/contraseña — reemplazado por Google OAuth

---

## Stack Técnico Detallado

```
Frontend:       React 19 + Vite + React Router v7
Estilos:        Tailwind CSS v4
Estado global:  Zustand (auth, grupos, configuración)
HTTP/DB:        Firebase SDK v11 (Firestore + Auth + Storage)
Offline:        Firestore enableMultiTabIndexedDbPersistence
Desktop:        Electron 33+ (wrapper sobre la app Vite)
Build desktop:  electron-builder → genera .exe (Windows)
Auth:           Firebase Auth con signInWithPopup (Google)
Linting:        ESLint + Prettier
Tests:          Vitest + React Testing Library
```

### Estructura de carpetas del repositorio único (monorepo)

```
cybereduca/
├── electron/                   # Capa Electron (main process)
│   ├── main.js                 # Entry point Electron
│   ├── preload.js              # Bridge seguro renderer↔main
│   └── auth-handler.js         # Manejo especial de OAuth en Electron
├── src/                        # App React (renderer process)
│   ├── main.jsx
│   ├── App.jsx
│   ├── firebase/
│   │   ├── config.js           # Inicialización Firebase
│   │   ├── auth.js             # Helpers de autenticación
│   │   ├── firestore.js        # Helpers genéricos Firestore
│   │   └── offline.js          # Configuración persistencia offline
│   ├── store/                  # Zustand stores
│   │   ├── authStore.js
│   │   ├── groupStore.js
│   │   └── uiStore.js
│   ├── hooks/                  # Custom hooks
│   ├── components/             # Componentes reutilizables
│   │   ├── ui/                 # Átomos: Button, Input, Badge, Modal...
│   │   ├── layout/             # Navbar, Sidebar, PageWrapper
│   │   └── shared/             # ProtectedRoute, RoleGuard, OfflineBanner
│   ├── pages/
│   │   ├── auth/               # Login, PendingApproval, Unauthorized
│   │   ├── admin/              # Dashboard, Users, Groups, Content, Settings
│   │   ├── teacher/            # MisTemas, GrupoResultados, CrearQuiz
│   │   ├── student/            # Inicio, Temas, Quiz, Juegos, Perfil, Rankings
│   │   └── shared/             # Privacy, Terms
│   ├── features/               # Lógica de dominio por módulo
│   │   ├── auth/
│   │   ├── groups/
│   │   ├── topics/
│   │   ├── quizzes/
│   │   ├── results/
│   │   ├── rankings/
│   │   └── games/
│   └── assets/
├── firestore.rules             # Reglas de seguridad Firestore
├── firestore.indexes.json      # Índices compuestos
├── firebase.json               # Configuración Firebase CLI
├── .env.example
├── vite.config.js
├── tailwind.config.js
├── package.json                # Scripts unificados (web + electron)
└── electron-builder.config.js  # Configuración build .exe
```

---

## Modelo de Datos Firestore

> **Regla de nomenclatura**: colecciones en `snake_case`, campos en `camelCase`, IDs auto-generados por Firestore salvo indicación.

### Colección: `users`
```
users/{userId}                    # userId = Firebase Auth UID
  uid: string                     # igual al ID del documento
  email: string                   # correo institucional @escuela.edu.mx
  displayName: string             # nombre real del alumno/maestro
  photoURL: string                # foto de Google
  role: 'admin' | 'docente' | 'estudiante'
  status: 'active' | 'pending' | 'rejected' | 'suspended'
  groupId: string | null          # ref a groups/{groupId} — solo estudiantes
  assignedGroups: string[]        # IDs de grupos — solo docentes
  createdAt: Timestamp
  lastLogin: Timestamp
  metadata:
    loginCount: number
    deviceInfo: string            # info del equipo de laboratorio (opcional)
```

### Colección: `groups`
```
groups/{groupId}
  name: string                    # ej. "1°A", "2°B"
  grade: '1' | '2' | '3'         # grado escolar
  letter: string                  # A, B, C...
  schoolYear: string              # ej. "2025-2026"
  teacherIds: string[]            # UIDs de docentes asignados
  studentIds: string[]            # UIDs de estudiantes (desnormalizado para queries)
  allowedTopicIds: string[]       # temas habilitados para este grupo
  allowedQuizSetIds: string[]     # quices habilitados para este grupo
  allowedGames: string[]          # 'hangman' | 'memorama' | 'bytedefender'
  isActive: boolean
  createdAt: Timestamp
  createdBy: string               # UID admin
```

### Colección: `topics`
```
topics/{topicId}
  title: string
  description: string
  category: string                # ej. "Redes", "Seguridad", "Hardware"
  contentBlocks: ContentBlock[]   # array embebido (ver tipo abajo)
  coverColor: string              # color de la tarjeta
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'archived'
  createdBy: string               # UID docente
  approvedBy: string | null       # UID admin
  editPermissions: string[]       # UIDs con permiso de edición
  groupVisibility: string[]       # IDs de grupos que pueden ver este tema
  createdAt: Timestamp
  updatedAt: Timestamp
  history: HistoryEntry[]         # auditoría de cambios (máx 50 entradas)

# Tipo ContentBlock:
  type: 'text' | 'heading' | 'subheading' | 'list' | 'quote' | 'code' | 'image' | 'divider'
  content: string
  metadata?: object               # fontSize, color, language (para code), etc.
  order: number

# Tipo HistoryEntry:
  action: string
  userId: string
  userName: string
  timestamp: Timestamp
```

### Colección: `quiz_sets`
```
quiz_sets/{quizSetId}
  title: string
  description: string
  topicId: string                 # ref a topics/{topicId}
  createdBy: string               # UID docente
  groupVisibility: string[]       # grupos habilitados
  timeLimit: number | null        # segundos — null = sin límite
  maxAttempts: number             # 0 = ilimitado
  shuffleQuestions: boolean
  showResultsImmediately: boolean # si el alumno ve respuestas al terminar
  isActive: boolean
  isDeleted: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
```

### Subcolección: `quiz_sets/{quizSetId}/questions`
```
questions/{questionId}
  text: string
  options: string[]               # 2–5 opciones
  correctIndex: number            # índice de la opción correcta
  explanation: string             # explicación que se muestra post-respuesta
  order: number
  points: number                  # default 1
```

### Colección: `quiz_attempts`
```
quiz_attempts/{attemptId}
  userId: string
  quizSetId: string
  topicId: string
  groupId: string
  answers: AttemptAnswer[]        # respuestas del alumno
  score: number                   # 0-100
  correctCount: number
  totalQuestions: number
  timeTaken: number               # segundos
  completedAt: Timestamp
  isReviewed: boolean             # si el docente ya revisó
  teacherComment: string | null   # comentario del docente
  status: 'in_progress' | 'completed' | 'reviewed'

# Tipo AttemptAnswer:
  questionId: string
  selectedIndex: number
  isCorrect: boolean
  timeSpent: number               # segundos en esta pregunta
```

### Colección: `rankings`
```
rankings/{rankingId}
  # Desnormalizado para lecturas rápidas — se actualiza via Cloud Function o cliente
  userId: string
  userName: string
  userPhoto: string
  groupId: string
  groupName: string
  totalScore: number
  quizzesTaken: number
  avgScore: number
  bestStreak: number
  gamesScore: number
  combinedScore: number           # totalScore + gamesScore (ponderado)
  period: 'all_time' | 'weekly' | 'monthly'
  updatedAt: Timestamp
```

### Colección: `games`
```
# Subcolecciones por tipo de juego

games/hangman/words/{wordId}
  word: string
  hint: string
  topicId: string
  groupVisibility: string[]
  createdBy: string
  difficulty: 'easy' | 'medium' | 'hard'
  isActive: boolean
  createdAt: Timestamp

games/memorama/sets/{setId}
  title: string
  topicId: string
  groupVisibility: string[]
  createdBy: string
  cards: MemorCard[]              # pares de tarjetas (max 20 pares)
  isActive: boolean
  createdAt: Timestamp

# Tipo MemorCard:
  id: string
  content: string                 # texto o URL imagen
  pairId: string                  # ID de la tarjeta con la que hace par

# ByteDefender (opcional - estructura extensible)
games/bytedefender/levels/{levelId}
  title: string
  topicId: string
  groupVisibility: string[]
  createdBy: string
  mapLayout: number[][]           # matriz 2D del laberinto
  puzzles: Puzzle[]               # preguntas/puzles en el nivel
  isActive: boolean
  createdAt: Timestamp
```

### Colección: `game_scores`
```
game_scores/{scoreId}
  userId: string
  groupId: string
  gameType: 'hangman' | 'memorama' | 'bytedefender'
  resourceId: string              # wordId / setId / levelId
  score: number
  timeTaken: number
  completedAt: Timestamp
```

### Colección: `audit_logs`
```
audit_logs/{logId}
  userId: string
  action: string                  # 'login' | 'create_topic' | 'delete_user' | etc.
  targetCollection: string
  targetId: string
  metadata: object
  timestamp: Timestamp
  ipHash: string | null           # hash de IP (no guardar IP directa — privacidad)
```

### Colección: `app_settings` (documento único)
```
app_settings/global
  schoolName: string
  schoolDomain: string            # ej. "escuela.edu.mx"
  allowedEmailDomain: string      # dominio permitido para login
  maintenanceMode: boolean
  registrationOpen: boolean
  defaultGroupForNewStudents: string | null
  rankingConfig:
    enableWeekly: boolean
    enableMonthly: boolean
    includeGamesInRanking: boolean
    gamesWeight: number           # 0.0 – 1.0
  featureFlags:
    hangmanEnabled: boolean
    memoramaEnabled: boolean
    bytedefenderEnabled: boolean  # flag para juego extensible
    rankingsEnabled: boolean
  updatedAt: Timestamp
  updatedBy: string
```

---

## Reglas de Seguridad Firestore — Resumen de Permisos

> El archivo completo está en `firestore.rules`. Este resumen es para que los agentes entiendan la intención.

| Colección | Leer | Escribir |
|---|---|---|
| `users/{uid}` | Propio uid + admin | Propio uid (campos limitados) + admin |
| `users` (lista) | Admin + docente (solo su grupo) | Admin |
| `groups` | Admin + docentes asignados + estudiantes del grupo | Admin |
| `topics` | Según `groupVisibility` + admin + docente creador | Docente creador o con permiso + admin |
| `quiz_sets` | Según `groupVisibility` + admin + docente | Docente creador + admin |
| `quiz_sets/.../questions` | Mismo que quiz_set padre | Docente creador + admin |
| `quiz_attempts` | Propio uid + docente del grupo + admin | Propio uid (crear/actualizar) |
| `rankings` | Cualquier usuario autenticado del dominio | Solo Cloud Function / admin |
| `games/**` | Según `groupVisibility` + admin | Docente + admin |
| `game_scores` | Propio uid + docente del grupo + admin | Propio uid |
| `audit_logs` | Solo admin | Solo servidor (Cloud Function) |
| `app_settings/global` | Admin + lectura de `allowedEmailDomain` en auth | Solo admin |

**Regla transversal crítica:** Ningún documento es legible por usuarios no autenticados. Todo token debe pertenecer al dominio `allowedEmailDomain` configurado (validado en la función de login, no solo en reglas).

---

## Bloques de Trabajo

> **Formato de cada bloque:**
> - **Estado**: 🔴 PENDIENTE | 🟡 EN PROGRESO | ✅ DONE
> - **Prioridad**: CRÍTICA > ALTA > MEDIA > BAJA
> - **Prerequisitos**: Bloques que deben estar DONE antes de iniciar
> - **Entregable**: Qué debe existir cuando el bloque esté DONE
> - **Instrucciones para el agente**: Qué hacer, qué no hacer, decisiones ya tomadas

---

### BLOQUE 0 — Fundamentos del Repositorio
**Estado:** ✅ DONE | **Prioridad:** CRÍTICA | **Prerequisitos:** ninguno

#### Objetivo
Crear el monorepo con la estructura de carpetas, configuraciones base, y Firebase inicializado. Este bloque no tiene lógica de negocio — solo la base sobre la que se construye todo.

#### Tareas
- [ ] Inicializar repositorio Git con `.gitignore` adecuado (ignorar `.env`, `node_modules`, `dist`, `out`)
- [ ] `npm init` con workspaces si se usa monorepo, o proyecto único con scripts separados
- [ ] Instalar dependencias core: `react`, `react-dom`, `react-router-dom`, `vite`, `@vitejs/plugin-react`
- [ ] Instalar Firebase SDK: `firebase`
- [ ] Instalar Tailwind CSS v4 + PostCSS
- [ ] Instalar Zustand: `zustand`
- [ ] Instalar Electron + electron-builder como devDependencies
- [ ] Crear estructura de carpetas según árbol definido arriba
- [ ] Crear `src/firebase/config.js` con inicialización Firebase (leer variables de `.env`)
- [ ] Crear `src/firebase/offline.js` que active `enableMultiTabIndexedDbPersistence`
- [ ] Crear `.env.example` con todas las variables requeridas (ver lista abajo)
- [ ] Configurar `vite.config.js` para que el build funcione tanto en browser como en Electron
- [ ] Configurar `electron/main.js` básico que cargue la app Vite en producción y el dev server en desarrollo
- [ ] Configurar `electron-builder.config.js` para generar `.exe` para Windows
- [ ] Crear scripts en `package.json`: `dev` (web), `dev:electron` (Electron + Vite), `build` (web), `build:electron` (`.exe`)
- [ ] Configurar `firebase.json` y `firestore.rules` con regla temporal `allow read, write: if false` (todo cerrado hasta el Bloque 1)
- [ ] Verificar que `npm run dev` levanta la app en localhost sin errores

#### Variables de entorno requeridas (`.env`)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_ALLOWED_EMAIL_DOMAIN=        # ej: escuela.edu.mx
VITE_APP_ENV=development          # development | production
```

#### Entregable
- Repo con estructura completa de carpetas
- `npm run dev` muestra una página React en blanco sin errores de consola
- `npm run dev:electron` abre ventana Electron mostrando la misma página
- Firebase inicializado (sin operaciones aún)
- Tailwind funcional (un `className="text-blue-500"` se renderiza en azul)

#### Notas para el agente
- NO agregar lógica de negocio en este bloque
- El proyecto es Windows-first (el lab usa Windows); el build debe generar `.exe` NSIS installer
- Firebase project ya debe existir en la consola Firebase antes de iniciar este bloque — el equipo lo crea manualmente
- Para Electron + Firebase Auth (Google OAuth) hay una limitación: `signInWithPopup` requiere una URL permitida en Firebase. En desarrollo usar `http://localhost:5173`; en producción Electron usar un custom protocol (`cybereduca://`) registrado en `electron/main.js` como handler de redirect
- Electron `main.js` debe crear la ventana con `webPreferences: { contextIsolation: true, nodeIntegration: false }` — nunca desactivar `contextIsolation`

---

### BLOQUE 1 — Autenticación y Seguridad de Acceso
**Estado:** ✅ DONE | **Prioridad:** CRÍTICA | **Prerequisitos:** BLOQUE 0 ✅

#### Objetivo
Implementar el flujo completo de login con Google, restricción de dominio institucional, creación automática de perfil en Firestore, y el sistema de estados de usuario. Este es el bloque de mayor impacto de seguridad.

#### Tareas

**Firebase Auth:**
- [ ] Habilitar proveedor Google en Firebase Console (manual, no código)
- [ ] En `src/firebase/auth.js`: función `signInWithGoogle()` usando `signInWithPopup(provider)` donde `provider = new GoogleAuthProvider()` con `provider.setCustomParameters({ hd: import.meta.env.VITE_ALLOWED_EMAIL_DOMAIN })`
- [ ] Función `signOut()` que limpia Zustand y redirige a `/login`
- [ ] Función `onAuthChange(callback)` que suscribe a `onAuthStateChanged`
- [ ] **Validación de dominio (crítica):** En `onAuthStateChanged`, verificar que `user.email.endsWith('@' + ALLOWED_DOMAIN)`. Si no cumple: llamar `signOut()` inmediatamente + mostrar error "Solo cuentas institucionales"
- [ ] **Manejo especial Electron:** En `electron/auth-handler.js`, registrar custom protocol `cybereduca://` y manejar el redirect de OAuth. Ver: https://www.electronjs.org/docs/latest/tutorial/oauth2

**Perfil de usuario en Firestore:**
- [ ] En `src/features/auth/userProfile.js`: función `createOrUpdateUserProfile(firebaseUser)` que:
  - Verifica si `users/{uid}` ya existe
  - Si NO existe: crea documento con `role: null`, `status: 'pending'`, datos de Google (email, displayName, photoURL)
  - Si SÍ existe: actualiza `lastLogin: serverTimestamp()` y `photoURL` (puede cambiar)
  - Nunca sobreescribir `role` o `status` si ya existen
- [ ] Función `getUserProfile(uid)` — lee el perfil del usuario actual

**Store de autenticación (Zustand):**
- [ ] `src/store/authStore.js` con estado: `user` (perfil Firestore), `firebaseUser` (Firebase Auth), `loading`, `error`
- [ ] Acciones: `setUser`, `clearUser`, `setLoading`, `setError`

**Flujo post-login:**
- [ ] Si `status === 'pending'` y `role === null` → redirigir a `/pending-approval` con mensaje "Tu cuenta está siendo configurada por el administrador"
- [ ] Si `status === 'pending'` y `role === 'docente'` → redirigir a `/pending-approval` con mensaje "Tu cuenta de docente está pendiente de aprobación"
- [ ] Si `status === 'rejected'` → redirigir a `/unauthorized` con mensaje específico
- [ ] Si `status === 'suspended'` → redirigir a `/unauthorized`
- [ ] Si `status === 'active'` → redirigir según rol: admin→`/admin`, docente→`/teacher`, estudiante→`/student`
- [ ] Si el usuario es nuevo (primer login) y su email es conocido como admin (lista blanca en `app_settings/global.adminEmails`): asignar `role: 'admin'`, `status: 'active'` automáticamente

**Páginas de auth:**
- [ ] `pages/auth/Login.jsx` — botón "Iniciar sesión con Google" + logo de la escuela + nombre de la app. Sin formulario de usuario/contraseña
- [ ] `pages/auth/PendingApproval.jsx` — pantalla de espera con mensaje claro
- [ ] `pages/auth/Unauthorized.jsx` — pantalla de acceso denegado con razón
- [ ] `components/shared/ProtectedRoute.jsx` — verifica auth + rol + status antes de renderizar hijos
- [ ] `components/shared/RoleGuard.jsx` — muestra/oculta contenido según rol

**Reglas Firestore para este bloque:**
- [ ] `users/{uid}`: read si `request.auth.uid == uid` OR `isAdmin()`; write solo si `request.auth.uid == uid` y solo campos permitidos (displayName, photoURL, lastLogin)
- [ ] `app_settings/global`: read el campo `allowedEmailDomain` sin auth (para validación pre-login); write solo admin

#### Entregable
- Login con Google funciona tanto en browser como en Electron
- Usuario con email fuera del dominio ve error y es deslogeado
- Usuario nuevo queda en estado `pending` con `role: null`
- Usuario con `status: active` llega a su página según rol
- Rutas protegidas redirigen a `/login` si no hay sesión
- `firestore.rules` tiene las reglas de `users` implementadas

#### Notas para el agente
- NUNCA guardar el JWT o token de Firebase en `localStorage` manualmente — Firebase SDK lo maneja internamente
- El campo `role` SOLO lo escribe el admin (Bloque 2) o la lógica de primer admin — nunca el propio usuario
- Para la lista blanca del primer admin: el admin inicial se define en `app_settings/global.adminEmails: string[]` — este documento se crea manualmente en Firebase Console antes del primer login
- En Electron, `signInWithPopup` puede fallar porque abre el popup en una ventana Electron y el redirect URI no coincide. Solución probada: usar `signInWithRedirect` + manejar el redirect con el custom protocol `cybereduca://callback` en `electron/auth-handler.js`

---

### BLOQUE 2 — Panel de Administración
**Estado:** 🔴 PENDIENTE | **Prioridad:** CRÍTICA | **Prerequisitos:** BLOQUE 1 ✅

#### Objetivo
Implementar el panel completo del admin. Este es el control de la plataforma: gestión de usuarios, grupos, contenido y configuración global. Sin este bloque, ningún maestro ni alumno puede operar.

#### Tareas

**Layout y navegación admin:**
- [ ] `pages/admin/AdminLayout.jsx` — sidebar con navegación: Dashboard, Usuarios, Grupos, Contenido, Juegos, Configuración, Logs
- [ ] Sidebar colapsable, muestra rol y foto del admin logueado
- [ ] Breadcrumbs en todas las páginas admin

**Dashboard admin (`/admin`):**
- [ ] Contadores en tiempo real (usando `onSnapshot`): total usuarios, usuarios pendientes, total grupos, temas publicados, quices activos
- [ ] Lista de últimas acciones (de `audit_logs`, últimas 20)
- [ ] Acceso rápido a "Usuarios pendientes" si hay pendientes

**Gestión de usuarios (`/admin/users`):**
- [ ] Tabla de todos los usuarios con columnas: nombre, email, rol, estado, grupo, último login
- [ ] Filtros: por rol, por estado, por grupo
- [ ] Búsqueda por nombre/email
- [ ] Acciones por usuario:
  - Aprobar usuario pendiente (asignar rol + `status: 'active'`)
  - Asignar/cambiar rol (`estudiante` | `docente` | `admin`)
  - Suspender/reactivar cuenta
  - Asignar a grupo (para estudiantes)
  - Ver historial de actividad (últimos quiz attempts, logins)
- [ ] Importación masiva de estudiantes: subir CSV con columnas `email,displayName,groupId` → crea documentos en `users` con `status: 'pre_registered'`; cuando ese email hace login, se activa automáticamente con el grupo y rol pre-asignados
- [ ] Alumnos sin grupo asignado se marcan visualmente como "sin asignar"

**Gestión de grupos (`/admin/groups`):**
- [ ] Listado de grupos con: nombre, grado, ciclo escolar, número de alumnos, docentes asignados
- [ ] Crear grupo: nombre, grado (1°/2°/3°), letra (A/B/C...), ciclo escolar
- [ ] Editar grupo: cambiar docentes asignados, activar/desactivar
- [ ] Vista detalle de grupo: lista de alumnos, docentes, temas y quices habilitados
- [ ] Asignar/desasignar temas y quices al grupo (de la lista de aprobados)
- [ ] Habilitar/deshabilitar juegos por grupo
- [ ] Duplicar grupo (para nuevo ciclo escolar)

**Gestión de contenido (`/admin/content`):**
- [ ] Temas pendientes de aprobación con vista previa del contenido
- [ ] Aprobar / rechazar tema con comentario
- [ ] Listado de todos los temas con estado y autor
- [ ] Listado de todos los quiz sets con estado
- [ ] Archivar / restaurar contenido

**Configuración de juegos (`/admin/games`):**
- [ ] Para cada tipo de juego: activar/desactivar globalmente (via `app_settings/global.featureFlags`)
- [ ] Listado de palabras de Ahorcado pendientes de revisión
- [ ] Listado de sets de Memorama pendientes de revisión
- [ ] Si ByteDefender está habilitado: listado de niveles pendientes

**Configuración global (`/admin/settings`):**
- [ ] Editar `schoolName`, `schoolDomain`, `allowedEmailDomain`
- [ ] Activar/desactivar modo mantenimiento (bloquea login de no-admins)
- [ ] Configurar pesos del ranking (sliders para quices vs juegos)
- [ ] Activar/desactivar rankings semanales/mensuales
- [ ] Configurar grupo por defecto para nuevos alumnos (opcional)

**Logs de auditoría (`/admin/logs`):**
- [ ] Tabla paginada de `audit_logs` con filtros por usuario, acción, fecha
- [ ] Solo lectura — nunca borrar logs desde la UI

**Reglas Firestore para este bloque:**
- [ ] `groups`: read/write si `isAdmin()` o (`isDocente()` y el docente está en `teacherIds`)
- [ ] `app_settings/global`: read/write solo `isAdmin()`
- [ ] `audit_logs`: read solo `isAdmin()`, write solo via Cloud Function o regla de sistema

#### Entregable
- Admin puede aprobar usuarios y asignar roles
- Admin puede crear grupos y asignar alumnos
- Admin puede aprobar/rechazar temas
- Admin puede habilitar contenido por grupo
- Admin puede ver y modificar configuración global
- Todas las acciones críticas escriben en `audit_logs`

#### Notas para el agente
- Las funciones helper `isAdmin()`, `isDocente()`, `isStudent()` deben definirse en `firestore.rules` como funciones reutilizables, no inline
- La importación CSV usa `papaparse` (npm) para parsear el archivo en el cliente; nunca enviar el CSV a un servidor
- El campo `pre_registered` en users es transitorio: cuando el usuario hace login y su email coincide con un perfil `pre_registered`, se actualiza a `active` y se copian `role` y `groupId` del perfil pre-registrado
- Auditoría: crear helper `src/firebase/audit.js` con función `logAction(action, targetCollection, targetId, metadata)` que escribe en `audit_logs`. Llamar esta función desde todas las acciones del admin

---

### BLOQUE 3 — Sistema de Grupos para Docentes
**Estado:** 🔴 PENDIENTE | **Prioridad:** ALTA | **Prerequisitos:** BLOQUE 2 ✅

#### Objetivo
Dar a los docentes visibilidad y control sobre sus grupos asignados. Un docente debe poder ver quiénes son sus alumnos, qué han completado y cómo van.

#### Tareas

**Dashboard docente (`/teacher`):**
- [ ] Tarjetas por grupo asignado: nombre, número de alumnos, % completado de quices activos
- [ ] Alertas: alumnos sin actividad reciente, quices no intentados por la mayoría

**Vista de grupo docente (`/teacher/groups/:groupId`):**
- [ ] Tabla de alumnos del grupo: nombre, foto, último acceso, quices completados, promedio
- [ ] Click en alumno → ver detalle de sus intentos
- [ ] Exportar resultados del grupo como CSV

**Reglas Firestore para este bloque:**
- [ ] Docente puede leer `users` de alumnos en sus grupos asignados
- [ ] Docente puede leer `quiz_attempts` de alumnos en sus grupos

#### Entregable
- Docente ve sus grupos y alumnos asignados
- Docente puede ver progreso general de su grupo
- Docente puede ver intentos individuales de alumnos

---

### BLOQUE 4 — Temas Educativos
**Estado:** 🔴 PENDIENTE | **Prioridad:** ALTA | **Prerequisitos:** BLOQUE 2 ✅

#### Objetivo
Crear el módulo completo de temas educativos: creación por docentes, aprobación por admin, lectura por alumnos según su grupo.

#### Tareas

**Listado de temas (alumno) (`/student/topics`):**
- [ ] Grid de tarjetas con: título, descripción, color, categoría, tiempo estimado
- [ ] Solo muestra temas en `groupVisibility` que incluya el grupo del alumno
- [ ] Filtro por categoría
- [ ] Buscador por título
- [ ] Estado visual si el alumno ya completó el quiz asociado

**Detalle de tema (alumno) (`/student/topics/:topicId`):**
- [ ] Renderizado de `contentBlocks` según su tipo:
  - `text`: párrafo HTML (sanitizar con DOMPurify)
  - `heading`/`subheading`: títulos h2/h3
  - `list`: `<ul>` o `<ol>`
  - `quote`: blockquote estilizado
  - `code`: highlight de sintaxis con `react-syntax-highlighter`
  - `image`: `<img>` con alt text
  - `divider`: separador visual
- [ ] Tabla de contenidos lateral (anclas a headings)
- [ ] Botón "Ir al Quiz" si hay quiz set asociado y habilitado para su grupo
- [ ] Botón "Volver a Temas"

**Creación/edición de temas (docente) (`/teacher/topics/new`, `/teacher/topics/:id/edit`):**
- [ ] Editor de bloques drag-and-drop (usar `@dnd-kit/core`)
- [ ] Cada bloque tiene: selector de tipo, input de contenido, opciones de estilo básicas
- [ ] Preview en tiempo real del tema
- [ ] Guardar como borrador (auto-save cada 30 segundos en Firestore)
- [ ] Enviar a revisión → cambia `status: 'pending_review'`
- [ ] Gestión de co-editores: docente puede añadir otros docentes a `editPermissions`

**Mis temas (docente) (`/teacher/topics`):**
- [ ] Lista de temas creados por el docente con estado y acciones
- [ ] Indicador claro de estado: borrador, en revisión, aprobado, rechazado (con comentario del admin)
- [ ] Opción de re-editar temas rechazados y volver a enviar

**Reglas Firestore para este bloque:**
- [ ] Estudiante: lee topics donde `groupVisibility` contiene su `groupId` y `status == 'approved'`
- [ ] Docente: lee/escribe sus propios topics o donde está en `editPermissions`; NO puede cambiar `status` directamente
- [ ] Admin: lee/escribe todos los topics, puede cambiar `status`

#### Entregable
- Docente puede crear, editar y enviar temas a revisión
- Admin puede aprobar/rechazar temas
- Alumno ve solo los temas habilitados para su grupo
- Renderizado correcto de todos los tipos de bloque
- Auto-save funciona con conexión intermitente

#### Notas para el agente
- El auto-save de 30 segundos solo guarda si `status === 'draft'` — nunca sobreescribir un tema en revisión o aprobado con el auto-save
- DOMPurify es obligatorio para renderizar cualquier contenido HTML generado por el usuario — nunca `dangerouslySetInnerHTML` sin sanitizar
- Los bloques de código no ejecutan JavaScript del alumno — son solo visualización
- Optimistic updates para el editor: actualizar UI inmediatamente, persistir en background, mostrar indicador de "guardado" / "pendiente sync"

---

### BLOQUE 5 — Quizzes y Evaluación
**Estado:** 🔴 PENDIENTE | **Prioridad:** ALTA | **Prerequisitos:** BLOQUE 4 ✅

#### Objetivo
Sistema completo de quizzes: creación por docentes, realización por alumnos, revisión y retroalimentación por docentes.

#### Tareas

**Creación de quiz set (docente) (`/teacher/quizzes/new`):**
- [ ] Formulario: título, descripción, tema asociado, límite de tiempo, intentos máximos, opciones de entrega
- [ ] Agregar/editar/eliminar/reordenar preguntas (drag-and-drop)
- [ ] Cada pregunta: texto, 2–5 opciones, marcar correcta, explicación post-respuesta, puntos
- [ ] Vista previa del quiz desde perspectiva alumno
- [ ] Guardar como borrador / activar quiz
- [ ] Asignar visibilidad a grupos (multi-select de grupos donde el docente enseña)

**Listado de quizzes (alumno) (`/student/quizzes`):**
- [ ] Cards por quiz disponible: título, tema, número de preguntas, tiempo límite, intentos restantes
- [ ] Estado: "Disponible", "Completado (nota: X/100)", "Sin intentos restantes"
- [ ] Orden: por asignación más reciente primero

**Realización de quiz (alumno) (`/student/quizzes/:quizSetId/take`):**
- [ ] Una pregunta a la vez con navegación adelante/atrás
- [ ] Barra de progreso (pregunta X de N)
- [ ] Temporizador visible si `timeLimit` está configurado
- [ ] Al seleccionar respuesta: guardar localmente (no enviar hasta terminar o que el alumno lo envíe)
- [ ] Si pierde conexión: seguir permitiendo responder (guardado local), sincronizar al recuperar
- [ ] Pantalla de confirmación antes de enviar
- [ ] Al enviar: calcular score, crear documento en `quiz_attempts`, actualizar `rankings`
- [ ] Si `showResultsImmediately === true`: mostrar resultados con respuestas correctas y explicaciones

**Resultados del quiz (alumno) (`/student/quizzes/:quizSetId/results`):**
- [ ] Resumen: score, tiempo, rango en su grupo
- [ ] Lista de preguntas con: su respuesta, respuesta correcta, explicación
- [ ] Botón "Intentar de nuevo" si tiene intentos restantes

**Vista de resultados (docente) (`/teacher/quizzes/:quizSetId/results`):**
- [ ] Tabla de intentos: alumno, fecha, score, tiempo, estado de revisión
- [ ] Click en intento → ver respuesta por respuesta con posibilidad de comentar
- [ ] Campo de comentario general del docente para el intento (`teacherComment`)
- [ ] Marcar intento como revisado (`isReviewed: true`)
- [ ] Estadísticas del quiz: promedio, distribución de scores, pregunta más fallada
- [ ] Filtrar por grupo
- [ ] Exportar resultados CSV

**Reglas Firestore para este bloque:**
- [ ] Alumno: lee `quiz_sets` y `questions` donde su grupo está en `groupVisibility` y `isActive === true`
- [ ] Alumno: crea `quiz_attempts` solo con su propio `userId`; no puede actualizar intentos ya completados
- [ ] Docente: lee `quiz_attempts` de alumnos en sus grupos; puede actualizar `isReviewed` y `teacherComment`
- [ ] Alumno NO puede leer `correctIndex` de preguntas — esta información solo se incluye en la respuesta del attempt al completar, calculada en cliente con la data local del quiz

**Nota crítica sobre respuestas correctas:**
El `correctIndex` de cada pregunta está en Firestore. Un alumno con las reglas incorrectas podría leerlo antes de responder. Solución: las questions se leen completas (incluyendo `correctIndex`) solo cuando el alumno envía el intento. Durante el quiz, solo se muestran las opciones. La validación de correctas se hace en cliente al enviar, con los datos cargados justo en ese momento. Las reglas de Firestore NO necesitan ocultar `correctIndex` si se diseña así, pero documentarlo claramente.

#### Entregable
- Docente puede crear y gestionar quizzes
- Alumno puede tomar quiz con timer funcional
- Quiz funciona offline (respuestas en memoria, sync al volver a conectar)
- Docente ve resultados detallados y puede comentar
- Score se calcula correctamente y actualiza ranking

#### Notas para el agente
- El estado del quiz en progreso se guarda en Zustand (memoria) + `sessionStorage` como backup — NO en Firestore durante el intento para evitar escrituras excesivas
- Solo escribir en Firestore al enviar el intento completo
- `timeTaken` se calcula como `Date.now()` al enviar menos `Date.now()` al iniciar (guardar startTime en sessionStorage)
- Al actualizar el ranking después de un quiz: actualizar solo los campos `totalScore`, `quizzesTaken`, `avgScore` del documento `rankings/{userId}` usando `updateDoc` con `increment`

---

### BLOQUE 6 — Rankings y Competitividad
**Estado:** 🔴 PENDIENTE | **Prioridad:** ALTA | **Prerequisitos:** BLOQUE 5 ✅

#### Objetivo
Sistema de rankings que motive a los alumnos a participar, con competencia dentro del grupo y entre grupos.

#### Tareas

**Actualización de rankings:**
- [ ] `src/features/rankings/updateRanking.js`: función que se llama al completar un quiz o juego, actualiza `rankings/{userId}` con los nuevos scores
- [ ] Cálculo de `combinedScore`: `(quizScore * (1 - gamesWeight)) + (gamesScore * gamesWeight)` usando el peso de `app_settings/global.rankingConfig.gamesWeight`
- [ ] Calcular `avgScore`: `totalScore / quizzesTaken`

**Ranking de grupo (`/student/rankings`):**
- [ ] Tabla con posición, foto, nombre, score total, quizzes completados, promedio
- [ ] Tabs: Mi Grupo | Toda la Escuela
- [ ] Resaltar la fila del usuario actual
- [ ] Animación de cambio de posición (sube/baja)
- [ ] Si rankings semanales están activos: tabs adicionales Semana | Mes | Histórico
- [ ] Podio visual para top 3 (visualización especial)

**Mi posición (widget en home del alumno):**
- [ ] Mini-widget que muestra posición actual del alumno en su grupo y en la escuela
- [ ] Flecha de tendencia: subió, bajó o igual respecto al día anterior

**Reglas Firestore para este bloque:**
- [ ] `rankings`: todos los usuarios autenticados del dominio pueden leer; solo el cliente puede actualizar su propio documento (campos específicos via regla)

#### Entregable
- Rankings se actualizan al completar quizzes y juegos
- Alumno ve su posición en grupo y escuela
- Top 3 tiene visualización especial
- Rankings reflejan peso configurable de quizzes vs juegos

---

### BLOQUE 7 — Juego: Ahorcado (Hangman)
**Estado:** 🔴 PENDIENTE | **Prioridad:** MEDIA | **Prerequisitos:** BLOQUE 2 ✅, BLOQUE 6 ✅

#### Objetivo
Migrar el módulo Ahorcado del proyecto anterior y adaptarlo al nuevo stack con Firebase y el sistema de grupos/rankings.

#### Tareas

**Gestión de palabras (docente) (`/teacher/games/hangman`):**
- [ ] Crear palabra: texto de la palabra, pista, tema asociado, dificultad, visibilidad por grupo
- [ ] Listado de palabras creadas con estado (pendiente revisión / aprobada)
- [ ] Las palabras pasan por revisión de admin antes de estar disponibles

**Revisión de palabras (admin):**
- [ ] En `/admin/games`: listado de palabras pendientes con opción de aprobar/rechazar

**Juego (alumno) (`/student/games/hangman`):**
- [ ] Selección de nivel de dificultad
- [ ] Mecánica clásica: mostrar letras adivinadas, dibujo del ahorcado progresivo, contador de intentos
- [ ] Teclado en pantalla (para tablets/touch) + soporte teclado físico
- [ ] Al ganar/perder: mostrar la palabra completa y la pista
- [ ] Guardar score en `game_scores`
- [ ] Las palabras mostradas se seleccionan aleatoriamente del pool aprobado y habilitado para el grupo

**Reglas Firestore:**
- [ ] Alumno: lee palabras donde su grupo está en `groupVisibility` y `isActive === true`
- [ ] Alumno: crea game_scores solo con su uid

#### Entregable
- Docente puede crear palabras para Ahorcado
- Admin aprueba palabras
- Alumno juega Ahorcado con palabras del banco aprobado
- Score se guarda y actualiza ranking

---

### BLOQUE 8 — Juego: Memorama
**Estado:** 🔴 PENDIENTE | **Prioridad:** MEDIA | **Prerequisitos:** BLOQUE 7 ✅

#### Objetivo
Migrar el módulo Memorama del proyecto anterior con adaptaciones al nuevo stack.

#### Tareas

**Gestión de sets (docente) (`/teacher/games/memorama`):**
- [ ] Crear set de Memorama: título, tema, grupos, pares de tarjetas (mínimo 4, máximo 20 pares)
- [ ] Cada tarjeta: contenido de texto (frente), contenido de texto (reverso que hace par)
- [ ] Vista previa del set
- [ ] Enviar a revisión de admin

**Juego (alumno) (`/student/games/memorama`):**
- [ ] Selección de set disponible
- [ ] Tablero de cartas boca abajo, animación de volteo
- [ ] Lógica de pares: voltear 2, si coinciden quedan abiertas, si no se voltean de regreso
- [ ] Contador de intentos, timer
- [ ] Al completar: mostrar tiempo, intentos, score calculado
- [ ] Score: base 100, penalización por intentos extra y tiempo
- [ ] Guardar en `game_scores`, actualizar ranking

#### Entregable
- Docente puede crear sets de Memorama
- Alumno puede jugar con sets aprobados para su grupo
- Score se calcula y guarda correctamente

---

### BLOQUE 9 — Experiencia del Alumno (Home y Perfil)
**Estado:** 🔴 PENDIENTE | **Prioridad:** MEDIA | **Prerequisitos:** BLOQUE 5 ✅, BLOQUE 6 ✅

#### Objetivo
Pantalla de inicio del alumno y perfil personal. Punto de entrada claro y motivador para el alumno.

#### Tareas

**Home del alumno (`/student`):**
- [ ] Saludo con nombre y foto del alumno
- [ ] Widget de ranking: posición actual en grupo y escuela
- [ ] Sección "Continuar": quizzes en progreso o sin completar
- [ ] Sección "Nuevos temas": temas recientes habilitados para su grupo
- [ ] Sección "Juegos disponibles": acceso rápido a Ahorcado y Memorama
- [ ] Indicador de conexión: banner discreto "Sin conexión — modo offline" cuando no hay internet

**Perfil del alumno (`/student/profile`):**
- [ ] Foto de perfil (de Google, no editable desde la app)
- [ ] Nombre, correo, grupo
- [ ] Estadísticas: quizzes completados, promedio general, juegos jugados, posición en grupo
- [ ] Historial de quizzes con scores
- [ ] Historial de juegos con scores

#### Entregable
- Home es el punto de entrada funcional del alumno
- Perfil muestra estadísticas reales del usuario
- Indicador offline funciona

---

### BLOQUE 10 — Offline y Sincronización
**Estado:** 🔴 PENDIENTE | **Prioridad:** ALTA | **Prerequisitos:** BLOQUE 5 ✅

#### Objetivo
Garantizar que la app sea usable con internet inestable o sin internet temporal. Este bloque no agrega pantallas nuevas sino que fortalece toda la app.

#### Tareas

**Configuración base offline:**
- [ ] `src/firebase/offline.js`: activar `enableMultiTabIndexedDbPersistence()` al iniciar la app
- [ ] Manejar el error `failed-precondition` (múltiples tabs) mostrando aviso pero sin romper la app
- [ ] Manejar el error `unimplemented` (Safari/IE) degradando gracefully

**Caché explícito de recursos críticos:**
- [ ] Al cargar la app y haber sesión activa: precargar con `getDocs` los topics y quiz_sets del grupo del alumno → quedan en caché IndexedDB de Firestore
- [ ] Al entrar a un tema: marcar como "disponible offline" (Firestore ya lo cachea automáticamente al leer)

**Indicador de estado de conexión:**
- [ ] `components/shared/OfflineBanner.jsx`: banner que aparece cuando `navigator.onLine === false` o cuando Firestore detecta que está en modo cache
- [ ] Escuchar eventos `online`/`offline` del navegador
- [ ] Escuchar `enableNetwork`/`disableNetwork` de Firestore para casos intermedios

**Comportamiento durante desconexión:**
- [ ] Tomar un quiz: el intento se guarda localmente (Zustand + sessionStorage), se envía a Firestore cuando se recupera la conexión
- [ ] Leer temas: funciona con caché (Firestore lo maneja)
- [ ] Ranking, admin, creación de temas: mostrar mensaje "Requiere conexión a internet"

**Sincronización al reconectar:**
- [ ] Si hay un intento de quiz pendiente de enviar (`sessionStorage` tiene datos), mostrar botón "Sincronizar" en el home
- [ ] Auto-sync cuando `online` event se dispara

#### Entregable
- La app no se rompe sin internet
- Alumno puede leer temas y completar quizzes en cache sin internet
- Banner visible cuando está offline
- Quiz pendiente se sincroniza al volver a conectar

#### Notas para el agente
- Firestore offline persistence aplica automáticamente para todas las lecturas y escrituras pendientes — no necesitas código extra para la mayoría de casos
- El caso especial es el quiz: como guardamos el estado en Zustand durante el intento y solo escribimos al final, necesitas asegurarte de que el `addDoc` del `quiz_attempt` se quede en la cola offline de Firestore aunque el usuario cierre la pestaña — para esto, usar `sessionStorage` como respaldo y al reabrir la app, verificar si hay intentos pendientes

---

### BLOQUE 11 — Electron — Aplicación de Escritorio
**Estado:** 🔴 PENDIENTE | **Prioridad:** ALTA | **Prerequisitos:** BLOQUE 10 ✅

#### Objetivo
Empaquetar la app como `.exe` instalable para Windows. La escuela instalará este ejecutable en todas las computadoras del laboratorio.

#### Tareas

**Configuración Electron:**
- [ ] `electron/main.js`: crear `BrowserWindow` con `width: 1280, height: 800, minWidth: 1024, minHeight: 640`
- [ ] En producción: cargar `file:///path/to/dist/index.html`; en desarrollo: `http://localhost:5173`
- [ ] Configurar `webPreferences`: `contextIsolation: true`, `nodeIntegration: false`, `preload: path.join(__dirname, 'preload.js')`
- [ ] Deshabilitar menú de aplicación (no necesario para alumnos) — opcional: menú simplificado para admin
- [ ] `electron/preload.js`: exponer solo APIs necesarias via `contextBridge` (ej: info de versión de la app)

**Manejo de Google OAuth en Electron:**
- [ ] Registrar custom protocol `cybereduca://` en `electron/main.js` con `app.setAsDefaultProtocolClient('cybereduca')`
- [ ] Al abrir el popup de Google, detectar la URL de callback con `cybereduca://callback?...`
- [ ] Extraer el token del callback y pasarlo a Firebase Auth con `signInWithCredential`
- [ ] Alternativa más simple: abrir la URL de auth en el browser del sistema con `shell.openExternal()` y recibir el callback — documentar cuál enfoque se usa

**Build para distribución:**
- [ ] `electron-builder.config.js`: target `nsis` (instalador Windows), `portable` como alternativa
- [ ] Nombre de la app: "CyberEduca"
- [ ] Icono: `assets/icon.ico` (crear/convertir el logo de la app)
- [ ] Instalar en `C:\Program Files\CyberEduca` por defecto
- [ ] Crear acceso directo en escritorio durante instalación
- [ ] `npm run build:electron` debe generar `dist-electron/CyberEduca-Setup-1.0.0.exe`

**Auto-update (opcional pero recomendado):**
- [ ] Usar `electron-updater` de `electron-builder`
- [ ] Configurar servidor de actualizaciones (puede ser un Release de GitHub)
- [ ] Al iniciar la app: verificar si hay actualización disponible, notificar al usuario (no forzar)

**Consideraciones de seguridad Electron:**
- [ ] Nunca `nodeIntegration: true` — vulnerabilidad crítica
- [ ] Validar en `main.js` que solo se cargan URLs esperadas (allowlist de URLs)
- [ ] Deshabilitar DevTools en producción: `win.webContents.on('devtools-opened', () => win.webContents.closeDevTools())`
- [ ] Usar `app.requestSingleInstanceLock()` para evitar múltiples instancias simultáneas

#### Entregable
- `npm run build:electron` genera `CyberEduca-Setup-x.x.x.exe`
- El instalador funciona en Windows 10/11
- Google Auth funciona dentro de Electron
- La app cierra correctamente y no deja procesos zombi
- DevTools no accesible en build de producción

---

### BLOQUE 12 — UI/UX y Sistema de Diseño
**Estado:** 🔴 PENDIENTE | **Prioridad:** MEDIA | **Prerequisitos:** BLOQUE 9 ✅

#### Objetivo
Consistencia visual, accesibilidad y buena experiencia para alumnos de secundaria (12–15 años). La UI debe ser clara, moderna y no infantilizante.

#### Tareas

**Sistema de diseño en Tailwind:**
- [ ] Definir en `tailwind.config.js`: paleta de colores (primario, secundario, error, éxito, neutros), tipografías (Inter o similar, sans-serif), radios de borde, sombras
- [ ] Colores sugeridos: primario azul/violeta (tech/educativo), fondo oscuro opcional (tema oscuro), acentos naranja/verde para acciones
- [ ] Crear componentes UI base en `components/ui/`:
  - `Button.jsx` (variantes: primary, secondary, danger, ghost; tamaños: sm, md, lg)
  - `Input.jsx` (con label, error state, helper text)
  - `Modal.jsx` (genérico con portal)
  - `Badge.jsx` (para estados: activo, pendiente, rechazado)
  - `Card.jsx` (contenedor base)
  - `Skeleton.jsx` (loading states)
  - `Spinner.jsx`
  - `Toast.jsx` (notificaciones temporales)
  - `Tooltip.jsx`
  - `Table.jsx` (con sorting y paginación)
  - `EmptyState.jsx` (pantalla cuando no hay datos)

**Navbar y navegación:**
- [ ] Navbar superior para alumnos: logo, nombre del alumno, foto, botón logout
- [ ] Navegación lateral para docentes: secciones colapsables
- [ ] Navegación lateral para admin: íconos + labels, badge con conteo de pendientes

**Responsive:**
- [ ] La app es principalmente para desktop (laboratorio); mínimo soportar 1024px de ancho
- [ ] Los juegos deben funcionar también en tablet (768px+)
- [ ] No es necesario soporte móvil completo, pero no debe romperse

**Accesibilidad:**
- [ ] Todos los botones con `aria-label` cuando usan solo icono
- [ ] Contraste WCAG AA en textos principales
- [ ] Focus visible en todos los elementos interactivos
- [ ] Navegación por teclado en modales (trap focus)

**Tema oscuro (opcional):**
- [ ] Si el tiempo lo permite: implementar toggle de tema claro/oscuro con `prefers-color-scheme` y Tailwind dark mode
- [ ] Guardar preferencia en `localStorage`

#### Entregable
- Sistema de componentes UI consistente
- La app se ve coherente en todas las páginas
- No hay texto ilegible ni elementos con bajo contraste
- Los estados de carga (skeleton/spinner) están en todas las páginas con datos async

---

### BLOQUE 13 — ByteDefender (Extensión Futura — Opcional)
**Estado:** 🔴 PENDIENTE | **Prioridad:** BAJA | **Prerequisitos:** BLOQUE 7 ✅, BLOQUE 8 ✅

#### Objetivo
Implementar la arquitectura que permita agregar ByteDefender como juego extensible. En esta primera versión se deja el sistema abierto para este juego pero no es obligatorio implementarlo completo.

#### Lo que SÍ debe implementarse (arquitectura abierta):
- [ ] La colección `games/bytedefender/levels` ya está definida en el modelo de datos — no requiere trabajo extra
- [ ] El feature flag `featureFlags.bytedefenderEnabled` en `app_settings/global` — ya incluido
- [ ] La constante `'bytedefender'` en `allowedGames` del grupo — ya incluido en el modelo
- [ ] `game_scores` acepta `gameType: 'bytedefender'` — ya incluido
- [ ] En `/admin/games`: sección "ByteDefender" que aparece solo si el flag está activo, con opción de crear/aprobar niveles

#### Lo que es OPCIONAL (implementar si hay tiempo):
- [ ] Motor de juego en Canvas (ver Abstract del juego arriba para la especificación completa)
- [ ] Editor de niveles/laberintos en el panel admin
- [ ] Sistema de puzles modales con preguntas de ciberseguridad
- [ ] Integración con Gemini API para el asistente "Cyber-IA" (requiere `VITE_GEMINI_API_KEY` en env)

#### Nota para el agente
El juego está descrito en el Abstract: ByteDefender - Operation CleanSweep. Si se implementa, usar HTML5 Canvas renderizado dentro de un componente React. La IA Gemini se integra via REST API directamente desde el cliente. El historial conversacional se guarda en estado local durante la sesión del juego, no en Firestore.

---

## Orden de Ejecución Recomendado

```
SPRINT 1 (Fundamentos — crítico)
  BLOQUE 0 → BLOQUE 1 → BLOQUE 2

SPRINT 2 (Core educativo)
  BLOQUE 3 → BLOQUE 4 → BLOQUE 5

SPRINT 3 (Valor agregado)
  BLOQUE 6 → BLOQUE 7 → BLOQUE 8 → BLOQUE 10

SPRINT 4 (Experiencia final)
  BLOQUE 9 → BLOQUE 11 → BLOQUE 12

SPRINT 5 (Extensión opcional)
  BLOQUE 13
```

---

## Reglas Globales para Agentes IA

Estas reglas aplican a TODOS los bloques y NUNCA deben ignorarse:

### Seguridad
1. **Nunca** exponer `VITE_FIREBASE_API_KEY` en logs o consola
2. **Nunca** `nodeIntegration: true` en Electron
3. **Nunca** `dangerouslySetInnerHTML` sin `DOMPurify.sanitize()`
4. **Nunca** guardar el rol del usuario en `localStorage` — siempre leerlo de Firestore
5. **Nunca** confiar en el rol que el cliente envía — validar en Firestore Security Rules
6. Todas las operaciones sensibles (cambio de rol, aprobación) deben verificar en Rules que quien escribe tiene permisos, no solo el cliente
7. El campo `correctIndex` de preguntas no necesita ocultarse si el diseño garantiza que se carga solo al enviar — documentar esto claramente en el código

### Calidad de código
8. Usar `async/await` siempre (no `.then()/.catch()`)
9. Manejar errores de Firestore explícitamente — no dejar `catch` vacíos
10. Mostrar estados de carga (`loading: true`) antes de cualquier operación async
11. Mostrar estados de error con mensaje amigable al usuario (no el error técnico de Firebase)
12. No crear componentes de más de 200 líneas — extraer lógica a hooks y helpers

### Firestore
13. Usar `onSnapshot` para datos que cambian frecuentemente (rankings, notificaciones)
14. Usar `getDoc`/`getDocs` para datos que no cambian frecuentemente (topics, quiz questions)
15. Nunca hacer N queries en un loop — usar `getDocs` con `where('id', 'in', [...ids])`
16. Índices compuestos: documentar en `firestore.indexes.json` cuando una query falle por falta de índice
17. No guardar arrays de más de 100 elementos en un documento — usar subcolecciones

### UX para alumnos de secundaria
18. Mensajes de error en español, claros y sin tecnicismos
19. Confirmación antes de acciones destructivas (borrar, enviar quiz definitivamente)
20. Feedback visual inmediato para todas las acciones (spinner, toast de éxito/error)
21. Los juegos deben tener instrucciones visibles en la primera pantalla

---

## Checklist de Entrega Final

Antes de entregar la aplicación a la escuela, verificar:

- [ ] Firebase project en plan **Spark (gratuito)** es suficiente — verificar quotas para el tamaño de la escuela
- [ ] Reglas de Firestore desplegadas con `firebase deploy --only firestore:rules`
- [ ] Dominio de correo configurado en `app_settings/global.allowedEmailDomain`
- [ ] Admin inicial creado en `app_settings/global.adminEmails`
- [ ] Build de Electron firmado digitalmente (evita advertencias de Windows SmartScreen) — opcional pero recomendado
- [ ] Manual de usuario para administrador (PDF de 1 página: cómo aprobar usuarios, crear grupos, habilitar contenido)
- [ ] Política de privacidad actualizada con datos reales de la escuela (contacto del responsable de datos)
- [ ] Pruebas realizadas con credenciales de prueba del dominio institucional real
- [ ] Verificar que el modo offline funciona desconectando el cable de red en el laboratorio
- [ ] Instalador `.exe` probado en una computadora limpia (sin Node.js instalado)

---

*Documento generado para CyberEduca v2. Actualizar el estado de cada bloque conforme avance el desarrollo.*
