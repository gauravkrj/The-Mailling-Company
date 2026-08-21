import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, FileText, Scale } from 'lucide-react';

export default function TermsOfServiceView() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8F8F8] text-[#1A1A1A] font-sans antialiased py-8 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header Navigation */}
        <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-8 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="btn-secondary text-xs py-2 px-4 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <span className="text-[11px] font-black text-[#054048] bg-[#FEF6EA] border border-black px-3 py-1 rounded-full uppercase tracking-wider">
              Legal Documentation
            </span>
          </div>

          <div className="space-y-1 pt-2">
            <h1 className="text-2xl md:text-3xl font-black text-[#1A1A1A]">Terms of Service</h1>
            <p className="text-xs text-[#5A5A5A] font-bold">
              Last updated: 21 August, 2026
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-10 space-y-8 shadow-sm text-xs md:text-sm leading-relaxed text-[#1A1A1A] font-medium">
          <p className="text-xs md:text-sm text-[#5A5A5A] leading-relaxed font-semibold">
            Welcome to The Mailling Company. By creating an account or using our service, you agree to these Terms of Service. Please read them carefully.
          </p>

          {/* Section 1 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">1. What We Provide</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              The Mailling Company is a tool that helps you send personalized bulk email campaigns using your own connected email-sending account (Gmail, SMTP, or Amazon SES). We provide the tooling; you are responsible for the content you send and the recipients you send it to.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">2. Your Responsibilities</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">By using this service, you agree that:</p>
            <ul className="list-disc pl-5 space-y-2 text-xs md:text-sm text-[#5A5A5A]">
              <li>You will only upload and email contacts you have a legitimate right to contact — including complying with applicable anti-spam laws (such as India's IT Act rules on commercial email, CAN-SPAM in the US, or GDPR/PECR in the EU/UK where applicable) and any consent requirements those laws impose</li>
              <li>You will not use this service to send spam, phishing content, malicious links, or any content that violates applicable law</li>
              <li>Every campaign you send must include a working, honest unsubscribe mechanism (the app provides this automatically — you may not remove or disable it)</li>
              <li>You are responsible for the accuracy of the contact information you upload and the content you send</li>
              <li>You will not attempt to circumvent rate limits, abuse AI-generation features, or interfere with the service's normal operation</li>
              <li>You are responsible for keeping your account credentials, and any sending-account credentials you connect, secure</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">3. Account Termination</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              We reserve the right to suspend or terminate accounts that violate these terms, including accounts used for spam, abuse, or illegal activity, with or without notice depending on severity.
            </p>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">4. Service Availability</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              We provide this service on an "as is" basis. While we work to keep it reliable, we don't guarantee uninterrupted availability, and we're not liable for losses resulting from service downtime, delivery failures caused by third-party providers (Gmail, AWS, your recipients' email providers), or your account's own reputation/deliverability outcomes.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">5. Free Service</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              This service is currently provided free of charge. You are responsible for any costs associated with your own connected sending accounts (e.g., Amazon SES sending fees, which are typically minimal — see AWS's own pricing). We reserve the right to introduce paid tiers or usage limits in the future, with reasonable notice.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">6. Intellectual Property</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              The Mailling Company's branding, design, and underlying software are our property. The contact data and email content you create remain yours.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">7. Limitation of Liability</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              To the maximum extent permitted by law, The Mailling Company is not liable for indirect, incidental, or consequential damages arising from your use of the service, including but not limited to damage to your sender reputation, email deliverability issues, or third-party actions.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">8. Changes to These Terms</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              We may update these terms from time to time. Continued use of the service after changes constitutes acceptance of the updated terms.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6 bg-[#FEF6EA] p-5 rounded-2xl border-2 border-black">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">9. Contact Us</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              Questions about these terms? Reach us at:
            </p>
            <div className="space-y-1 text-xs md:text-sm font-bold text-[#054048]">
              <div>• Email: <a href="mailto:themaillingcompany@gmail.com" className="underline">themaillingcompany@gmail.com</a></div>
              <div>• WhatsApp: <a href="https://wa.me/918670628044" target="_blank" rel="noopener noreferrer" className="underline">+91 8670628044</a></div>
            </div>
          </section>

          {/* Section 10 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">10. Governing Law</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              These terms are governed by the laws of India.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
}
