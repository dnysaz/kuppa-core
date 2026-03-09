# ☕ Kuppa.js

**High-performance, opinionated JavaScript framework.** 
*Built on top of Express.js, powered by Supabase, and rendered with Handlebars.*

---

## 🚀 Overview
**Kuppa.js** is a minimalist JavaScript framework designed for developers who crave the speed of native Node.js but miss the elegant structure of frameworks like Laravel or NestJS. It bridges the gap between raw performance and developer productivity through a strict MVC architecture and deep integration with the Supabase ecosystem.

## 🛠 The Core Stack
* **Engine**: Node.js (High-performance runtime)
* **Router**: Express.js (The industry standard)
* **Data**: Supabase (PostgreSQL with real-time capabilities)
* **View**: Handlebars (Logic-less server-side templating)

---

## ⚡ Key Features
* **Ultra Fast Rendering**: Optimized middleware with Local JWT Decoding for near-zero latency.
* **Serious MVC Architecture**: Clear separation of concerns between Models, Views, and Controllers.
* **BaseModel (Eloquent-ish)**: Simplified database interaction with a powerful Supabase wrapper.
* **Hybrid Authentication**:
    * **Global State**: Instant user data accessibility for UI (Navbar/Header) via Local JWT.
    * **Controller State**: Secure server-side verification for protected routes.
* **CLI Powered**: Built-in `kuppa` binary for rapid scaffolding, migrations, and system management.
* **Maintenance Mode**: Toggle your entire app state with Next.js-style UI using `up` and `down` commands.
* **LiveReload**: Automatic browser refreshing during development for a seamless DX.

---

## 📂 Directory Structure
Kuppa.js maintains a clean separation between your application logic and the framework's core engine:

```plaintext
.
├── App/                    # Application logic (User Domain)
│   ├── Controllers/        # Business logic & Request handling
│   ├── Middleware/         # Custom user middlewares
│   ├── Migrations/         # Custom user migrations
│   └── Models/             # Application-specific models
├── Core/                   # Kuppa Core Engine (The Framework Heart)
│   ├── App/                # Server & Express initialization
│   ├── Auth/               # Internal Authentication & JWT logic
│   ├── Cache/              # Native memory caching system
│   ├── Cli/                # CLI command templates & logic
│   ├── Config/             # System & Database configuration
│   ├── Controller/         # Base Controller classes
│   ├── Middleware/         # Core system middlewares
│   ├── Migrations/         # Database migration engine
│   ├── Model/              # Base Model (The Eloquent Wrapper)
│   ├── Utils/              # Internal helper functions
│   ├── Views/              # Core views (Maintenance, Error pages)
│   └── Autoload.js         # Core component loader
├── Public/                 # Static assets (CSS, JS, Images)
├── Routes/                 # WEB & API Route definitions
├── Views/                  # Application Handlebars templates
├── kuppa                   # Kuppa CLI Binary
└── Server.js               # Application Entry Point

```

## Getting Started

1. Scaffolding Your Project
The fastest way to start a new Kuppa.js project is using our official scaffolder:

```bash
npx create-kuppa my-kuppa

```

2. Environment Setup
Navigate to your project folder and configure your .env file:

```bash
cd my-kuppa

```

Edit the .env with your Supabase credentials:

```bash
...
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
...

```

4. CLI Commands
Kuppa.js comes with a powerful CLI to speed up your workflow:

```bash
  ██╗  ██╗██╗   ██╗██████╗ ██████╗  █████╗ 
  ██║ ██╔╝██║   ██║██╔══██╗██╔══██╗██╔══██╗
  █████╔╝ ██║   ██║██████╔╝██████╔╝███████║
  ██╔═██╗ ██║   ██║██╔═══╝ ██╔═══╝ ██╔══██║
  ██║  ██╗╚██████╔╝██║     ██║     ██║  ██║
  ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝     ╚═╝  ╚═╝
  The minimalist javascript supabase framework CLI Tool v1.0.0

  USAGE:
    kuppa [command] [options]

  CORE COMMANDS:
    run:install           Sync & install Kuppa core engine
    run:update            Update core engine to latest version
    key:generate          Generate a secure 64-char APP_KEY

  APPLICATION SETUP (Up/Down):
    up                    Take the application out of maintenance mode
    down [msg]            Put the application into maintenance mode
    route:list            List all registered WEB and API routes
    clear:cache           Flush native memory cache (auto-managed)

  GENERATORS (make):
    make:controller [N]   Create a new controller. Use --api for JSON
    make:model [N] [-m]   Create a model. Use -m to add a migration
    make:migration [N]    Create a new migration file in app/Migrations
    make:middleware [N]   Create a new middleware in app/Middleware

  DATABASE (migrate):
    migrate               Run all pending migrations to Supabase
    migrate:status        Check the status of all migrations
    migrate:rollback      Rollback the last migration batch
    migrate:fresh         Drop all tables and re-run all migrations

  UTILITIES:
    db                    Check table structures and connection
    sql                   Open interactive SQL runner

  HELP:
    help, --help          Display this help documentation

```


## Credits & Acknowledgments
Kuppa.js is built on the shoulders of giants:

- Handlebars.js: Our core templating engine by Yehuda Katz.

- Express.js: The reliable foundation for our web server.

- Supabase: For providing a world-class backend-as-a-service.


# MIT License
Copyright (c) 2026 Ketut Dana

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.