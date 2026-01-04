// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    // Admin Client
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    try {
        // 1. Find seasons ready to process
        // end_at < now, processed_at is null, rewards_enabled is true
        const now = new Date().toISOString();

        const { data: seasons, error: seasonsError } = await supabase
            .from('seasons')
            .select('*')
            .lt('end_at', now)
            .is('processed_at', null)
            .eq('rewards_enabled', true)
            .order('end_at', { ascending: true })
            .limit(1); // Process one at a time to avoid timeouts

        if (seasonsError) throw seasonsError;
        if (!seasons || seasons.length === 0) {
            return new Response(JSON.stringify({ message: "No seasons to process" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
        }

        const season = seasons[0];
        console.log(`Processing Season: ${season.name} (${season.id})`);

        // 1.5 Build User Map (Wallet -> UserID) to handle Anon Scores
        // Fetch all users (pagination needed for >50 users, for MVP fetching page 1)
        const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
        if (usersError) throw usersError;

        const walletToUserId = new Map<string, string>();
        users.forEach(u => {
            const addr = u.user_metadata?.address || u.user_metadata?.wallet_address;
            if (addr) walletToUserId.set(addr, u.id);
        });

        // 2. Fetch Active Campaigns & Tiers for this Season
        const { data: campaigns, error: campaignError } = await supabase
            .from('reward_campaigns')
            .select(`
            id, 
            reward_tiers (
                rank_min, 
                rank_max, 
                amount, 
                reward_tokens (id, mint_address, symbol, decimals)
            )
        `)
            .eq('season_id', season.id)
            .eq('active', true);

        if (campaignError) throw campaignError;
        if (!campaigns || campaigns.length === 0) {
            console.log("No active campaigns skipping rewards.");
            await markProcessed(supabase, season.id);
            return new Response(JSON.stringify({ message: "No campaigns" }), { headers: corsHeaders });
        }

        // 3. Fetch Leaderboard Entries (Assuming 'scores' table)
        // Filter by season time range?
        // Using filtered queries on 'scores' created_at
        const { data: entries, error: entriesError } = await supabase
            .from('scores')
            .select('wallet_address, time_ms, created_at')
            .gte('created_at', season.start_at)
            .lte('created_at', season.end_at)
            .order('time_ms', { ascending: true }) // Reaction test: Lower is better
            // TODO: Handle 'progressive_speed' mode which uses 'score' DESC
            // For now MVP supports reaction_test only or assumes best logic
            .limit(1000); // safety cap

        if (entriesError) throw entriesError;

        // 4. Calculate Winners
        // Group by wallet? Or take best score per wallet?
        // Let's implement unique wallet logic: Best score per wallet takes the rank.

        const uniqueEntries = new Map();
        for (const entry of entries) {
            // Assume wallet_address is the identity if user_id is null/missing
            // or prioritize user_id logic if we forced auth.
            // SolTap: wallet_address is key.
            const key = entry.wallet_address;
            if (!uniqueEntries.has(key)) {
                uniqueEntries.set(key, entry);
            }
            // Since sorted by time ASC, first encounter is best score.
        }
        const filteredRanked = Array.from(uniqueEntries.values()); // Order preserved? Map iter usually preserves insertion order
        // But verify:
        // filteredRanked.sort((a,b) => a.time_ms - b.time_ms);
        // Let's trust the DB sort + Map insertion order for now or re-sort.

        const rewardsToInsert: any[] = [];

        // Apply Tiers
        for (let index = 0; index < filteredRanked.length; index++) {
            const winner = filteredRanked[index];
            const rank = index + 1;

            for (const campaign of campaigns) {
                // @ts-ignore
                for (const tier of campaign.reward_tiers) {
                    if (rank >= tier.rank_min && rank <= tier.rank_max) {
                        // Winner gets this reward

                        // Resolve User ID
                        let userId = winner.user_id; // Try score first
                        if (!userId && winner.wallet_address) {
                            userId = walletToUserId.get(winner.wallet_address);
                        }

                        // Auto-provision if missing
                        if (!userId && winner.wallet_address) {
                            console.log(`Provisioning user for ${winner.wallet_address}`);
                            const fakeEmail = `${winner.wallet_address}@soltap.app`;
                            const { data: newUser } = await supabase.auth.admin.createUser({
                                email: fakeEmail,
                                email_confirm: true,
                                user_metadata: { wallet_address: winner.wallet_address },
                                password: `Pwd_${winner.wallet_address}_${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.substring(0, 5)}`
                            });
                            if (newUser && newUser.user) {
                                userId = newUser.user.id;
                                walletToUserId.set(winner.wallet_address, userId);
                            }
                        }

                        if (userId) {
                            rewardsToInsert.push({
                                user_id: userId,
                                season_id: season.id,
                                reward_token_id: tier.reward_tokens.id,
                                wallet_address: winner.wallet_address,
                                amount: tier.amount,
                                claimed: false
                            });
                        } else {
                            console.warn(`Could not resolve user_id for ${winner.wallet_address}`);
                        }
                    }
                }
            }
        }

        // Filter out missing user_ids if constraint exists
        const validRewards = rewardsToInsert.filter(r => r.user_id);

        if (rewardsToInsert.length > validRewards.length) {
            console.warn(`Skipped ${rewardsToInsert.length - validRewards.length} rewards due to missing user_id (Anon scores)`);
        }

        // 5. Insert Rewards
        if (validRewards.length > 0) {
            const { error: insertError } = await supabase
                .from('user_rewards')
                .insert(validRewards);

            if (insertError) throw insertError;
        }

        // 6. Mark Season Processed & Enable Claims
        await markProcessed(supabase, season.id);

        return new Response(
            JSON.stringify({
                success: true,
                season: season.name,
                rewards_generated: validRewards.length
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error: any) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message || "Unknown error" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

async function markProcessed(supabase: any, seasonId: string) {
    await supabase
        .from('seasons')
        .update({
            processed_at: new Date().toISOString(),
            claims_enabled: true
        })
        .eq('id', seasonId);
}
