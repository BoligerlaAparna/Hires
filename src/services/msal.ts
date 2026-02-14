import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "../authConfig";

export const msalInstance = new PublicClientApplication(msalConfig);

// Initialize the instance immediately (required for v3+)
msalInstance.initialize().catch(console.error);
