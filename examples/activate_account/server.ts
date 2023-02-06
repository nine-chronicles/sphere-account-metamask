import { serve } from "aleph/react-server";
import unocss from "./unocss.config.ts";

serve({
  ssr: true,
  unocss,
});
