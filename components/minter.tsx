import {
  createQR,
  encodeURL,
  TransactionRequestURLFields,
  findReference,
  validateTransfer,
  FindReferenceError,
  ValidateTransferError,
  Link,
} from "@solana/pay";
import axios from "axios";
import BigNumber from "bignumber.js";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Button, ButtonGroup } from "@chakra-ui/react";
import styles from '../styles/Home.module.css'

export default function Minter() {

  const [signature, setSignature] = useState<string | null>(null);
  const router = useRouter();
  // ref to a div where we'll show the QR code
  const qrRef = useRef<HTMLDivElement>(null);
  /* Add code to the component to get the Solana connection */
  // Unique address that we can listen for payments to
  const reference = useMemo(() => Keypair.generate().publicKey, []);
  // Read the URL query (which includes our chosen products)
  const searchParams = new URLSearchParams({ reference: reference.toString() });
  for (const [key, value] of Object.entries(router.query)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) {
          searchParams.append(key, v);
        }
      } else {
        searchParams.append(key, value);
      }
    }
  }
console.log(reference.toString())
  // Get a connection to Solana devnet
  const connection = new Connection("https://api.devnet.solana.com");

  useEffect(() => {
    // window.location is only available in the browser, so create the URL in here
    const { location } = window
    const apiUrl = `${location.protocol}//${location.host}/api/payment?${searchParams.toString()}`
    const urlParams: TransactionRequestURLFields = {
      link: new URL(apiUrl),
    }
    console.log(urlParams.link.href)
    const solanaUrl = encodeURL(urlParams)
   // setSolanaUrl(solanaUrl)

   console.log(solanaUrl.href)
    const qr = createQR(solanaUrl, 312, 'transparent')
    if (qrRef.current) {
      qrRef.current.innerHTML = ''
      qr.append(qrRef.current)
    }
  })


  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Check if there is any transaction for the reference
        const signatureInfo = await findReference(connection, reference, {
          finality: "confirmed",
        });
        setSignature(signatureInfo.signature.toString())
        clearInterval(interval);

      } catch (e) {
        if (e instanceof FindReferenceError) {
          return;
        }
       toast.error("Minting failed!");
        console.error("Unknown error", e);
        clearInterval(interval);
      }
    }, 500);
    return () => {
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (signature) {
      toast.success("txn done")
     console.log("Txn signature here:", signature)
     const data = axios.get("https://jsonplaceholder.typicode.com/todos/1")
     console.log(data)
     toast.success("API req done")
     router.push("/confirmed");
    }
  }, [signature]);

  return (
    <>
      <Toaster />
      <Button colorScheme="messenger" size="lg">Pay Mony</Button>
      <div ref={qrRef} />
    </>
  );
}
