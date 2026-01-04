import { decode as decodeBase58 } from "https://deno.land/std@0.168.0/encoding/base58.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createAssociatedTokenAccountInstruction, createTransferInstruction, getAccount, getAssociatedTokenAddress } from "https://esm.sh/@solana/spl-token@0.3.7";
import { Connection, Keypair, PublicKey, Transaction } from "https://esm.sh/@solana/web3.js@1.73.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to load treasury keypair from safe storage
function getTreasuryKeypair(secretKeyId: string): Keypair {
    const secret = Deno.env.get(secretKeyId);
    if (!secret) throw new Error(`Missing treasury secret for ${secretKeyId}`);
    return Keypair.fromSecretKey(decodeBase58(secret));
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Verify Authentication
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            // Support both new and legacy key names
            Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
        );

        const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

        if (!user) {
            throw new Error(`Unauthorized: ${userError?.message || "Invalid Token"}`);
        }

        // Admin Client for database operations
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        const { reward_id } = await req.json();

        // Fetch and validate reward eligibility
        const { data: reward, error: rewardError } = await supabaseAdmin
            .from('user_rewards')
            .select(`
                id, 
                wallet_address, 
                amount, 
                claimed, 
                reward_token_id,
                seasons (claims_enabled),
                reward_tokens (mint_address, decimals, treasury_secret_id)
            `)
            .eq('id', reward_id)
            .eq('user_id', user.id)
            .single();

        if (rewardError || !reward) {
            throw new Error("Reward not found or access denied");
        }

        if (reward.claimed) {
            throw new Error("Reward already claimed");
        }

        if (reward.seasons.claims_enabled === false) {
            throw new Error("Claims are currently disabled for this season");
        }

        // Initialize Solana Connection
        const rpcUrl = Deno.env.get("RPC_URL");
        if (!rpcUrl) {
            throw new Error("Server configuration error: RPC_URL missing");
        }

        const connection = new Connection(rpcUrl);
        const treasuryKeypair = getTreasuryKeypair(reward.reward_tokens.treasury_secret_id);
        const mint = new PublicKey(reward.reward_tokens.mint_address);
        const recipient = new PublicKey(reward.wallet_address);
        const amount = BigInt(reward.amount);

        // Derive Associated Token Accounts
        const sourceATA = await getAssociatedTokenAddress(mint, treasuryKeypair.publicKey);
        const destATA = await getAssociatedTokenAddress(mint, recipient);

        // Verify Treasury Sol Balance for Fees
        const balance = await connection.getBalance(treasuryKeypair.publicKey);
        const MIN_BALANCE_LAMPORTS = 3000000; // ~0.003 SOL for rent + fees
        if (balance < MIN_BALANCE_LAMPORTS) {
            throw new Error(`Treasury Insufficient SOL: Has ${balance / 1e9} SOL`);
        }

        const tx = new Transaction();

        // Create recipient ATA if needed
        try {
            await getAccount(connection, destATA);
        } catch (e: any) {
            tx.add(
                createAssociatedTokenAccountInstruction(
                    treasuryKeypair.publicKey,
                    destATA,
                    recipient,
                    mint
                )
            );
        }

        // Add Transfer Instruction
        tx.add(
            createTransferInstruction(
                sourceATA,
                destATA,
                treasuryKeypair.publicKey,
                amount
            )
        );

        // Sign and Send Transaction
        const signature = await connection.sendTransaction(tx, [treasuryKeypair]);
        console.log("Transaction sent:", signature);

        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'processed');

        if (confirmation.value.err) {
            console.error("Transaction confirmation error:", confirmation.value.err);
            throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        // Mark reward as claimed in database
        const { error: updateError } = await supabaseAdmin
            .from('user_rewards')
            .update({
                claimed: true,
                claimed_at: new Date().toISOString(),
                tx_hash: signature
            })
            .eq('id', reward_id);

        if (updateError) {
            console.error("CRITICAL: Reward claimed on-chain but DB failed update", signature, updateError);
        }

        return new Response(
            JSON.stringify({ success: true, tx: signature }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error("Handler error:", error);
        return new Response(JSON.stringify({ error: error.message || "Unknown error", details: error.toString() }), {
            status: 200, // Return 200 so client gets the JSON body
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
