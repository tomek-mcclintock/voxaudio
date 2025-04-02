// src/app/privacy/english-policy.tsx
export default function EnglishPrivacyPolicy() {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow p-8">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-3xl font-bold">Privacy Notice</h1>
              <div>
                <a href="/privacy?lang=de" className="text-sm text-blue-600 hover:underline">Deutsch</a>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">Last Updated: April 2025</p>
            
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Introduction</h2>
              <p className="mb-4">
                VoxAudio Ltd ("we," "us," or "our") is committed to protecting the privacy and security of your personal information. This Privacy Notice describes how we collect, use, disclose, and safeguard your information when you use our feedback collection services (the "Service").
              </p>
              <p className="mb-4">
                We act as a data processor on behalf of our business clients (the "Client") who use our Service to collect feedback from their customers. The Client is the data controller with respect to the information collected through our Service. This Privacy Notice explains our data practices, and the rights and choices available to individuals whose data we process.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. Information We Collect</h2>
              <p className="mb-4">
                We collect and process the following categories of personal information through our Service:
              </p>
              <div className="ml-6 mb-4">
                <h3 className="font-semibold mb-2">2.1 Feedback Data</h3>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>Ratings and scores (such as Net Promoter Score)</li>
                  <li>Voice recordings (when you choose to provide voice feedback)</li>
                  <li>Transcriptions of voice feedback</li>
                  <li>Text-based feedback and comments</li>
                  <li>Responses to survey questions</li>
                </ul>
  
                <h3 className="font-semibold mb-2">2.2 Identifier Information</h3>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>Reference numbers (such as order numbers, ticket numbers, or customer identifiers)</li>
                  <li>Session identifiers</li>
                  <li>Technical identifiers necessary to provide the Service</li>
                </ul>
  
                <h3 className="font-semibold mb-2">2.3 Technical Information</h3>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li>IP address</li>
                  <li>Browser type and version</li>
                  <li>Device information</li>
                  <li>Operating system</li>
                  <li>Time stamps and dates of feedback submission</li>
                </ul>
              </div>
              <p className="mb-4">
                We do not knowingly collect personal information from individuals under 16 years of age. If you are under 16, please do not provide any personal information to us.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
              <p className="mb-4">
                We process your information for the following purposes:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>To provide our feedback collection and analysis services to our Clients</li>
                <li>To transcribe voice recordings into text using automated processes</li>
                <li>To analyze feedback content and sentiment to generate insights and reports</li>
                <li>To identify trends, patterns, and themes in feedback</li>
                <li>To enable our Clients to improve their products, services, and customer experience</li>
                <li>To maintain and improve our Service</li>
                <li>To comply with legal obligations</li>
                <li>To protect the security and integrity of our Service</li>
              </ul>
              <p className="mb-4">
                The legal basis for our processing of your personal information varies depending on the type of processing and the applicable laws, but generally includes:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Legitimate interests pursued by our Clients (such as understanding customer satisfaction and improving their products and services)</li>
                <li>Your consent, which you provide when submitting feedback</li>
                <li>Performance of contracts to which our Clients are party</li>
                <li>Compliance with legal obligations</li>
              </ul>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. How We Process Your Information</h2>
              <p className="mb-4">
                Your feedback is processed using various technologies and methodologies:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Voice recordings are transcribed using machine learning technologies, including third-party transcription services</li>
                <li>Feedback analysis is performed using artificial intelligence and natural language processing</li>
                <li>Feedback data is stored in secure cloud-based databases with appropriate access controls</li>
                <li>We employ analytical technologies to identify patterns and insights in aggregate feedback data</li>
              </ul>
              <p className="mb-4">
                All data processing is conducted in accordance with applicable data protection laws and with appropriate security measures in place.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Disclosure of Your Information</h2>
              <p className="mb-4">
                We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>With our Clients:</strong> We share the feedback you provide with the Client organization that requested the feedback.</li>
                <li><strong>Service Providers:</strong> We engage trusted third-party service providers to perform functions and provide services to us, such as cloud hosting, data analysis, transcription services, and customer support. These service providers have access to your information only to perform these tasks on our behalf.</li>
                <li><strong>Business Transfers:</strong> If we are involved in a merger, acquisition, financing, or sale of business assets, your information may be transferred as part of that transaction.</li>
                <li><strong>Legal Requirements:</strong> We may disclose your information if required to do so by law or in response to valid requests by public authorities.</li>
                <li><strong>With Your Consent:</strong> We may share your information with third parties when we have your consent to do so.</li>
              </ul>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">6. International Data Transfers</h2>
              <p className="mb-4">
                Your data may be transferred to and processed in countries other than the country in which you are resident. These countries may have data protection laws that are different from those of your country.
              </p>
              <p className="mb-4">
                Specifically, our servers are located in various regions, and we use service providers that may be located in different countries. This means that when we collect your personal information, we may process it in any of these countries.
              </p>
              <p className="mb-4">
                By providing your feedback, you consent to this transfer, storage, and processing. We take appropriate safeguards to ensure that your personal information remains protected in accordance with this Privacy Notice, including the implementation of standard contractual clauses for transfers of personal information between our group companies and third-party service providers where appropriate.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">7. Data Security</h2>
              <p className="mb-4">
                We have implemented appropriate technical and organizational measures designed to protect the security of the personal information we process. Despite our safeguards, no security system is impenetrable, and due to the inherent nature of the Internet, we cannot guarantee that information, during transmission or while stored on our systems, is absolutely safe from intrusion by others.
              </p>
              <p className="mb-4">
                Our security measures include:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments of our systems</li>
                <li>Access controls and authentication procedures</li>
                <li>Regular monitoring of systems for possible vulnerabilities and attacks</li>
                <li>Business continuity and disaster recovery plans</li>
              </ul>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">8. Data Retention</h2>
              <p className="mb-4">
                We will retain your personal information only for as long as is necessary for the purposes set out in this Privacy Notice, or as required to comply with our legal obligations, resolve disputes, and enforce our agreements.
              </p>
              <p className="mb-4">
                The criteria used to determine our retention periods include:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>The duration of our contractual relationship with our Client</li>
                <li>Whether there is a legal obligation to which we are subject</li>
                <li>Whether retention is advisable in light of our legal position (such as in regard to applicable statutes of limitations, litigation, or regulatory investigations)</li>
              </ul>
              <p className="mb-4">
                After the retention period expires, personal information will be deleted or anonymized in accordance with applicable laws.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">9. Your Rights</h2>
              <p className="mb-4">
                Depending on your location and subject to applicable law, you may have the following rights with respect to your personal information:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li><strong>Access:</strong> The right to request access to your personal information</li>
                <li><strong>Rectification:</strong> The right to request that we correct inaccurate or incomplete personal information</li>
                <li><strong>Erasure:</strong> The right to request the deletion of your personal information in certain circumstances</li>
                <li><strong>Restriction:</strong> The right to request that we restrict the processing of your personal information in certain circumstances</li>
                <li><strong>Data Portability:</strong> The right to receive your personal information in a structured, commonly used, and machine-readable format</li>
                <li><strong>Objection:</strong> The right to object to the processing of your personal information in certain circumstances</li>
                <li><strong>Withdraw Consent:</strong> Where processing is based on consent, the right to withdraw your consent at any time</li>
                <li><strong>Complaint:</strong> The right to lodge a complaint with a supervisory authority</li>
              </ul>
              <p className="mb-4">
                Please note that these rights are not absolute and may be subject to limitations under applicable law. Since we process personal information as a service provider on behalf of our Clients, we may refer your request to the relevant Client and assist them as needed in responding to your request.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">10. Third-Party Services</h2>
              <p className="mb-4">
                Our Service may use third-party services for functions such as data analytics, voice transcription, and cloud storage. These third parties may have access to your personal information only to perform these functions on our behalf and are obligated not to disclose or use it for any other purpose.
              </p>
              <p className="mb-4">
                We use the following categories of third-party service providers:
              </p>
              <ul className="list-disc pl-6 mb-4 space-y-2">
                <li>Cloud hosting and storage providers</li>
                <li>AI and machine learning services for transcription and analysis</li>
                <li>Analytics services</li>
                <li>Database management services</li>
                <li>Customer relationship management tools</li>
              </ul>
              <p className="mb-4">
                Each of these service providers has their own privacy policies which govern their use of personal information.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">11. Changes to This Privacy Notice</h2>
              <p className="mb-4">
                We may update this Privacy Notice from time to time in response to changing legal, technical, or business developments. When we update our Privacy Notice, we will take appropriate measures to inform you, consistent with the significance of the changes we make.
              </p>
              <p className="mb-4">
                We will obtain your consent to any material changes if and where this is required by applicable data protection laws. You can see when this Privacy Notice was last updated by checking the "Last Updated" date at the top of this page.
              </p>
            </section>
  
            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">12. Contact Us</h2>
              <p className="mb-4">
                If you have any questions or concerns about this Privacy Notice or our data practices, please contact us at:
              </p>
              <div className="mb-4">
                <p>Privacy Team</p>
                <p>VoxAudio Ltd</p>
                <p>Email: <a href="mailto:privacy@voxaudio.com" className="text-blue-600 hover:underline">privacy@voxaudio.com</a></p>
              </div>
              <p className="mb-4">
                We will respond to your inquiries as soon as possible and within the timeframe specified by applicable law.
              </p>
            </section>
  
            <footer className="mt-12 pt-6 border-t border-gray-200 text-sm text-gray-600">
              <p className="mb-2">© 2025 VoxAudio Ltd. All rights reserved.</p>
              <p>This Privacy Notice is provided for informational purposes only and does not constitute legal advice.</p>
            </footer>
          </div>
        </div>
      </div>
    );
  }