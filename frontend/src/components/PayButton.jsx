import React, { useState } from 'react';
import axios from 'axios';

const PayButton = ({ provider='stripe', amount, currency='USD', jobId }) => {
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  const pay = async () => {
    setLoading(true);
    try {
      if (provider === 'stripe') {
        const { data } = await axios.post('/api/payments/stripe/create-intent',
          { amount, currency, job: jobId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data.mock) alert('Mock Stripe: payment successful!');
        else alert('Stripe clientSecret received. Integrate Stripe.js here.');
      } else {
        const { data } = await axios.post('/api/payments/razorpay/create-order',
          { amount, currency: 'INR', job: jobId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data.mock) alert('Mock Razorpay: payment successful!');
        else alert('Razorpay order created. Load Razorpay Checkout here.');
      }
    } finally { setLoading(false); }
  };

  return (
    <button className="btn btn-success" onClick={pay} disabled={loading}>
      {loading ? 'Processing…' : `Pay ${currency} ${amount}`}
    </button>
  );
};

export default PayButton;
