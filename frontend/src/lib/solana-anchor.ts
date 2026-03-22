import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

/** Official Memo program — stores UTF-8 memo on a signed transaction. */
const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export type SolanaCluster = "devnet" | "mainnet-beta" | "testnet";

function defaultRpcForCluster(cluster: SolanaCluster): string {
  switch (cluster) {
    case "mainnet-beta":
      return "https://api.mainnet-beta.solana.com";
    case "testnet":
      return "https://api.testnet.solana.com";
    default:
      return "https://api.devnet.solana.com";
  }
}

export function getAnchorClusterFromEnv(): SolanaCluster {
  const c = process.env.SOLANA_CLUSTER?.trim().toLowerCase();
  if (c === "mainnet" || c === "mainnet-beta") return "mainnet-beta";
  if (c === "testnet") return "testnet";
  return "devnet";
}

export function getSolanaConnection(): Connection {
  const cluster = getAnchorClusterFromEnv();
  const rpc =
    process.env.SOLANA_RPC_URL?.trim() || defaultRpcForCluster(cluster);
  return new Connection(rpc, "confirmed");
}

/**
 * Base64-encoded 64-byte secret key (standard Solana keypair export).
 */
export function loadAnchorPayerKeypair(): Keypair {
  const b64 = process.env.SOLANA_ANCHOR_SECRET_KEY?.trim();
  if (!b64) {
    throw new Error("SOLANA_ANCHOR_SECRET_KEY is not set.");
  }
  let buf: Buffer;
  try {
    buf = Buffer.from(b64, "base64");
  } catch {
    throw new Error("SOLANA_ANCHOR_SECRET_KEY must be valid base64.");
  }
  if (buf.length !== 64) {
    throw new Error(
      "SOLANA_ANCHOR_SECRET_KEY must decode to 64 bytes (full keypair secret).",
    );
  }
  return Keypair.fromSecretKey(new Uint8Array(buf));
}

function memoInstruction(memo: string, signer: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: signer, isSigner: true, isWritable: false }],
    data: Buffer.from(memo, "utf8"),
  });
}

export async function sendMemoTransaction(memo: string): Promise<{
  signature: string;
  slot: number;
}> {
  const payer = loadAnchorPayerKeypair();
  const connection = getSolanaConnection();
  const latest = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({
    feePayer: payer.publicKey,
    recentBlockhash: latest.blockhash,
  }).add(memoInstruction(memo, payer.publicKey));

  const signature = await sendAndConfirmTransaction(connection, tx, [payer], {
    commitment: "confirmed",
  });

  const status = await connection.getTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  const slot = status?.slot ?? 0;

  return { signature, slot };
}
