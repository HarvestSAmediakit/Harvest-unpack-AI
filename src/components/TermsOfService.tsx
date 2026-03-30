import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, FileText } from 'lucide-react';

const TermsOfService: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#f5f5f0] text-[#1a1a1a] font-sans selection:bg-[#5A5A40]/20">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-[#5A5A40] hover:underline mb-8 font-bold uppercase tracking-widest text-xs">
          <ChevronLeft size={16} /> Back to App
        </Link>
        
        <div className="bg-white rounded-3xl p-8 md:p-12 shadow-xl shadow-[#1a1a1a]/5 border border-[#1a1a1a]/5">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[#5A5A40]/10 rounded-2xl flex items-center justify-center text-[#5A5A40]">
              <FileText size={24} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
          </div>

          <div className="prose prose-stone max-w-none space-y-6 text-[#1a1a1a]/70 leading-relaxed">
            <section>
              <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing or using AI Podcasts, you agree to be bound by these Terms of Service. 
                If you do not agree to these terms, please do not use our application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">2. Use of Our Services</h2>
              <p>
                You may use our services for lawful purposes only. 
                You are responsible for any content you generate or upload using our application.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">3. Google Drive Integration</h2>
              <p>
                Our application integrates with Google Drive to store generated podcasts. 
                By using this feature, you agree to comply with Google's Terms of Service and Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">4. Intellectual Property</h2>
              <p>
                AI Podcasts and its original content, features, and functionality are and will remain the exclusive property of AI Podcasts and its licensors.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">5. Limitation of Liability</h2>
              <p>
                In no event shall AI Podcasts, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">6. Changes to Terms</h2>
              <p>
                We reserve the right, at our sole discretion, to modify or replace these Terms at any time. 
                What constitutes a material change will be determined at our sole discretion.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-[#1a1a1a] mb-3">7. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at damstert11@gmail.com.
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

export default TermsOfService;
