
/// Create header for diff output
pub fn create_diff_header(file_name1: &str, file_name2: &str) -> String {
    format!("# Diff between {} and {}\n\n", file_name1, file_name2)
}

/// Format similarity ratio for better readability
pub fn format_similarity(ratio: f32) -> String {
    format!("Similarity: {:.1}%\n", ratio * 100.0)
}