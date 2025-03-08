// DOM Elements
const tokenPrices = {
    'INJ': document.getElementById('inj-price'),
    'TON': document.getElementById('ton-price'),
    'SONIC': document.getElementById('sonic-price')
  };
  
  const tokenRisks = {
    'INJ': document.getElementById('inj-risk'),
    'TON': document.getElementById('ton-risk'),
    'SONIC': document.getElementById('sonic-risk')
  };
  
  const activePlansContainer = document.getElementById('active-plans');
  const totalInvestedElement = document.getElementById('total-invested');
  const activePlanCountElement = document.getElementById('active-plan-count');
  const lastExecutionElement = document.getElementById('last-execution');
  const recentTransactionsContainer = document.getElementById('recent-transactions');
  const refreshPricesButton = document.getElementById('refresh-prices');
  const tokenSelect = document.getElementById('token-select');
  const amountInput = document.getElementById('amount-input');
  const suggestedInvestmentElement = document.getElementById('suggested-investment');
  const frequencySelect = document.getElementById('frequency-select');
  const addressInput = document.getElementById('address-input');
  const createPlanButton = document.getElementById('create-plan-btn');
  
  const txModal = new bootstrap.Modal(document.getElementById('txModal'));
  const modalMessage = document.getElementById('modal-message');
  
  // API Endpoints
  const API = {
    PRICE: (symbol) => `/api/price/${symbol}`,
    ANALYZE: (symbol) => `/api/analyze/${symbol}`,
    HISTORY: (symbol) => `/api/history/${symbol}`,
    PLANS: '/api/dca/plans',
    STOP_PLAN: (planId) => `/api/dca/plans/${planId}/stop`,
    PLAN_TRANSACTIONS: (planId) => `/api/dca/plans/${planId}/transactions`,
    TOTAL_INVESTMENT: '/api/dca/total-investment'
  };
  
  // Initialize the application
  document.addEventListener('DOMContentLoaded', () => {
    init();
    setupEventListeners();
  });
  
  // Fetch token prices
  async function fetchTokenPrices() {
    const tokens = ['INJ', 'TON', 'SONIC'];
    
    for (const token of tokens) {
      try {
        const response = await fetch(API.PRICE(token));
        const data = await response.json();
        
        if (data.success) {
          tokenPrices[token].textContent = `$${data.price.toFixed(4)}`;
        } else {
          tokenPrices[token].textContent = 'Error';
          tokenPrices[token].classList.add('text-danger');
        }
        
        // Also fetch risk analysis
        fetchRiskAnalysis(token);
      } catch (error) {
        console.error(`Error fetching ${token} price:`, error);
        tokenPrices[token].textContent = 'Error';
        tokenPrices[token].classList.add('text-danger');
      }
    }
  }
  
  // Fetch risk analysis for a token
  async function fetchRiskAnalysis(token) {
    try {
      const response = await fetch(API.ANALYZE(token));
      const data = await response.json();
      
      if (data.success && data.analysis) {
        const riskLevel = data.analysis.riskLevel;
        tokenRisks[token].textContent = `Risk: ${capitalizeFirstLetter(riskLevel)}`;
        tokenRisks[token].className = 'risk-badge ' + getRiskColorClass(riskLevel);
      } else {
        tokenRisks[token].textContent = '';
      }
    } catch (error) {
      console.error(`Error fetching ${token} risk analysis:`, error);
      tokenRisks[token].textContent = '';
    }
  }
  
  // Fetch active plans
  async function fetchActivePlans() {
    try {
      const response = await fetch(API.PLANS);
      const data = await response.json();
      
      if (data.success && data.plans) {
        const activePlans = data.plans.filter(plan => plan.isActive);
        activePlanCountElement.textContent = activePlans.length;
        
        if (activePlans.length === 0) {
          activePlansContainer.innerHTML = '<p class="text-center">No active plans</p>';
          return;
        }
        
        // Find the most recent execution
        let lastExecution = null;
        for (const plan of activePlans) {
          if (plan.lastExecutionTime && (!lastExecution || new Date(plan.lastExecutionTime) > new Date(lastExecution))) {
            lastExecution = plan.lastExecutionTime;
          }
        }
        
        if (lastExecution) {
          lastExecutionElement.textContent = new Date(lastExecution).toLocaleString();
        } else {
          lastExecutionElement.textContent = 'None yet';
        }
        
        // Render active plans
        activePlansContainer.innerHTML = activePlans.map(plan => `
          <div class="plan-card mb-3">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6>${plan.tokenSymbol}</h6>
                <div>$${plan.amount} ${getFrequencyText(plan.frequency)}</div>
                <div class="text-muted small">Total: $${plan.totalInvested.toFixed(2)}</div>
              </div>
              <button class="btn btn-sm btn-danger stop-plan-btn" data-plan-id="${plan._id}">Stop</button>
            </div>
          </div>
        `).join('');
        
        // Add event listeners to stop buttons
        document.querySelectorAll('.stop-plan-btn').forEach(button => {
          button.addEventListener('click', () => stopPlan(button.dataset.planId));
        });
      } else {
        activePlansContainer.innerHTML = '<p class="text-center">Error loading plans</p>';
      }
    } catch (error) {
      console.error('Error fetching active plans:', error);
      activePlansContainer.innerHTML = '<p class="text-center">Error loading plans</p>';
    }
  }
  
  // Fetch total investment
  async function fetchTotalInvestment() {
    try {
      const response = await fetch(API.TOTAL_INVESTMENT);
      const data = await response.json();
      
      if (data.success) {
        totalInvestedElement.textContent = `$${data.totalInvestment.toFixed(2)}`;
      } else {
        totalInvestedElement.textContent = 'Error';
      }
    } catch (error) {
      console.error('Error fetching total investment:', error);
      totalInvestedElement.textContent = 'Error';
    }
  }
  
  // Create a new DCA plan
  async function createPlan() {
    const tokenSymbol = tokenSelect.value;
    const amount = parseFloat(amountInput.value);
    const frequency = frequencySelect.value;
    const toAddress = addressInput.value;
    
    if (!tokenSymbol || isNaN(amount) || amount <= 0 || !frequency || !toAddress) {
      alert('Please fill in all fields correctly');
      return;
    }
    
    // Show processing modal
    txModal.show();
    modalMessage.textContent = `Creating DCA plan for ${tokenSymbol}...`;
    
    try {
      const response = await fetch(API.PLANS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tokenSymbol,
          amount,
          frequency,
          toAddress
        })
      });
      
      const data = await response.json();
      
      txModal.hide();
      
      if (data.success) {
        // Reset form
        document.getElementById('dca-form').reset();
        
        // Close modal
        const createPlanModal = bootstrap.Modal.getInstance(document.getElementById('createPlanModal'));
        createPlanModal.hide();
        
        // Update UI
        fetchActivePlans();
        fetchTotalInvestment();
        
        alert('DCA plan created successfully!');
      } else {
        alert(`Failed to create DCA plan: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating DCA plan:', error);
      txModal.hide();
      alert('An error occurred while creating the DCA plan. Please try again.');
    }
  }
  
  // Stop a DCA plan
  async function stopPlan(planId) {
    if (!confirm('Are you sure you want to stop this DCA plan?')) {
      return;
    }
    
    try {
      const response = await fetch(API.STOP_PLAN(planId), {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        fetchActivePlans();
        alert('DCA plan stopped successfully');
      } else {
        alert(`Failed to stop DCA plan: ${data.error}`);
      }
    } catch (error) {
      console.error('Error stopping DCA plan:', error);
      alert('An error occurred while stopping the DCA plan. Please try again.');
    }
  }
  
  // Update suggested investment amount when token changes
  async function updateSuggestedInvestment() {
    const token = tokenSelect.value;
    
    try {
      const response = await fetch(API.ANALYZE(token));
      const data = await response.json();
      
      if (data.success && data.analysis) {
        suggestedInvestmentElement.textContent = `$${data.analysis.suggestedInvestment}`;
        amountInput.value = data.analysis.suggestedInvestment;
      }
    } catch (error) {
      console.error('Error updating suggested investment:', error);
    }
  }
  
  // Initialize the application
  async function init() {
    await fetchTokenPrices();
    await fetchActivePlans();
    await fetchTotalInvestment();
    updateSuggestedInvestment();
  }
  
  // Set up event listeners
  function setupEventListeners() {
    refreshPricesButton.addEventListener('click', fetchTokenPrices);
    
    tokenSelect.addEventListener('change', updateSuggestedInvestment);
    
    createPlanButton.addEventListener('click', createPlan);
  }
  
  // Helper Functions
  function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
  
  function getRiskColorClass(riskLevel) {
    switch (riskLevel) {
      case 'low': return 'bg-success';
      case 'medium': return 'bg-warning';
      case 'high': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }
  
  function getFrequencyText(frequency) {
    switch (frequency) {
      case 'minute': return 'per minute';
      case 'hour': return 'per hour';
      case 'day': return 'per day';
      default: return '';
    }
  }