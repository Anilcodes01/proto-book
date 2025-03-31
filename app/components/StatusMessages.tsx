import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, CheckCircle, FileWarning, XCircle } from 'lucide-react';

interface Props {
    errorMessage: string | null;
    successMessage: string | null;
    pdfLoadError: string | null;
    onDismissError: () => void;
    onDismissSuccess: () => void;
    onDismissPdfLoadError: () => void;
}

const StatusMessages: React.FC<Props> = ({
    errorMessage,
    successMessage,
    pdfLoadError,
    onDismissError,
    onDismissSuccess,
    onDismissPdfLoadError,
}) => {
    return (
        <AnimatePresence>
            {errorMessage && (
                <motion.div
                    key="error-message"
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
                    className="mb-5 p-3.5 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center space-x-2.5 shadow-sm" role="alert"
                >
                    <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                    <span className="text-sm font-medium flex-grow">{errorMessage}</span>
                    <button onClick={onDismissError} className="ml-auto p-1 text-red-500 hover:text-red-700 focus:outline-none rounded-full hover:bg-red-100" aria-label="Dismiss error">
                        <XCircle className="h-4.5 w-4.5" />
                    </button>
                </motion.div>
            )}
            {successMessage && (
                <motion.div
                    key="success-message"
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
                    className="mb-5 p-3.5 bg-green-50 text-green-700 border border-green-200 rounded-lg flex items-center space-x-2.5 shadow-sm" role="status"
                >
                    <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" />
                    <span className="text-sm font-medium flex-grow">{successMessage}</span>
                    <button onClick={onDismissSuccess} className="ml-auto p-1 text-green-500 hover:text-green-700 focus:outline-none rounded-full hover:bg-green-100" aria-label="Dismiss success message">
                        <XCircle className="h-4.5 w-4.5" />
                    </button>
                </motion.div>
            )}
            {pdfLoadError && (
                <motion.div
                    key="pdf-load-error"
                    initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }}
                    className="mb-5 p-3.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg flex items-center space-x-2.5 shadow-sm" role="alert"
                >
                    <FileWarning className="h-5 w-5 flex-shrink-0 text-yellow-500" />
                    <span className="text-sm font-medium flex-grow">{pdfLoadError}</span>
                    <button onClick={onDismissPdfLoadError} className="ml-auto p-1 text-yellow-500 hover:text-yellow-700 focus:outline-none rounded-full hover:bg-yellow-100" aria-label="Dismiss PDF load warning">
                        <XCircle className="h-4.5 w-4.5" />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default StatusMessages;