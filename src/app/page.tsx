"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Users, Camera, Clock, MapPin, QrCode, Share2, Lock, Unlock, Eye, UserPlus, LogIn, X } from 'lucide-react';

export default function HomePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [userName, setUserName] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [albumTitle, setAlbumTitle] = useState('');

  const handleCreateAlbum = () => {
    if (!userName.trim() || !albumTitle.trim()) {
      toast.error('Please provide both your name and album title');
      return;
    }

    // Simulate album creation
    const newAlbumId = `wedding-${Date.now()}`;
    const newQrCode = `https://wedding-app.com/join/${newAlbumId}`;
    setQrCode(newQrCode);
    setCurrentStep(2);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        className="max-w-2xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-400 rounded-full mb-4"
            whileHover={{ scale: 1.05, rotate: 360 }}
            transition={{ duration: 0.3 }}
          >
            <Heart className="h-8 w-8 text-white" fill="currentColor" />
          </motion.div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Create Your Wedding Album</h1>
          <p className="text-gray-600">Start capturing precious moments with your loved ones</p>
        </motion.div>

        <motion.div
          className="flex items-center justify-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((step) => (
              <motion.div
                key={step}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step < currentStep
                  ? 'bg-green-500 text-white'
                  : step === currentStep
                    ? 'bg-rose-500 text-white'
                    : 'bg-gray-200 text-gray-500'}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 * step }}
              >
                {step < currentStep ? "✓" : step + 1}
              </motion.div>
            ))}
            <div className="w-16 h-0.5 bg-gray-300 ml-2" />
          </div>
        </motion.div>

        {currentStep === 0 && (
          <motion.div
            className="bg-white rounded-3xl shadow-xl p-8 mb-6"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <Users className="h-6 w-6 text-rose-500" />
              Your Information
            </h2>

            <div className="space-y-5">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                  required
                />
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Album Title
                </label>
                <input
                  type="text"
                  value={albumTitle}
                  onChange={(e) => setAlbumTitle(e.target.value)}
                  placeholder="E.g., 'John & Jane's Wedding'"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                  required
                />
              </motion.div>

              <motion.button
                onClick={() => setCurrentStep(1)}
                disabled={!userName.trim() || !albumTitle.trim()}
                className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Continue to QR Code
              </motion.button>
            </div>
          </motion.div>
        )}

        {currentStep === 1 && (
          <motion.div
            className="bg-white rounded-3xl shadow-xl p-8 mb-6"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
              <QrCode className="h-6 w-6 text-purple-500" />
              Your QR Code
            </h2>

            <div className="text-center space-y-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-8 inline-block">
                <div className="w-48 h-48 bg-white rounded-xl flex items-center justify-center shadow-inner mb-4">
                  <div className="text-center">
                    <QrCode className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500 font-mono">
                      wedding-{Date.now().toString().slice(-6)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600">Scan this code with your phone</p>
              </div>

              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-sm text-blue-800 flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Open camera app and scan QR code to join
                </p>
              </div>

              <div className="flex gap-4">
                <motion.button
                  onClick={() => setCurrentStep(0)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Back
                </motion.button>

                <motion.button
                  onClick={() => setCurrentStep(2)}
                  className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  I've Scanned It
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {currentStep === 2 && (
          <motion.div
            className="bg-white rounded-3xl shadow-xl p-8 mb-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center space-y-6">
              <motion.div
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1 }}
              >
                <CheckCircle className="h-10 w-10 text-green-600" />
              </motion.div>

              <h2 className="text-2xl font-semibold text-gray-800">
                🎉 Wedding Album Created Successfully!
              </h2>

              <div className="bg-green-50 rounded-xl p-6">
                <p className="text-green-800 mb-2">Album ID: wedding-{Date.now().toString().slice(-6)}</p>
                <p className="text-sm text-green-700">
                  Your QR code has been generated. Share it with guests to let them join your wedding album!
                </p>
              </div>

              <motion.button
                onClick={() => setCurrentStep(0)}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Create Another Album
              </motion.button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}