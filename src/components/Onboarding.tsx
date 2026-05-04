import { useState } from "react";

export function Onboarding() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState({ name: "", bio: "", website: "" });

  const register = async () => {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (res.ok) {
        localStorage.setItem("publisherToken", data.token);
        setStep(2);
    }
  };

  const updateProfile = async () => {
     await fetch("/api/publisher/profile", {
         method: "PUT",
         headers: { 
             "Content-Type": "application/json",
             "Authorization": `Bearer ${localStorage.getItem("publisherToken")}`
         },
         body: JSON.stringify(profile)
     });
     setStep(3);
  }

  const createMagazine = async () => {
      await fetch("/api/magazines", {
         method: "POST",
         headers: { 
             "Content-Type": "application/json",
             "Authorization": `Bearer ${localStorage.getItem("publisherToken")}`
         },
         body: JSON.stringify({ title: "My First Magazine", description: "Welcome to my magazine." })
     });
     setStep(4);
  }

  const subscribe = async () => {
      const res = await fetch("/api/subscription/create-checkout", {
         method: "POST",
         headers: { "Authorization": `Bearer ${localStorage.getItem("publisherToken")}` }
      });
      const data = await res.json();
      if (data.checkoutId) {
          // Load Peach Payments Checkout script
          const script = document.createElement("script");
          script.src = "https://sandbox-checkout.peachpayments.com/js/checkout.js";
          script.async = true;
          script.onload = () => {
              // @ts-ignore
              const checkout = window.Checkout.initiate({
                  key: data.entityId,
                  checkoutId: data.checkoutId,
                  events: {
                      onCompleted: () => window.location.href = "/dashboard?subscribed=true",
                      onCancelled: () => console.log("Payment cancelled")
                  }
              });
              checkout.render("#payment-form");
          };
          document.body.appendChild(script);
      } else if (data.url) {
          window.location.href = data.url;
      }
  }

  return (
    <div className="max-w-xl mx-auto p-8 bg-tech-surface rounded-2xl border border-tech-accent/20">
      <div id="payment-form"></div>
      {step === 1 && (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Register</h2>
            <input type="email" value={email || ""} placeholder="Email" className="w-full p-2 bg-slate-900 text-white rounded" onChange={e => setEmail(e.target.value)} />
            <input type="password" value={password || ""} placeholder="Password" className="w-full p-2 bg-slate-900 text-white rounded" onChange={e => setPassword(e.target.value)} />
            <button onClick={register} className="w-full p-2 bg-tech-accent text-slate-900 font-bold rounded">Next</button>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Profile</h2>
            <input value={profile.name || ""} placeholder="Magazine Name" className="w-full p-2 bg-slate-900 text-white rounded" onChange={e => setProfile({...profile, name: e.target.value})} />
            <textarea value={profile.bio || ""} placeholder="Bio" className="w-full p-2 bg-slate-900 text-white rounded" onChange={e => setProfile({...profile, bio: e.target.value})} />
            <button onClick={updateProfile} className="w-full p-2 bg-tech-accent text-slate-900 font-bold rounded">Next</button>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Create Magazine</h2>
            <button onClick={createMagazine} className="w-full p-2 bg-tech-accent text-slate-900 font-bold rounded">Create Magazine & Finish</button>
        </div>
      )}
      {step === 4 && (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Final Step: Activate Subscription</h2>
            <button onClick={subscribe} className="w-full p-2 bg-tech-accent text-slate-900 font-bold rounded">Subscribe (R199/mo)</button>
        </div>
      )}
    </div>
  );
}
