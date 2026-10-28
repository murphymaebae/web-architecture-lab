// Runs the catalog subgraph on its own (microservices topology).
import { noInventory, portFromEnv, remoteRefs, startService } from "@lab/service-kit";
import { catalogModule } from "./module";

await startService({
  name: "catalog",
  port: portFromEnv("CATALOG_PORT", 4001),
  modules: [catalogModule],
  topology: "microservices",
  refs: remoteRefs,
  inventory: noInventory,
});
