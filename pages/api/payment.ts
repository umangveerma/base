import {
    PublicKey,
    Connection,
    Transaction,
    TransactionInstruction,
    SYSVAR_SLOT_HASHES_PUBKEY,
    SystemProgram,
    Keypair
  } from "@solana/web3.js";
  import { NextApiRequest, NextApiResponse } from "next";
  import {
    getAtaForMint,
    createAssociatedTokenAccountInstruction,
    getNetworkToken,
    CIVIC,
    getNetworkExpire,
    getMetadata,
    getMasterEdition,
    TOKEN_METADATA_PROGRAM_ID,
    getCandyMachineCreator,
    getCollectionPDA,
    CollectionData,
    getCollectionAuthorityRecordPDA,
    getCandyMachineState,
  } from "../../components/candy-machine";
  import * as anchor from "@project-serum/anchor";
  import { MintLayout, TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
  import base58 from "bs58"
  
  export type MakeTransactionInputData = {
    account: string;
  };
  
  type MakeTransactionGetResponse = {
    label: string;
    icon: string;
  };
  
  export type MakeTransactionOutputData = {
    transaction: string;
    message: string;
  };
  
  type ErrorOutput = {
    error: string;
  };
  
  function get(res: NextApiResponse<MakeTransactionGetResponse>) {
    res.status(200).json({
      label: "Candy Machine",
      icon: "https://www.downloadclipart.net/large/candy-png-free-download.png",
    });
  }
  
  async function post(
    req: NextApiRequest,
    res: NextApiResponse<MakeTransactionOutputData | ErrorOutput>
  ) {
    try {
      // We pass the reference to use in the query
      const { reference } = req.query;
      if (!reference) {
        res.status(400).json({ error: "No reference provided" });
        return;
      }
      console.log(reference);
      // We pass the buyer's public key in JSON body
      const { account } = req.body as MakeTransactionInputData;
      if (!account) {
        res.status(40).json({ error: "No account provided" });
        return;
      }
      console.log(account as string);
      const payer = new PublicKey(account);
      const user = new PublicKey("4Bxkgsf8xC5pxS8jYKmpjcFt7vaCYcaKsnXEWgPMbNMG");
      const connection = new Connection('https://api.devnet.solana.com');
      const { blockhash } = await connection.getLatestBlockhash("finalized");
      const transaction = new Transaction({
        recentBlockhash: blockhash,
        feePayer: payer,
      });

      const lamportsToSend = 1_000_000;

      const sendSol = SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: user,
        lamports: lamportsToSend,
      })
      sendSol.keys.push({
        pubkey: new PublicKey(reference),
        isSigner: false,
        isWritable: false,
      })

      
      transaction.add(sendSol);
  
      console.log("Transaction Before Serilize",transaction);
  

      // transaction.add(transferIx);
  
      const serializedTransaction = transaction.serialize({
        // We will need the buyer to sign this transaction after it's returned to them
        requireAllSignatures: false,
      });
      const base64 = serializedTransaction.toString("base64");
      console.log("Searilized Transaction: ", base64);
      const message = "Thanks for minting NFTs!";
  
      res.status(200).json({
        transaction: base64,
        message,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "error creating transaction" });
      return;
    }
  }
  
  export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<
      MakeTransactionGetResponse | MakeTransactionOutputData | ErrorOutput
    >
  ) {
    if (req.method === "GET") {
      return get(res);
    } else if (req.method === "POST") {
      return await post(req, res);
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  }