import React from 'react';
import { motion } from 'framer-motion';

interface Props {
    title: string;
    description: string;
}

const PageHeader: React.FC<Props> = ({ title, description }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mb-10 text-center"
        >
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 tracking-tight">
                {title}
            </h1>
            <p className="text-gray-500 mt-2 text-sm md:text-base max-w-xl mx-auto">
                {description}
            </p>
        </motion.div>
    );
};

export default PageHeader;