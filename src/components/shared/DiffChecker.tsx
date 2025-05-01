import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Check, Loader2, Merge, Plus } from 'lucide-react';
import { Button } from '@/components/shared/global/button';
import { FileUploadCard } from './FileUploadCard';
import { DiffResultView } from './DiffResultView';
import { ErrorAlert } from './ErrorAlert';
import { Alert, AlertDescription, AlertTitle } from '@/components/shared/global/alert';

// Define types based on the Rust API
interface DiffResult {
  line_number: number;
  content: string;
  status: string; // "added", "removed", or "unchanged"
}

interface DiffSummary {
  total_lines: number;
  added_lines: number;
  removed_lines: number;
  unchanged_lines: number;
  similarity_ratio: number;
}

interface DiffResponse {
  file_name1: string;
  file_name2: string;
  changes: DiffResult[];
  summary: DiffSummary;
}

// Format for our UI
interface ParsedDiffLine {
  type: string;
  leftLineNum?: number;
  rightLineNum?: number;
  content: string;
  selected?: boolean;
}

interface ParsedDiff {
  header: string;
  summary: string;
  lines: ParsedDiffLine[];
}

export default function DiffChecker() {
    const [file1, setFile1] = useState<File | null>(null);
    const [file2, setFile2] = useState<File | null>(null);
    const [diffResult, setDiffResult] = useState<DiffResponse | null>(null);
    const [parsedDiff, setParsedDiff] = useState<ParsedDiff | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [showUpload, setShowUpload] = useState(true);
    const [mergedContent, setMergedContent] = useState<string | null>(null);
    const [mergeSuccess, setMergeSuccess] = useState<boolean | null>(null);
    const [mergeInProgress, setMergeInProgress] = useState(false);
    const [mergeStrategy, setMergeStrategy] = useState<string>("merge");

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

    const convertToUIFormat = (diffResponse: DiffResponse): ParsedDiff => {
        // Create header
        const header = `# Diff between ${diffResponse.file_name1} and ${diffResponse.file_name2}`;
        
        // Create summary
        const summary = `## Summary
Total lines: ${diffResponse.summary.total_lines}
Added lines: ${diffResponse.summary.added_lines}
Removed lines: ${diffResponse.summary.removed_lines}
Unchanged lines: ${diffResponse.summary.unchanged_lines}
Similarity: ${(diffResponse.summary.similarity_ratio * 100).toFixed(2)}%
`;

        // Track line numbers for left and right files
        let leftLineNum = 0;
        let rightLineNum = 0;
        
        // Convert API response to our UI format
        const parsedLines = diffResponse.changes.map(change => {
            if (change.status === "unchanged") {
                leftLineNum++;
                rightLineNum++;
                return {
                    type: "unchanged",
                    leftLineNum,
                    rightLineNum,
                    content: change.content,
                    selected: true
                };
            } else if (change.status === "added") {
                rightLineNum = change.line_number;
                return {
                    type: "added",
                    rightLineNum,
                    content: change.content,
                    selected: false
                };
            } else if (change.status === "removed") {
                leftLineNum = change.line_number;
                return {
                    type: "removed",
                    leftLineNum,
                    content: change.content,
                    selected: false
                };
            }
            
            // Fallback (shouldn't happen)
            return {
                type: "unknown",
                content: change.content
            };
        });

        return {
            header,
            summary,
            lines: parsedLines
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

            // Call the updated Rust API
            const response = await invoke<DiffResponse>('diff_check', {
                fileContent1: content1,
                fileContent2: content2,
                fileName1: file1.name,
                fileName2: file2.name,
            });
            
            console.log("Diff response:", response);
            setDiffResult(response);
            
            // Convert to our UI format
            const parsed = convertToUIFormat(response);
            setParsedDiff(parsed);
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

    const handleMerge = async () => {
        if (!file1 || !file2) return;
        
        setMergeInProgress(true);
        setError(null);
        
        try {
            if (mergeStrategy === "manual" && parsedDiff) {
                // Manual merge uses the UI selections
                let mergedText = '';
                for (const line of parsedDiff.lines) {
                    if (line.type === 'unchanged' || line.selected) {
                        mergedText += line.content + '\n';
                    }
                }
                setMergedContent(mergedText);
                setMergeSuccess(true);
            } else {
                // Use the Rust API's conflict resolution
                const content1 = await readFileAsText(file1);
                const content2 = await readFileAsText(file2);
                
                const mergedText = await invoke<string>('resolve_conflicts', {
                    fileContent1: content1,
                    fileContent2: content2,
                    resolutionStrategy: mergeStrategy,
                });
                
                setMergedContent(mergedText);
                setMergeSuccess(true);
            }
        } catch (err) {
            console.error('Error merging files:', err);
            setError(typeof err === 'string' ? err : 'Failed to merge files');
            setMergeSuccess(false);
        } finally {
            setMergeInProgress(false);
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
            // Format the diff result for clipboard
            const formattedDiff = formatDiffForClipboard(diffResult);
            navigator.clipboard.writeText(formattedDiff);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    
    const formatDiffForClipboard = (diff: DiffResponse): string => {
        let result = `# Diff between ${diff.file_name1} and ${diff.file_name2}\n\n`;
        
        for (const change of diff.changes) {
            if (change.status === "unchanged") {
                result += `  ${change.content}\n`;
            } else if (change.status === "added") {
                result += `+ [L${change.line_number}] ${change.content}\n`;
            } else if (change.status === "removed") {
                result += `- [L${change.line_number}] ${change.content}\n`;
            }
        }
        
        result += `\n## Summary\n`;
        result += `Total lines: ${diff.summary.total_lines}\n`;
        result += `Added lines: ${diff.summary.added_lines}\n`;
        result += `Removed lines: ${diff.summary.removed_lines}\n`;
        result += `Unchanged lines: ${diff.summary.unchanged_lines}\n`;
        result += `Similarity: ${(diff.summary.similarity_ratio * 100).toFixed(2)}%\n`;
        
        return result;
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
                    <div className="flex flex-col md:flex-row justify-end mb-4 gap-2">
                        <div className="flex items-center mr-auto mb-2 md:mb-0">
                            <span className="mr-2 text-sm font-medium">Merge Strategy:</span>
                            <select 
                                className="border rounded px-2 py-1 text-sm"
                                value={mergeStrategy}
                                onChange={(e) => setMergeStrategy(e.target.value)}
                            >
                                <option value="merge">Smart Merge (with conflict markers)</option>
                                <option value="prefer_first">Use First File</option>
                                <option value="prefer_second">Use Second File</option>
                                <option value="manual">Manual Selection</option>
                            </select>
                        </div>
                        
                        <Button 
                            onClick={handleMerge} 
                            variant="default"
                            disabled={mergeInProgress}
                        >
                            {mergeInProgress ? (
                                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            ) : (
                                <Merge className="h-4 w-4 mr-2" />
                            )}
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
                                {mergeStrategy === "merge" && 
                                    " The merged file contains conflict markers (<<<<<<< FILE 1, =======, >>>>>>> FILE 2) for manual resolution."}
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
                        selectionMode={mergeStrategy === "manual"}
                    />
                </div>
            )}

            {mergedContent && (
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Merged Content Preview</h3>
                    <div className="border rounded p-4 bg-gray-50 overflow-auto max-h-96">
                        <pre className="whitespace-pre-wrap text-sm">{mergedContent}</pre>
                    </div>
                </div>
            )}
        </div>
    );
}