"use client";
import React, { useState, useCallback, ChangeEvent, useEffect } from "react";
import { pdfjs } from "react-pdf";
import { motion } from "framer-motion";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import PageHeader from "./components/PageHeader";
import UploadForm from "./components/UploadForm";
import StatusMessages from "./components/StatusMessages";
import PdfPreview from "./components/PdfPreview";
import DownloadLinks from "./components/DownloadLinks";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

type ProcessingStatus =
    | "idle"
    | "uploading"
    | "processing"
    | "success"
    | "error";


const TEMPLATE_OPTIONS = [
    { value: "classic", label: "Classic Serif" },
    { value: "modern", label: "Modern Sans" },
    { value: "minimalist", label: "Minimalist" },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function HomePage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<string>(
        TEMPLATE_OPTIONS[0].value
    );
    const [processingStatus, setProcessingStatus] =
        useState<ProcessingStatus>("idle");
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [bookId, setBookId] = useState<number | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [originalUrl, setOriginalUrl] = useState<string | null>(null);
console.log(bookId)
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState<number>(1);
    const [pdfLoadError, setPdfLoadError] = useState<string | null>(null); 

    const isLoading =
        processingStatus === "uploading" || processingStatus === "processing";

    const resetState = useCallback((clearFile: boolean = true) => {
        console.log("Resetting state, clearFile:", clearFile);
        if (clearFile) {
            setSelectedFile(null);
            const fileInput = document.getElementById("file-upload") as HTMLInputElement;
            if (fileInput) {
                fileInput.value = ""; 
            }
        }
        setProcessingStatus("idle");
        setErrorMessage(null);
        setSuccessMessage(null);
        setPdfUrl(null);
        setOriginalUrl(null);
        setBookId(null);
        setNumPages(null);
        setPageNumber(1);
        setPdfLoadError(null);
    }, []); 

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        resetState(false); 

        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                setErrorMessage(`File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit.`);
                setSelectedFile(null);
                event.target.value = "";
                return;
            }
             if (
                file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                file.name.toLowerCase().endsWith(".docx")
            ) {
                setSelectedFile(file);
                setErrorMessage(null);
            } else {
                setErrorMessage("Invalid file type. Please upload a .docx file.");
                setSelectedFile(null);
                event.target.value = "";
            }
        } else {
            setSelectedFile(null);
        }
    };

    const handleTemplateChange = (event: ChangeEvent<HTMLSelectElement>) => {
        setSelectedTemplate(event.target.value);
    };

    const handleSubmit = useCallback(
        async (event?: React.FormEvent) => { 
            event?.preventDefault(); 
            if (!selectedFile) {
                setErrorMessage("Please select a .docx file first.");
                return;
            }

            setProcessingStatus("uploading");
            setErrorMessage(null);
            setSuccessMessage(null);
            setPdfUrl(null);
            setOriginalUrl(null);
            setBookId(null);
            setNumPages(null);
            setPageNumber(1);
            setPdfLoadError(null);

            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("templateName", selectedTemplate);

            const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "/api";

            try {
                setProcessingStatus("processing");
                console.log(`Submitting with template: ${selectedTemplate}`);

                const response = await fetch(`${apiUrl}/process-book`, {
                    method: "POST",
                    body: formData,
                });

                const result = await response.json();

                if (!response.ok || !result.success) {
                    throw new Error(
                        result.message || `Processing failed. Status: ${response.status}`
                    );
                }

                setProcessingStatus("success");
                setSuccessMessage("Success! Your book is formatted and ready for preview.");
                setPdfUrl(result.pdfUrl);
                setOriginalUrl(result.originalUrl);
                setBookId(result.bookId);

            } catch (error: any) {
                console.error("Processing error:", error);
                setProcessingStatus("error");
                setErrorMessage(
                    error.message || "An unexpected error occurred during processing."
                );
                setPdfUrl(null);
                setOriginalUrl(null);
            }
        },
        [selectedFile, selectedTemplate] 
    );

    const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }): void => {
        setNumPages(numPages);
        setPageNumber(1);
        setPdfLoadError(null);
    }, []); 

    const onDocumentLoadError = useCallback((error: Error): void => {
        console.error("Failed to load PDF for preview:", error);
        let friendlyError = "Failed to load PDF preview. ";
        if (error.message.includes("40")) { 
            friendlyError += "The file might be inaccessible or not found.";
        } else if (error.message.includes("Invalid PDF structure")) {
            friendlyError += "The generated file appears to be corrupted.";
        } else if (error.message.includes("Missing PDF")) {
             friendlyError += "The PDF file is missing or unavailable.";
        } else {
            friendlyError += "An issue occurred loading the preview.";
        }
        friendlyError += " You can still try downloading the file below."
        setPdfLoadError(friendlyError);
        setNumPages(null); 
    }, []);

    const handlePageChange = useCallback((newPage: number) => {
        setPageNumber(newPage);
    }, []); 

    return (
        <main className={`flex min-h-screen flex-col items-center w-full justify-center p-4 md:p-8 bg-gray-50`}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-4xl bg-white p-6 md:p-10 shadow-lg rounded-xl border border-gray-200"
            >
                <PageHeader
                    title="Book Formatter"
                    description="Upload your .docx manuscript, choose a style, and get a print-ready PDF."
                />

                <UploadForm
                    selectedFile={selectedFile}
                    selectedTemplate={selectedTemplate}
                    processingStatus={processingStatus}
                    isLoading={isLoading}
                    onFileChange={handleFileChange}
                    onTemplateChange={handleTemplateChange}
                    onSubmit={handleSubmit}
                    onResetClick={() => resetState(true)} 
                    maxFileSize={MAX_FILE_SIZE}
                    templateOptions={TEMPLATE_OPTIONS}
                />

                <StatusMessages
                    errorMessage={errorMessage}
                    successMessage={successMessage}
                    pdfLoadError={pdfLoadError}
                    onDismissError={() => setErrorMessage(null)}
                    onDismissSuccess={() => setSuccessMessage(null)}
                    onDismissPdfLoadError={() => setPdfLoadError(null)}
                />

                <PdfPreview
                    pdfUrl={pdfUrl}
                    processingStatus={processingStatus}
                    numPages={numPages}
                    pageNumber={pageNumber}
                    onDocumentLoadSuccess={onDocumentLoadSuccess}
                    onDocumentLoadError={onDocumentLoadError}
                    onPageChange={handlePageChange}
                    pdfLoadErrorProp={pdfLoadError}
                />

                <DownloadLinks
                    originalUrl={originalUrl}
                    pdfUrl={pdfUrl}
                    processingStatus={processingStatus}
                />

            </motion.div>
        </main>
    );
}