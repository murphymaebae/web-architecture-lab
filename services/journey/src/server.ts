// Runs the journey subgraph on its own (microservices topology).
import { noInventory, portFromEnv, remoteRefs, startService } from "@lab/service-kit";
import { journeyFederationStubs, journeyModule } from "./module";

await startService({
  name: "journey",
  port: portFromEnv("JOURNEY_PORT", 4005),
  modules: [journeyFederationStubs, journeyModule],
  topology: "microservices",
  refs: remoteRefs,
  inventory: noInventory,
});
