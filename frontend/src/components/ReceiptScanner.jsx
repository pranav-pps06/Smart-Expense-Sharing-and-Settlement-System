import { useState, useRef } from 'react';
import { FaCamera, FaUpload, FaTimes, FaSpinner } from 'react-icons/fa';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function ReceiptScanner({ isOpen, onClose, onExpenseExtracted }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      setSelectedFile(file);
      setExtractedData(null);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) {
      toast.error('Please select an image first');
      return;
    }

    setIsScanning(true);
    const formData = new FormData();
    formData.append('receipt', selectedFile);

    try {
      const response = await axios.post(
        '/api/ai/scan-receipt',
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' }
        }
      );

      if (response.data.success) {
        setExtractedData(response.data.data);
        toast.success('Receipt scanned successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to scan receipt');
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error(error.response?.data?.message || 'Failed to scan receipt');
    } finally {
      setIsScanning(false);
    }
  };

  const handleUseExpense = () => {
    if (extractedData && onExpenseExtracted) {
      onExpenseExtracted({
        amount: extractedData.amount,
        description: extractedData.description,
        merchant: extractedData.merchant
      });
      onClose();
      toast.success('Expense data loaded!');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setExtractedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-teal-600 text-white p-4 rounded-t-lg flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-3">
            <FaCamera className="text-2xl" />
            <div>
              <h2 className="text-xl font-bold">Scan Receipt</h2>
              <p className="text-sm opacity-90">Upload a receipt to extract expense details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white hover:bg-opacity-20 p-2 rounded-full transition"
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Area */}
          {!preview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition cursor-pointer"
                 onClick={() => fileInputRef.current?.click()}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <FaUpload className="text-5xl text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-semibold text-gray-700 mb-2">
                Click to upload receipt image
              </p>
              <p className="text-sm text-gray-500">
                Supports: JPG, PNG, WebP (Max 5MB)
              </p>
            </div>
          ) : (
            <>
              {/* Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-700">Receipt Preview</h3>
                  <button
                    onClick={handleReset}
                    className="text-sm text-red-500 hover:text-red-700"
                  >
                    Change Image
                  </button>
                </div>
                <img
                  src={preview}
                  alt="Receipt preview"
                  className="w-full max-h-64 object-contain border border-gray-200 rounded-lg"
                />
              </div>

              {/* Scan Button */}
              {!extractedData && (
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 font-semibold"
                >
                  {isScanning ? (
                    <>
                      <FaSpinner className="animate-spin" />
                      Scanning Receipt...
                    </>
                  ) : (
                    <>
                      <FaCamera />
                      Scan Receipt
                    </>
                  )}
                </button>
              )}

              {/* Extracted Data */}
              {extractedData && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-green-800 flex items-center gap-2">
                      <span className="text-2xl">✓</span>
                      Extracted Data
                    </h3>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b border-green-200">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-bold text-lg text-green-700">₹{extractedData.amount}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-green-200">
                      <span className="text-gray-600">Description:</span>
                      <span className="font-semibold">{extractedData.description}</span>
                    </div>
                    {extractedData.merchant && (
                      <div className="flex justify-between items-center py-2 border-b border-green-200">
                        <span className="text-gray-600">Merchant:</span>
                        <span className="font-semibold">{extractedData.merchant}</span>
                      </div>
                    )}
                    {extractedData.date && (
                      <div className="flex justify-between items-center py-2 border-b border-green-200">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-semibold">{extractedData.date}</span>
                      </div>
                    )}
                    {extractedData.items && extractedData.items.length > 0 && (
                      <div className="py-2">
                        <span className="text-gray-600 block mb-2">Items:</span>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {extractedData.items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button
                      onClick={handleUseExpense}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold"
                    >
                      Use This Data
                    </button>
                    <button
                      onClick={handleReset}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition font-semibold"
                    >
                      Scan Another
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-800 mb-2">Tips for best results:</h4>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Ensure the receipt is well-lit and clear</li>
              <li>Place receipt on a flat surface</li>
              <li>Include the total amount in the photo</li>
              <li>Avoid shadows and glare</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
