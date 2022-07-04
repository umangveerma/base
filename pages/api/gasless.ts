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

    const dummy_key_pair = new anchor.web3.Keypair();
    const walletWrapper = new anchor.Wallet(dummy_key_pair);
    const candyMachine = await getCandyMachineState(
      walletWrapper,
      new anchor.web3.PublicKey(process.env.CANDY_MACHINE_ID!),
      new anchor.web3.Connection(process.env.NEXT_PUBLIC_RPC!)
    );

    const candyMachineAddress = candyMachine.id;
    console.log("Cm address:", candyMachineAddress.toString());
    const user = new PublicKey(account);
    console.log("User address:", user.toString());
    const mint = anchor.web3.Keypair.generate();
    console.log("Mint publickey:", mint.publicKey.toString());
    const servicefee = candyMachine.state.price * 10000000;
    console.log("Mint Price is: ", servicefee);
    const 
shopPrivateKey=process.env.PRIVATE_KEYS!
    const shopKeypair = Keypair.fromSecretKey(base58.decode(shopPrivateKey))
    const payer = shopKeypair.publicKey
    console.log("Payer address: ", payer.toString());
    
    const userTokenAccountAddress = (
      await getAtaForMint(mint.publicKey, user)
    )[0];


    const userPayingAccountAddress = payer;
    const instructions: TransactionInstruction[] = [];
    const remainingAccounts = [];
    const signers: anchor.web3.Keypair[] = [];
    
    if (mint) {
      signers.push(mint);
      instructions.push(
        ...[
          anchor.web3.SystemProgram.createAccount({
            fromPubkey: payer,
            newAccountPubkey: mint.publicKey,
            space: MintLayout.span,
            lamports:
              await candyMachine.program.provider.connection.getMinimumBalanceForRentExemption(
                MintLayout.span
              ),
            programId: TOKEN_PROGRAM_ID,
          }),
          Token.createInitMintInstruction(
            TOKEN_PROGRAM_ID,
            mint.publicKey,
            0,
            user,
            user
          ),
          createAssociatedTokenAccountInstruction(
            userTokenAccountAddress,
            payer,
            user,
            mint.publicKey
          ),
          Token.createMintToInstruction(
            TOKEN_PROGRAM_ID,
            mint.publicKey,
            userTokenAccountAddress,
            user,
            [],
            1
          ),
        ]
      );
    }
    if (candyMachine.state.gatekeeper) {
      remainingAccounts.push({
        pubkey: (
          await getNetworkToken(
            payer,
            candyMachine.state.gatekeeper.gatekeeperNetwork
          )
        )[0],
        isWritable: true,
        isSigner: false,
      });

      if (candyMachine.state.gatekeeper.expireOnUse) {
        remainingAccounts.push({
          pubkey: CIVIC,
          isWritable: false,
          isSigner: false,
        });
        remainingAccounts.push({
          pubkey: (
            await getNetworkExpire(
              candyMachine.state.gatekeeper.gatekeeperNetwork
            )
          )[0],
          isWritable: false,
          isSigner: false,
        });
      }
    }
    if (candyMachine.state.whitelistMintSettings) {
      const mint = new anchor.web3.PublicKey(
        candyMachine.state.whitelistMintSettings.mint
      );

      const whitelistToken = (await getAtaForMint(mint, payer))[0];
      remainingAccounts.push({
        pubkey: whitelistToken,
        isWritable: true,
        isSigner: false,
      });

      if (candyMachine.state.whitelistMintSettings.mode.burnEveryTime) {
        remainingAccounts.push({
          pubkey: mint,
          isWritable: true,
          isSigner: false,
        });
        remainingAccounts.push({
          pubkey: payer,
          isWritable: false,
          isSigner: true,
        });
      }
    }

    if (candyMachine.state.tokenMint) {
      remainingAccounts.push({
        pubkey: userPayingAccountAddress,
        isWritable: true,
        isSigner: false,
      });
      remainingAccounts.push({
        pubkey: payer,
        isWritable: false,
        isSigner: true,
      });
    }
    const metadataAddress = await getMetadata(mint.publicKey);
    const masterEdition = await getMasterEdition(mint.publicKey);

    const [candyMachineCreator, creatorBump] = await getCandyMachineCreator(
      candyMachineAddress
    );

    console.log(remainingAccounts.map((rm) => rm.pubkey.toBase58()));
    instructions.push(
      await candyMachine.program.instruction.mintNft(creatorBump, {
        accounts: {
          candyMachine: candyMachineAddress,
          candyMachineCreator,
          payer: payer,
          wallet: candyMachine.state.treasury,
          mint: mint.publicKey,
          metadata: metadataAddress,
          masterEdition,
          mintAuthority: user,
          updateAuthority: user,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
          recentBlockhashes: SYSVAR_SLOT_HASHES_PUBKEY,
          instructionSysvarAccount: anchor.web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        remainingAccounts:
          remainingAccounts.length > 0 ? remainingAccounts : undefined,
      })
    );   

    const connection = new Connection(process.env.NEXT_PUBLIC_RPC!);
    const { blockhash } = await connection.getLatestBlockhash("finalized");
    const transaction = new Transaction({
      recentBlockhash: blockhash,
      feePayer: payer,
    });
    console.log("INXs: ",instructions);
    transaction.add(...instructions);

    transaction.partialSign(shopKeypair, mint);

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