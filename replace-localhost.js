const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) results.push(file);
        }
    });
    return results;
}

const files = walk('./src');

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;
    
    // Replace single quotes
    if (content.includes("'http://localhost:5000")) {
        content = content.replace(/'http:\/\/localhost:5000/g, "(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000') + '");
        changed = true;
    }
    // Replace backticks
    if (content.includes("`http://localhost:5000")) {
        content = content.replace(/`http:\/\/localhost:5000/g, "`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}");
        changed = true;
    }
    // Replace double quote
    if (content.includes('"http://localhost:5000')) {
        content = content.replace(/"http:\/\/localhost:5000/g, '(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000") + "');
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log(`Updated ${file}`);
    }
});
console.log("All replacements complete!");
