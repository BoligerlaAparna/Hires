const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'backend', 'data');

if (!fs.existsSync(dataDir)) {
    console.error(`Data directory not found: ${dataDir}`);
    process.exit(1);
}

const files = fs.readdirSync(dataDir).filter(file => file.endsWith('_dump.json'));

files.forEach(file => {
    const filePath = path.join(dataDir, file);
    if (file.includes('jobs_dump.json') || file.includes('candidates_dump.json') || file.includes('resumes_dump.json') || file.includes('skillmatrices_dump.json')) {
        console.log(`Processing ${file}...`);
        try {
            let content = fs.readFileSync(filePath, 'utf8');

            // Fix malformed dates like "2026-02-13T09:28:32.320.32.3" -> "2026-02-13T09:28:32.320"
            // The pattern seems to be: quote, date-time, dot, digits, dot, digits, dot, digits (possibly more), quote
            // Regex: "(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})\.\d+\.\d+"
            // We want to keep only the first part.

            // Initial attempt: replace specifically ".320.32.3" -> ".320"
            // More general: Replace (\.\d{3})\.\d+[\.\d]*" with $1"

            // Let's use a very specific regex for this pattern seen in logs:
            // "2026-02-09T14:42:59.812.81.8"
            // "2026-02-11T13:05:32.573.57.5"
            content = content.replace(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3})\.\d+\.\d+/g, '$1');

            // Also fix potential "Unexpected end-of-input" in resumes_dump.json by checking if it ends properly
            // If it ends abruptly inside a string or object, we might need to truncate to last valid object or just try to parse.

            // Try to parse to verify
            try {
                JSON.parse(content);
                console.log(`  JSON is valid.`);
            } catch (e) {
                console.warn(`  JSON invalid after date fix: ${e.message}`);
                // Attempt to fix end of file truncation if possible (simple case: missing closing bracket)
                if (content.trim().endsWith('}')) {
                    // Arrays usually end with ]
                    if (!content.trim().endsWith(']')) {
                        content += ']';
                        console.log('  Appended closing bracket ]');
                    }
                } else if (!content.trim().endsWith(']')) {
                    // Try to find the last valid object closing
                    const lastClose = content.lastIndexOf('}');
                    if (lastClose > 0) {
                        content = content.substring(0, lastClose + 1) + ']';
                        console.log('  Truncated to last valid object and closed array.');
                    }
                }
            }

            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`  Saved fixed content to ${file}`);

        } catch (err) {
            console.error(`Error processing ${file}: ${err.message}`);
        }
    }
});
