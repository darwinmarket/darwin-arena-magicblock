// A devnet-only "burner" wallet kept in localStorage, for trying the game
// without a browser extension (and for scripted browser tests). Shown in the
// wallet list as "Burner (devnet)"; fund it with `solana transfer` or a faucet.
// Never use it for anything of value: its key sits in plain localStorage.
import {
  BaseSignerWalletAdapter,
  WalletName,
  WalletReadyState,
  type TransactionOrVersionedTransaction,
} from "@solana/wallet-adapter-base";
import { Keypair, type PublicKey, type TransactionVersion, VersionedTransaction } from "@solana/web3.js";

const STORAGE = "darwin-arena:burner";

export class BurnerWalletAdapter extends BaseSignerWalletAdapter {
  name = "Burner (devnet)" as WalletName<"Burner (devnet)">;
  url = "https://docs.solana.com";
  icon =
    "data:image/svg+xml;base64," +
    (typeof btoa !== "undefined"
      ? btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#ff6a3d"/><text x="16" y="22" font-size="16" text-anchor="middle" fill="#1a0612">🔥</text></svg>')
      : "");
  readyState = WalletReadyState.Loadable;
  supportedTransactionVersions: ReadonlySet<TransactionVersion> = new Set(["legacy", 0] as TransactionVersion[]);
  private keypair: Keypair | null = null;
  connecting = false;

  get publicKey(): PublicKey | null {
    return this.keypair?.publicKey ?? null;
  }

  async connect() {
    let raw = localStorage.getItem(STORAGE);
    if (!raw) {
      raw = JSON.stringify(Array.from(Keypair.generate().secretKey));
      localStorage.setItem(STORAGE, raw);
    }
    this.keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
    this.emit("connect", this.keypair.publicKey);
  }

  async disconnect() {
    this.keypair = null;
    this.emit("disconnect");
  }

  async signTransaction<T extends TransactionOrVersionedTransaction<this["supportedTransactionVersions"]>>(tx: T): Promise<T> {
    if (!this.keypair) throw new Error("not connected");
    if (tx instanceof VersionedTransaction) tx.sign([this.keypair]);
    else tx.partialSign(this.keypair);
    return tx;
  }
}
