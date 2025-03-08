import axios from 'axios';
import { TokenPrice } from '../models/TokenPrice';
import { logger } from '../utils/logger';

export class PriceService {
  // Fetch the current price of a token
  async fetchCurrentPrice(tokenSymbol: string): Promise<number> {
    try {
      // For simplicity, we'll use CoinGecko for price data
      // In production, you might want to use multiple sources or a paid API
      const tokenId = this.getTokenId(tokenSymbol);
      
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: tokenId,
          vs_currencies: 'usd'
        }
      });

      const price = response.data[tokenId].usd;
      
      // Save the price to the database
      await TokenPrice.create({
        symbol: tokenSymbol,
        price,
        timestamp: new Date()
      });
      
      return price;
    } catch (error) {
      logger.error('Error fetching token price:', error);
      
      // As a fallback, try to get the latest price from our database
      const latestPrice = await TokenPrice.findOne({ symbol: tokenSymbol })
        .sort({ timestamp: -1 })
        .limit(1);
      
      if (latestPrice) {
        return latestPrice.price;
      }
      
      // If all else fails, return a default price
      // In a real system, you'd want better error handling
      return 1.0;
    }
  }

  // Get historical prices for a token
  async getHistoricalPrices(tokenSymbol: string, days: number = 7): Promise<any[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const prices = await TokenPrice.find({
        symbol: tokenSymbol,
        timestamp: { $gte: startDate }
      }).sort({ timestamp: 1 });
      
      return prices;
    } catch (error) {
      logger.error('Error fetching historical prices:', error);
      return [];
    }
  }

  // Calculate moving average
  async calculateMovingAverage(tokenSymbol: string, days: number = 7): Promise<number> {
    const prices = await this.getHistoricalPrices(tokenSymbol, days);
    
    if (prices.length === 0) {
      return await this.fetchCurrentPrice(tokenSymbol);
    }
    
    const sum = prices.reduce((acc, price) => acc + price.price, 0);
    return sum / prices.length;
  }

  // Analyze risk level
  async analyzeRisk(tokenSymbol: string): Promise<{
    riskLevel: 'low' | 'medium' | 'high',
    recommendation: string,
    suggestedInvestment: number
  }> {
    try {
      // Get price data
      const prices = await this.getHistoricalPrices(tokenSymbol, 30);
      const currentPrice = await this.fetchCurrentPrice(tokenSymbol);
      
      // Calculate volatility (simple standard deviation of daily returns)
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        const dailyReturn = (prices[i].price - prices[i-1].price) / prices[i-1].price;
        returns.push(dailyReturn);
      }
      
      // Calculate volatility
      const avgReturn = returns.reduce((sum, val) => sum + val, 0) / returns.length || 0;
      const variance = returns.reduce((sum, val) => sum + Math.pow(val - avgReturn, 2), 0) / returns.length || 0;
      const volatility = Math.sqrt(variance);
      
      // Determine risk level based on volatility
      let riskLevel: 'low' | 'medium' | 'high' = 'medium';
      let suggestedInvestment = 20;
      let recommendation = '';
      
      if (volatility < 0.03) {
        riskLevel = 'low';
        suggestedInvestment = 10;
        recommendation = `${tokenSymbol} has shown low volatility recently. Consider a conservative investment.`;
      } else if (volatility > 0.07) {
        riskLevel = 'high';
        suggestedInvestment = 30;
        recommendation = `${tokenSymbol} has shown high volatility recently. Only invest what you can afford to lose.`;
      } else {
        recommendation = `${tokenSymbol} has shown moderate volatility. A balanced approach is recommended.`;
      }
      
      return {
        riskLevel,
        recommendation,
        suggestedInvestment
      };
    } catch (error) {
      logger.error('Error analyzing risk:', error);
      
      // Default to medium risk if analysis fails
      return {
        riskLevel: 'medium',
        recommendation: 'Could not analyze risk. Using default medium risk profile.',
        suggestedInvestment: 20
      };
    }
  }

  // Helper to map token symbols to CoinGecko IDs
  private getTokenId(symbol: string): string {
    const symbolMap: {[key: string]: string} = {
      'INJ': 'injective-protocol',
      'TON': 'the-open-network',
      'SONIC': 'sonic-3' // Using 'sonic-3' as per your original code
    };
    
    return symbolMap[symbol] || symbol.toLowerCase();
  }
}