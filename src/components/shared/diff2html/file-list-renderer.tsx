import React from 'react';
import { DiffFile, ColorSchemeType } from './types';
import * as renderUtils from './render-utils';

export interface FileListRendererProps {
    files: DiffFile[];
    colorScheme?: ColorSchemeType;
}

export const FileListRenderer: React.FC<FileListRendererProps> = ({
    files,
    colorScheme = renderUtils.defaultRenderConfig.colorScheme,
}) => {
    const cssClass = renderUtils.colorSchemeToCss(colorScheme);

    return (
        <div className={`d2h-file-list-wrapper ${cssClass}`}>
            <div className="d2h-file-list-header">
                <span className="d2h-files-number">{files.length} files</span>
            </div>
            <ul className="d2h-file-list">
                {files.map(file => {
                    const fileHtmlId = renderUtils.getHtmlId(file);
                    const fileName = renderUtils.filenameDiff(file);
                    const fileIcon = renderUtils.getFileIcon(file);

                    return (
                        <li key={fileHtmlId} className="d2h-file-name" data-file={fileHtmlId}>
                            <span className={`d2h-icon ${fileIcon}`} aria-hidden="true"></span>
                            <span className="d2h-file-name-text">{fileName}</span>
                            <span className="d2h-lines-added">+{file.addedLines}</span>
                            <span className="d2h-lines-deleted">-{file.deletedLines}</span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
