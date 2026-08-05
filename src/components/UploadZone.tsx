"use client";

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle, AlertCircle, Image as ImageIcon, Video, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface UploadZoneProps {
  onUpload: (files: FileList) => Promise<void>;
  albumId: string;
  userId: string;
  maxSize?: number;
}

export function UploadZone({ onUpload, albumId, userId, maxSize = 50 * 1024 * 1024 }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxSize) {
      return `File too large. Maximum size is ${Math.round(maxSize / (1024 * 1024))}MB`;
    }

    // Check file type
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const videoTypes = ['video/mp4', 'video/quicktime', 'video/webm'];
    const allowedTypes = [...imageTypes, ...videoTypes];

    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported. Please upload images or videos only';
    }

    return null;
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate all files
    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      toast.error(errors.join('\n'));
      return;
    }

    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress({});

    try {
      // Simulate upload progress for demo
      const fileNames = validFiles.map(f => f.name);
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          fileNames.forEach(name => {
            if (!newProgress[name]) {
              newProgress[name] = Math.min((newProgress[name] || 0) + Math.random() * 30, 90);
            }
          });
          return newProgress;
        });
      }, 500);

      // Prepare FormData for API call
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('files', file);
      });
      formData.append('albumId', albumId);
      formData.append('userId', userId);

      // Call the upload API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      clearInterval(progressInterval);
      setUploadProgress({});

      const result = await response.json();
      toast.success(result.message || `${validFiles.length} file(s) uploaded successfully!`);
      onUpload(validFiles as any as FileList);

    } catch (error) {
      clearInterval(progressInterval);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="relative">
      <motion.div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${isDragOver
          ? 'border-rose-500 bg-rose-50 dark:border-rose-400 dark:bg-rose-950/20'
          : 'border-gray-300 dark:border-gray-600 hover:border-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/10'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        <motion.div
          className="flex flex-col items-center space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {isUploading ? (
            <motion.div
              className="flex flex-col items-center space-y-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div className="relative">
                <Upload className="h-16 w-16 text-rose-500 animate-pulse" />
                <motion.div
                  className="absolute inset-0 border-4 border-rose-500 border-t-transparent rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Uploading files...</p>
            </motion.div>
          ) : (
            <>
              <motion.div
                className="flex justify-center space-x-4"
                whileHover={{ scale: 1.1 }}
              >
                <ImageIcon className="h-12 w-12 text-gray-400" />
                <Video className="h-12 w-12 text-gray-400" />
              </motion.div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2">
                  Drop files here or click to upload
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Supports images (JPG, PNG, GIF, WebP) and videos (MP4, QuickTime, WebM)
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Maximum file size: {Math.round(maxSize / (1024 * 1024))}MB
                </p>
              </div>
              <motion.button
                onClick={() => fileInputRef.current?.click()}
                className="px-8 py-3 bg-gradient-to-r from-rose-500 to-pink-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                Select Files
              </motion.button>
            </>
          )}
        </motion.div>
      </motion.div>

      {/* Upload Progress */}
      <AnimatePresence>
        {Object.keys(uploadProgress).length > 0 && (
          <motion.div
            className="mt-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">Upload Progress</h4>
            {Object.entries(uploadProgress).map(([fileName, progress]) => (
              <div key={fileName} className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400 truncate max-w-xs">
                    {fileName}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {Math.round(progress)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <motion.div
                    className="bg-gradient-to-r from-rose-500 to-pink-500 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}