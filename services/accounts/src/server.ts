// Runs the accounts subgraph on its own (microservices topology).
import { noInventory, portFromEnv, remoteRefs, startService } from "@lab/service-kit";
import { accountsModule } from "./module";

await startService({
  name: "accounts",
  port: portFromEnv("ACCOUNTS_PORT", 4002),
  modules: [accountsModule],
  topology: "microservices",
  refs: remoteRefs,
  inventory: noInventory,
});
