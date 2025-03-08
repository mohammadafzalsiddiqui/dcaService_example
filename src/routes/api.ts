import express from 'express';
import { PriceService } from '../services/PriceService';
import {logger}  from '../utils/logger';

const router = express.Router();
const priceService = new PriceService();

// Get current price of a token
router.get('/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const price = await priceService.fetchCurrentPrice(symbol);
    
    res.json({
      success: true,
      price,
      symbol,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to fetch price:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch price' });
  }
});

// Get risk analysis for a token
router.get('/analyze/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const analysis = await priceService.analyzeRisk(symbol);
    
    // Get moving average
    const movingAverage = await priceService.calculateMovingAverage(symbol, 7);
    
    res.json({
      success: true,
      token_id: symbol,
      analysis: {
        ...analysis,
        movingAverage
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Failed to analyze token:', error);
    res.status(500).json({ success: false, error: 'Failed to analyze token' });
  }
});

// Get historical prices for a token
router.get('/history/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const days = req.query.days ? parseInt(req.query.days as string) : 7;
    
    const prices = await priceService.getHistoricalPrices(symbol, days);
    
    res.json({
      success: true,
      symbol,
      prices: prices.map(p => ({
        price: p.price,
        timestamp: p.timestamp
      }))
    });
  } catch (error) {
    logger.error('Failed to fetch historical prices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch historical prices' });
  }
});

export default router;