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
    try {
        console.log(`Processing ${file}...`);
        let content = fs.readFileSync(filePath, 'utf8');

        if (!content || content.trim().length === 0) {
            console.log(`  Skipping empty file: ${file}`);
            return;
        }

        // Fix weird date formats:
        // 1. Repeated decimals: "2026-02-13T09:28:32.320.32.3" -> "2026-02-13T09:28:32.320"
        // 2. Timezone offsets for LocalDateTime: "2026-02-13T14:43:32.546+05:30" -> "2026-02-13T14:43:32.546"
        const originalContent = content;

        // Match base ISO timestamp and trim everything after the first set of milliseconds if there are repeating decimals OR trim offsets
        // Examples:
        // .320.32.3 -> .320
        // .546+05:30 -> .546
        content = content.replace(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)(?:(?:\.\d+)+|Z|[+-]\d{2}:?\d{2})/g, '$1');

        if (content !== originalContent) {
            console.log(`  Cleaned corrupted date/time strings.`);
        }

        // Handles truncated JSON (unexpected end of input)
        // Check if file ends with valid JSON closer like "]" or "}"
        // If not, try to find the last valid object close "}" and append "]"
        let invalid = false;
        try {
            JSON.parse(content);
            console.log(`  JSON is valid.`);
        } catch (e) {
            invalid = true;
            console.warn(`  JSON invalid initally: ${e.message}`);
        }

        if (invalid) {
            // Very naive repair for array of objects cut short
            const lastClose = content.lastIndexOf('}');
            if (lastClose !== -1) {
                // Check if it already has closing bracket after
                const verifyTail = content.substring(lastClose + 1).trim();
                if (verifyTail !== ']' && verifyTail !== ',') {
                    console.log('  Repairing truncated array...');
                    content = content.substring(0, lastClose + 1) + ']';
                }
            } else {
                // No objects found?
                if (content.trim().startsWith('[') && !content.trim().endsWith(']')) {
                    content += ']';
                }
            }

            // Verify again
            try {
                JSON.parse(content);
                console.log(`  JSON repaired and valid.`);
            } catch (e) {
                console.error(`  Could not fully repair JSON: ${e.message}`);
            }
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`  Saved ${file}`);

    } catch (err) {
        console.error(`Error processing ${file}: ${err.message}`);
    }
});
