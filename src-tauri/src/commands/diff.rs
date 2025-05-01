use serde::{Deserialize, Serialize};
use similar::{ChangeTag, TextDiff};
use tauri::command;
use crate::utils::formatter;

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffResult {
    pub line_number: usize,
    pub content: String,
    pub status: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffSummary {
    pub total_lines: usize,
    pub added_lines: usize,
    pub removed_lines: usize,
    pub unchanged_lines: usize,
    pub similarity_ratio: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DiffResponse {
    pub file_name1: String,
    pub file_name2: String,
    pub changes: Vec<DiffResult>,
    pub summary: DiffSummary,
}

/// Command to check differences between two text files with improved response format
/// 
/// # Arguments
/// 
/// * `file_content1` - Content of the first file
/// * `file_content2` - Content of the second file
/// * `file_name1` - Name of the first file
/// * `file_name2` - Name of the second file
/// 
/// # Returns
/// 
/// * `Result<DiffResponse, String>` - Structured diff output or error message
#[command]
pub fn diff_check(
    file_content1: String,
    file_content2: String,
    file_name1: String,
    file_name2: String,
) -> Result<DiffResponse, String> {
    // Create a diff between the two file contents
    let diff = TextDiff::from_lines(&file_content1, &file_content2);
    
    // Track line numbers for better output
    let mut line_num1 = 0;
    let mut line_num2 = 0;
    
    // Track statistics
    let mut added_lines = 0;
    let mut removed_lines = 0;
    let mut unchanged_lines = 0;
    
    // Store changes in a structured format
    let mut changes: Vec<DiffResult> = Vec::new();
    
    // Process diff chunks
    for change in diff.iter_all_changes() {
        match change.tag() {
            ChangeTag::Delete => {
                line_num1 += 1;
                removed_lines += 1;
                changes.push(DiffResult {
                    line_number: line_num1,
                    content: change.value().to_string(),
                    status: "removed".to_string(),
                });
            }
            ChangeTag::Insert => {
                line_num2 += 1;
                added_lines += 1;
                changes.push(DiffResult {
                    line_number: line_num2,
                    content: change.value().to_string(),
                    status: "added".to_string(),
                });
            }
            ChangeTag::Equal => {
                line_num1 += 1;
                line_num2 += 1;
                unchanged_lines += 1;
                changes.push(DiffResult {
                    line_number: line_num1, // Both line numbers are the same for unchanged lines
                    content: change.value().to_string(),
                    status: "unchanged".to_string(),
                });
            }
        }
    }
    
    // Create summary
    let total_lines = added_lines + removed_lines + unchanged_lines;
    let similarity_ratio = diff.ratio();
    
    let summary = DiffSummary {
        total_lines,
        added_lines,
        removed_lines,
        unchanged_lines,
        similarity_ratio: similarity_ratio.into(),
    };
    
    // Build final response
    let response = DiffResponse {
        file_name1,
        file_name2,
        changes,
        summary,
    };
    
    Ok(response)
}

/// Command to generate a human-readable diff report
/// 
/// # Arguments
/// 
/// * `diff_response` - The structured diff response
/// 
/// # Returns
/// 
/// * `String` - Formatted text representation of the diff
#[command]
pub fn format_diff_report(diff_response: DiffResponse) -> String {
    let mut result = formatter::create_diff_header(&diff_response.file_name1, &diff_response.file_name2);
    
    // Format each change
    for change in &diff_response.changes {
        match change.status.as_str() {
            "removed" => {
                result.push_str(&format!("- [L{}] {}", change.line_number, change.content));
            }
            "added" => {
                result.push_str(&format!("+ [L{}] {}", change.line_number, change.content));
            }
            "unchanged" => {
                result.push_str(&format!("  {}", change.content));
            }
            _ => {}
        }
    }
    
    // Add a summary
    result.push_str("\n\n## Summary\n");
    result.push_str(&format!("Total lines: {}\n", diff_response.summary.total_lines));
    result.push_str(&format!("Added lines: {}\n", diff_response.summary.added_lines));
    result.push_str(&format!("Removed lines: {}\n", diff_response.summary.removed_lines));
    result.push_str(&format!("Unchanged lines: {}\n", diff_response.summary.unchanged_lines));
    result.push_str(&format!("Similarity: {:.2}%\n", diff_response.summary.similarity_ratio * 100.0));
    
    result
}

/// Command to resolve conflicts between two files
/// 
/// # Arguments
/// 
/// * `file_content1` - Content of the first file
/// * `file_content2` - Content of the second file
/// * `resolution_strategy` - Strategy to resolve conflicts ("prefer_first", "prefer_second", "merge")
/// 
/// # Returns
/// 
/// * `Result<String, String>` - Resolved content or error message
#[command]
pub fn resolve_conflicts(
    file_content1: String,
    file_content2: String,
    resolution_strategy: String,
) -> Result<String, String> {
    // Create a diff between the two file contents
    let diff = TextDiff::from_lines(&file_content1, &file_content2);
    
    let mut resolved = String::new();
    
    match resolution_strategy.as_str() {
        "prefer_first" => {
            // Just return the first file's content
            resolved = file_content1;
        },
        "prefer_second" => {
            // Just return the second file's content
            resolved = file_content2;
        },
        "merge" => {
            // Attempt to merge the content with conflict markers
            for change in diff.iter_all_changes() {
                match change.tag() {
                    ChangeTag::Equal => {
                        resolved.push_str(change.value());
                    },
                    ChangeTag::Delete => {
                        // For conflicts, retain both versions with conflict markers
                        if !change.value().trim().is_empty() {
                            // Only add conflict markers if there's an actual conflict
                            if diff.iter_all_changes().any(|c| c.tag() == ChangeTag::Insert && 
                               !c.value().trim().is_empty()) {
                                if !resolved.ends_with("<<<<<<< FILE 1\n") {
                                    resolved.push_str("<<<<<<< FILE 1\n");
                                }
                                resolved.push_str(change.value());
                            } else {
                                // If there's no corresponding insert, just keep this deletion
                                resolved.push_str(change.value());
                            }
                        }
                    },
                    ChangeTag::Insert => {
                        // For conflicts, retain both versions with conflict markers
                        if !change.value().trim().is_empty() {
                            // Only add conflict markers if there's an actual conflict
                            if diff.iter_all_changes().any(|c| c.tag() == ChangeTag::Delete && 
                               !c.value().trim().is_empty()) {
                                if !resolved.contains("=======\n") {
                                    resolved.push_str("=======\n");
                                }
                                resolved.push_str(change.value());
                                if !resolved.ends_with(">>>>>>> FILE 2\n") {
                                    resolved.push_str(">>>>>>> FILE 2\n");
                                }
                            } else {
                                // If there's no corresponding deletion, just keep this insertion
                                resolved.push_str(change.value());
                            }
                        }
                    }
                }
            }
        },
        _ => {
            return Err(format!("Invalid resolution strategy: {}", resolution_strategy));
        }
    }
    
    Ok(resolved)
}