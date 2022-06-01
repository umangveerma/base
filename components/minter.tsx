import { createQR, encodeURL, TransactionRequestURLFields, findReference, validateTransfer, FindReferenceError, ValidateTransferError } from "@solana/pay";
import {  Connection, Keypair, PublicKey } from "@solana/web3.js";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef,useState } from "react";
import * as anchor from '@project-serum/anchor';
import {getCandyMachineState} from './candy-machine';
import { BigNumber } from "bignumber.js";

export default function Minter() {
  const [charge, setCharge] = useState(0);

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
  }

  async function getcandyAccount(){
    const dummy_key_pair = new anchor.web3.Keypair();
    const walletWrapper = new anchor.Wallet(dummy_key_pair);
    const candyMachine = await getCandyMachineState(
      walletWrapper,
      new anchor.web3.PublicKey(process.env.NEXT_PUBLIC_CANDY_MACHINE_ID!),
      new anchor.web3.Connection(process.env.NEXT_PUBLIC_RPC!)
    );
    const serviceCharge = candyMachine.state.price/100
    setCharge(serviceCharge)
  }
  // Get a connection to Solana devnet
const connection = new Connection(process.env.NEXT_PUBLIC_RPC!)
const shopAddress = new PublicKey(process.env.NEXT_PUBLIC_SHOP!);
  // Show the QR code
  useEffect(() => {
    getcandyAccount()
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
        await validateTransfer(
          connection,
          signatureInfo.signature,
          {
            recipient: shopAddress,
            amount: new BigNumber(charge),
            reference,
          },
          { commitment: 'confirmed' }
        )
        console.log('Success! signature here: ', signatureInfo.signature.toString())
        router.push('/confirmed')
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
        console.error('Unknown error', e)
      }
    }, 500)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <>
      <div ref={qrRef} />
    </>
  )
}