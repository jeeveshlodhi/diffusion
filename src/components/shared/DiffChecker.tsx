import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Check, Loader2, Merge, Plus } from 'lucide-react';
import { Button } from '@/components/shared/global/button';
import { FileUploadCard } from './FileUploadCard';
import { DiffResultView } from './DiffResultView';
import { ErrorAlert } from './ErrorAlert';
import { Alert, AlertDescription, AlertTitle } from '@/components/shared/global/alert';

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
            selected?: boolean;
        }>;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showUpload, setShowUpload] = useState(true);
    const [mergedContent, setMergedContent] = useState<string | null>(null);
    const [mergeSuccess, setMergeSuccess] = useState<boolean | null>(null);

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

        const parsedLines = [];
        for (const line of contentLines) {
            if (line.startsWith('- [L')) {
                const match = line.match(/- \[L(\d+)\] (.*)/);
                if (match) {
                    parsedLines.push({
                        type: 'removed',
                        leftLineNum: parseInt(match[1]),
                        content: match[2],
                    });
                }
            } else if (line.startsWith('+ [L')) {
                const match = line.match(/\+ \[L(\d+)\] (.*)/);
                if (match) {
                    parsedLines.push({
                        type: 'added',
                        rightLineNum: parseInt(match[1]),
                        content: match[2],
                    });
                }
            } else if (line.startsWith('  ')) {
                const content = line.substring(2);
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
        setMergedContent(null);
        setMergeSuccess(null);

        try {
            const content1 = await readFileAsText(file1);
            const content2 = await readFileAsText(file2);

            const result = await invoke<string>('diff_check', {
                fileContent1: content1,
                fileContent2: content2,
                fileName1: file1.name,
                fileName2: file2.name,
            });

            setDiffResult(result);
            const parsed = parseDiffOutput(result);
            // Initialize selected state for conflict lines
            const parsedWithSelection = {
                ...parsed,
                lines: parsed.lines.map(line => ({
                    ...line,
                    selected: line.type === 'unchanged' ? true : undefined,
                })),
            };
            setParsedDiff(parsedWithSelection);
            setShowUpload(false);
        } catch (err) {
            console.error('Error resolving diff:', err);
            setError(typeof err === 'string' ? err : 'Failed to resolve differences between files');
        } finally {
            setLoading(false);
        }
    };

    const handleNewComparison = () => {
        setFile1(null);
        setFile2(null);
        setDiffResult(null);
        setParsedDiff(null);
        setError(null);
        setMergedContent(null);
        setMergeSuccess(null);
        setShowUpload(true);
    };

    const toggleLineSelection = (index: number) => {
        if (!parsedDiff) return;

        const updatedLines = [...parsedDiff.lines];
        const line = updatedLines[index];

        // Only allow toggling for changed lines (not unchanged)
        if (line.type !== 'unchanged') {
            updatedLines[index] = {
                ...line,
                selected: !line.selected,
            };
            setParsedDiff({
                ...parsedDiff,
                lines: updatedLines,
            });
        }
    };

    const handleMerge = () => {
        if (!parsedDiff || !file1 || !file2) return;

        try {
            let mergedText = '';
            for (const line of parsedDiff.lines) {
                if (line.type === 'unchanged' || line.selected) {
                    mergedText += line.content + '\n';
                }
            }

            setMergedContent(mergedText);
            setMergeSuccess(true);
        } catch (err) {
            console.error('Error merging files:', err);
            setError('Failed to merge files');
            setMergeSuccess(false);
        }
    };

    const downloadMergedFile = () => {
        if (!mergedContent || !file1) return;

        const blob = new Blob([mergedContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `merged_${file1.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const copyToClipboard = () => {
        if (diffResult) {
            navigator.clipboard.writeText(diffResult);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">File Diff Checker</h2>
                {!showUpload && (
                    <Button variant="outline" onClick={handleNewComparison}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Comparison
                    </Button>
                )}
            </div>

            {showUpload ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <FileUploadCard file={file1} onChange={e => handleFileChange(e, setFile1)} label="First File" />
                        <FileUploadCard
                            file={file2}
                            onChange={e => handleFileChange(e, setFile2)}
                            label="Second File"
                        />
                    </div>

                    <div className="flex justify-center mb-8">
                        <Button onClick={handleCompare} disabled={loading || !file1 || !file2} className="min-w-40">
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                                    Comparing Files...
                                </>
                            ) : (
                                'Compare & Resolve'
                            )}
                        </Button>
                    </div>
                </>
            ) : (
                <>
                    <div className="flex justify-end mb-4 gap-2">
                        <Button onClick={handleMerge} variant="default">
                            <Merge className="h-4 w-4 mr-2" />
                            Merge Files
                        </Button>
                        {mergedContent && (
                            <Button onClick={downloadMergedFile} variant="secondary">
                                Download Merged File
                            </Button>
                        )}
                    </div>

                    {mergeSuccess === false && (
                        <ErrorAlert error="Failed to merge files. Please check the differences and try again." />
                    )}

                    {mergeSuccess && (
                        <Alert variant="default" className="mb-4">
                            <Check className="h-4 w-4" />
                            <AlertTitle>Merge Successful</AlertTitle>
                            <AlertDescription>
                                Files have been successfully merged. You can now download the merged file.
                            </AlertDescription>
                        </Alert>
                    )}
                </>
            )}

            {error && <ErrorAlert error={error} />}

            {parsedDiff && (
                <div className="mt-4">
                    <DiffResultView
                        parsedDiff={parsedDiff}
                        file1Name={file1?.name || null}
                        file2Name={file2?.name || null}
                        onCopy={copyToClipboard}
                        copied={copied}
                        onLineClick={toggleLineSelection}
                    />
                </div>
            )}
        </div>
    );
}
