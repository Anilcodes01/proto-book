import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, FileCode } from 'lucide-react';

interface Props {
    originalUrl: string | null;
    pdfUrl: string | null;
    processingStatus: string;
}

const ACCENT_COLOR = "sky";

const DownloadLinks: React.FC<Props> = ({ originalUrl, pdfUrl, processingStatus }) => {
    const isVisible = processingStatus === "success" && (pdfUrl || originalUrl);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    key="download-links"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
                    className="mt-8 text-center pt-6 border-t border-gray-200"
                >
                    <h3 className="text-base font-semibold mb-4 text-gray-600">Download Your Files</h3>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                        {originalUrl && (
                            <motion.a
                                href={originalUrl} download target="_blank" rel="noopener noreferrer"
                                className={`inline-flex items-center justify-center px-5 py-2.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition duration-150 font-medium shadow-sm hover:shadow-md space-x-2 w-full sm:w-auto text-sm`}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <FileCode className="h-4 w-4" />
                                <span>Original (.docx)</span>
                            </motion.a>
                        )}
                        {pdfUrl && (
                            <motion.a
                                href={pdfUrl} download target="_blank" rel="noopener noreferrer"
                                className={`inline-flex items-center justify-center px-5 py-2.5 bg-green-600 text-white rounded-md hover:bg-${ACCENT_COLOR}-700 transition duration-150 font-medium shadow-sm hover:shadow-md space-x-2 w-full sm:w-auto text-sm`}
                                whileHover={{ y: -2 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <FileText className="h-4 w-4" />
                                <span>Formatted (.pdf)</span>
                            </motion.a>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default DownloadLinks;