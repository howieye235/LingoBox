import { useEffect, useRef, useState } from "react";
import Tesseract from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";

// Use CDN pdf.worker (avoids import/resolve issues)
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";

export default function MainUI() {
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [languageFrom, setLanguageFrom] = useState("English");
  const [languageTo, setLanguageTo] = useState("Spanish");
  const [listening, setListening] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showWebInput, setShowWebInput] = useState(false);
  const [webUrl, setWebUrl] = useState("");
  const [webLoading, setWebLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // ------- language codes (88-ish) -------
  const languageCodes: Record<string, string> = {
    Afrikaans: "af",
    Albanian: "sq",
    Arabic: "ar",
    Armenian: "hy",
    Bengali: "bn",
    Bulgarian: "bg",
    Burmese: "my",
    Chinese: "zh",
    Taiwanese: "zh-yue",
    Croatian: "hr",
    Czech: "cs",
    Danish: "da",
    Dutch: "nl",
    English: "en",
    Estonian: "et",
    Finnish: "fi",
    French: "fr",
    Galician: "gl",
    Georgian: "ka",
    German: "de",
    Gujarati: "gu",
    Hawaiian: "haw",
    Hebrew: "he",
    Hindi: "hi",
    Hungarian: "hu",
    Icelandic: "is",
    Indonesian: "id",
    Irish: "ga",
    Italian: "it",
    Japanese: "ja",
    Javanese: "jv",
    Korean: "ko",
    Kurdish: "ku",
    Lao: "lo",
    Latin: "la",
    Latvian: "lv",
    Lithuanian: "lt",
    Luxembourgish: "lb",
    Macedonian: "mk",
    Malay: "ms",
    Maltese: "mt",
    Mongolian: "mn",
    Nepali: "ne",
    Norwegian: "no",
    Persian: "fa",
    Polish: "pl",
    Portuguese: "pt",
    Punjabi: "pa",
    Romanian: "ro",
    Russian: "ru",
    Serbian: "sr",
    Slovak: "sk",
    Slovenian: "sl",
    Spanish: "es",
    Swedish: "sv",
    Tamil: "ta",
    Thai: "th",
    Tibetan: "bo",
    Turkish: "tr",
    Turkmen: "tk",
    Ukrainian: "uk",
    Urdu: "ur",
    Uzbek: "uz",
    Vietnamese: "vi",
  };

  // ------- Speech recognition setup (browser API) -------
  const recognitionRef = useRef<any | null>(null);

  useEffect(() => {
    const win: any = window;
    if (!("webkitSpeechRecognition" in win || "SpeechRecognition" in win)) {
      console.warn("Speech Recognition API not supported in this browser");
      return;
    }
    const SpeechRecognition =
      win.SpeechRecognition || win.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = languageCodes[languageFrom] || "en-US";
    recognitionRef.current.interimResults = false;
    recognitionRef.current.maxAlternatives = 1;

    recognitionRef.current.onresult = (event: any) => {
      try {
        if (event.results && event.results.length > 0) {
          const spokenText = event.results[0][0].transcript;
          setSourceText((prev) =>
            prev ? prev + " " + spokenText : spokenText
          );
        }
      } catch (e) {
        console.error(e);
      }
      setListening(false);
    };

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setListening(false);
    };

    recognitionRef.current.onend = () => {
      setListening(false);
    };

    return () => {
      // cleanup if needed
      try {
        recognitionRef.current &&
          recognitionRef.current.stop &&
          recognitionRef.current.stop();
      } catch (e) {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languageFrom]);

  const handleMic = () => {
    if (!recognitionRef.current)
      return alert("Speech Recognition not supported");
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.lang = languageCodes[languageFrom] || "en-US";
      recognitionRef.current.start();
      setListening(true);
    }
  };

  // ------- Hybrid translation setup -------
  // offline languages (7)
  const offlineLanguages = new Set([
    "English",
    "Spanish",
    "French",
    "Italian",
    "Portuguese",
    "Chinese",
    "Japanese",
  ]);

  // small demo dictionary (replace with a real offline model later)
  const localDictionary: Record<string, Record<string, string>> = {
    "en|es": { hello: "hola", goodbye: "adiós", "thank you": "gracias" },
    "en|fr": { hello: "bonjour", goodbye: "au revoir", "thank you": "merci" },
    "en|it": { hello: "ciao", "thank you": "grazie" },
    "en|pt": { hello: "olá", "thank you": "obrigado" },
    "en|zh": { hello: "你好", "thank you": "谢谢" },
    "en|ja": { hello: "こんにちは", "thank you": "ありがとうございます" },
    // add reverse small mappings for demo convenience:
    "es|en": { hola: "hello" },
    "fr|en": { bonjour: "hello" },
    "it|en": { ciao: "hello" },
    "pt|en": { olá: "hello" },
    "zh|en": { 你好: "hello" },
    "ja|en": { こんにちは: "hello" },
  };

  // placeholders for a real offline model
  let offlineModelLoaded = false;
  let offlineModel: any = null;

  async function loadOfflineModelIfNeeded(): Promise<void> {
    if (offlineModelLoaded) return;
    // placeholder: no model loaded now. When you add a real model,
    // implement lazy load logic here and set offlineModelLoaded = true;
    return;
  }

  async function localTranslate(
    text: string,
    fromCode: string,
    toCode: string
  ): Promise<string> {
    await loadOfflineModelIfNeeded();

    if (
      offlineModelLoaded &&
      offlineModel &&
      typeof offlineModel.translate === "function"
    ) {
      try {
        return await offlineModel.translate(text, fromCode, toCode);
      } catch (err) {
        console.warn("offline model translate error:", err);
      }
    }

    // small dictionary fallback (only matches normalized exact phrases)
    const key = `${fromCode}|${toCode}`;
    const normalized = text.toLowerCase().trim();
    const dict = localDictionary[key];
    if (dict) {
      // exact match
      if (dict[normalized]) return dict[normalized];
      // try some simple multi-word normalization (strip punctuation)
      const normalizedAlpha = normalized.replace(
        /[^\w\s\u4e00-\u9fff\u3040-\u30ff]/g,
        ""
      );
      if (dict[normalizedAlpha]) return dict[normalizedAlpha];
    }
    return "";
  }

  // translateChunk uses localTranslate when both languages are offline-supported,
  // otherwise calls the MyMemory online API.
  const translateChunk = async (
    text: string,
    fromLangName: string,
    toLangName: string
  ): Promise<string> => {
    const fromCode = languageCodes[fromLangName] || fromLangName;
    const toCode = languageCodes[toLangName] || toLangName;

    if (
      offlineLanguages.has(fromLangName) &&
      offlineLanguages.has(toLangName)
    ) {
      const local = await localTranslate(text, fromCode, toCode);
      if (local && local.trim()) return local;
      // if local didn't return, fall through to online
    }

    // online fallback (MyMemory)
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
          text
        )}&langpair=${fromCode}|${toCode}`
      );
      const data = await res.json();
      if (data && data.responseData && data.responseData.translatedText) {
        return data.responseData.translatedText;
      } else {
        return "";
      }
    } catch (err) {
      console.error("Online translate error:", err);
      return "";
    }
  };

  // handleTranslate splits into 500-char chunks (your chosen chunk size)
  const MAX_CHUNK_SIZE = 500;
  const handleTranslate = async () => {
    if (sourceText.trim() === "") return;
    const fromLang = languageFrom;
    const toLang = languageTo;
    setTranslatedText("Translating...");

    try {
      const chunks: string[] = [];
      for (let i = 0; i < sourceText.length; i += MAX_CHUNK_SIZE) {
        chunks.push(sourceText.slice(i, i + MAX_CHUNK_SIZE));
      }

      const translatedChunks: string[] = [];
      for (const chunk of chunks) {
        const translated = await translateChunk(chunk, fromLang, toLang);
        translatedChunks.push(translated || "");
      }

      setTranslatedText(translatedChunks.join(" "));
    } catch (err) {
      console.error("Translation error:", err);
      setTranslatedText("Error translating. Please try again.");
    }
  };

  // ------- Listen (Text-to-Speech) -------
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const handleListen = () => {
    if (!translatedText.trim()) return;
    // Cancel any existing
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(translatedText);
    utterance.lang = languageCodes[languageTo] || "en";
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // ------- Handwriting canvas handlers -------
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    draw(e);
  };

  const endDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(false);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) ctx.beginPath();
    }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    let x: number, y: number;
    if ("touches" in e && e.touches.length > 0) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else if ("clientX" in e && "clientY" in e) {
      x = (e as React.MouseEvent).clientX - rect.left;
      y = (e as React.MouseEvent).clientY - rect.top;
    } else {
      return;
    }
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSourceText("");
  };

  const transferHandwritingToText = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setTranslatedText("Recognizing handwriting...");
    setOcrLoading(true);
    try {
      const { data } = await Tesseract.recognize(canvas.toDataURL(), "eng", {
        logger: () => {},
      });
      const recognizedText = data.text.trim();
      if (recognizedText) {
        setSourceText((prev) =>
          prev ? prev + " " + recognizedText : recognizedText
        );
      } else {
        setTranslatedText("No handwriting recognized.");
      }
    } catch (err) {
      console.error("OCR error:", err);
      setTranslatedText("Error recognizing handwriting.");
    } finally {
      setOcrLoading(false);
    }
  };

  // ------- File upload (txt + pdf) -------
  const handlePdfFileInput = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n\n";
      }
      setSourceText(fullText);
    } catch (err) {
      console.error("PDF parsing error:", err);
      alert("Error reading PDF file.");
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === "application/pdf") {
      await handlePdfFileInput(file);
    } else if (file.type === "text/plain") {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setSourceText(event.target.result.toString());
        }
      };
      reader.readAsText(file);
    } else {
      alert("Unsupported file type. Please upload PDF or TXT files.");
    }
  };

  // ------- Camera OCR component -------
  const CameraComponent = ({
    onClose,
    onExtractText,
  }: {
    onClose: () => void;
    onExtractText: (text: string) => void;
  }) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRefLocal = useRef<HTMLCanvasElement | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [loading, setLoading] = useState(false);
    const retryTimeout = useRef<number | null>(null);

    const startCamera = async () => {
      try {
        stopCamera();
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        setStream(mediaStream);
        const attach = () => {
          const v = videoRef.current;
          if (!v) {
            retryTimeout.current = window.setTimeout(attach, 50);
            return;
          }
          v.srcObject = mediaStream;
          v.onloadedmetadata = () => {
            v.play().catch(() => {});
          };
        };
        attach();
      } catch (err) {
        alert("Unable to access camera.");
      }
    };

    const stopCamera = () => {
      if (retryTimeout.current) {
        clearTimeout(retryTimeout.current);
        retryTimeout.current = null;
      }
      const v = videoRef.current;
      if (v && v.srcObject) {
        (v.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        v.srcObject = null;
      }
      if (stream) stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    };

    const capturePhoto = async () => {
      if (!videoRef.current || !canvasRefLocal.current) return;
      setLoading(true);
      const canvas = canvasRefLocal.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        const result = await Tesseract.recognize(canvas, "eng");
        onExtractText(result.data.text.trim());
        onClose();
      } catch {
        alert("Error reading text");
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      startCamera();
      return () => stopCamera();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center p-4 z-50">
        <div className="bg-white w-full max-w-md p-4 rounded-xl">
          <h2 className="text-xl font-bold mb-4">Camera OCR</h2>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-xl bg-black"
            style={{ minHeight: 200 }}
          />
          <canvas ref={canvasRefLocal} className="hidden" />
          <div className="flex justify-between mt-4">
            <button
              onClick={onClose}
              className="bg-gray-400 text-white px-4 py-2 rounded-xl"
            >
              Close
            </button>
            <button
              onClick={capturePhoto}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl"
            >
              {loading ? "Reading..." : "Capture"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ------- Web text fetch -------
  const fetchWebText = async () => {
    if (!webUrl.trim()) return alert("Please enter a URL");
    setWebLoading(true);
    setTranslatedText("Fetching and extracting text...");
    try {
      const res = await fetch(webUrl);
      if (!res.ok) throw new Error("Failed to fetch URL");
      const html = await res.text();
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      Array.from(tempDiv.querySelectorAll("script, style, noscript")).forEach(
        (el) => el.remove()
      );
      const textContent = tempDiv.innerText || tempDiv.textContent || "";
      if (textContent.trim()) {
        setSourceText(textContent.trim());
        setTranslatedText("Fetched text added to input. Ready to translate.");
      } else {
        setTranslatedText("No readable text found at the URL.");
      }
    } catch (err) {
      console.error("Web fetch error:", err);
      setTranslatedText("Error fetching or reading the URL.");
    } finally {
      setWebLoading(false);
    }
  };

  // ------- Camera show/hide handling for main UI (uses CameraComponent) -------
  const openCameraModal = () => setShowCamera(true);
  const closeCameraModal = () => setShowCamera(false);

  return (
    <div className="flex justify-center items-center h-screen p-4 bg-gray-200 overflow-auto">
      <div className="w-[420px] rounded-3xl bg-white shadow-xl p-6 border border-gray-300">
        <h1 className="text-xl font-bold text-center mb-4">LingoBox</h1>

        <textarea
          className="w-full h-40 p-3 rounded-xl border border-gray-300 focus:outline-blue-400"
          placeholder="Speak, type, or scan text…"
          maxLength={5000}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />

        <div className="mt-3 grid grid-cols-3 gap-3 items-center">
          <button
            onClick={handleMic}
            className={`px-3 py-2 rounded-xl text-white font-semibold transition ${
              listening ? "bg-red-500" : "bg-blue-500"
            }`}
            title="Speak"
          >
            🎤 {listening ? "Listening…" : "Speak"}
          </button>

          <button
            onClick={handleListen}
            disabled={!translatedText.trim()}
            className="px-3 py-2 rounded-xl bg-yellow-500 text-white font-semibold"
            title="Listen to translation"
          >
            🔊 Listen
          </button>

          <button
            onClick={handleTranslate}
            className="px-3 py-2 rounded-xl bg-green-600 text-white font-semibold"
            title="Translate text"
          >
            Translate
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Translate from:</label>
            <select
              className="w-full mt-1 p-2 rounded-xl border border-gray-300"
              value={languageFrom}
              onChange={(e) => setLanguageFrom(e.target.value)}
            >
              {Object.keys(languageCodes)
                .sort()
                .map((lang) => (
                  <option key={lang}>{lang}</option>
                ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Translate to:</label>
            <select
              className="w-full mt-1 p-2 rounded-xl border border-gray-300"
              value={languageTo}
              onChange={(e) => setLanguageTo(e.target.value)}
            >
              {Object.keys(languageCodes)
                .sort()
                .map((lang) => (
                  <option key={lang}>{lang}</option>
                ))}
            </select>
          </div>
        </div>

        <div className="mt-5 p-3 bg-gray-100 rounded-xl min-h-24 border border-gray-300 whitespace-pre-wrap">
          <p className="font-semibold text-gray-600">Output:</p>
          <p className="mt-1 text-gray-900">{translatedText}</p>
        </div>

        {showCanvas && (
          <div className="mt-5">
            <label className="font-medium">Write here:</label>
            <canvas
              ref={canvasRef}
              width={360}
              height={160}
              className="border border-gray-300 rounded-xl mt-2 touch-none"
              onMouseDown={startDrawing}
              onMouseUp={endDrawing}
              onMouseMove={draw}
              onMouseLeave={endDrawing}
              onTouchStart={startDrawing}
              onTouchEnd={endDrawing}
              onTouchMove={draw}
            />
            <div className="flex mt-2 gap-2">
              <button
                onClick={clearCanvas}
                className="flex-1 bg-red-500 text-white py-2 rounded-xl font-semibold"
              >
                Clear Writing
              </button>
              <button
                onClick={transferHandwritingToText}
                disabled={ocrLoading}
                className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-semibold"
              >
                {ocrLoading ? "Recognizing..." : "Transfer to Text"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3">
          <div className="flex justify-between text-2xl text-gray-500">
            <button
              onClick={() => setShowCanvas((v) => !v)}
              title="Toggle Write"
            >
              📝
            </button>
            <button onClick={openCameraModal} title="Open Camera">
              📷
            </button>
            <button
              onClick={() => setShowWebInput((v) => !v)}
              title="Fetch text from URL"
            >
              🌐
            </button>
            <label
              htmlFor="fileInput"
              className="cursor-pointer"
              title="Upload File"
            >
              📁
            </label>
            <input
              id="fileInput"
              type="file"
              accept=".txt,application/pdf"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {showCamera && (
            <CameraComponent
              onClose={closeCameraModal}
              onExtractText={(text) =>
                setSourceText((prev) => (prev ? prev + " " + text : text))
              }
            />
          )}
        </div>

        {showWebInput && (
          <div className="mt-4 fixed inset-0 bg-black bg-opacity-60 flex flex-col justify-center items-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">Enter URL</h2>
              <input
                type="text"
                placeholder="https://example.com"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-xl mb-4"
              />
              <div className="flex justify-between">
                <button
                  onClick={() => setShowWebInput(false)}
                  className="bg-gray-400 text-white px-4 py-2 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  onClick={fetchWebText}
                  disabled={webLoading}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl"
                >
                  {webLoading ? "Fetching..." : "Fetch Text"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
