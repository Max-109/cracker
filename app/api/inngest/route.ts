import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { generateInBackground } from "@/lib/inngest/functions";

// Serve the Inngest API - this handles all Inngest communication
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [generateInBackground],
});
