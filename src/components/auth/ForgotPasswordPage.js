import React from 'react';
import { Link } from 'react-router-dom';
import { Scale, Mail } from 'lucide-react';

const ForgotPasswordPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Scale className="w-10 h-10 text-blue-600" />
            <h1 className="text-3xl font-bold text-blue-600">Qanuni</h1>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Reset Password</h2>
          <p className="text-gray-500 mb-6">
            To reset your password, please contact your firm administrator.
          </p>
          <Link
            to="/login"
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 transition-colors"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
