import React, { useState, useCallback } from 'react';
import { UploadCloud, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import api from '../api';

interface SourceStatus {
  name: string;
  connected: boolean;
  status: 'connected' | 'syncing' | 'disconnected';
}

interface ResumeUploadProps {
  searchQuery?: string;
}

const ResumeUpload: React.FC<ResumeUploadProps> = ({ searchQuery = '' }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<{ name: string, status: 'processing' | 'completed' | 'error', progress: number, error?: string }[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [sources, setSources] = useState<SourceStatus[]>([
    { name: 'ATS System', connected: true, status: 'connected' },
    { name: 'Email Inbox', connected: true, status: 'syncing' },
    { name: 'LinkedIn', connected: false, status: 'disconnected' },
  ]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = (fileList: FileList) => {
    const newFiles = Array.from(fileList).map((file: File) => ({
      name: file.name,
      file,
      status: 'processing' as const,
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);

    newFiles.forEach((fileObj) => {
      const formData = new FormData();
      formData.append('file', fileObj.file);
      formData.append('source', 'Local System');

      api.post('/resumes/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 120000, // 2 minute timeout
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));

          // When upload reaches 100%, show "parsing" status
          if (percent >= 100) {
            setFiles(prev => prev.map(f =>
              f.name === fileObj.name ? { ...f, status: 'processing', progress: 100 } : f
            ));
          } else {
            setFiles(prev => prev.map(f =>
              f.name === fileObj.name ? { ...f, progress: percent } : f
            ));
          }
        }
      })
        .then(response => {
          console.log("Upload success:", response.data);
          const candidateName = response.data.name;
          setFiles(prev => prev.map(f =>
            f.name === fileObj.name ? { ...f, name: candidateName || f.name, status: 'completed', progress: 100 } : f
          ));

          // Auto-remove completed files after 3 seconds
          setTimeout(() => {
            setFiles(prev => prev.filter(f => f.name !== fileObj.name));
          }, 3000);
        })
        .catch(err => {
          console.error("Upload failed:", err);
          // Handle both object with message property and raw string response
          const errorResponse = err.response?.data;
          const errorMsg = (typeof errorResponse === 'string' ? errorResponse : errorResponse?.message) || err.message || 'Upload failed';
          console.error("Error details:", errorMsg);
          setFiles(prev => prev.map(f =>
            f.name === fileObj.name ? { ...f, status: 'error', error: errorMsg } : f
          ));
        });
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleSelectFilesClick = () => {
    fileInputRef.current?.click();
  };

  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === searchQuery.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 px-1 rounded">{part}</mark>
      ) : part
    );
  };

  const filteredFiles = files.filter(file => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return file.name.toLowerCase().includes(query);
  });

  const filteredSources = sources.filter(source => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return source.name.toLowerCase().includes(query);
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Upload Resumes</h2>
        <p className="text-sm text-gray-500">Upload resumes to automatically parse details and match with open jobs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Upload Area */}
        <div className="md:col-span-2">
          <div
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors duration-200 ${isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-white'
              }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="p-4 bg-indigo-50 rounded-full text-indigo-600 mb-4">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Drag & drop resumes here</h3>
            <p className="text-gray-500 mt-1 mb-6">or click to browse files (PDF, DOCX, TXT)</p>
            <button
              onClick={handleSelectFilesClick}
              className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition shadow-sm"
            >
              Select Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <p className="text-xs text-gray-400 mt-4">Maximum file size 10MB.</p>
          </div>

          {/* Processing Queue */}
          {files.length > 0 && (
            <div className="mt-8 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-medium text-gray-900">Processing Queue</h3>
              </div>
              <ul className="divide-y divide-gray-200">
                {filteredFiles.length === 0 && searchQuery ? (
                  <li className="px-6 py-4 text-center text-gray-500">No files match your search</li>
                ) : (
                  filteredFiles.map((file, idx) => (
                    <li key={idx} className="px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <FileText className="w-5 h-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{highlightText(file.name)}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {file.status === 'processing' && <span className="text-xs text-indigo-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Parsing... {file.progress}%</span>}
                            {file.status === 'completed' && <span className="text-xs text-green-600">Completed</span>}
                            {file.status === 'error' && <span className="text-xs text-red-600">{file.error || 'Failed to parse'}</span>}
                          </div>
                        </div>
                      </div>
                      <div>
                        {file.status === 'completed' ? (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        ) : file.status === 'error' ? (
                          <AlertCircle className="w-6 h-6 text-red-500" />
                        ) : (
                          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${file.progress}%` }}></div>
                          </div>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Supported Sources</h3>
            <div className="space-y-4">
              {filteredSources.length === 0 && searchQuery ? (
                <div className="text-center text-gray-500 text-sm py-4">No sources match your search</div>
              ) : (
                filteredSources.map((source, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${source.status === 'connected' ? 'bg-green-500' :
                        source.status === 'syncing' ? 'bg-yellow-500 animate-pulse' :
                          'bg-gray-300'
                        }`}></div>
                      <span className="text-sm text-gray-600">{highlightText(source.name)}</span>
                    </div>
                    {source.connected ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {source.status === 'connected' ? 'Connected' : 'Syncing...'}
                        </span>
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to disconnect ${source.name}?`)) {
                              setSources(prev => prev.map((s, i) =>
                                i === index
                                  ? { ...s, connected: false, status: 'disconnected' }
                                  : s
                              ));
                            }
                          }}
                          className="text-xs text-red-600 hover:text-red-700 font-medium"
                          title="Disconnect"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          // In a real app, this would open OAuth flow
                          alert(`Connecting to ${source.name}...\n\nIn a real application, this would open ${source.name} OAuth authentication.`);
                          setSources(prev => prev.map((s, i) =>
                            i === index
                              ? { ...s, connected: true, status: source.name === 'Email Inbox' ? 'syncing' : 'connected' }
                              : s
                          ));
                        }}
                        className="text-xs text-indigo-600 font-medium hover:text-indigo-700"
                      >
                        Connect
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
            <h4 className="font-medium text-blue-900 mb-2">AI Parsing Active</h4>
            <p className="text-sm text-blue-700">
              Our AI automatically extracts skills, experience, and education from uploaded resumes to calculate fit scores.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeUpload;