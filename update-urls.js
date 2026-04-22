const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'lamif-frontend', 'src');

function walkAndReplace(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkAndReplace(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            // Replace 'http://localhost:5000'
            if (content.includes("'http://localhost:5000")) {
                content = content.replace(/'http:\/\/localhost:5000/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + '");
                modified = true;
            }
            
            // Replace `http://localhost:5000${endpoint}`
            if (content.includes("`http://localhost:5000")) {
                content = content.replace(/`http:\/\/localhost:5000/g, "`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}` + `");
                modified = true;
            }

            // Cleanup any double backticks if they appear
            content = content.replace(/\+ ``/g, "");

            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${file}`);
            }
        }
    }
}

walkAndReplace(srcDir);
