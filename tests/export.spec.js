import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// LİMİTLƏRİ SIFIRLAYIRIQ - NƏ QƏDƏR LAZIMDIRSA İŞLƏSİN
test.setTimeout(0); 

const sourceFolder = 'Copart_16-22_Mart_Həftəliyi';
const downloadFolder = 'Copart_Yuklenen_Maşınlar';

test('Copart Export - Dayanmadan Yüklə', async ({ page }) => {
    if (!fs.existsSync(downloadFolder)) fs.mkdirSync(downloadFolder);

    // 1. LOGİN
    await page.goto('https://www.copart.com/login');
    await page.locator('#username').fill('86757');
    await page.locator('#password').fill('GLBGLBGLB311321@@@');
    await page.locator('button:has-text("Sign into your account")').first().click();
    await page.waitForURL('**/dashboard/**', { timeout: 60000 });
    console.log("✅ Login olundu. Başlayırıq...");

    const files = fs.readdirSync(sourceFolder).filter(f => f.endsWith('.csv'));

    for (const file of files) {
        console.log(`\n📂 FAYL: ${file}`);
        const filePath = path.join(sourceFolder, file);
        const lines = fs.readFileSync(filePath, 'utf8').split('\n').slice(1);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const [location, url] = line.split('","').map(s => s.replace(/"/g, ''));
            const fileName = `${location.replace(/[^a-z0-9]/gi, '_')}_${file}`;
            const fullDownloadPath = path.join(downloadFolder, fileName);

            // Əgər bu fayl artıq yüklənibsə, keç (vaxt itirməyək)
            if (fs.existsSync(fullDownloadPath)) {
                console.log(`⏩ Atlanıldı (Artıq var): ${location}`);
                continue;
            }

            console.log(`🔗 (${i+1}/${lines.length}) -> ${location}`);

            let success = false;
            let attempts = 0;

            while (!success && attempts < 2) { // 2 dəfə cəhd et
                try {
                    // "networkidle" yerinə "domcontentloaded" istifadə edirik ki, sürətli olsun
                    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
                    
                    // Export düyməsini gözlə
                    const exportBtn = page.locator('button:has-text("Export"), a:has-text("Export")').first();
                    await exportBtn.waitFor({ state: 'visible', timeout: 15000 });

                    const [download] = await Promise.all([
                        page.waitForEvent('download', { timeout: 30000 }),
                        exportBtn.click(),
                    ]);

                    await download.saveAs(fullDownloadPath);
                    console.log(`   ✅ OK`);
                    success = true;
                } catch (err) {
                    attempts++;
                    console.log(`   ⚠️ Cəhd ${attempts} uğursuz: ${location}`);
                    await page.waitForTimeout(2000);
                }
            }
            
            // Hər 20 linkdən bir 5 saniyə dincəl (Blok olmamaq üçün)
            if (i % 20 === 0 && i !== 0) {
                console.log("☕ Brauzer dincəlir...");
                await page.waitForTimeout(5000);
            }
        }
    }
});