import { DCAPlugin } from '../plugins/types';
import { InjectivePlugin } from '../plugins/injective';
import { TonPlugin } from '../plugins/ton';
import { SonicPlugin } from '../plugins/sonic';
import { InvestmentPlan, IInvestmentPlan } from '../models/InvestmentPlan';
import { User } from '../models/User';
import { Transaction } from '../models/Transaction';
import { PriceService } from './PriceService';
import cron from 'node-cron';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';

export class DCAService {
  private plugins: Map<string, DCAPlugin>;
  private cronJobs: Map<string, cron.ScheduledTask>;
  private priceService: PriceService;

  constructor() {
    this.plugins = new Map();
    this.plugins.set('INJ', new InjectivePlugin());
    this.plugins.set('TON', new TonPlugin());
    this.plugins.set('SONIC', new SonicPlugin());
    
    this.cronJobs = new Map();
    this.priceService = new PriceService();
    
    this.initializeExistingPlans();
  }

  private async initializeExistingPlans() {
    try {
      const activePlans = await InvestmentPlan.find({ isActive: true });
      activePlans.forEach(plan => this.schedulePlan(plan));
      logger.info(`Initialized ${activePlans.length} active plans`);
    } catch (error) {
      logger.error('Failed to initialize existing plans:', error);
    }
  }

  private getCronExpression(frequency: string): string {
    switch (frequency) {
      case 'minute':
        return '* * * * *';
      case 'hour':
        return '0 * * * *';
      case 'day':
        return '0 0 * * *';
      default:
        throw new Error('Invalid frequency');
    }
  }

  private async executePlan(plan: IInvestmentPlan) {
    try {
      logger.info(`Executing DCA plan: ${plan._id}`);
      
      // Get the user
      const user = await User.findById(plan.userId);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Get the appropriate plugin
      const plugin = this.plugins.get(plan.tokenSymbol);
      if (!plugin) {
        throw new Error(`Unsupported token: ${plan.tokenSymbol}`);
      }
      
      // Get current token price
      const tokenPrice = await this.priceService.fetchCurrentPrice(plan.tokenSymbol);
      
      // Execute the transaction
      const txHash = await plugin.sendTransaction(
        plan.amount, 
        process.env.PLATFORM_WALLET_ADDRESS || '',
        plan.toAddress
      );
      
      // Calculate token amount
      const tokenAmount = plan.amount / tokenPrice;
      
      // Record the transaction
      await Transaction.create({
        planId: plan._id,
        userId: plan.userId,
        tokenSymbol: plan.tokenSymbol,
        amount: plan.amount,
        tokenAmount,
        tokenPrice,
        txHash,
        status: 'completed',
        timestamp: new Date()
      });
      
      // Update the plan
      plan.lastExecutionTime = new Date();
      plan.totalInvested += plan.amount;
      await plan.save();
      
      // Update user's total invested amount
      await User.findByIdAndUpdate(plan.userId, {
        $inc: { totalInvested: plan.amount }
      });
      
      logger.info(`Successfully executed DCA plan: ${plan._id}, txHash: ${txHash}`);
    } catch (error) {
      logger.error(`Failed to execute DCA plan: ${plan._id}`, error);
      
      // Record failed transaction
      try {
        await Transaction.create({
          planId: plan._id,
          userId: plan.userId,
          tokenSymbol: plan.tokenSymbol,
          amount: plan.amount,
          tokenAmount: 0,
          tokenPrice: 0,
          txHash: 'failed',
          status: 'failed',
          timestamp: new Date()
        });
      } catch (e) {
        logger.error('Failed to record failed transaction:', e);
      }
    }
  }

  private schedulePlan(plan: IInvestmentPlan) {
    const cronExpression = this.getCronExpression(plan.frequency);
    const job = cron.schedule(cronExpression, () => this.executePlan(plan));
    this.cronJobs.set(plan._id.toString(), job);
    logger.info(`Scheduled plan ${plan._id} with frequency ${plan.frequency}`);
  }

  async createPlan(userId: string, planData: {
    tokenSymbol: string;
    amount: number;
    frequency: string;
    toAddress: string;
  }): Promise<IInvestmentPlan> {
    // Make sure the user exists
    let user = await User.findById(userId);
    
    // If not using auth, create a default user if it doesn't exist
    if (!user && userId === process.env.DEFAULT_USER_ID) {
      user = await User.create({
        _id: new mongoose.Types.ObjectId(userId),
        address: process.env.PLATFORM_WALLET_ADDRESS || 'default-address',
        totalInvested: 0
      });
    }
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const plan = await InvestmentPlan.create({
      userId,
      ...planData,
      isActive: true
    });
    
    this.schedulePlan(plan);
    return plan;
  }

  async stopPlan(planId: string): Promise<IInvestmentPlan | null> {
    const plan = await InvestmentPlan.findById(planId);
    if (!plan) {
      return null;
    }
    
    plan.isActive = false;
    await plan.save();
    
    const job = this.cronJobs.get(planId);
    if (job) {
      job.stop();
      this.cronJobs.delete(planId);
    }
    
    return plan;
  }

  async getUserPlans(userId: string): Promise<IInvestmentPlan[]> {
    return InvestmentPlan.find({ userId });
  }

  async getUserTotalInvestment(userId: string): Promise<number> {
    const result = await InvestmentPlan.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: '$totalInvested' } } }
    ]);
    return result.length > 0 ? result[0].total : 0;
  }
  
  async getPlanTransactions(planId: string): Promise<any[]> {
    return Transaction.find({ planId }).sort({ timestamp: -1 });
  }
}