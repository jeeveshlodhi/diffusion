import { CheckCircle, Copy } from 'lucide-react';
import { Button } from '@/components/shared/global/button';
import { Card } from '@/components/shared/global/card';
import { useEffect, useState } from 'react';
import * as Diff2Html from 'diff2html';
import 'diff2html/bundles/css/diff2html.min.css';

interface DiffResultViewProps {
    parsedDiff: {
        header: string;
        summary: string;
        lines: Array<{
            type: string;
            leftLineNum?: number;
            rightLineNum?: number;
            content: string;
            selected?: boolean;
        }>;
    };
    file1Name: string | null;
    file2Name: string | null;
    onCopy: () => void;
    copied: boolean;
    rawDiff?: string; // Make rawDiff optional
    onLineClick?: (index: number, side: 'left' | 'right') => void;
    selectionMode?: boolean;
    selectedSide?: 'left' | 'right';
}

export const DiffResultView: React.FC<DiffResultViewProps> = ({
    parsedDiff,
    file1Name,
    file2Name,
    onCopy,
    copied,
    rawDiff = '', // Provide default empty string
    onLineClick,
    selectionMode = true,
    selectedSide,
}) => {
    const [diffHtml, setDiffHtml] = useState('');
    
    useEffect(() => {
        if (!rawDiff) {
            // Generate a unified diff format from parsedDiff if rawDiff is not provided
            const generatedDiff = generateDiffFromParsed(parsedDiff, file1Name || 'original', file2Name || 'modified');
            renderDiff(generatedDiff);
        } else {
            renderDiff(rawDiff);
        }
        
    }, [rawDiff, parsedDiff, file1Name, file2Name, selectionMode, onLineClick, selectedSide]);
    
    // Function to generate a simple unified diff from our parsed diff structure
    const generateDiffFromParsed = (
        parsedDiff: DiffResultViewProps['parsedDiff'], 
        oldFileName: string, 
        newFileName: string
    ) => {
        let diff = `--- a/${oldFileName}\n+++ b/${newFileName}\n@@ -1,1 +1,1 @@\n`;
        
        parsedDiff.lines.forEach(line => {
            if (line.type === 'added') {
                diff += `+${line.content}\n`;
            } else if (line.type === 'removed') {
                diff += `-${line.content}\n`;
            } else {
                diff += ` ${line.content}\n`;
            }
        });
        
        return diff;
    };
    
    // Function to render the diff using diff2html
    const renderDiff = (diffInput: string) => {
        try {
            // Configure diff2html options
            const configuration = {
                drawFileList: false,
                matching: 'lines',
                outputFormat: 'side-by-side',
                highlight: true,
                fileContentToggle: false,
                renderNothingWhenEmpty: false,
            };
            
            // Generate the diff HTML
            const diffJson = Diff2Html.parse(diffInput);
            const html = Diff2Html.html(diffJson, configuration);
            setDiffHtml(html);
            
            // After the diff is rendered, we can attach event listeners for line selection if needed
            if (selectionMode && onLineClick) {
                setTimeout(() => {
                    attachLineClickHandlers();
                }, 100);
            }
        } catch (error) {
            console.error('Error rendering diff:', error);
            setDiffHtml(`<div class="p-4 text-red-500">Error rendering diff: ${error.message}</div>`);
        }
    };
    
    // Function to attach click handlers to diff lines for selection
    const attachLineClickHandlers = () => {
        const container = document.getElementById('diff-container');
        if (!container) return;
        
        // Find all added lines (usually have a class like 'd2h-ins' or similar in diff2html)
        const addedLines = container.querySelectorAll('.d2h-ins');
        addedLines.forEach((line, index) => {
            line.classList.add('cursor-pointer', 'hover:bg-opacity-80');
            if (selectedSide === 'right') {
                line.classList.add('bg-green-100');
            }
            line.addEventListener('click', () => onLineClick && onLineClick(index, 'right'));
        });
        
        // Find all removed lines
        const removedLines = container.querySelectorAll('.d2h-del');
        removedLines.forEach((line, index) => {
            line.classList.add('cursor-pointer', 'hover:bg-opacity-80');
            if (selectedSide === 'left') {
                line.classList.add('bg-red-100');
            }
            line.addEventListener('click', () => onLineClick && onLineClick(index, 'left'));
        });
    };

    return (
        <Card className="animate-fadeIn">
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        {parsedDiff.header}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={onCopy} className={copied ? 'text-green-600' : ''}>
                        <Copy className="h-4 w-4 mr-1" />
                        {copied ? 'Copied!' : 'Copy to clipboard'}
                    </Button>
                </div>

                {selectionMode && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm text-blue-700">
                            <strong>Manual Selection Mode:</strong> Click on added or removed lines to select which ones to keep in the merged file.
                        </p>
                    </div>
                )}

                <div className="flex flex-col">
                    <div className="overflow-x-auto">
                        <div className="grid grid-cols-2 gap-1 mb-4">
                            <div className="text-center font-medium text-gray-700 py-2 bg-gray-100 rounded-t">
                                {file1Name || 'Original File'}
                            </div>
                            <div className="text-center font-medium text-gray-700 py-2 bg-gray-100 rounded-t">
                                {file2Name || 'Modified File'}
                            </div>
                        </div>

                        <div 
                            id="diff-container"
                            className="border border-gray-200 rounded-lg overflow-auto max-h-96"
                            dangerouslySetInnerHTML={{ __html: diffHtml }}
                        />
                    </div>

                    <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                        <h4 className="font-medium text-gray-800 mb-2">Summary</h4>
                        <div className="text-sm text-gray-700">
                            {parsedDiff.summary.split('\n').map((line, i) =>
                                line.startsWith('##') ? null : (
                                    <div key={i} className="mb-1">
                                        {line}
                                    </div>
                                ),
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};