# 02 · Backend and GraphQL: microservices, a monolith, and one API

**Goal:** see how a backend is split into business areas, how GraphQL gives
apps one API over many services, and what really changes between a monolith
and microservices. Code lives in `services/`.

## Run it three ways

| Command (from repo root) | What starts | Website reads data from |
| --- | --- | --- |
| `npm run dev` | Monolith on :4000 + website on :3000 | GraphQL (monolith) |
| `npm run dev:micro` | Services (:4001-4005) + gateway (:4000) + website | GraphQL (gateway) |
| `npm run dev:web` | Website only | In-repo sample data |

Then open http://localhost:3000/architecture to see which topology is running,
and http://localhost:4000 for **Apollo Sandbox**, an interactive GraphQL
playground with autocomplete and schema docs.

With Docker installed you can also run the microservices in containers:

```bash
docker compose up --build      # backend services + gateway in containers
npm run dev:micro -w web       # website on your machine, pointed at them
```

## The business areas ("bounded contexts")

| Service | Owns | Key types |
| --- | --- | --- |
| `catalog` | Products, prices, stock | `Product`, `reserveStock` |
| `accounts` | Customers and their segment | `User`, `me` |
| `orders` | Orders and what was paid | `Order`, `placeOrder`, adds `User.orders` |
| `content` | CMS pages and articles | `Page`, `Block` (interface), `Article` |

Each service owns its data. Nobody else reads the catalog's products
directly; they ask the catalog. That rule ("database per service") is what
lets teams change their service without breaking others.

## GraphQL in five minutes

GraphQL is a query language for APIs. Instead of many REST endpoints
(`/users/1`, `/users/1/orders`, `/products/7`...), there is one endpoint and the
client describes the exact shape it wants:

```graphql
query AccountPage {
  me {
    name
    orders {
      total
      lines { quantity product { name emoji } }
    }
  }
}
```

The answer has exactly that shape, nothing more. Key ideas:

- **Schema** (`typeDefs`): the menu of types and fields. See any `module.ts`.
- **Resolvers**: the functions that fetch each field's data.
- **Query** reads, **Mutation** writes (`placeOrder`).
- **Interfaces/unions** let one field return different shapes (CMS blocks).
- **Variables** keep queries reusable: `query Product($slug: String!) { ... }`.

Why enterprises like it: one round trip per screen, no over-fetching (great
for mobile), a typed contract that tooling understands, and a single API over
many backends.

## Federation: one graph, many services

Each service publishes a *subgraph*. The **gateway** combines them into one
*supergraph* and plans each query across services:

1. `me { name }` → ask **accounts**.
2. `orders` is a field `orders` adds to `User` → ask **orders** for that user.
3. `product { name }` on each order line → ask **catalog** for those products.

The glue is the **entity**: `type Product @key(fields: "id")` says "any service
can point at a Product by id". `orders` stores only `productId`, returns
`{ __typename: "Product", id }`, and the gateway asks catalog's
`__resolveReference` for the rest.

Watch it happen: run `npm run dev:micro`, open the Account page, and read the
terminal. You'll see lines like:

```
[accounts] AccountPage__accounts__0 33ms
[orders]   AccountPage__orders__1 41ms
[catalog]  AccountPage__catalog__2 40ms
```

That is one browser request turning into a three-step query plan.

> In production, the gateway is usually the **Apollo Router** (or Cosmo,
> Hive Gateway, Grafbase...) with the supergraph schema composed in CI, so a
> breaking schema change fails the build instead of production.

## Monolith vs microservices: same code, different wiring

`services/monolith/src/server.ts` loads **the same four modules** into one
process. Clients can't tell the difference. What changes is how modules reach
each other, which the code expresses as two small interfaces in
`services/kit/src/index.ts`:

| | Monolith | Microservices |
| --- | --- | --- |
| `refs.product(id)` | Calls `catalogRepository.byId(id)` in-process | Returns `{ __typename, id }`; the gateway fetches it over HTTP |
| `inventory.reserve(...)` | Calls `catalogRepository.reserve(...)` | HTTP POST to the catalog service (`services/orders/src/server.ts`) |

This is the **ports and adapters** (hexagonal) pattern: business code depends
on a small interface (a port), and the deployment picks the implementation (an
adapter). It's what makes a "modular monolith" easy to split later.

### Things a real system would add

- **Transactions:** placing an order reserves stock (catalog) then saves the
  order (orders). If saving fails after reserving, the stock is lost. A
  monolith can wrap both in one database transaction. Microservices need a
  *saga*: a sequence of steps with compensating actions ("release stock"),
  usually driven by events.
- **Events:** services announcing what happened (`OrderPlaced`) on a message
  broker (Kafka, RabbitMQ, AWS SNS/SQS, Azure Service Bus). Step 3 introduces
  events with the journey service.
- **Auth:** here the website passes `x-user-id`. Real systems pass a signed
  token (JWT) that the gateway verifies.
- **Observability:** distributed tracing (OpenTelemetry) to follow one request
  across services, instead of reading logs side by side.

## How the website changed

- `apps/web/src/lib/data-source.ts` decides between local data and GraphQL.
- `lib/catalog.ts` and `lib/cms.ts` call GraphQL when it's on. Pages didn't
  change at all.
- `lib/content-graphql.ts` is a second CMS adapter that reads content through
  GraphQL, using fragments (`... on HeroBlock { heading }`) for each block type.
- New pages: **Account** (one federated query) and **Architecture** (live
  service check and trade-offs).
- **Buy now** on product pages runs a Server Action → GraphQL mutation →
  orders → catalog. Stock updates live.

## Things to try

1. In Apollo Sandbox (http://localhost:4000), run the Account page query. Add
   `x-user-id: u1` under Headers.
2. Stop just the catalog service while `dev:micro` runs (or
   `docker compose stop catalog`). Load the Account page: what happens to the
   order lines? Then the products page. This is a partial outage.
3. Add a `rating: Float` field to `Product` in `services/catalog/src/module.ts`.
   The gateway picks it up within 5 seconds. Query it from Sandbox.
4. Add a `wishlist` service that extends `User` with `wishlist: [Product!]!`,
   following `orders` as a template, and add it to the gateway's list.
