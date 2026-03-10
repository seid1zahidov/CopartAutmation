import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// LİMİTLƏRİ SIFIRLAYIRIQ
test.setTimeout(0); 

// 1. QOVLUQ AYARLARI
const mainSourceFolder = 'CopartWeekExcel'; // Mənbə qovluğu
const mainDownloadFolder = 'CopartYuklenenMasinlarExcel'; // Yükləmələrin ana qovluğu

test('Copart Export - Həftəlik Qovluğa Yüklə', async ({ page }) => {
    // CopartWeekExcel qovluğundan "Copart_16-22" ilə başlayan qovluğu tapırıq
    const subFolders = fs.readdirSync(mainSourceFolder).filter(f => f.startsWith('Copart_16-22'));
    
    if (subFolders.length === 0) {
        console.error("❌ Səhv: Həftəlik mənbə qovluğu tapılmadı!");
        return;
    }

    const weekFolderName = subFolders[0]; // Məsələn: "Copart_16-22_Mart_Həftəliyi"
    const sourcePath = path.join(mainSourceFolder, weekFolderName);
    
    // Yükləmə yeri: CopartYuklenenMasinlarExcel / Copart_16-22_Mart_Həftəliyi
    const targetDownloadPath = path.join(mainDownloadFolder, weekFolderName);

    // Yükləmə qovluğunu yaradırıq (yoxdursa)
    if (!fs.existsSync(targetDownloadPath)) {
        fs.mkdirSync(targetDownloadPath, { recursive: true });
    }

    console.log(`🔍 Mənbə: ${sourcePath}`);
    console.log(`📂 Yükləmə yeri: ${targetDownloadPath}`);

    // 2. LOGİN
    await page.goto('https://www.copart.com/login');
    await page.locator('#username').fill('86757');
    await page.locator('#password').fill('GLBGLBGLB311321@@@');
    await page.locator('button:has-text("Sign into your account")').first().click();
    await page.waitForURL('**/dashboard/**', { timeout: 60000 });
    console.log("✅ Login olundu.");

    // 3. PROSES
    const files = fs.readdirSync(sourcePath).filter(f => f.endsWith('.csv'));

    for (const file of files) {
        console.log(`\n📄 Fayl: ${file}`);
        const filePath = path.join(sourcePath, file);
        const lines = fs.readFileSync(filePath, 'utf8').split('\n').slice(1);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const parts = line.split('","');
            const location = parts[0].replace(/"/g, '');
            const url = parts[1] ? parts[1].replace(/"/g, '') : '';

            if (!url) continue;

            const safeLocation = location.replace(/[^a-z0-9]/gi, '_');
            const fileName = `${safeLocation}_${file}`;
            const finalFilePath = path.join(targetDownloadPath, fileName);

            if (fs.existsSync(finalFilePath)) {
                console.log(`⏩ Atlanıldı: ${location}`);
                continue;
            }

            console.log(`🔗 (${i+1}/${lines.length}) -> ${location}`);

            try {
                await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
                const exportBtn = page.locator('button:has-text("Export"), a:has-text("Export")').first();
                await exportBtn.waitFor({ state: 'visible', timeout: 15000 });

                const [download] = await Promise.all([
                    page.waitForEvent('download', { timeout: 30000 }),
                    exportBtn.click(),
                ]);

                await download.saveAs(finalFilePath);
                console.log(`   ✅ OK`);
            } catch (err) {
                console.log(`   ⚠️ Xəta: ${location}`);
            }
        }
    }
    console.log("\n🚀 Bu həftə üzrə bütün işlər tamamlandı!");
});