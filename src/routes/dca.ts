import express from 'express';
import { DCAService } from '../services/DCAService';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();
const dcaService = new DCAService();

// Create a new DCA plan
router.post('/plans', async (req, res) => {
  try {
    const { amount, frequency, toAddress, tokenSymbol } = req.body;
    
    // Use hardcoded user ID for simplicity
    const userId = process.env.DEFAULT_USER_ID || '000000000000000000000000';
    
    if (!amount || !frequency || !toAddress || !tokenSymbol) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const plan = await dcaService.createPlan(userId, {
      tokenSymbol,
      amount,
      frequency,
      toAddress
    });

    res.json({ success: true, plan });
  } catch (error) {
    logger.error('Failed to create DCA plan:', error);
    res.status(500).json({ success: false, error: 'Failed to create DCA plan' });
  }
});

// Stop a DCA plan
router.post('/plans/:planId/stop', async (req, res) => {
  try {
    const { planId } = req.params;
    const plan = await dcaService.stopPlan(planId);

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Plan not found' });
    }

    res.json({ success: true, plan });
  } catch (error) {
    logger.error('Failed to stop DCA plan:', error);
    res.status(500).json({ success: false, error: 'Failed to stop DCA plan' });
  }
});

// Get user's plans
router.get('/plans', async (req, res) => {
  try {
    // Use hardcoded user ID for simplicity
    const userId = process.env.DEFAULT_USER_ID || '000000000000000000000000';
    
    const plans = await dcaService.getUserPlans(userId);
    res.json({ success: true, plans });
  } catch (error) {
    logger.error('Failed to get user plans:', error);
    res.status(500).json({ success: false, error: 'Failed to get user plans' });
  }
});

// Get plan transactions
router.get('/plans/:planId/transactions', async (req, res) => {
  try {
    const { planId } = req.params;
    const transactions = await dcaService.getPlanTransactions(planId);
    res.json({ success: true, transactions });
  } catch (error) {
    logger.error('Failed to get plan transactions:', error);
    res.status(500).json({ success: false, error: 'Failed to get plan transactions' });
  }
});

// Get user's total investment
router.get('/total-investment', async (req, res) => {
  try {
    // Use hardcoded user ID for simplicity
    const userId = process.env.DEFAULT_USER_ID || '000000000000000000000000';
    
    const total = await dcaService.getUserTotalInvestment(userId);
    res.json({ success: true, totalInvestment: total });
  } catch (error) {
    logger.error('Failed to get total investment:', error);
    res.status(500).json({ success: false, error: 'Failed to get total investment' });
  }
});

export default router;