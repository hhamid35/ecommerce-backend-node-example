# Ecommerce Backend API

A production-ready **Node.js + Express + MongoDB (Mongoose)** REST API for an ecommerce
platform. It powers the companion
[ecommerce React Native app](../ecommerce-react-native-example) and ships with
interactive **OpenAPI / Swagger** documentation and a **Docker** setup.

## Features

- Layered architecture: `config` / `models` / `controllers` / `routes` / `middleware` / `utils`
- JWT authentication via the `x-auth-token` header, with `USER` / `ADMIN` roles
- Products, categories, orders, wishlist, cart, admin dashboard, and image uploads
- Centralized configuration with **dotenv** and startup validation
- Security & DX middleware: **helmet**, **cors**, **morgan** logging, and **rate limiting**
- Consistent error handling and a `/health` probe
- Interactive API docs served with **Swagger UI** at `/api-docs`
- Containerized with a multi-stage **Dockerfile** (non-root user + healthcheck) and **docker-compose**

## Project structure

```
src/
├── app.js                 # Express app assembly (middleware, docs, routes)
├── server.js              # Bootstrap: config validation, DB connect, graceful shutdown
├── config/
│   ├── env.js             # Loads .env, validates required vars, exposes `config`
│   └── database.js        # Mongoose connection lifecycle
├── controllers/           # Request handlers (auth, product, category, order, ...)
├── docs/openapi.js        # OpenAPI 3.0 specification
├── middleware/            # auth, error, upload
├── models/                # Mongoose schemas (user, product, category, order)
├── routes/                # Express routers, mounted flat at "/"
└── utils/                 # logger, asyncHandler, ApiError
```

## Prerequisites

- Node.js **>= 18**
- A MongoDB database (MongoDB Atlas or a local instance)

## Getting started (local)

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your `.env` from the template and fill in the values:

   ```bash
   cp .env.example .env
   ```

   | Variable           | Required | Default          | Description                                    |
   | ------------------ | :------: | ---------------- | ---------------------------------------------- |
   | `PORT`             |    no    | `3002`           | Port the server listens on                     |
   | `NODE_ENV`         |    no    | `development`    | `development` \| `production` \| `test`        |
   | `DB_CON_STRING`    |  **yes** | –                | MongoDB connection string                      |
   | `TOKEN_KEY`        |  **yes** | –                | Secret used to sign JWTs                        |
   | `TOKEN_EXPIRES_IN` |    no    | `10h`            | JWT lifetime                                   |
   | `CORS_ORIGIN`      |    no    | `*`              | `*` or a comma-separated list of origins       |
   | `UPLOAD_DIR`       |    no    | `public/uploads` | Where uploaded images are stored               |
   | `MAX_UPLOAD_BYTES` |    no    | `15728640`       | Max upload size in bytes (15 MB)               |
   | `RATE_LIMIT_MAX`   |    no    | `1000`           | Max requests / IP / 15 min window              |

3. Run the server:

   ```bash
   npm run dev     # with auto-reload (nodemon)
   # or
   npm start       # production mode
   ```

4. Open the interactive docs at **http://localhost:3002/api-docs**.

## API documentation

- Swagger UI: `GET /api-docs`
- Raw OpenAPI spec (JSON): `GET /api-docs.json`
- Health check: `GET /health`

### Authentication

Obtain a JWT from `POST /login`, then send it on protected requests using the
**`x-auth-token`** header:

```
x-auth-token: <your-jwt>
```

Admin-only routes additionally require the user's `userType` to be `ADMIN`.

### Endpoint overview

| Method | Path                     | Auth  | Description                    |
| ------ | ------------------------ | ----- | ------------------------------ |
| POST   | `/register`              | –     | Register a user                |
| POST   | `/login`                 | –     | Log in, returns a JWT          |
| POST   | `/reset-password?id=`    | –     | Reset a password               |
| GET    | `/user?id=`              | –     | Get a user                     |
| POST   | `/update-user?id=`       | –     | Update a user                  |
| GET    | `/delete-user?id=`       | –     | Delete a user                  |
| GET    | `/products?search=`      | –     | List products                  |
| POST   | `/product`               | Admin | Create a product               |
| POST   | `/update-product?id=`    | Admin | Update a product               |
| GET    | `/delete-product?id=`    | Admin | Delete a product               |
| GET    | `/categories`            | –     | List categories                |
| POST   | `/category`              | Admin | Create a category              |
| POST   | `/update-category?id=`   | Admin | Update a category              |
| GET    | `/delete-category?id=`   | Admin | Delete a category              |
| POST   | `/checkout`              | User  | Create an order                |
| GET    | `/orders`                | User  | List the user's orders         |
| POST   | `/add-to-wishlist`       | User  | Add to wishlist                |
| GET    | `/wishlist`              | User  | Get wishlist                   |
| GET    | `/remove-from-wishlist?id=` | User | Remove from wishlist         |
| GET    | `/dashboard`             | Admin | Dashboard counts               |
| GET    | `/admin/orders`          | Admin | List all orders                |
| GET    | `/admin/order-status?orderId=&status=` | Admin | Update order status |
| GET    | `/admin/users`           | Admin | List all users                 |
| POST   | `/photos/upload`         | –     | Upload an image (`photos` field) |
| GET    | `/uploads/:filename`     | –     | Serve an uploaded image        |

> The URL contract (including GET-based deletes and `x-auth-token` auth) is kept
> stable for backward compatibility with the React Native client. See the
> [Mobile app integration](#mobile-app-integration) section.

## Docker

### With docker-compose (API + MongoDB)

```bash
docker compose up --build
```

This starts the API and a local MongoDB, wiring `DB_CON_STRING` to the bundled
`mongo` service automatically. Values from your `.env` override the defaults.

### Standalone image

```bash
# Build
docker build -t ecommerce-backend .

# Run (pass configuration at runtime; never bake secrets into the image)
docker run --rm -p 3002:3002 \
  -e DB_CON_STRING="your-mongodb-uri" \
  -e TOKEN_KEY="your-jwt-secret" \
  ecommerce-backend
```

The image runs as a non-root user and defines a `HEALTHCHECK` hitting `/health`.

## Mobile app integration

This backend is consumed by
[`ecommerce-react-native-example`](../ecommerce-react-native-example). The app
reads its API base URL from the `EXPO_PUBLIC_API_URL` environment variable
(falling back to `http://10.0.2.2:3002` for the Android emulator).

To point the app at this backend during local development, set the base URL to
match the port this server runs on. For example, if the API runs on port `3002`:

```bash
# in the React Native project
EXPO_PUBLIC_API_URL=http://10.0.2.2:3002 npx expo start   # Android emulator
# or use your machine's LAN IP for a physical device:
EXPO_PUBLIC_API_URL=http://192.168.1.50:3002 npx expo start
```

Compatibility notes:

- The client sends its JWT in the **`x-auth-token`** header (not `Authorization`).
- On an expired token the API returns `{ err: "jwt expired" }`, which the app
  uses to trigger a logout.
- `GET /categories` returns the list under `categories` (not `data`).
- `GET /products` returns the list under `data` with the `category` populated.
- Image uploads use `multipart/form-data` with a `photos` field and respond with
  `{ image: "<filename>" }`; images are then served from `/uploads/<filename>`.

## License

ISC
