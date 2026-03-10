import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.setTimeout(0); 

const sourceFolder = path.join('CopartYuklenenMasinlarExcel', 'Copart_16-22_Mart_Hefteliyi');
const archiveFolder = path.join('Copart_Masin_Sekilleri_Arxiv', 'Copart_16-22_Mart_Yuklenen_Sekiller');

test('Linklərin içinə gir və şəkilləri yüklə', async ({ page }) => {
    if (!fs.existsSync(archiveFolder)) fs.mkdirSync(archiveFolder, { recursive: true });

    // 1. LOGIN
    await page.goto('https://www.copart.com/login');
    await page.locator('#username').fill('86757');
    await page.locator('#password').fill('GLBGLBGLB311321@@@');
    await page.locator('button:has-text("Sign into your account")').first().click();
    await page.waitForURL('**/dashboard/**', { timeout: 60000 });
    console.log("✅ Login olundu.");

    // 2. CSV OXUMA
    const csvFiles = fs.readdirSync(sourceFolder).filter(f => f.endsWith('.csv'));

    for (const file of csvFiles) {
        console.log(`\n📂 Fayl emal edilir: ${file}`);
        const filePath = path.join(sourceFolder, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split(/\r?\n/);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || i === 0) continue; 

            let carUrl = "";
            if (line.includes('","')) {
                carUrl = line.split('","')[1]?.replace(/"/g, '').trim();
            } else {
                carUrl = line.split(',')[1]?.replace(/"/g, '').trim();
            }

            if (!carUrl || !carUrl.includes('http')) {
                const match = line.match(/https?:\/\/[^\s",]+/);
                carUrl = match ? match[0] : "";
            }

            if (!carUrl || !carUrl.includes('lot')) continue;

            const lotNumber = carUrl.match(/lot\/(\d+)/)?.[1] || `ID_${Date.now()}`;
            const zipPath = path.join(archiveFolder, `${lotNumber}_images.zip`);

            if (fs.existsSync(zipPath)) {
                console.log(`⏩ Artıq var: ${lotNumber}`);
                continue;
            }

            console.log(`🚀 (${i}) Linkə girilir: ${carUrl}`);

            try {
                await page.goto(carUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
                
                // --- SƏNİN DEDİYİN ARDICILLIQ BURADA BAŞLAYIR ---

                // 1. getbylabel 3 click
                try {
                    await page.getByLabel('3', { exact: true }).click({ timeout: 5000 });
                    console.log(`   🔘 Label '3' sıxıldı`);
                } catch (e) { console.log(`   ⚠️ Label '3' tapılmadı`); }

                // 2. Download Image click
                try {
                    await page.getByRole('button', { name: 'Download Image' }).click({ timeout: 5000 });
                    console.log(`   📸 Download Image sıxıldı`);
                } catch (e) { console.log(`   ⚠️ Download Image tapılmadı`); }

                // 3. Download All Hissəsi (Sənin kodların)
                try {
                    // Əvvəlcə pusquya dururuq
                    const download1Promise = page.waitForEvent('download', { timeout: 20000 });
                    
                    // Sonra düyməni sıxırıq
                    await page.getByRole('button', { name: 'Download all' }).click({ timeout: 10000 });
                    
                    // Və yükləməni gözləyirik
                    const download1 = await download1Promise;
                    
                    // Faylı yadda saxlayırıq
                    await download1.saveAs(zipPath);
                    console.log(`   ✅ Yükləndi: ${lotNumber}`);
                } catch (downloadErr) {
                    console.log(`   ⚠️ Download uğursuz oldu: ${lotNumber}`);
                }

            } catch (err) {
                console.log(`   ❌ Səhifə xətası: ${lotNumber}`);
            }
            
            await page.waitForTimeout(1500); 
        }
    }
}); 