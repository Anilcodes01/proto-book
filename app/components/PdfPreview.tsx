import React, { useRef, useEffect, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Loader2, AlertCircle } from 'lucide-react';

interface Props {
    pdfUrl: string | null;
    processingStatus: string;
    numPages: number | null;
    pageNumber: number;
    onDocumentLoadSuccess: (data: { numPages: number }) => void;
    onDocumentLoadError: (error: Error) => void;
    onPageChange: (newPage: number) => void;
    pdfLoadErrorProp: string | null;
}

const PdfPreview: React.FC<Props> = ({
    pdfUrl,
    processingStatus,
    numPages,
    pageNumber,
    onDocumentLoadSuccess,
    onDocumentLoadError,
    onPageChange,
    pdfLoadErrorProp
}) => {
    const pdfViewerContainerRef = useRef<HTMLDivElement>(null);
    const [pdfViewerWidth, setPdfViewerWidth] = useState<number | undefined>(undefined);

    useEffect(() => {
        const resizeObserver = new ResizeObserver(entries => {
            if (entries[0]?.contentRect.width) {
                setPdfViewerWidth(Math.min(entries[0].contentRect.width * 0.98, 850));
            }
        });

        const container = pdfViewerContainerRef.current;
        if (container) {
            resizeObserver.observe(container);
            setPdfViewerWidth(Math.min(container.offsetWidth * 0.98, 850));
        }

        return () => {
            if (container) {
                resizeObserver.unobserve(container);
            }
        };
    }, [pdfUrl]);

    const goToPrevPage = () => onPageChange(Math.max(pageNumber - 1, 1));
    const goToNextPage = () => onPageChange(Math.min(pageNumber + 1, numPages || 1));

    const isVisible = pdfUrl && processingStatus === "success";

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    key="pdf-preview"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: '2rem' }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="border border-gray-200 rounded-lg overflow-hidden shadow-md bg-white"
                >
                    <div className="flex flex-wrap items-center justify-between bg-gray-100 p-3 border-b border-gray-200 gap-2">
                        <h2 className="text-base md:text-lg font-semibold text-gray-700 whitespace-nowrap">
                            Formatted PDF Preview
                        </h2>
                        {numPages && numPages > 1 && (
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                                className="flex items-center justify-center space-x-1 md:space-x-1.5 rounded-md bg-white shadow-sm p-1 border border-gray-200"
                            >
                                <motion.button 
                                    onClick={goToPrevPage} 
                                    disabled={pageNumber <= 1} 
                                    aria-label="Previous page" 
                                    whileHover={{ scale: 1.1 }} 
                                    whileTap={{ scale: 0.95 }} 
                                    className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </motion.button>
                                <span className="text-xs font-medium text-gray-600 tabular-nums px-1 whitespace-nowrap">
                                    Page {pageNumber} / {numPages}
                                </span>
                                <motion.button 
                                    onClick={goToNextPage} 
                                    disabled={pageNumber >= (numPages || 1)} 
                                    aria-label="Next page" 
                                    whileHover={{ scale: 1.1 }} 
                                    whileTap={{ scale: 0.95 }} 
                                    className="p-1.5 rounded text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </motion.button>
                            </motion.div>
                        )}
                        {!numPages && !pdfLoadErrorProp && (
                            <div className="flex items-center justify-center space-x-1.5 p-1">
                                <Loader2 className="animate-spin h-4 w-4 text-gray-400" />
                                <span className="text-xs text-gray-500">Loading pages...</span>
                            </div>
                        )}
                    </div>

                    <div ref={pdfViewerContainerRef} className="p-4 md:p-6 bg-white flex flex-col items-center">
                        <div
                            className="pdf-viewer-wrapper w-full flex justify-center items-start overflow-auto"
                            style={{ minHeight: '500px' }}
                        >
                            <Document
                                file={pdfUrl}
                                onLoadSuccess={onDocumentLoadSuccess}
                                onLoadError={onDocumentLoadError}
                                loading={
                                    <div className="flex flex-col items-center justify-center text-gray-500 space-y-2 p-4 min-h-[500px]">
                                        <Loader2 className="animate-spin h-7 w-7" />
                                        <span className="text-sm">Loading PDF Preview...</span>
                                    </div>
                                }
                                error={
                                    <div className="flex flex-col items-center justify-center text-red-600 space-y-2 p-4 text-center max-w-md min-h-[500px]">
                                        <AlertCircle className="h-8 w-8" />
                                        <span className="font-medium">Preview Error</span>
                                        <span className="text-sm text-red-500">Could not load PDF preview.</span>
                                    </div>
                                }
                            >
                                {numPages && (
                                    <Page
                                        key={`page_${pageNumber}`}
                                        pageNumber={pageNumber}
                                        renderAnnotationLayer={false}
                                        renderTextLayer={true}
                                        width={pdfViewerWidth}
                                        className="react-pdf__Page__container border border-gray-300 shadow-md bg-white"
                                    />
                                )}
                            </Document>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PdfPreview;
