import React, { ChangeEvent } from "react";
import { motion } from "framer-motion";
import { UploadCloud, FileCheck, Palette, Loader2 } from "lucide-react";

interface TemplateOption {
  value: string;
  label: string;
}

interface Props {
  selectedFile: File | null;
  selectedTemplate: string;
  processingStatus: string;
  isLoading: boolean;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onTemplateChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  onSubmit: (event: React.FormEvent) => void;
  onResetClick: () => void;
  maxFileSize: number;
  templateOptions: TemplateOption[];
}

const ACCENT_COLOR = "black";

const UploadForm: React.FC<Props> = ({
  selectedFile,
  selectedTemplate,
  processingStatus,
  isLoading,
  onFileChange,
  onTemplateChange,
  onSubmit,
  onResetClick,
  maxFileSize,
  templateOptions,
}) => {
  const buttonText = () => {
    switch (processingStatus) {
      case "idle":
        return "Format My Book";
      case "uploading":
        return "Uploading...";
      case "processing":
        return "Processing...";
      case "success":
        return "Format Another Book";
      case "error":
        return "Try Again";
      default:
        return "Format My Book";
    }
  };

  const getButtonClasses = () => {
    const baseClasses =
      "w-full px-6 py-3.5 text-base font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-200 ease-in-out flex items-center justify-center space-x-2 shadow-sm";

    if (isLoading) {
      return `${baseClasses} bg-gray-300 text-gray-700 cursor-wait`;
    } else if (processingStatus === "success") {
      return `${baseClasses} bg-green-600 hover:bg-green-700 text-white focus:ring-green-500`;
    } else if (processingStatus === "error") {
      return `${baseClasses} bg-red-600 hover:bg-red-700 text-white focus:ring-red-500`;
    } else if (selectedFile) {
      return `${baseClasses} bg-black hover:bg-gray-800 text-white focus:ring-gray-500`;
    } else {
      return `${baseClasses} bg-gray-200 text-gray-500 cursor-not-allowed`;
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (processingStatus === "success" || processingStatus === "error") {
      onResetClick();
    } else if (!isLoading && selectedFile) {
      onSubmit(e);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      onSubmit={handleFormSubmit}
      className="mb-6 pb-6 border-b border-gray-200 space-y-6"
    >
      <div>
        <label
          htmlFor="file-upload"
          className={`flex flex-col items-center justify-center w-full min-h-[9rem] border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ease-in-out
                                ${
                                  isLoading
                                    ? `bg-gray-100 border-gray-300 cursor-not-allowed`
                                    : selectedFile
                                    ? `border-${ACCENT_COLOR}-300 bg-${ACCENT_COLOR}-50/50 hover:border-${ACCENT_COLOR}-400`
                                    : `border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50/50`
                                }`}
        >
          <motion.div
            key={selectedFile ? "fileSelected" : "noFile"}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4"
          >
            {selectedFile ? (
              <FileCheck className={`w-8 h-8 mb-2 text-green-600`} />
            ) : (
              <UploadCloud className="w-8 h-8 mb-2 text-gray-400" />
            )}
            <p
              className={`mb-1 text-sm font-medium ${
                selectedFile
                  ? `text-black`
                  : isLoading
                  ? "text-gray-500"
                  : "text-black"
              }`}
            >
              {selectedFile
                ? selectedFile.name
                : "Click or drag .docx file here"}
            </p>
            <p className={`text-xs ${isLoading ? "text-black" : "text-black"}`}>
              {selectedFile
                ? `(${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)`
                : `Max ${maxFileSize / (1024 * 1024)}MB, .docx only`}
            </p>
          </motion.div>
          <input
            id="file-upload"
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={onFileChange}
            disabled={isLoading}
            className="sr-only"
          />
        </label>
      </div>
      <div>
        <label
          htmlFor="template-select"
          className="flex items-center text-sm font-medium text-gray-700 mb-1.5"
        >
          <Palette className={`h-4 w-4 mr-2 text-${ACCENT_COLOR}-600`} />
          Choose Formatting Style
        </label>
        <select
          id="template-select"
          value={selectedTemplate}
          onChange={onTemplateChange}
          disabled={isLoading}
          className={`block w-full px-3 py-2.5 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-1 focus:ring-${ACCENT_COLOR}-500 focus:border-${ACCENT_COLOR}-500 text-sm transition duration-150 ease-in-out text-black ${
            isLoading ? "opacity-60 cursor-not-allowed bg-gray-100" : ""
          }`}
        >
          {templateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <motion.button
        type="submit"
        disabled={isLoading || (!selectedFile && processingStatus === "idle")}
        className={getButtonClasses()}
        whileHover={{ scale: 1.03, y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        {isLoading && (
          <Loader2 className="animate-spin h-5 w-5 mr-2 text-current" />
        )}
        <span>{buttonText()}</span>
      </motion.button>
    </motion.form>
  );
};

export default UploadForm;
