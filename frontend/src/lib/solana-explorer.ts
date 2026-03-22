/** Public explorer links (safe for client components). */

export function solanaTxExplorerUrl(signature: string, cluster: string): string {
  const c =
    cluster === "mainnet-beta"
      ? ""
      : `?cluster=${encodeURIComponent(cluster)}`;
  return `https://explorer.solana.com/tx/${signature}${c}`;
}
