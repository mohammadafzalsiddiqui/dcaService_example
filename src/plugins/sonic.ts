import { ethers } from 'ethers';
import { DCAPlugin } from './types';
import * as dotenv from 'dotenv';

dotenv.config();

export class SonicPlugin implements DCAPlugin {
  name = 'sonic';
  
  async sendTransaction(
    amount: number,
    fromAddress: string,
    toAddress: string
  ): Promise<string> {
    try {
      // Connect to Sonic network
      const provider = new ethers.JsonRpcProvider('https://rpc.blaze.soniclabs.com');
      
      // Get private key from environment variables
      const privateKey = process.env.PRIVATE_KEY_INJECTIVE;
      if (!privateKey) {
        throw new Error('Private key not found in environment variables');
      }
      
      const wallet = new ethers.Wallet(privateKey, provider);
      
      // Calculate token amount based on USD value and current price
      // For simplicity, we're using a fixed price of 1 token = $1
      // In a real system, you'd fetch the actual price
      const tokenAmount = ethers.parseEther(amount.toString());
      
      // Create transaction
      const tx = {
        to: toAddress,
        value: tokenAmount,
      };
      
      // Send transaction
      const receipt = await wallet.sendTransaction(tx);
      console.log(`Transaction submitted: ${receipt.hash}`);
      
      // Wait for transaction to be mined
      const confirmedReceipt = await receipt.wait();
      console.log(`Transaction confirmed in block ${confirmedReceipt?.blockNumber}`);
      
      return receipt.hash;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw new Error('Failed to send transaction');
    }
  }
}