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

/// Command to check differences between two text files
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
/// * `Result<String, String>` - Formatted diff output or error message
#[command]
pub fn diff_check(
    file_content1: String,
    file_content2: String,
    file_name1: String,
    file_name2: String,
) -> Result<String, String> {
    // Create a diff between the two file contents
    let diff = TextDiff::from_lines(&file_content1, &file_content2);
    
    // Prepare a formatted result string
    let mut result = formatter::create_diff_header(&file_name1, &file_name2);
    
    // Track line numbers for better output
    let mut line_num1 = 0;
    let mut line_num2 = 0;
    
    // Process diff chunks
    for change in diff.iter_all_changes() {
        match change.tag() {
            ChangeTag::Delete => {
                line_num1 += 1;
                result.push_str(&format!("- [L{}] {}", line_num1, change.value()));
            }
            ChangeTag::Insert => {
                line_num2 += 1;
                result.push_str(&format!("+ [L{}] {}", line_num2, change.value()));
            }
            ChangeTag::Equal => {
                line_num1 += 1;
                line_num2 += 1;
                result.push_str(&format!("  {}", change.value()));
            }
        }
    }
    
    // Add a summary
    result.push_str("\n\n## Summary\n");
    let stats = diff.ratio();
    result.push_str(&formatter::format_similarity(stats));
    
    Ok(result)
}