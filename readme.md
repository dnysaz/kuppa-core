
# Kuppa.Js

**Kuppa.Js** (The minimalist javascript supabase framework) is a high-performance, minimalist web framework built on top of Node.js and Express. It is designed with a clean MVC architecture and deep integration with Supabase for rapid backend development.

## Key Features

-   **Ultra Fast Rendering**: Optimized middleware with Local JWT Decoding for `0.00x s` response times.
    
-   **Serious MVC Architecture**: Clear separation between Models, Views, and Controllers.
    
-   **BaseModel Eloquent-ish**: Simplified database interaction with Supabase.
    
-   **Hybrid Authentication**:
    
    -   **Global State**: Instant user data for UI (Navbar) via Local JWT.
        
    -   **Controller State**: Secure server-side verification for protected routes.
        
-   **Tailwind CSS Ready**: Built-in support for modern, utility-first UI design.
    
-   **LiveReload**: Automatic browser refreshing during development.
    

## Directory Structure

```
.
├── app/
│   ├── Controllers/    # Business logic
│   ├── Middleware/     # Auth & Exception filters
│   └── Models/         # Database interaction
├── core/
│   ├── app/            # Framework engine (Server.js)
│   └── config/         # Database configuration
│   └── model/          # Base Model configuration
├── public/             # Static assets (CSS, JS, Images)
├── routes/             # Routing definitions
└── views/              # Handlebars templates
| kuppa
| server.js

```

## Getting Started

### 1. Installation

```
npm install

```

### 2. Environment Setup

Create a `.env` file in the root directory:

```
APP_NAME=Kuppa.Js
APP_VERSION=0.5.0
APP_DEBUG=true

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

```

### 3. Running the Server

```
# Development mode
npm run dev

# Production mode
npm start
```