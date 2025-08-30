/**
 * Midtrans Integration for KomplekKita
 * This file handles the integration with Midtrans payment gateway
 */

// Configuration
const DEMO_MODE = true; // Set to false when integrating with real backend + real client key
const MIDTRANS_CLIENT_KEY = 'SB-Mid-client-YOUR_CLIENT_KEY'; // Replace with your actual client key
const MIDTRANS_URL = 'https://app.sandbox.midtrans.com/snap/snap.js';
const MIDTRANS_ORIGIN = 'https://app.sandbox.midtrans.com';

// Prevent cross-origin errors in demo mode
if (DEMO_MODE) {
  console.log('[DEMO_MODE] Running in demo mode - no actual Midtrans API calls will be made');
}

// Load Midtrans Snap library
function loadMidtransScript() {
  return new Promise((resolve, reject) => {
    if (DEMO_MODE) {
      // In demo mode we skip loading external script to avoid cross-origin errors
      console.log('Demo mode active: Skipping Midtrans script loading');
      resolve();
      return;
    }
    if (document.querySelector(`script[src="${MIDTRANS_URL}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = MIDTRANS_URL;
    script.setAttribute('data-client-key', MIDTRANS_CLIENT_KEY);
    script.onload = () => resolve();
    script.onerror = (error) => reject(error);
    document.body.appendChild(script);
  });
}

// Create transaction and get snap token
async function createTransaction(orderDetails) {
  try {
    // In a real implementation, you would call your backend to create a transaction
    // and return a real Snap token. Demo mode simulates this.
    if (DEMO_MODE) {
      console.log('[DEMO_MODE] Creating simulated transaction');
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            token: 'dummy-token-' + Math.random().toString(36).substring(2, 15),
            order_id: 'demo-order-' + Date.now()
          });
        }, 500);
      });
    }

    // Example placeholder for real request (replace with your API call)
    // const res = await fetch('/api/midtrans/create-transaction', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(orderDetails)
    // });
    // if (!res.ok) throw new Error('Failed to create transaction');
    // return await res.json(); // { token, order_id }
    throw new Error('Backend integration not implemented. Set DEMO_MODE = true or implement the API.');
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

// Open Midtrans Snap payment page
async function openSnapPayment(snapToken, callbacks = {}) {
  try {
    // Default callbacks
    const defaultCallbacks = {
      onSuccess: function(result) {
        console.log('Payment success:', result);
        window.location.href = '/admin?payment=success';
      },
      onPending: function(result) {
        console.log('Payment pending:', result);
        alert('Menunggu pembayaran Anda!');
      },
      onError: function(result) {
        console.error('Payment error:', result);
        alert('Pembayaran gagal!');
      },
      onClose: function() {
        console.log('Customer closed the payment window');
        alert('Anda menutup popup tanpa menyelesaikan pembayaran');
      }
    };
    
    // Merge default callbacks with provided callbacks
    const mergedCallbacks = { ...defaultCallbacks, ...callbacks };
    
    if (DEMO_MODE) {
      // Simulate successful payment without contacting Midtrans
      console.warn('[DEMO_MODE] Simulating payment success. No real charge was made.');
      setTimeout(() => {
        mergedCallbacks.onSuccess({
          transaction_status: 'settlement',
          order_id: 'DEMO-' + Date.now(),
          snap_token: snapToken
        });
      }, 800);
      return;
    }
    
    // Only load Midtrans script if not in demo mode
    await loadMidtransScript();

    // Open Snap payment page (real flow)
    if (!window.snap || typeof window.snap.pay !== 'function') {
      throw new Error('Midtrans Snap is not loaded. Check client key and script loading.');
    }
    window.snap.pay(snapToken, mergedCallbacks);
  } catch (error) {
    console.error('Error opening Snap payment:', error);
    alert('Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.');
  }
}

// Process payment
async function processPayment(paymentDetails) {
  try {
    // Show loading state
    const payButton = document.getElementById('pay-button');
    if (payButton) {
      payButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
      payButton.disabled = true;
    }
    
    if (DEMO_MODE) {
      console.log('[DEMO_MODE] Processing payment in demo mode');
    }
    
    // Create transaction and get token
    const transaction = await createTransaction(paymentDetails);
    
    // Open Snap payment page
    await openSnapPayment(transaction.token, {
      onSuccess: function(result) {
        console.log('Payment success:', result);
        saveTransactionToDatabase(transaction.order_id, 'success', result);
        window.location.href = '/admin?payment=success';
      },
      onPending: function(result) {
        console.log('Payment pending:', result);
        saveTransactionToDatabase(transaction.order_id, 'pending', result);
        alert('Menunggu pembayaran Anda!');
      },
      onError: function(result) {
        console.error('Payment error:', result);
        saveTransactionToDatabase(transaction.order_id, 'error', result);
        alert('Pembayaran gagal!');
        if (payButton) {
          payButton.innerHTML = '<i class="fas fa-lock"></i> Bayar Sekarang';
          payButton.disabled = false;
        }
      },
      onClose: function() {
        console.log('Customer closed the payment window');
        if (payButton) {
          payButton.innerHTML = '<i class="fas fa-lock"></i> Bayar Sekarang';
          payButton.disabled = false;
        }
      }
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    alert('Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.');
    
    const payButton = document.getElementById('pay-button');
    if (payButton) {
      payButton.innerHTML = '<i class="fas fa-lock"></i> Bayar Sekarang';
      payButton.disabled = false;
    }
  }
}

// Save transaction to database
function saveTransactionToDatabase(orderId, status, result) {
  // In a real implementation, you would make an API call to your backend
  // to save the transaction details to your database
  console.log('Saving transaction to database:', { orderId, status, result });
  
  if (DEMO_MODE) {
    console.log('[DEMO_MODE] No actual database save in demo mode');
    return;
  }
  
  // Actual implementation would go here
  // Example:
  // fetch('/api/transactions', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ orderId, status, result })
  // });
}

// Export functions
window.MidtransIntegration = {
  processPayment,
  createTransaction,
  openSnapPayment
};