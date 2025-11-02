
import React, { useState, useCallback, useRef } from 'react';
import { ProcessStatus } from './types';

declare const JSZip: any;
declare const saveAs: any;

// Helper function to format bytes into a readable string
const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// SVG Icon Components
const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const ZipFileIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M2.25 13.125c0-2.32.158-4.584.44-6.759A4.5 4.5 0 016.32 2.25h9.36a4.5 4.5 0 013.63 4.116c.282 2.175.44 4.44.44 6.759 0 2.32-.158 4.584-.44 6.759A4.5 4.5 0 0115.68 21.75H6.32a4.5 4.5 0 01-3.63-4.116C2.408 17.71 2.25 15.444 2.25 13.125zM6 8.625a.75.75 0 01.75-.75h.75v-.75a.75.75 0 011.5 0v.75h.75a.75.75 0 010 1.5H9v.75a.75.75 0 01-1.5 0V10.5H6.75a.75.75 0 01-.75-.75zm.75 4.5a.75.75 0 00-1.5 0v.75h.75a.75.75 0 00.75-.75zm1.5 1.5a.75.75 0 01.75-.75h.75v-.75a.75.75 0 011.5 0v.75h.75a.75.75 0 010 1.5H9v.75a.75.75 0 01-1.5 0v-.75z" clipRule="evenodd" />
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
        <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
    </svg>
);

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default function App() {
  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.Idle);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReset = () => {
    setStatus(ProcessStatus.Idle);
    setOriginalFile(null);
    setCompressedBlob(null);
    setOriginalSize(0);
    setCompressedSize(0);
    setError('');
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const compressFile = useCallback(async (file: File) => {
    setStatus(ProcessStatus.Processing);
    setOriginalFile(file);
    setOriginalSize(file.size);

    try {
      const zip = await JSZip.loadAsync(file);
      const newZip = new JSZip();

      const filePromises = Object.keys(zip.files).map(async (filename) => {
        const fileData = await zip.files[filename].async('uint8array');
        newZip.file(filename, fileData, { 
          compression: "DEFLATE",
          compressionOptions: {
            level: 9
          }
        });
      });

      await Promise.all(filePromises);

      const blob = await newZip.generateAsync({ type: 'blob' });
      setCompressedBlob(blob);
      setCompressedSize(blob.size);
      setStatus(ProcessStatus.Success);
    } catch (err) {
      console.error(err);
      setError('Failed to process the ZIP file. It might be corrupted or in an unsupported format.');
      setStatus(ProcessStatus.Error);
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
        compressFile(file);
      } else {
        setError('Please upload a valid .zip file.');
        setStatus(ProcessStatus.Error);
      }
    }
  };
  
  const handleDownload = () => {
    if (compressedBlob && originalFile) {
        const newName = originalFile.name.replace('.zip', '.compressed.zip');
        saveAs(compressedBlob, newName);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const sizeReduction = originalSize > 0 ? ((originalSize - compressedSize) / originalSize) * 100 : 0;

  return (
    <div className="bg-slate-900 min-h-screen flex flex-col items-center justify-center p-4 font-sans text-white">
      <header className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">
          ZipCompress Pro
        </h1>
        <p className="text-slate-400 mt-2">Maximum compression for your ZIP archives, right in your browser.</p>
      </header>
      
      <main className="w-full max-w-2xl">
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl shadow-2xl shadow-slate-900/50 p-6 md:p-8 transition-all duration-300 min-h-[350px] flex flex-col justify-center items-center">
          
          {status === ProcessStatus.Idle && (
            <div 
                className="w-full h-full flex flex-col items-center justify-center text-center border-4 border-dashed border-slate-600 hover:border-cyan-400 transition-colors rounded-xl p-8 cursor-pointer"
                onClick={handleUploadClick}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                        const file = e.dataTransfer.files[0];
                        if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
                            compressFile(file);
                        } else {
                            setError('Please upload a valid .zip file.');
                            setStatus(ProcessStatus.Error);
                        }
                    }
                }}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".zip" className="hidden" />
              <UploadIcon className="w-16 h-16 text-slate-500 mb-4" />
              <p className="text-xl font-semibold text-slate-300">Drag & drop your .zip file here</p>
              <p className="text-slate-400">or click to browse</p>
            </div>
          )}

          {status === ProcessStatus.Processing && (
            <div className="flex flex-col items-center justify-center text-center">
              <SpinnerIcon className="w-16 h-16 text-cyan-400 animate-spin mb-4" />
              <p className="text-xl font-semibold text-slate-300">Compressing...</p>
              <p className="text-slate-400 mt-1">{originalFile?.name}</p>
              <div className="w-64 bg-slate-700 rounded-full h-2.5 mt-4 overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2.5 rounded-full animate-pulse" style={{width: '100%'}}></div>
              </div>
            </div>
          )}

          {status === ProcessStatus.Success && (
            <div className="w-full flex flex-col items-center justify-center text-center">
                <ZipFileIcon className="w-20 h-20 text-cyan-400 mb-4"/>
                <h2 className="text-2xl font-bold text-green-400 mb-2">Compression Complete!</h2>
                <p className="text-slate-400 mb-6 max-w-md">{originalFile?.name}</p>

                <div className="w-full bg-slate-700/50 rounded-lg p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-6">
                    <div>
                        <p className="text-sm text-slate-400">Original Size</p>
                        <p className="text-lg font-semibold text-white">{formatBytes(originalSize)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">Compressed Size</p>
                        <p className="text-lg font-semibold text-green-400">{formatBytes(compressedSize)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-slate-400">Reduction</p>
                        <p className="text-lg font-semibold text-cyan-400">{sizeReduction.toFixed(2)}%</p>
                    </div>
                </div>

                <div className="flex space-x-4">
                    <button 
                        onClick={handleDownload}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg transition-transform transform hover:scale-105 flex items-center space-x-2"
                    >
                        <DownloadIcon className="w-5 h-5" />
                        <span>Download Now</span>
                    </button>
                    <button 
                        onClick={handleReset}
                        className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                    >
                        Compress Another
                    </button>
                </div>
            </div>
          )}

          {status === ProcessStatus.Error && (
            <div className="flex flex-col items-center justify-center text-center">
              <p className="text-xl font-semibold text-red-500 mb-4">An Error Occurred</p>
              <p className="text-slate-400 mb-6">{error}</p>
              <button 
                onClick={handleReset}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      </main>
      <footer className="text-center mt-8 text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} ZipCompress Pro. All rights reserved.</p>
        <p className="mt-1">Note: Compression happens entirely in your browser. Your files are never uploaded to a server.</p>
      </footer>
    </div>
  );
}
