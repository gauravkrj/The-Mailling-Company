import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Mail, Lock, Globe, Server, FileText } from 'lucide-react';

export default function PrivacyPolicyView() {
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
            <h1 className="text-2xl md:text-3xl font-black text-[#1A1A1A]">Privacy Policy</h1>
            <p className="text-xs text-[#5A5A5A] font-bold">
              Last updated: 21 August, 2026
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="bg-white border-2 border-black rounded-2xl p-6 md:p-10 space-y-8 shadow-sm text-xs md:text-sm leading-relaxed text-[#1A1A1A] font-medium">
          <p className="text-xs md:text-sm text-[#5A5A5A] leading-relaxed font-semibold">
            The Mailling Company ("we," "us," "our") provides a tool that helps users send personalized bulk email campaigns from their own email accounts. This policy explains what information we collect, how we use it, and the choices you have.
          </p>

          {/* Section 1 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">1. Information We Collect</h2>
            <div className="space-y-3 text-xs md:text-sm text-[#5A5A5A]">
              <p>
                <strong className="text-[#1A1A1A]">Account information:</strong> When you sign up, we collect your name, email address, and (if you sign up with a password) a securely hashed version of your password. If you sign up with Google, we receive basic profile information from Google (name, email).
              </p>
              <p>
                <strong className="text-[#1A1A1A]">Contact data you upload:</strong> When you upload a spreadsheet of contacts to send campaigns to, we store that information — email addresses and any other details you include (name, company, role, or other fields you map) — in your account. This data belongs to you and is used solely to help you send and track your campaigns.
              </p>
              <p>
                <strong className="text-[#1A1A1A]">Sending account credentials:</strong> If you connect a Gmail account, SMTP credentials, or Amazon SES access keys to send campaigns, we store these credentials in encrypted form (AES-256-GCM). We never display your full credentials back to you or anyone else after you save them, and we never use them for anything other than sending the campaigns you create.
              </p>
              <p>
                <strong className="text-[#1A1A1A]">Email content:</strong> We store the subject lines and body content of the campaigns you create and send, including AI-personalized versions generated for individual contacts, so you can review what was actually sent.
              </p>
              <p>
                <strong className="text-[#1A1A1A]">Usage data:</strong> We collect basic information about how you use the app — pages visited, actions taken, campaign performance data (opens, clicks, bounces) — to help the product work and to help us improve it.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">2. How We Use Your Information</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">We use the information above to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm text-[#5A5A5A]">
              <li>Provide the core service: let you upload contacts, draft emails, and send campaigns through your connected sending account</li>
              <li>Generate AI-personalized email content, using your campaign brief and the contact data you provide (see Section 4 on third-party AI processing)</li>
              <li>Track and display campaign performance (opens, clicks, delivery status) back to you</li>
              <li>Maintain suppression lists so contacts who unsubscribe are not emailed again</li>
              <li>Communicate with you about your account (e.g., email verification, password resets, important service updates)</li>
              <li>Investigate and prevent abuse, fraud, or violations of our Terms of Service</li>
            </ul>
            <p className="text-xs md:text-sm font-bold text-[#054048] bg-[#FEF6EA] p-3 rounded-xl border border-black">
              We do not sell your personal information, or the contact data you upload, to any third party.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">3. Who Can See Your Data</h2>
            <div className="space-y-3 text-xs md:text-sm text-[#5A5A5A]">
              <p>
                <strong className="text-[#1A1A1A]">Our team:</strong> Authorized administrators of The Mailling Company can access account and usage data for support, troubleshooting, and abuse-prevention purposes. We do not access your connected sending account's decrypted credentials — these remain encrypted and are only used programmatically by our systems to send emails on your behalf.
              </p>
              <p>
                <strong className="text-[#1A1A1A]">Your contacts:</strong> The people you send campaigns to will see the email you send them, including your sender name/address. We do not share their contact information with anyone beyond what's necessary to deliver your campaign (e.g., your email service provider).
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">4. Third-Party Services We Use</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">To provide the service, we rely on the following third-party providers, each of which processes relevant data as necessary:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm text-[#5A5A5A]">
              <li><strong className="text-[#1A1A1A]">Google</strong> (if you sign in with Google, or connect a Gmail sending account) — processes your basic profile info and, for sending, your email content</li>
              <li><strong className="text-[#1A1A1A]">Amazon Web Services (Amazon SES)</strong> (if you connect an SES sending account) — processes email content and recipient addresses to deliver your campaigns</li>
              <li><strong className="text-[#1A1A1A]">Google Gemini (AI)</strong> — if you use AI-personalized content generation, your campaign brief and relevant contact details (e.g., name, company, role) are sent to Google's Gemini API to generate personalized email content. This content is used solely to generate your emails and is subject to Google's own data handling terms for their API.</li>
              <li><strong className="text-[#1A1A1A]">Cloud Database & Hosting Infrastructure</strong> — stores your account and campaign data securely</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">5. Data Security</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              We use encryption to protect sensitive data, including your sending account credentials, both in transit (HTTPS) and at rest (AES-256-GCM). However, no system is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">6. Data Retention</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              We retain your account and campaign data for as long as your account is active. If you delete your account, we delete your associated data (campaigns, contacts, sending account credentials) within <strong>30 days</strong>, except where we're required to retain certain records for legal or compliance purposes.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">7. Your Rights</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">You can:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs md:text-sm text-[#5A5A5A]">
              <li>Access, edit, or delete your uploaded contacts at any time through the Contacts page</li>
              <li>Delete your account entirely through Settings, which removes your associated data as described above</li>
              <li>Contact us with any questions or requests regarding your data (see Section 9)</li>
            </ul>
            <p className="text-xs md:text-sm text-[#5A5A5A] pt-1">
              If you are located in a jurisdiction with specific data protection rights (such as under India's Digital Personal Data Protection Act, 2023 [DPDP Act] or the EU's GDPR), you may have additional rights, including the right to request a copy of your data or to lodge a complaint with a relevant data protection authority.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">8. Children's Privacy</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              This service is not intended for use by anyone under the age of 18. We do not knowingly collect information from minors.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6 bg-[#FEF6EA] p-5 rounded-2xl border-2 border-black">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">9. Contact Us</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              If you have questions about this Privacy Policy or how we handle your data, contact us at:
            </p>
            <div className="space-y-1 text-xs md:text-sm font-bold text-[#054048]">
              <div>• Email: <a href="mailto:themaillingcompany@gmail.com" className="underline">themaillingcompany@gmail.com</a></div>
              <div>• WhatsApp: <a href="https://wa.me/918670628044" target="_blank" rel="noopener noreferrer" className="underline">+91 8670628044</a></div>
            </div>
          </section>

          {/* Section 10 */}
          <section className="space-y-3 border-t-2 border-black/10 pt-6">
            <h2 className="text-base md:text-lg font-black text-[#1A1A1A]">10. Changes to This Policy</h2>
            <p className="text-xs md:text-sm text-[#5A5A5A]">
              We may update this policy from time to time. We'll notify you of significant changes by email or through a notice in the app.
            </p>
          </section>
        </div>

      </div>
    </div>
  );
}
