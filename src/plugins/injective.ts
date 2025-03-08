import {
    MsgSend,
    BaseAccount,
    ChainRestAuthApi,
    createTransaction,
    ChainRestTendermintApi,
    PrivateKey,
    SignDoc,
    CosmosTxV1Beta1Tx,
} from "@injectivelabs/sdk-ts";
import { BigNumberInBase } from "@injectivelabs/utils";
import { getStdFee, DEFAULT_BLOCK_TIMEOUT_HEIGHT } from "@injectivelabs/utils";
import { ChainId } from "@injectivelabs/ts-types";
import { DCAPlugin } from "./types";
import { DirectSecp256k1Wallet } from "@cosmjs/proto-signing";
import dotenv from 'dotenv';
dotenv.config();

export class InjectivePlugin implements DCAPlugin {
    name = "injective";
    constructor() {}

    async sendTransaction(
        amount: number,
        fromAddress: string,
        toAddress: string
    ): Promise<string> {
        try {
            // Use the provided addresses instead of hardcoded values
            const injectiveAddress = fromAddress;
            const destinationAddress = toAddress;
            const chainId = ChainId.Testnet;
            const restEndpoint = "https://testnet.sentry.lcd.injective.network";

            // Convert the provided amount parameter to the correct format
            const amountInToken = {
                amount: new BigNumberInBase(amount).toWei().toFixed(),
                denom: "inj",
            };

            /** Account Details **/
            const chainRestAuthApi = new ChainRestAuthApi(restEndpoint);
            const accountDetailsResponse = await chainRestAuthApi.fetchAccount(
                injectiveAddress
            );
            const baseAccount = BaseAccount.fromRestApi(accountDetailsResponse);

            /** Block Details */
            const chainRestTendermintApi = new ChainRestTendermintApi(
                restEndpoint
            );
            const latestBlock = await chainRestTendermintApi.fetchLatestBlock();
            const latestHeight = latestBlock.header.height;
            const timeoutHeight = new BigNumberInBase(latestHeight).plus(
                DEFAULT_BLOCK_TIMEOUT_HEIGHT
            );

            /** Preparing the transaction */
            const msg = MsgSend.fromJSON({
                amount: amountInToken,
                srcInjectiveAddress: injectiveAddress,
                dstInjectiveAddress: destinationAddress, // Use the provided destination address
            });

            // Get private key from environment
            const privateKeyHex = process.env.PRIVATE_KEY_INJECTIVE;
            if (!privateKeyHex) {
                throw new Error(
                    "Private key not found in environment variables"
                );
            }

            const privateKey = PrivateKey.fromHex(privateKeyHex);

            // Get the public key from the private key
            const pubKey = privateKey.toPublicKey();

            /** Prepare the Transaction **/
            const { txRaw, signDoc } = createTransaction({
                pubKey: pubKey.toBase64(),
                chainId,
                fee: getStdFee({}),
                message: msg,
                sequence: baseAccount.sequence,
                timeoutHeight: timeoutHeight.toNumber(),
                accountNumber: baseAccount.accountNumber,
            });

            // Create wallet from private key
            const wallet = await DirectSecp256k1Wallet.fromKey(
                Buffer.from(privateKeyHex, "hex"),
                "inj" // Injective address prefix
            );

            // Get account
            const accounts = await wallet.getAccounts();
            const address = accounts[0].address;

            // Verify the from address matches our wallet address
            if (injectiveAddress !== address) {
                throw new Error(
                    `Address mismatch: ${injectiveAddress} !== ${address}`
                );
            }

            const offlineSigner = {
                getAccounts: async () => accounts,
                signDirect: async (
                    signerAddress: string,
                    signDocToSign: SignDoc
                ) => {
                    // Verify the signer address matches our wallet address
                    if (signerAddress !== address) {
                        throw new Error(
                            `Address mismatch: ${signerAddress} !== ${address}`
                        );
                    }

                    // Prepare the sign doc
                    const { bodyBytes, authInfoBytes, chainId } = signDocToSign;

                    // Create signature
                    const signBytes = new Uint8Array([
                        ...new TextEncoder().encode(chainId),
                        0, // Separator
                        ...bodyBytes,
                        ...authInfoBytes,
                    ]);

                    const signature = await privateKey.sign(
                        Buffer.from(signBytes)
                    );

                    return {
                        signed: signDocToSign,
                        signature: {
                            signature:
                                Buffer.from(signature).toString("base64"),
                            pub_key: {
                                type: "tendermint/PubKeySecp256k1",
                                value: privateKey.toPublicKey().toBase64(),
                            },
                        },
                    };
                },
            };

            /* Sign the Transaction */
            const directSignResponse = await offlineSigner.signDirect(
                address,
                signDoc as SignDoc
            );

            // Append signature to transaction
            txRaw.signatures = [
                Buffer.from(directSignResponse.signature.signature, "base64"),
            ];

            // Broadcast the transaction using HTTP REST endpoint similar to the Keplr example
            const txBytes = CosmosTxV1Beta1Tx.TxRaw.encode(txRaw).finish();

            // Use Axios or fetch to broadcast the transaction
            const response = await fetch(
                `${restEndpoint}/cosmos/tx/v1beta1/txs`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        tx_bytes: Buffer.from(txBytes).toString("base64"),
                        mode: "BROADCAST_MODE_SYNC", // This matches Keplr's Sync mode
                    }),
                }
            );

            const responseData: any = await response.json();

            if (responseData.tx_response && responseData.tx_response.txhash) {
                return responseData.tx_response.txhash;
            } else {
                throw new Error(
                    `Broadcast error: ${JSON.stringify(responseData.error)}`
                );
            }
        } catch (error) {
            throw new Error(`Failed to send transaction: ${error}`);
        }
    }

    async getUSDTBalance(address: string): Promise<number> {
        try {
            // Actual implementation would query chain for balance
            return 0;
        } catch (error) {
            throw new Error(`Failed to get balance: ${error}`);
        }
    }

    async getNativeBalance(address: string): Promise<number> {
        try {
            // Actual implementation would query chain for balance
            return 0;
        } catch (error) {
            throw new Error(`Failed to get balance: ${error}`);
        }
    }
}