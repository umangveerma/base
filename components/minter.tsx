import { createQR, encodeURL, TransactionRequestURLFields, findReference, validateTransfer, FindReferenceError, ValidateTransferError } from "@solana/pay";
import {  Connection, Keypair,PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef } from "react";
import toast, { Toaster } from 'react-hot-toast';
import * as anchor from "@project-serum/anchor"

export default function Minter() {

    const router = useRouter()
    // ref to a div where we'll show the QR code
    const qrRef = useRef<HTMLDivElement>(null)
    /* Add code to the component to get the Solana connection */
  // Unique address that we can listen for payments to
  const reference = useMemo(() => Keypair.generate().publicKey, [])
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
  };

  // Get a connection to Solana devnet
const connection = new Connection(process.env.NEXT_PUBLIC_RPC!);
  // Show the QR code
  useEffect(() => {
    // window.location is only available in the browser, so create the URL in here
    console.log(searchParams.toString())
    const { location } = window
    const apiUrl = `${location.protocol}//${location.host}/api/mintTransaction?${searchParams.toString()}`
    console.log(apiUrl)
    const urlParams: TransactionRequestURLFields = {
      link: new URL(apiUrl),
      label: "Candy Machine",
      message: "https://www.downloadclipart.net/large/candy-png-free-download.png",
    }
    const solanaUrl = encodeURL(urlParams)
    const qr = createQR(solanaUrl, 512, 'transparent')
    if (qrRef.current) {
      qrRef.current.innerHTML = ''
      qr.append(qrRef.current)
    }
  })

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        // Check if there is any transaction for the reference
        const signatureInfo = await findReference(connection, reference, { finality: 'confirmed' })
        // Validate that the transaction has the expected recipient, amount and SPL token

        // const validationResult = await validateTransfer(connection,signatureInfo.signature,{
        //   recipient: new PublicKey('9kpML3MhVLPmASMDBYuaMzmFiCtdm3aityWu1pJZ1wR4'),
        //   amount: anchor.BN(1*anchor.web3.LAMPORTS_PER_SOL),
        //   reference:reference,
        // })

        // console.log("validation result",validationResult);

        console.log('Success! signature here: ', signatureInfo.signature.toString());

        toast.success('NFT mint successfully!');

        router.push('/confirmed');
      } catch (e) {
        if (e instanceof FindReferenceError) {
          // No transaction found yet, ignore this error
          return;
        }
        toast.error('Minting failed!');
        console.error('Unknown error', e)
        clearInterval(interval)
      }
    }, 500)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <>
    <Toaster />
      <div ref={qrRef} />
    </>
  )
}