import { CheckCircle, Copy, ArrowLeftRight, FileDown } from 'lucide-react';
import { Button } from '@/components/shared/global/button';
import { Card } from '@/components/shared/global/card';
import { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/global/tabs';
import { Diff2Html } from './diff2html/diff2html';

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
    rawDiff?: string;
}

export const DiffResultView: React.FC<DiffResultViewProps> = ({
    parsedDiff,
    file1Name,
    file2Name,
    onCopy,
    copied,
    rawDiff = '',
}) => {
    const [viewMode, setViewMode] = useState('side-by-side'); // 'side-by-side', 'line-by-line', or 'merged'

    // useEffect(() => {
    //     if (!rawDiff) {
    //         // Generate a unified diff format from parsedDiff if rawDiff is not provided
    //         const generatedDiff = generateDiffFromParsed(parsedDiff, file1Name || 'original', file2Name || 'modified');
    // }, [rawDiff, parsedDiff, file1Name, file2Name, viewMode]);

    // Function to generate a simple unified diff from our parsed diff structure
    const generateDiffFromParsed = (
        parsedDiff: DiffResultViewProps['parsedDiff'],
        oldFileName: string,
        newFileName: string,
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

    return (
        <Card className="animate-fadeIn">
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                        {parsedDiff.header}
                    </h3>
                    <div className="flex space-x-2">
                        <Button variant="ghost" size="sm" onClick={onCopy} className={copied ? 'text-green-600' : ''}>
                            <Copy className="h-4 w-4 mr-1" />
                            {copied ? 'Copied!' : 'Copy diff'}
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="diff" className="w-full">
                    <TabsList className="grid grid-cols-2 mb-4">
                        <TabsTrigger value="diff" onClick={() => setViewMode('side-by-side')}>
                            Side by Side
                        </TabsTrigger>
                        <TabsTrigger value="unified" onClick={() => setViewMode('line-by-line')}>
                            Unified View
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="diff" className="border-0 p-0">
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

                                <div className="border border-gray-200 rounded-lg overflow-auto max-h-[700px] relative">
                                    <Diff2Html
                                        diffInput={rawDiff || generateDiffFromParsed(parsedDiff, file1Name, file2Name)}
                                        configuration={{
                                            outputFormat: viewMode === 'side-by-side' ? 'side-by-side' : 'line-by-line',
                                            drawFileList: false,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="unified" className="border-0 p-0">
                        <div className="flex flex-col">
                            <div className="overflow-x-auto">
                                <div className="text-center font-medium text-gray-700 py-2 bg-gray-100 rounded-t">
                                    Unified Diff View
                                </div>
                                <div className="overflow-x-auto">
                                    <div className="border border-gray-200 rounded-lg overflow-auto max-h-[700px] relative">
                                        <Diff2Html
                                            diffInput={
                                                rawDiff || generateDiffFromParsed(parsedDiff, file1Name, file2Name)
                                            }
                                            configuration={{
                                                outputFormat: 'line-by-line',
                                                drawFileList: false,
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

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
        </Card>
    );
};
