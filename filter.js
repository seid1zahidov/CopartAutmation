const fs = require('fs');
const path = require('path');

// 1. ANA QOVLUĞUN TƏYİNİ
const mainFolder = 'CopartWeekExcel';

// 2. HƏFTƏLİK ALT QOVLUQLARIN TƏYİNİ
const week1Folder = path.join(mainFolder, 'Copart_16-22_Mart_Hefteliyi');
const week2Folder = path.join(mainFolder, 'Copart_23-29_Mart_Hefteliyi');
const week3Folder = path.join(mainFolder, 'Copart_30Mart-05Aprel_Hefteliyi');

// Ana qovluğu yaradırıq (yoxdursa)
if (!fs.existsSync(mainFolder)) {
    fs.mkdirSync(mainFolder);
}

// Alt qovluqları yaradırıq
[week1Folder, week2Folder, week3Folder].forEach(folder => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
});

// 3. MƏNBƏ FAYLI
const csvFile = 'COPART_LINKLER.csv';
if (!fs.existsSync(csvFile)) {
    console.log("❌ Səhv: 'COPART_LINKLER.csv' tapılmadı!");
    process.exit();
}

const csvData = fs.readFileSync(csvFile, 'utf8');
const lines = csvData.split('\n');
const results = {};

console.log(`📂 '${csvFile}' oxunur və '${mainFolder}' içindəki qovluqlara paylanır...`);

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
            const dateKey = date.toISOString().split('T')[0];

            if (!results[dateKey]) results[dateKey] = [];
            results[dateKey].push(`"${location}","${url}"`);
        }
    }
});

// 4. FAYLLARI ÖZ QOVLUQLARINA PAYLAYIRIQ
Object.keys(results).forEach(date => {
    let targetFolder = null;

    if (date >= '2026-03-16' && date <= '2026-03-22') {
        targetFolder = week1Folder;
    } 
    else if (date >= '2026-03-23' && date <= '2026-03-29') {
        targetFolder = week2Folder;
    }
    else if (date >= '2026-03-30' && date <= '2026-04-05') {
        targetFolder = week3Folder;
    }

    if (targetFolder) {
        const fileName = `Hərrac_${date}.csv`;
        const filePath = path.join(targetFolder, fileName);
        const content = "Mekan,URL\n" + results[date].join('\n');
        
        fs.writeFileSync(filePath, content);
        console.log(`✅ [${targetFolder}] -> ${date}`);
    }
});

console.log(`\n🚀 İş tamamdır! Bütün həftələr '${mainFolder}' qovluğuna yığıldı.`);