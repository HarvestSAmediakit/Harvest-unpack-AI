import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ShieldCheck } from 'lucide-react';

const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-sans selection:bg-[#5A5A40]/20">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-[#5A5A40] hover:underline mb-8 font-bold uppercase tracking-widest text-xs">
          <ChevronLeft size={16} /> Back to App
        </Link>
        
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-[#1a1a1a]/5 border border-[#1a1a1a]/5">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center text-[#5A5A40]">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
          </div>

          <div className="prose prose-stone max-w-none space-y-6 text-[#1a1a1a]/70 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">1. Information We Collect</h2>
              <p>
                AI Podcasts ("we", "us", or "our") collects information that you provide directly to us when you use our application. 
                This includes your Google account information when you choose to connect your Google Drive for podcast storage.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">2. How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Provide, maintain, and improve our services.</li>
                <li>Facilitate the upload of generated podcasts to your Google Drive.</li>
                <li>Communicate with you about your account and our services.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">3. Google Drive Data</h2>
              <p>
                Our application requests access to your Google Drive specifically to create and manage podcast files generated within the app. 
                We only access the files we create and do not read or modify other files in your Google Drive unless explicitly required for the app's functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">4. Data Security</h2>
              <p>
                We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">5. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at damstert11@gmail.com.
              </p>
            </section>
          </div>
        </div>
        
        <footer className="mt-12 text-center text-[#1a1a1a]/40 text-xs uppercase tracking-widest font-bold">
          &copy; 2026 AI Podcasts &bull; Last Updated: March 29, 2026
        </footer>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
