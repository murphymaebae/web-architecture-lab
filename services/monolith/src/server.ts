// THE MONOLITH (single-process topology).
//
// Exactly the same business modules as the microservices, loaded into ONE
// process with ONE combined schema on port 4000. Clients can't tell the
// difference: same URL, same queries, same answers.
//
// What changes is how the modules talk to each other:
//   - Orders gets products and users by calling the other modules' code
//     directly (a function call, microseconds), instead of returning a
//     reference for a gateway to resolve over the network.
//   - Reserving stock is a function call, not an HTTP request. In a real
//     monolith it could also share one database transaction with the order,
//     which microservices cannot do (they need patterns like "sagas").
//
// Many enterprises run a "modular monolith" like this: clear module
// boundaries inside one deployable. Splitting into microservices later is
// much easier when the boundaries already exist.

import { accountsModule, accountsRepository } from "@lab/accounts-service/module";
import { catalogModule, catalogRepository } from "@lab/catalog-service/module";
import { contentModule } from "@lab/content-service/module";
import { ordersModule } from "@lab/orders-service/module";
import { portFromEnv, startService, type EntityRefs, type InventoryPort } from "@lab/service-kit";

const inProcessRefs: EntityRefs = {
  async product(id) {
    const product = await catalogRepository.byId(id);
    if (!product) throw new Error(`Unknown product ${id}`);
    return product;
  },
  async user(id) {
    const user = await accountsRepository.byId(id);
    if (!user) throw new Error(`Unknown user ${id}`);
    return user;
  },
};

const inProcessInventory: InventoryPort = {
  reserve: (productId, quantity) => catalogRepository.reserve(productId, quantity),
};

await startService({
  name: "monolith",
  port: portFromEnv("GATEWAY_PORT", 4000),
  // Note: no ordersFederationStubs. The real User and Product types are here.
  modules: [catalogModule, accountsModule, ordersModule, contentModule],
  topology: "monolith",
  refs: inProcessRefs,
  inventory: inProcessInventory,
});
