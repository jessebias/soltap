import { decode as decodeBase58 } from "https://deno.land/std@0.168.0/encoding/base58.ts";
import { decode as decodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";
import nacl from "https://esm.sh/tweetnacl@1.0.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { address, message, signature } = await req.json();

        if (!address || !message || !signature) {
            throw new Error("Missing address, message, or signature");
        }

        // 1. Verify Signature (SIWS)
        const messageBytes = new TextEncoder().encode(message);
        const signatureBytes = decodeBase64(signature);
        const publicKeyBytes = decodeBase58(address);

        const verified = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKeyBytes
        );

        if (!verified) {
            return new Response(JSON.stringify({ error: "Invalid signature" }), {
                status: 401,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        // 2. Initialize Admin Client
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // 3. Find or Create User
        // Strategy: Link 1 user to 1 wallet.
        // We first search for ANY existing user with this wallet address (metadata).
        // If found, we migrate them to the standard email/password format and log them in.
        // If not found, we create a new user.

        const fakeEmail = `${address}@soltap.app`;
        const deterministicPassword = `Pwd_${address}_${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.substring(0, 5)}`;

        let userId: string | null = null;

        // A. Search for existing user by wallet address
        const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers();

        let existingUser = null;
        if (listData?.users) {
            existingUser = listData.users.find(u =>
                u.user_metadata?.wallet_address === address ||
                u.email === fakeEmail ||
                // Legacy check for old domain format if needed, though wallet_address check covers it
                u.email?.includes(address.toLowerCase())
            );
        }

        if (existingUser) {
            // Found an existing user! Migrate/Update them to ensure credentials work.
            console.log(`Found existing user ${existingUser.id}, updating credentials...`);
            const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
                existingUser.id,
                {
                    email: fakeEmail,
                    password: deterministicPassword,
                    user_metadata: { ...existingUser.user_metadata, wallet_address: address },
                    email_confirm: true
                }
            );

            if (updateError) {
                console.error("Failed to update existing user:", updateError);
                // If update fails, we might fall back to creating, but that would duplicate.
                // Try logging in anyway? Password might match if not changed.
            }
            userId = existingUser.id;
        } else {
            // Create new user
            console.log(`Creating new user for ${address}...`);
            const { data: createdUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email: fakeEmail,
                email_confirm: true,
                user_metadata: { wallet_address: address },
                password: deterministicPassword
            });

            if (createdUser?.user) {
                userId = createdUser.user.id;
            } else if (createError?.message?.includes("already registered")) {
                // Should have been caught by search, but safety net:
                // Try to sign in.
            } else {
                console.error("Failed to create user:", createError);
                throw new Error("Failed to create user account");
            }
        }

        if (!userId && !existingUser) {
            // Fallback attempt to sign in directly if create failed due to existence but list failed (rare)
        }

        // 4. Generate Session
        const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.signInWithPassword({
            email: fakeEmail,
            password: deterministicPassword
        });

        if (sessionError || !sessionData.session) {
            throw new Error("Failed to create session: " + sessionError?.message);
        }

        return new Response(
            JSON.stringify(sessionData.session),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
