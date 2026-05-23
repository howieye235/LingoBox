import { motion } from "framer-motion";

export default function TitlePage({ onStart }) {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center"
      >
        <h1 className="text-4xl font-extrabold tracking-wide">LingoBox</h1>
        <p className="mt-3 text-lg text-blue-100">
          Your AI-powered universal translator
        </p>

        <motion.button
          onClick={onStart}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="mt-6 px-6 py-3 bg-white text-blue-600 font-semibold rounded-2xl shadow-lg"
        >
          Start
        </motion.button>
      </motion.div>
    </div>
  );
}
