# Dynamic Forms Lib 🚀

**CRUD enterprise screens in minutes, not hours.**

Una librería Angular (v20+, standalone, signals) que genera formularios dinámicos + tablas AG Grid desde configuración JSON. Olvidate de escribir HTML repetitivo para cada pantalla de ABM.

---

## ⏱️ ¿Cuánto tiempo te ahorra?

| Escenario | Sin la lib | Con la lib | **Ahorro** |
|---|---|---|---|
| Pantalla CRUD simple (5 campos, tabla, sin dependencias) | ~4 horas | ~15 minutos | **~94%** |
| Pantalla CRUD media (10 campos, selects anidados, validaciones) | ~8 horas | ~30 minutos | **~94%** |
| Pantalla CRUD compleja (20+ campos, tabs, dependencias en cascada, autocomplete, file upload) | ~16 horas | ~1 hora | **~94%** |
| **Proyecto completo (10 pantallas CRUD)** | **~80-160 horas** | **~5-10 horas** | **~90-94%** |

> Los números asumen que ya conocés la configuración de la lib. La curva de aprendizaje inicial es de ~1-2 horas.

### ¿De dónde sale el ahorro?

Construir una pantalla CRUD manualmente requiere:

| Tarea | Manual | Con Dynamic Forms Lib |
|---|---|---|
| Template HTML del formulario | ✍️ Escribir ~100-200 líneas de HTML | ✅ Nada — se genera del JSON |
| Template de la tabla | ✍️ Configurar AG Grid + columnas | ✅ Ya integrado en CrudManager |
| Validaciones campo por campo | ✍️ Cada input con su validator | ✅ Se declaran en el JSON |
| Lógica de crear/editar/eliminar | ✍️ HTTP calls, estados, dialogo de confirmación | ✅ Ya integrado |
| Dependencias en cascada | ✍️ Subscriptions, filtros, limpieza de campos | ✅ Se declara con `dependsOn` |
| Tematización | ✍️ Configurar Material + AG Grid + modo oscuro | ✅ ThemeService con 12 paletas |
| Exportación a Excel | ✍️ Configurar exceljs desde cero | ✅ Ya integrado |
| **Total** | **~4-16 horas por pantalla** | **~15-60 minutos** |

---

## 📦 ¿Qué incluye este repo?

- **`projects/dynamic-forms-lib/`** → La librería publicable en npm
- **`src/`** → Demo app funcional con ejemplos reales

### Features de la lib

| Feature | Estado |
|---|---|
| 18 tipos de campo (text, number, select, autocomplete, date, file, checkbox-multiple, etc.) | ✅ Estable |
| Layouts: tabs, steps, accordion, simple | ✅ Estable |
| CRUD completo (crear/editar/ver/eliminar) | ✅ Estable |
| AG Grid con acciones por fila | ✅ Estable |
| Dependencias en cascada (locales y desde API) | ✅ Estable |
| ThemeService: 12 paletas + light/dark/system + 4 AG Grid themes | ✅ Estable |
| Exportación a Excel con estilos (exceljs) | ✅ Estable |
| Mapeo one-to-many en options dinámicas | ✅ Estable |
| File upload (multipart + JSON condicional) | ✅ Estable |
| JSDoc completo en API pública | ✅ Estable |
| Custom validators | 📋 Planificado |
| Tests unitarios | 📋 Planificado |
| Internacionalización (inglés) | 📋 Planificado |

---

## 🚀 Quick Start — Demo App

```bash
git clone https://github.com/JOMAVARGAS01/dynamic-forms-lib.git
cd dynamic-forms-lib
npm install
ng serve
# Abrí http://localhost:4200
```

La demo incluye:

| Página | Muestra |
|---|---|
| **Welcome** | Overview y navegación |
| **Personas** | CRUD completo con selects dependientes (país → moneda), autocomplete, checkbox-multiple |
| **Vehículos** | Formulario con tabs, file upload, switch |
| **Pokémon** | Select dinámico desde API externa |
| **Star Wars** | Autocomplete + búsqueda desde API externa |

---

## 📖 Documentación de la Librería

Toda la documentación de la API, configuración y roadmap está en:

➡️ **[projects/dynamic-forms-lib/README.md](./projects/dynamic-forms-lib/README.md)**

Incluye:
- Instalación
- Configuración de FormConfig completa (todos los field types, layouts, validaciones)
- Guía de layouts (tabs, steps, accordion)
- Sistema de theming
- API endpoints dinámicos
- Roadmap

---

## 🏗️ Estructura del Proyecto

```
dynamic-forms-lib/
├── src/                          # Demo app
│   └── app/
│       ├── pages/                # Cada página es un ejemplo CRUD
│       │   ├── personas-page/    # CRUD completo + dependencias
│       │   ├── vehicles-page/    # Tabs + file upload
│       │   ├── pokemon-page/     # API externa
│       │   ├── star-wars-page/   # Autocomplete externo
│       │   └── welcome-page/     # Landing de la demo
│       ├── components/           # Componentes compartidos de la demo
│       └── services/             # Servicios compartidos de la demo
├── projects/
│   └── dynamic-forms-lib/        # ⭐ La librería
│       ├── src/lib/
│       │   ├── components/       # CrudManager, Forms, Field
│       │   ├── services/         # DynamicOptions, Theme
│       │   └── types/            # FormConfig, FieldConfig, etc.
│       ├── README.md             # Docs de la lib
│       ├── CHANGELOG.md          # Historial de versiones
│       ├── CONTRIBUTING.md       # Guía para contribuir
│       └── CODE_OF_CONDUCT.md    # Código de conducta
├── angular.json
├── package.json
└── README.md                     # Este archivo
```

---

## 🔧 Próximos pasos

1. **Traducción** de mensajes hardcodeados al inglés
2. **Custom validators** configurables desde FieldConfig
3. **Tests** unitarios con cubrimiento decente
4. **Publicación npm** como `@dmdintersoft/dynamic-forms-lib`

---

## 📄 Licencia

MIT © [José Manuel Vargas](https://github.com/JOMAVARGAS01) — DmdIntersoft

---

**¿Te sirve la lib? Dejá una ⭐ en [GitHub](https://github.com/JOMAVARGAS01/dynamic-forms-lib) y ayudá a que crezca.**
