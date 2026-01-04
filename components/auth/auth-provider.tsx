import { AppConfig } from '@/constants/app-config'
import { supabase } from '@/lib/supabase'
import { PublicKey } from '@solana/web3.js'
import { useMutation } from '@tanstack/react-query'
import { Account, useMobileWallet } from '@wallet-ui/react-native-web3js'
import { Buffer } from 'buffer'
import { createContext, type PropsWithChildren, use, useEffect, useMemo, useState } from 'react'
import { Alert } from 'react-native'

export interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: any | null
  supabaseUser: any | null // Added
  walletAddress: string | null
  signIn: () => Promise<Account>
  signOut: () => Promise<void>
}

const Context = createContext<AuthState>({} as AuthState)

export function useAuth() {
  const value = use(Context)
  if (!value) {
    throw new Error('useAuth must be wrapped in a <AuthProvider />')
  }

  return value
}

function useSignInMutation() {
  const { signIn } = useMobileWallet()

  return useMutation({
    mutationFn: async () =>
      await signIn({
        uri: AppConfig.uri,
      }),
  })
}

export function AuthProvider({ children }: PropsWithChildren) {
  const { accounts, disconnect, signMessage, isLoading: isWalletLoading } = useMobileWallet()
  const signInMutation = useSignInMutation()
  const [supabaseUser, setSupabaseUser] = useState<any | null>(null) // State for user

  // Helper to ensure Base58 address
  const getBase58Address = (addr: string | undefined): string | null => {
    if (!addr) return null;
    try {
      // MWA usually returns Base64. Try to parse as Base64 first.
      const buffer = Buffer.from(addr, 'base64');
      if (buffer.length === 32) {
        return new PublicKey(buffer).toBase58();
      }
      // If length isn't 32 bytes, maybe it was already Base58 or invalid
      return new PublicKey(addr).toBase58();
    } catch (e) {
      console.warn("Address conversion failed, using raw:", addr);
      return addr;
    }
  };

  const currentAddress = useMemo(() => getBase58Address(accounts?.[0]?.address), [accounts]);

  // Sync Supabase Auth State
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSupabaseUser(session?.user ?? null);
    });

    // Initial fetch
    supabase.auth.getUser().then(({ data }) => {
      setSupabaseUser(data.user);
    });

    return () => subscription.unsubscribe();
  }, []);


  // Handle Sign In with Solana (SIWS)
  const handleSignIn = async () => {
    // 1. reuse or create connection
    let account = accounts?.[0];
    if (!account) {
      account = await signInMutation.mutateAsync();
    }

    if (account && account.address) {
      try {
        // 2. Sign auth message
        const message = `Login to SolTap: ${Date.now()}`;
        const encodedMessage = new TextEncoder().encode(message);
        const signedMessage = await signMessage(encodedMessage);

        const signatureBase64 = btoa(String.fromCharCode(...signedMessage));

        // Ensure proper address format for backend verification
        const finalAddress = getBase58Address(account.address) || account.address;

        const { data: session, error } = await supabase.functions.invoke('auth-login', {
          body: {
            address: finalAddress,
            message: message,
            signature: signatureBase64
          }
        });

        if (session && session.user) {
          await supabase.auth.setSession(session);
        }

      } catch (e: any) {
        console.error("SIWS Process Error", e);
        Alert.alert("Login Failed", e.message || JSON.stringify(e));
      }
    }
    return account;
  };

  const value: AuthState = useMemo(
    () => ({
      signIn: handleSignIn,
      signOut: async () => {
        await supabase.auth.signOut();
        await disconnect();
        setSupabaseUser(null);
      },
      isAuthenticated: (accounts?.length ?? 0) > 0 && !!supabaseUser,
      isLoading: signInMutation.isPending || isWalletLoading,
      user: accounts?.[0] ?? null,
      supabaseUser,
      walletAddress: currentAddress
    }),
    [accounts, disconnect, signInMutation, isWalletLoading, currentAddress, supabaseUser],
  )

  return <Context value={value}>{children}</Context>
}
