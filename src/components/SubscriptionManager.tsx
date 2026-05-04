import { useState, useEffect } from 'react';
import { ShieldAlert, Zap } from 'lucide-react';

const PLANS = {
  starter: { priceId: 'price_starter', monthly: 49, magazines: 1, issuesPerYear: 10, features: ['Basic analytics', 'Email support'] },
  pro: { priceId: 'price_1R8xRDEQ40o6Xz3Zl615EEDw', monthly: 199, magazines: 5, issuesPerYear: 'Unlimited', features: ['Advanced analytics', 'Custom voices', 'Priority support'] },
  enterprise: { priceId: 'price_enterprise', monthly: 999, magazines: 'Unlimited', issuesPerYear: 'Unlimited', features: ['White-label embed', 'API access', 'Dedicated account manager'] }
};

export function SubscriptionManager() {
  const [current, setCurrent] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Requires Auth header, usually provided by calling inside context or with firebase token.
    // For now we assume standard fetch with credentials or firebase auth token
    fetch('/api/subscription', {
        headers: {
             'Authorization': `Bearer ${localStorage.getItem('publisherToken') || ''}`
        }
    })
    .then(res => res.json())
    .then(data => setCurrent(data))
    .catch(console.error);
  }, []);

  const upgrade = async (priceId: string, amount: number, planName: string) => {
    setLoading(true);
    try {
        // Try Xero to generate an invoice
        const xeroRes = await fetch('/api/xero/invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'user@example.com',
                amount: amount, 
                planName: planName
            })
        });
        
        const xeroData = await xeroRes.json();
        if (xeroRes.ok && xeroData.status && xeroData.data?.onlineInvoiceUrl) {
            // Redirect the user to pay the Xero invoice online
            window.location.href = xeroData.data.onlineInvoiceUrl;
            return;
        }

        // If Xero fails (e.g. not connected), fallback to Paystack for African Markets
        const paystackRes = await fetch('/api/paystack/initialize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'user@example.com',
                amount: amount * 100 * 1500, // Roughly converting USD to NGN and multiplying by 100 for kobo
                currency: 'NGN'
            })
        });
        
        const paystackData = await paystackRes.json();
        if (paystackData.status && paystackData.data?.authorization_url) {
            window.location.href = paystackData.data.authorization_url;
            return;
        }

        // Fallback to Stripe if Paystack fails (or no secret key)
        const res = await fetch('/api/subscription/create-checkout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('publisherToken') || ''}`
            },
            body: JSON.stringify({
                priceId,
                successUrl: window.location.href,
                cancelUrl: window.location.href
            })
        });
        const data = await res.json();
        if (data.url) {
            window.location.href = data.url;
        } else {
            console.error('No redirect URL', data);
        }
    } catch(err) {
        console.error(err);
    }
    setLoading(false);
  };

  return (
    <div className="bg-tech-surface border border-[#333] rounded-xl p-8 mb-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="text-tech-accent" size={24} />
          <h2 className="text-2xl font-display font-black uppercase tracking-widest text-white">Subscription Plan</h2>
        </div>
        <a 
          href="/api/xero/connect"
          className="px-4 py-2 bg-[#13B5EA] hover:bg-[#0092c4] text-white text-sm font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-2"
        >
          Connect Xero
        </a>
      </div>
      <p className="text-tech-dim mb-8 font-sans">
        Current tier: <span className="text-tech-accent font-bold px-2 py-1 bg-tech-accent/10 rounded uppercase text-sm tracking-widest ml-2">{current?.tier || 'starter'}</span>
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(PLANS).map(([key, plan]) => (
          <div key={key} className={`border rounded-xl p-6 transition-all ${current?.tier === key ? 'border-tech-accent bg-tech-accent/5' : 'border-[#333] bg-[#111] hover:border-[#555]'}`}>
            <h3 className="text-xl font-bold uppercase tracking-widest text-white mb-2">{key}</h3>
            <div className="flex items-end gap-1 mb-6">
               <span className="text-3xl font-black text-tech-accent">${plan.monthly}</span>
               <span className="text-tech-dim text-sm uppercase tracking-widest mb-1">/mo</span>
            </div>
            <ul className="space-y-3 text-sm text-gray-300 font-sans mb-8">
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-tech-accent" /> {plan.magazines} magazine{typeof plan.magazines === 'number' && plan.magazines > 1 ? 's' : ''}</li>
              <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-tech-accent" /> {plan.issuesPerYear} issues/year</li>
              {plan.features.map(f => (
                <li key={f} className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-tech-accent" /> {f}
                </li>
              ))}
            </ul>
            {current?.tier !== key && key !== 'starter' && (
              <button 
                 onClick={() => upgrade(plan.priceId, plan.monthly, key)} 
                 disabled={loading} 
                 className="w-full bg-tech-accent text-black font-black uppercase tracking-widest py-3 rounded hover:bg-white transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
              >
                <Zap size={16} /> Upgrade Now
              </button>
            )}
            {current?.tier === key && (
              <div className="w-full text-center text-tech-dim font-bold uppercase tracking-widest text-sm py-3 border border-tech-dim/30 rounded">
                Active Plan
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
