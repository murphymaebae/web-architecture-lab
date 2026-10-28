// Runs the content subgraph on its own (microservices topology).
import { noInventory, portFromEnv, remoteRefs, startService } from "@lab/service-kit";
import { contentModule } from "./module";

await startService({
  name: "content",
  port: portFromEnv("CONTENT_PORT", 4004),
  modules: [contentModule],
  topology: "microservices",
  refs: remoteRefs,
  inventory: noInventory,
});
