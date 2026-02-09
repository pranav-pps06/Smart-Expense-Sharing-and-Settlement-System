import { useState, useRef } from 'react';
import { FaCamera, FaUpload, FaTimes, FaSpinner, FaCheck } from 'react-icons/fa';
import axios from 'axios';

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
        alert('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setExtractedData(null);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!selectedFile) return;
    setIsScanning(true);
    const formData = new FormData();
    formData.append('receipt', selectedFile);

    try {
      const response = await axios.post('/api/ai/scan-receipt', formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (response.data.success) {
        setExtractedData(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to scan receipt');
      }
    } catch (error) {
      console.error('Scan error:', error);
      alert(error.response?.data?.message || 'Failed to scan receipt');
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
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreview(null);
    setExtractedData(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111] border border-gray-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-black border-b border-gray-800 text-white p-4 rounded-t-xl flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#C8FF01]/20 flex items-center justify-center">
              <FaCamera className="text-xl text-[#C8FF01]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#C8FF01]">Scan Receipt</h2>
              <p className="text-xs text-gray-500">AI-powered extraction</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:bg-white/10 p-2 rounded-full transition text-gray-400 hover:text-white">
            <FaTimes />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Upload Area */}
          {!preview ? (
            <div
              className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center hover:border-[#C8FF01] transition cursor-pointer bg-black/50"
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
              <FaUpload className="text-4xl text-gray-600 mx-auto mb-4" />
              <p className="text-gray-300 font-medium mb-1">Click to upload receipt</p>
              <p className="text-xs text-gray-600">JPG, PNG, WebP (Max 5MB)</p>
            </div>
          ) : (
            <>
              {/* Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Receipt Preview</span>
                  <button onClick={handleReset} className="text-xs text-red-400 hover:text-red-300">Change</button>
                </div>
                <img src={preview} alt="Receipt" className="w-full max-h-48 object-contain border border-gray-800 rounded-lg bg-black" />
              </div>

              {/* Scan Button */}
              {!extractedData && (
                <button
                  onClick={handleScan}
                  disabled={isScanning}
                  className="w-full bg-[#C8FF01] text-black py-3 rounded-lg hover:bg-[#d4ff33] disabled:bg-gray-800 disabled:text-gray-500 transition flex items-center justify-center gap-2 font-semibold"
                >
                  {isScanning ? <><FaSpinner className="animate-spin" /> Scanning...</> : <><FaCamera /> Scan Receipt</>}
                </button>
              )}

              {/* Extracted Data */}
              {extractedData && (
                <div className="bg-black border border-[#C8FF01]/30 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-[#C8FF01] font-semibold">
                    <FaCheck /> Extracted Data
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between border-b border-gray-800 pb-2">
                      <span className="text-gray-500">Amount</span>
                      <span className="text-[#C8FF01] font-bold text-lg">₹{extractedData.amount}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-800 pb-2">
                      <span className="text-gray-500">Description</span>
                      <span className="text-white">{extractedData.description}</span>
                    </div>
                    {extractedData.merchant && (
                      <div className="flex justify-between border-b border-gray-800 pb-2">
                        <span className="text-gray-500">Merchant</span>
                        <span className="text-white">{extractedData.merchant}</span>
                      </div>
                    )}
                    {extractedData.date && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date</span>
                        <span className="text-white">{extractedData.date}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleUseExpense} className="flex-1 bg-[#C8FF01] text-black py-2 rounded-lg hover:bg-[#d4ff33] font-semibold transition">
                      Use This
                    </button>
                    <button onClick={handleReset} className="flex-1 bg-gray-800 text-gray-300 py-2 rounded-lg hover:bg-gray-700 transition">
                      Scan Another
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Tips */}
          <div className="bg-black/50 border border-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1 font-medium">Tips for best results:</p>
            <ul className="text-xs text-gray-600 space-y-0.5 list-disc list-inside">
              <li>Ensure receipt is well-lit and clear</li>
              <li>Include the total amount in frame</li>
              <li>Avoid shadows and glare</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
