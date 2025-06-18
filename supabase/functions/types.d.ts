// Type declarations for Supabase Edge Functions (Deno environment)

// Deno runtime globals
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

// Module declarations for remote imports
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(handler: (request: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export function createClient(url: string, key: string): any;
}

declare module "https://deno.land/x/xhr@0.1.0/mod.ts" {
  // XHR polyfill module
}

// Response and Request types are available in Deno runtime
