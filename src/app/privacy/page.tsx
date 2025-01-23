export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold mb-6">Privacy Notice - Ruggable Customer Feedback</h1>
          
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">1. What Information We Collect</h2>
            <p className="mb-2">When you provide feedback, we collect:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Your order ID</li>
              <li>Your NPS (Net Promoter Score) rating</li>
              <li>Voice recordings (if you choose to provide them)</li>
              <li>Transcriptions of your voice feedback</li>
              <li>Analysis of feedback themes and sentiment</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="mb-2">We use this information to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Improve our products and services</li>
              <li>Understand customer satisfaction</li>
              <li>Identify areas for improvement</li>
              <li>Analyze feedback trends</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">3. How We Process Your Information</h2>
            <p className="mb-4">Your feedback is processed using various technologies:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Voice recordings are transcribed using OpenAI's Whisper service, hosted on US-based servers</li>
              <li>Feedback analysis is performed using OpenAI's GPT-4 service, also on US-based servers</li>
              <li>Data is stored securely using industry-standard encryption</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">4. International Data Transfers</h2>
            <p className="mb-4">Your data may be transferred to and processed in the United States, where some of our service providers (including OpenAI) are located. By providing your feedback, you consent to this transfer and processing. We ensure appropriate safeguards are in place to protect your information.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 mb-4">
              <li>Access your personal information</li>
              <li>Request deletion of your feedback</li>
              <li>Withdraw your consent at any time</li>
              <li>Request a copy of your data</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">6. Contact Us</h2>
            <p className="mb-4">If you have any questions about this privacy notice or our feedback collection process, please contact us at <a href="mailto:privacy@ruggable.co.uk" className="text-blue-600 hover:underline">privacy@ruggable.co.uk</a></p>
          </section>

          <footer className="mt-8 pt-4 border-t text-sm text-gray-600">
            <p>Last updated: January 2024</p>
            <p>Ruggable UK Ltd</p>
          </footer>
        </div>
      </div>
    </div>
  );
}