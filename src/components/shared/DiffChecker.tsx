import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Loader2, File, CheckCircle, XCircle, Copy } from 'lucide-react';

export default function DiffChecker() {
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);
    const [diffResult, setDiffResult] = useState<string | null>(null);
    const [parsedDiff, setParsedDiff] = useState<{
        header: string; 
        summary: string;
        lines: Array<{
            type: string;
            leftLineNum?: number;
            rightLineNum?: number;
            content: string;
        }>;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const readFileAsText = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target?.result as string);
            reader.onerror = e => reject(e);
            reader.readAsText(file);
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fileSetter: (file: File | null) => void) => {
        const file = e.target.files?.[0] || null;
        fileSetter(file);
        setError(null);
    };

    const parseDiffOutput = (diffText: string) => {
        const lines = diffText.split('\n');
        let header = '';
        let summary = '';
        let inSummary = false;

        // Find header and summary sections
        let contentLines: string[] = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('# Diff between')) {
                header = line;
            } else if (line.startsWith('## Summary')) {
                inSummary = true;
                summary = line + '\n';
            } else if (inSummary) {
                summary += line + '\n';
            } else if (line.trim() !== '' && !line.startsWith('#')) {
                contentLines.push(line);
            }
        }

        // Parse content lines into structured format
        const parsedLines = [];
        for (const line of contentLines) {
            if (line.startsWith('- [L')) {
                // Removed line
                const match = line.match(/- \[L(\d+)\] (.*)/);
                if (match) {
                    parsedLines.push({
                        type: 'removed',
                        leftLineNum: parseInt(match[1]),
                        content: match[2],
                    });
                }
            } else if (line.startsWith('+ [L')) {
                // Added line
                const match = line.match(/\+ \[L(\d+)\] (.*)/);
                if (match) {
                    parsedLines.push({
                        type: 'added',
                        rightLineNum: parseInt(match[1]),
                        content: match[2],
                    });
                }
            } else if (line.startsWith('  ')) {
                // Unchanged line
                const content = line.substring(2);
                // Find the last parsed line to get the line numbers
                let leftLineNum = 1;
                let rightLineNum = 1;

                for (let i = parsedLines.length - 1; i >= 0; i--) {
                    const prevLine = parsedLines[i];
                    if (prevLine.leftLineNum) {
                        leftLineNum = prevLine.leftLineNum + 1;
                        break;
                    }
                }

                for (let i = parsedLines.length - 1; i >= 0; i--) {
                    const prevLine = parsedLines[i];
                    if (prevLine.rightLineNum) {
                        rightLineNum = prevLine.rightLineNum + 1;
                        break;
                    }
                }

                parsedLines.push({
                    type: 'unchanged',
                    leftLineNum,
                    rightLineNum,
                    content,
                });
            }
        }

        return {
            header,
            summary,
            lines: parsedLines,
        };
    };

    const handleCompare = async () => {
        if (!file1 || !file2) {
            setError('Please select two files to compare');
            return;
        }

        setLoading(true);
        setDiffResult(null);
        setParsedDiff(null);
        setError(null);

        try {
            // Read both files as text
            const content1 = await readFileAsText(file1);
            const content2 = await readFileAsText(file2);

            // Call Rust function through Tauri
            const result = await invoke<string>('diff_check', {
                fileContent1: content1,
                fileContent2: content2,
                fileName1: file1.name,
                fileName2: file2.name,
            });

            console.log(result);
            setDiffResult(result);

            // Parse the diff output for side-by-side viewing
            const parsed = parseDiffOutput(result);
            setParsedDiff(parsed);
        } catch (err) {
            console.error('Error resolving diff:', err);
            setError(typeof err === 'string' ? err : 'Failed to resolve differences between files');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (diffResult) {
            navigator.clipboard.writeText(diffResult);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="mx-auto p-6 bg-white">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">File Diff Checker</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* File 1 Upload */}
                <FileUploadCard file={file1} onChange={e => handleFileChange(e, setFile1)} label="First File" />

                {/* File 2 Upload */}
                <FileUploadCard file={file2} onChange={e => handleFileChange(e, setFile2)} label="Second File" />
            </div>

            <div className="flex justify-center mb-8">
                <button
                    onClick={handleCompare}
                    disabled={loading || !file1 || !file2}
                    className={`
                        px-6 py-3 rounded-lg font-medium flex items-center justify-center
                        transition-colors duration-200 min-w-40
                        ${
                            loading || !file1 || !file2
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }
                    `}
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin mr-2 h-5 w-5" />
                            Comparing Files...
                        </>
                    ) : (
                        'Compare & Resolve'
                    )}
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    <div className="flex">
                        <XCircle className="h-5 w-5 mr-2" />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {parsedDiff && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 animate-fadeIn">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center">
                            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                            {parsedDiff.header}
                        </h3>
                        <button
                            className={`
                                text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center
                                ${copied ? 'text-green-600' : ''}
                            `}
                            onClick={copyToClipboard}
                        >
                            <Copy className="h-4 w-4 mr-1" />
                            {copied ? 'Copied!' : 'Copy to clipboard'}
                        </button>
                    </div>

                    {/* Side by side diff view */}
                    <div className="flex flex-col">
                        <div className="overflow-x-auto">
                            <div className="grid grid-cols-2 gap-1 mb-4">
                                <div className="text-center font-medium text-gray-700 py-2 bg-gray-100 rounded-t">
                                    {file1?.name || 'Original File'}
                                </div>
                                <div className="text-center font-medium text-gray-700 py-2 bg-gray-100 rounded-t">
                                    {file2?.name || 'Modified File'}
                                </div>
                            </div>

                            <div className="overflow-auto max-h-96 border border-gray-200 rounded-lg">
                                <table className="w-full">
                                    <tbody className="divide-y divide-gray-200">
                                        {parsedDiff.lines.map((line, idx) => (
                                            <tr
                                                key={idx}
                                                className={`
                                                    ${line.type === 'added' ? 'bg-green-50' : ''}
                                                    ${line.type === 'removed' ? 'bg-red-50' : ''}
                                                `}
                                            >
                                                {/* Line number (left) */}
                                                <td className="p-1 text-xs text-gray-500 text-right select-none w-10 border-r border-gray-200">
                                                    {line.leftLineNum || ''}
                                                </td>

                                                {/* Content (left) */}
                                                <td
                                                    className={`
                                                        p-1 font-mono text-sm whitespace-pre
                                                        ${line.type === 'removed' ? 'bg-red-100' : ''}
                                                    `}
                                                >
                                                    {line.type !== 'added' ? line.content : ''}
                                                </td>

                                                {/* Line number (right) */}
                                                <td className="p-1 text-xs text-gray-500 text-right select-none w-10 border-l border-r border-gray-200">
                                                    {line.rightLineNum || ''}
                                                </td>

                                                {/* Content (right) */}
                                                <td
                                                    className={`
                                                        p-1 font-mono text-sm whitespace-pre
                                                        ${line.type === 'added' ? 'bg-green-100' : ''}
                                                    `}
                                                >
                                                    {line.type !== 'removed' ? line.content : ''}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Summary section */}
                        <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                            <h4 className="font-medium text-gray-800">Summary</h4>
                            <p className="text-sm text-gray-700">
                                {parsedDiff.summary.split('\n').map((line, i) =>
                                    line.startsWith('##') ? null : (
                                        <span key={i}>
                                            {line}
                                            <br />
                                        </span>
                                    ),
                                )}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// File upload component
interface FileUploadCardProps {
    file: File | null;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label: string;
}

const FileUploadCard: React.FC<FileUploadCardProps> = ({ file, onChange, label }) => {
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h3 className="font-medium text-gray-700">{label}</h3>
            </div>
            <div className="p-6">
                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <File className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500">{file ? file.name : 'Click to upload or drag and drop'}</p>
                        {file && <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>}
                    </div>
                    <input type="file" className="hidden" onChange={onChange} />
                </label>
            </div>
        </div>
    );
};
