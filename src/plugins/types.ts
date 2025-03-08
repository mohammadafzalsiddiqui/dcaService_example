export interface DCAPlugin {
    name: string;
    sendTransaction(amount: number, fromAddress: string, toAddress: string): Promise<string>;
  }
  
  export type SupportedPlugins = 'injective' | 'ton' | 'sonic';