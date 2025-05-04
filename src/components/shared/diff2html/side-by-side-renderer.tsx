import React from 'react';
import * as Rematch from './rematch';
import * as renderUtils from './render-utils';
import {
    DiffLine,
    LineType,
    DiffFile,
    DiffBlock,
    DiffLineContext,
    DiffLineDeleted,
    DiffLineInserted,
    DiffLineContent,
} from './types';

export interface SideBySideRendererConfig extends renderUtils.RenderConfig {
    renderNothingWhenEmpty?: boolean;
    matchingMaxComparisons?: number;
    maxLineSizeInBlockForComparison?: number;
}

export const defaultSideBySideRendererConfig = {
    ...renderUtils.defaultRenderConfig,
    renderNothingWhenEmpty: false,
    matchingMaxComparisons: 2500,
    maxLineSizeInBlockForComparison: 200,
};

interface SideBySideRendererProps {
    files: DiffFile[];
    config?: SideBySideRendererConfig;
}

interface DiffPreparedLine {
    type: renderUtils.CSSLineClass | string;
    prefix: string;
    content: string;
    number: number;
}

type DiffLineGroups = [
    (DiffLineContext & DiffLineContent)[],
    (DiffLineDeleted & DiffLineContent)[],
    (DiffLineInserted & DiffLineContent)[],
][];

type FileHtml = {
    left: React.ReactNode;
    right: React.ReactNode;
};

