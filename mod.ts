import type { Account } from "https://esm.sh/@planetarium/sign@0.0.11";
import * as ethers from "https://esm.sh/ethers@5.7.2";
import * as hex from "https://deno.land/std@0.173.0/encoding/hex.ts";
import { Signature } from "https://esm.sh/@noble/secp256k1@1.7.1";

declare global {
  interface Window {
    ethereum: {
      request: (param: {
        method: "personal_sign" | "eth_sign";
        params: [string, string];
      }) => Promise<string>;
      enable: () => Promise<void>;
    };
  }
}

export function createAccount(address: string): Account {
  return {
    VERSION: 0,
    async getPublicKey(isCompressed?: boolean) {
      await window.ethereum.enable();
      const msg = "aa" as const;
      const sig = await window.ethereum.request({
        method: "personal_sign",
        params: [msg, address],
      });

      const hash = ethers.utils.hashMessage([0xaa]);
      const publicKey = ethers.utils.computePublicKey(
        ethers.utils.recoverPublicKey(hash, sig),
        isCompressed || false,
      );
      return hex.decode(new TextEncoder().encode(publicKey.substring(2)));
    },
    async sign(hash) {
      await window.ethereum.enable();
      const sig = await window.ethereum.request({
        method: "eth_sign",
        params: [address, "0x" + new TextDecoder().decode(hex.encode(hash))],
      });

      return Signature.fromCompact(sig.substring(2, 130)).normalizeS().toDERRawBytes();
    },
  };
}
