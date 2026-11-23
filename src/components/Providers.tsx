"use client";

// Wallet (Solana wallet adapter, devnet) -> arena chain context -> profile
// customisation. Wallets are discovered through the Wallet Standard (Phantom,
// Solflare, Backpack...), so no adapter list is needed.
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import type { ReactNode } from "react";
import { ArenaProvider } from "@/lib/chain/ArenaProvider";
import { BASE_RPC } from "@/lib/chain/constants";
import { ProfileProvider } from "@/lib/store";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={BASE_RPC}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>
          <ArenaProvider>
            <ProfileProvider>{children}</ProfileProvider>
          </ArenaProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
