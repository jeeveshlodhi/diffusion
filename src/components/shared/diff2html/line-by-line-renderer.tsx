import React from 'react';
import * as renderUtils from './render-utils';
import { DiffFile } from './types';
import FileDiff from './components/file-diff';
import { ColorSchemeType } from './types';

export interface LineByLineRendererConfig extends renderUtils.RenderConfig {
    renderNothingWhenEmpty?: boolean;
    matchingMaxComparisons?: number;
    maxLineSizeInBlockForComparison?: number;
}

export const defaultLineByLineRendererConfig: LineByLineRendererConfig = {
    ...renderUtils.defaultRenderConfig,
    renderNothingWhenEmpty: false,
    matchingMaxComparisons: 2500,
    maxLineSizeInBlockForComparison: 200,
};

interface LineByLineRendererProps {
    files: DiffFile[];
    config?: LineByLineRendererConfig;
}

const LineByLineRenderer: React.FC<LineByLineRendererProps> = ({ files, config = {} }) => {
    const mergedConfig = { ...defaultLineByLineRendererConfig, ...config };
    const colorSchemeClass = renderUtils.colorSchemeToCss(mergedConfig.colorScheme || ColorSchemeType.LIGHT);

    return (
        <div className={`d2h-wrapper ${colorSchemeClass}`}>
            <div className="d2h-files-diff">
                {files.map((file, index) => {
                    if (mergedConfig.renderNothingWhenEmpty && file.blocks.length === 0) {
                        return null;
                    }

                    return (
                        <div key={`file-${index}-${renderUtils.getHtmlId(file)}`} className="d2h-file-wrapper">
                            <FileDiff file={file} config={mergedConfig} />
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default LineByLineRenderer;
