const fs = require('fs');
const path = require('path');

// 1. QOVLUQLARIN TƏYİNİ (3 HƏFTƏ)
const week1Folder = 'Copart_16-22_Mart_Həftəliyi';
const week2Folder = 'Copart_23-29_Mart_Hefteliyi';
const week3Folder = 'Copart_30Mart-05Aprel_Hefteliyi'; // Yeni qovluq

// Qovluqları yaradırıq
[week1Folder, week2Folder, week3Folder].forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder);
    }
});

// 2. MƏNBƏ FAYLI
const csvFile = 'COPART_LINKLER.csv';
if (!fs.existsSync(csvFile)) {
    console.log("❌ Səhv: 'COPART_LINKLER.csv' tapılmadı!");
    process.exit();
}

const csvData = fs.readFileSync(csvFile, 'utf8');
const lines = csvData.split('\n');
const results = {};

console.log(`📂 '${csvFile}' oxunur və 3 həftə üzrə bölüşdürülür...`);

lines.forEach((line, index) => {
    if (index === 0 || !line.trim()) return;

    const parts = line.split('","');
    const location = parts[0].replace(/"/g, '');
    const url = parts[1] ? parts[1].replace(/"/g, '') : '';

    if (url) {
        const match = url.match(/saleDate=(\d+)/);
        if (match) {
            const timestamp = parseInt(match[1]);
            const date = new Date(timestamp);
            const dateKey = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD

            if (!results[dateKey]) results[dateKey] = [];
            results[dateKey].push(`"${location}","${url}"`);
        }
    }
});

// 3. FAYLLARI ÖZ QOVLUQLARINA PAYLAYIRIQ
Object.keys(results).forEach(date => {
    let targetFolder = null;

    // HƏFTƏ 1: 16-22 Mart
    if (date >= '2026-03-16' && date <= '2026-03-22') {
        targetFolder = week1Folder;
    } 
    // HƏFTƏ 2: 23-29 Mart
    else if (date >= '2026-03-23' && date <= '2026-03-29') {
        targetFolder = week2Folder;
    }
    // HƏFTƏ 3: 30 Mart - 05 Aprel (KEÇİD BURADADIR)
    else if (date >= '2026-03-30' && date <= '2026-04-05') {
        targetFolder = week3Folder;
    }

    if (targetFolder) {
        const fileName = `Hərrac_${date}.csv`;
        const filePath = path.join(targetFolder, fileName);
        const content = "Mekan,URL\n" + results[date].join('\n');
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ [${targetFolder}] -> ${date} (Tapıldı: ${results[date].length})`);
    }
});

console.log(`\n🚀 Əla! İndi 3 həftəlik qovluğun da hazırdır. 16 Martdan 5 Aprelə qədər hər şey qaydasındadır.`);