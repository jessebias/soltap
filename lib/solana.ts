import {
    clusterApiUrl,
    Connection,
    Keypair,
    PublicKey
} from '@solana/web3.js';
import { Buffer } from 'buffer';
import * as Linking from 'expo-linking';

// Ensure globally available for web3.js
global.Buffer = global.Buffer || Buffer;

// Use custom RPC if available, otherwise fallback to public (flakey)
const NETWORK = process.env.EXPO_PUBLIC_RPC_URL || clusterApiUrl('mainnet-beta');
console.log("⚡️ Solana Connection URL:", NETWORK); // Log the full URL
const CONNECTION = new Connection(NETWORK, 'confirmed');

// The "House" wallet that collects transaction fees
const HOUSE_ADDRESS = process.env.EXPO_PUBLIC_HOUSE_ADDRESS!;

if (!HOUSE_ADDRESS) {
    throw new Error("Missing EXPO_PUBLIC_HOUSE_ADDRESS in .env");
}

export interface PaymentResult {
    signature: string;
    verified: boolean;
    wallet: string;
}

export const requestPayment = async (): Promise<PaymentResult> => {
    try {
        // Generate a unique reference key to track this specific transaction
        const reference = Keypair.generate();
        const referencePubkey = reference.publicKey;

        // Construct the Solana Pay URL
        const amount = 0.001;
        const url = new URL(`solana:${HOUSE_ADDRESS}`);
        url.searchParams.append("amount", amount.toString());
        url.searchParams.append("reference", referencePubkey.toBase58());

        // Check if a wallet app is installed
        const supported = await Linking.canOpenURL(url.toString());

        if (!supported) {
            console.error("No Solana wallet found");
            throw new Error("No Solana wallet found. Please install Phantom or Solflare.");
        }

        // Open the wallet to sign the transaction
        await Linking.openURL(url.toString());

        console.log(`Watching for reference: ${referencePubkey.toBase58()}`);

        // Poll the blockchain for a transaction matching our reference
        const result = await waitForConfirmation(referencePubkey);

        return result;

    } catch (e: any) {
        console.error("Payment Error:", e);
        if (e.message === 'Network request failed') {
            console.error("Network Error Details:", e.cause);
        }
        throw e;
    }
};

const waitForConfirmation = async (reference: PublicKey): Promise<PaymentResult> => {
    let attempts = 0;
    const maxAttempts = 120; // Increased to 2 minutes for public RPC delays

    while (attempts < maxAttempts) {
        attempts++;
        try {
            // Check for signatures matching the reference key
            const signatures = await CONNECTION.getSignaturesForAddress(reference, { limit: 1 });

            if (signatures.length > 0) {
                const sigInfo = signatures[0];
                if (sigInfo.err) {
                    throw new Error("Transaction failed on chain.");
                }

                // Extract the sender address from the transaction
                const tx = await CONNECTION.getParsedTransaction(sigInfo.signature, {
                    maxSupportedTransactionVersion: 0
                });

                if (tx && tx.transaction && tx.transaction.message && tx.transaction.message.accountKeys) {
                    const sender = tx.transaction.message.accountKeys[0].pubkey.toBase58();
                    return {
                        signature: sigInfo.signature,
                        verified: true,
                        wallet: sender
                    };
                }

                throw new Error("Transaction found but could not parse sender.");
            }
        } catch (e) {
            console.warn("Polling error:", e);
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error("Payment timed out. Did you confirm the transaction?");
};
