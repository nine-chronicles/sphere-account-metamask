import { Buffer } from "https://esm.sh/buffer@6.0.3";
import { ActivateAccount, Address } from "https://raw.githubusercontent.com/nine-chronicles/lib9c.js/8bd16bd023d6c4007bd30a714bdabb6da839dbea/mod.ts";
import { createAccount } from "https://raw.githubusercontent.com/nine-chronicles/sphere-account-metamask/main/mod.ts";
import { signTransaction } from "https://esm.sh/@planetarium/sign@0.0.12";
import { BencodexValue, decode } from "https://esm.sh/bencodex@0.1.2";
import * as hex from "https://deno.land/std@0.173.0/encoding/hex.ts";
import {sign} from "https://esm.sh/@noble/secp256k1@1.7.1";
import { useRef, useState } from "react";

async function getRawState(address: string): Promise<BencodexValue> {
  console.log("Test");
  const NC_HEADLESS_GRAPHQL_ENDPOINT = "https://9c-main-full-state.planetarium.dev/graphql";
  if (NC_HEADLESS_GRAPHQL_ENDPOINT === undefined) {
    throw new Error("NC_HEADLESS_GRAPHQL_ENDPOINT is not set.");
  }

  const response = await fetch(NC_HEADLESS_GRAPHQL_ENDPOINT, {
    method: "POST",
    body: JSON.stringify({
      query: `query {
        state(address: "${address}")
      }`,
    }),
    headers: {
      "Content-Type": "application/json"
    }
  });

  const responseJson = await response.json();
  if (responseJson.errors) {
    throw new Error(responseJson.errors[0].message);
  }

  if (responseJson.data.state === null) {
    throw new Error("The state seems not existed.");
  }

  // deno-lint-ignore no-explicit-any
  const result = decode(Buffer.from(hex.decode(new TextEncoder().encode(responseJson.data.state))) as any);
  if (result === undefined) {
    throw new Error("Failed to decode state.");
  }

  return result;
}

async function makeActivateAccount(activateCode: string): Promise<ActivateAccount> {
  const [privateKey, pendingAddress] = activateCode.split("/");
  const pendingActivationState = await getRawState("0x" + pendingAddress);

  console.log(pendingActivationState);
  if (!(pendingActivationState instanceof Map)) {
    throw new Error("The state must be Map type.");
  }

  const nonce = pendingActivationState.get("nonce");
  if (nonce === undefined) {
    throw new Error("Nonce doesn't exist.");
  }

  if (!(nonce instanceof Uint8Array)) {
    throw new Error("Nonce must be Uint8Array type.");
  }

  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", nonce));
  const signature = await sign(hash, privateKey);

  const activateAccount = new ActivateAccount({
    pendingAddress: new Address("0x" + pendingAddress),
    signature,
  });

  return activateAccount;
}

export default function Index() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [signedTx, setSignedTx] = useState<null | ActivateAccount>(null);

  return (
    <div
      className="w-screen flex flex-col items-center justify-center"
      style={{
        height: "calc(100vh - 2 * 80px)",
      }}
    >
      Activate account with MetaMask.
      <input ref={inputRef} className="m-8 p-4 w-150 h-15 border" placeholder="Insert activation code." />
      <button className="border w-50 h-10" onClick={(event) => { console.log(inputRef); makeActivateAccount(inputRef.current!.value).then(setSignedTx); event.preventDefault(); }}>Sign</button>

      {
        signedTx === null
          ? <p>Before signing...</p>
          : <p>{Buffer.from(signedTx.serialize()).toString("hex")}</p>
      }
    </div>
  );
}
