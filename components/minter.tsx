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
import BigNumber from "bignumber.js";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Button, ButtonGroup } from "@chakra-ui/react";
import styles from '../styles/Home.module.css'

export default function Minter() {

  const [solanaUrl, setSolanaUrl] = useState<URL>();
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
        // Validate that the transaction has the expected recipient, amount and SPL token

         await validateTransfer(connection,signatureInfo.signature,{
          recipient: new PublicKey('4Bxkgsf8xC5pxS8jYKmpjcFt7vaCYcaKsnXEWgPMbNMG'),
          amount: new BigNumber(1_000_000),
          reference:reference,
        },{ commitment: 'confirmed' })

        console.log(
          "Success! signature here: ",
          signatureInfo.signature.toString()
        );

       toast.success("NFT mint successfully!");

        router.push("/confirmed");
      } catch (e) {
        if (e instanceof FindReferenceError) {
          // No transaction found yet, ignore this error
          return;
        }
        if (e instanceof ValidateTransferError) {
          // Transaction is invalid
          console.error('Transaction is invalid', e)
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

  return (
    <>
      <Toaster />
      <Button onClick={()=>router.push(solanaUrl!)} colorScheme="messenger" size="lg">Pay Mony</Button>
      <div ref={qrRef} />
    </>
  );
}