const SideBySideRenderer: React.FC<SideBySideRendererProps> = ({ files, config = {} }) => {
    const mergedConfig = { ...defaultSideBySideRendererConfig, ...config };

    const renderFileDiff = (file: DiffFile) => {
        let diffsHtml;
        if (file.blocks.length) {
            diffsHtml = generateFileHtml(file);
        } else {
            diffsHtml = generateEmptyDiff();
        }
        return makeFileDiffHtml(file, diffsHtml);
    };

    const makeFileDiffHtml = (file: DiffFile, diffs: FileHtml): JSX.Element => {
        if (mergedConfig.renderNothingWhenEmpty && Array.isArray(file.blocks) && file.blocks.length === 0) {
            return <></>;
        }

        return (
            <div key={renderUtils.getHtmlId(file)} className="d2h-file-wrapper" data-lang={file.language}>
                <div className="d2h-file-header">{renderFilePath(file)}</div>
                <div className="d2h-files-diff">
                    <div className="d2h-file-side-diff">
                        <div className="d2h-code-wrapper">
                            <table className="d2h-diff-table">
                                <tbody className="d2h-diff-tbody">{diffs.left}</tbody>
                            </table>
                        </div>
                    </div>
                    <div className="d2h-file-side-diff">
                        <div className="d2h-code-wrapper">
                            <table className="d2h-diff-table">
                                <tbody className="d2h-diff-tbody">{diffs.right}</tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderFilePath = (file: DiffFile): JSX.Element => {
        const fileIcon = <renderUtils.FileIcons.File />;

        const fileTag = (
            <span className={`d2h-tag d2h-${renderUtils.getFileIcon(file)}-tag`}>
                {renderUtils.getFileStatus(file)}
            </span>
        );

        return (
            <div className="d2h-file-name-wrapper">
                {fileIcon}
                <span className="d2h-file-name">{renderUtils.filenameDiff(file)}</span>
                {fileTag}
            </div>
        );
    };

    const generateEmptyDiff = (): FileHtml => ({
        right: <></>,
        left: (
            <tr>
                <td className="d2h-code-side-linenumber d2h-info"></td>
                <td className="d2h-info">
                    <div className="d2h-code-side-line">File without changes</div>
                </td>
            </tr>
        ),
    });

    const generateFileHtml = (file: DiffFile): FileHtml => {
        const matcher = Rematch.newMatcherFn(
            Rematch.newDistanceFn((e: DiffLine) => renderUtils.deconstructLine(e.content, file.isCombined).content),
        );

        let leftContent: React.ReactNode[] = [];
        let rightContent: React.ReactNode[] = [];

        file.blocks.forEach(block => {
            // Add headers
            leftContent.push(makeHeaderHtml(block.header, file));
            rightContent.push(makeHeaderHtml(''));

            applyLineGroupping(block).forEach(([contextLines, oldLines, newLines]) => {
                if (oldLines.length && newLines.length && !contextLines.length) {
                    applyRematchMatching(oldLines, newLines, matcher).forEach(([matchedOldLines, matchedNewLines]) => {
                        const { left, right } = processChangedLines(file.isCombined, matchedOldLines, matchedNewLines);
                        leftContent = [...leftContent, ...left];
                        rightContent = [...rightContent, ...right];
                    });
                } else if (contextLines.length) {
                    contextLines.forEach(line => {
                        const { prefix, content } = renderUtils.deconstructLine(line.content, file.isCombined);
                        const { left, right } = generateLineHtml(
                            {
                                type: renderUtils.CSSLineClass.CONTEXT,
                                prefix: prefix,
                                content: content,
                                number: line.oldNumber!,
                            },
                            {
                                type: renderUtils.CSSLineClass.CONTEXT,
                                prefix: prefix,
                                content: content,
                                number: line.newNumber!,
                            },
                        );
                        leftContent.push(left);
                        rightContent.push(right);
                    });
                } else if (oldLines.length || newLines.length) {
                    const { left, right } = processChangedLines(file.isCombined, oldLines, newLines);
                    leftContent = [...leftContent, ...left];
                    rightContent = [...rightContent, ...right];
                } else {
                    console.error(
                        'Unknown state reached while processing groups of lines',
                        contextLines,
                        oldLines,
                        newLines,
                    );
                }
            });
        });

        return {
            left: leftContent,
            right: rightContent,
        };
    };

    const applyLineGroupping = (block: DiffBlock): DiffLineGroups => {
        const blockLinesGroups: DiffLineGroups = [];
        let oldLines: (DiffLineDeleted & DiffLineContent)[] = [];
        let newLines: (DiffLineInserted & DiffLineContent)[] = [];

        for (let i = 0; i < block.lines.length; i++) {
            const diffLine = block.lines[i];

            if (
                (diffLine.type !== LineType.INSERT && newLines.length) ||
                (diffLine.type === LineType.CONTEXT && oldLines.length > 0)
            ) {
                blockLinesGroups.push([[], oldLines, newLines]);
                oldLines = [];
                newLines = [];
            }

            if (diffLine.type === LineType.CONTEXT) {
                blockLinesGroups.push([[diffLine], [], []]);
            } else if (diffLine.type === LineType.INSERT && oldLines.length === 0) {
                blockLinesGroups.push([[], [], [diffLine]]);
            } else if (diffLine.type === LineType.INSERT && oldLines.length > 0) {
                newLines.push(diffLine);
            } else if (diffLine.type === LineType.DELETE) {
                oldLines.push(diffLine);
            }
        }

        if (oldLines.length || newLines.length) {
            blockLinesGroups.push([[], oldLines, newLines]);
        }

        return blockLinesGroups;
    };

    const applyRematchMatching = (
        oldLines: DiffLine[],
        newLines: DiffLine[],
        matcher: Rematch.MatcherFn<DiffLine>,
    ): DiffLine[][][] => {
        const comparisons = oldLines.length * newLines.length;
        const maxLineSizeInBlock = Math.max.apply(
            null,
            [0].concat(oldLines.concat(newLines).map(elem => elem.content.length)),
        );
        const doMatching =
            comparisons < mergedConfig.matchingMaxComparisons &&
            maxLineSizeInBlock < mergedConfig.maxLineSizeInBlockForComparison &&
            (mergedConfig.matching === 'lines' || mergedConfig.matching === 'words');

        return doMatching ? matcher(oldLines, newLines) : [[oldLines, newLines]];
    };

    const makeHeaderHtml = (blockHeader: string, file?: DiffFile): React.ReactNode => {
        return (
            <tr>
                <td className="d2h-code-side-linenumber d2h-info"></td>
                <td className="d2h-info">
                    <div className="d2h-code-side-line">
                        {file?.isTooBig ? blockHeader : renderUtils.escapeForHtml(blockHeader)}
                    </div>
                </td>
            </tr>
        );
    };

    const processChangedLines = (
        isCombined: boolean,
        oldLines: DiffLine[],
        newLines: DiffLine[],
    ): { left: React.ReactNode[]; right: React.ReactNode[] } => {
        const leftContent: React.ReactNode[] = [];
        const rightContent: React.ReactNode[] = [];

        const maxLinesNumber = Math.max(oldLines.length, newLines.length);
        for (let i = 0; i < maxLinesNumber; i++) {
            const oldLine = oldLines[i];
            const newLine = newLines[i];

            const diff =
                oldLine !== undefined && newLine !== undefined
                    ? renderUtils.diffHighlight(oldLine.content, newLine.content, isCombined, mergedConfig)
                    : undefined;

            const preparedOldLine =
                oldLine !== undefined && oldLine.oldNumber !== undefined
                    ? {
                          ...(diff !== undefined
                              ? {
                                    prefix: diff.oldLine.prefix,
                                    content: diff.oldLine.content,
                                    type: renderUtils.CSSLineClass.DELETE_CHANGES,
                                }
                              : {
                                    ...renderUtils.deconstructLine(oldLine.content, isCombined),
                                    type: renderUtils.toCSSClass(oldLine.type),
                                }),
                          number: oldLine.oldNumber,
                      }
                    : undefined;

            const preparedNewLine =
                newLine !== undefined && newLine.newNumber !== undefined
                    ? {
                          ...(diff !== undefined
                              ? {
                                    prefix: diff.newLine.prefix,
                                    content: diff.newLine.content,
                                    type: renderUtils.CSSLineClass.INSERT_CHANGES,
                                }
                              : {
                                    ...renderUtils.deconstructLine(newLine.content, isCombined),
                                    type: renderUtils.toCSSClass(newLine.type),
                                }),
                          number: newLine.newNumber,
                      }
                    : undefined;

            const { left, right } = generateLineHtml(preparedOldLine, preparedNewLine);
            leftContent.push(left);
            rightContent.push(right);
        }

        return { left: leftContent, right: rightContent };
    };

    const generateLineHtml = (
        oldLine?: DiffPreparedLine,
        newLine?: DiffPreparedLine,
    ): { left: React.ReactNode; right: React.ReactNode } => {
        return {
            left: generateSingleLineHtml(oldLine),
            right: generateSingleLineHtml(newLine),
        };
    };

    const generateSingleLineHtml = (line?: DiffPreparedLine): React.ReactNode => {
        const lineType = line?.type || `${renderUtils.CSSLineClass.CONTEXT} d2h-emptyplaceholder`;
        const lineClass =
            line !== undefined ? 'd2h-code-side-linenumber' : 'd2h-code-side-linenumber d2h-code-side-emptyplaceholder';
        const contentClass =
            line !== undefined ? 'd2h-code-side-line' : 'd2h-code-side-line d2h-code-side-emptyplaceholder';
        const prefix = line?.prefix === ' ' ? '\u00a0' : line?.prefix; // Use non-breaking space for empty prefixes

        return (
            <tr className={lineType}>
                <td className={lineClass}>{line?.number}</td>
                <td className={contentClass}>
                    <span className="d2h-code-line-prefix">{prefix}</span>
                    <span
                        className="d2h-code-line-ctn"
                        dangerouslySetInnerHTML={{ __html: line?.content || '' }}
                    ></span>
                </td>
            </tr>
        );
    };

    return (
        <div className={`d2h-wrapper ${renderUtils.colorSchemeToCss(mergedConfig.colorScheme)}`}>
            {files.map(file => renderFileDiff(file))}
        </div>
    );
};

export default SideBySideRenderer;
