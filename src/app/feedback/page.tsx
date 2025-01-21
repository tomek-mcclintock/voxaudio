import { Suspense } from 'react';
import FeedbackForm from '@/components/FeedbackForm';
import Header from '@/components/header';

export default function FeedbackPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 bg-gray-50">
        {!searchParams.id ? (
          <div className="flex items-center justify-center min-h-full p-4">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Invalid Link</h2>
              <p className="text-gray-600">
                This feedback link appears to be invalid. Please use the link provided in your email.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <Suspense
              fallback={
                <div className="flex justify-center items-center h-full">
                  <div className="text-gray-600">Loading...</div>
                </div>
              }
            >
              <FeedbackForm orderId={searchParams.id} />
            </Suspense>
          </div>
        )}
      </main>
    </div>
  );
}