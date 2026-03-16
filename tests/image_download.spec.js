import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

test.setTimeout(0);

const sourceFolder = path.join('CopartYuklenenMasinlarExcel', 'Copart_16-22_Mart_Hefteliyi');
const archiveFolder = path.join('Copart_Masin_Sekilleri_Arxiv', 'Copart_16-22_Mart_Yuklenen_Sekiller');

test('Şəkilləri yüklə və API-yə göndər', async ({ page, request }) => {
    if (!fs.existsSync(archiveFolder)) fs.mkdirSync(archiveFolder, { recursive: true });

    // 1. LOGIN
    await page.goto('https://www.copart.com/login');
    await page.locator('#username').fill('86757');
    await page.locator('#password').fill('GLBGLBGLB311321@@@');
    await page.locator('button:has-text("Sign into your account")').first().click();
    await page.waitForURL('**/dashboard/**', { timeout: 60000 });
    console.log("✅ Login olundu.");

    const csvFiles = fs.readdirSync(sourceFolder).filter(f => f.endsWith('.csv'));

    for (const file of csvFiles) {
        console.log(`\n📂 Fayl: ${file}`);
        const lines = fs.readFileSync(path.join(sourceFolder, file), 'utf8').split(/\r?\n/).slice(1);

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const match = line.match(/lot\/(\d+)/);
            if (!match) continue;
            const lotNumber = match[1];
            const carUrl = `https://www.copart.com/lot/${lotNumber}`;
            const zipPath = path.join(archiveFolder, `${lotNumber}_images.zip`);

            if (fs.existsSync(zipPath)) continue;

            try {
                await page.goto(carUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

                try { await page.getByLabel('3', { exact: true }).click({ timeout: 4000 }); } catch (e) {}
                try { await page.getByRole('button', { name: 'Download Image' }).click({ timeout: 4000 }); } catch (e) {}

                const downloadPromise = page.waitForEvent('download', { timeout: 20000 });
                await page.getByRole('button', { name: 'Download all' }).click({ timeout: 5000 });
                const download = await downloadPromise;
                await download.saveAs(zipPath);
                
                console.log(`✅ Yükləndi: ${lotNumber}`);

                try {
                    console.log(`📡 API-yə göndərilir: ${lotNumber}...`);
                    
                    const apiResponse = await request.post('https://www.copart.com/lot/api/send-data', {
                        multipart: {
                            lot_number: lotNumber,
                            file: fs.createReadStream(zipPath), 
                        }
                    });

                    if (apiResponse.ok()) {
                        console.log(`🚀 API: Uğurla qəbul edildi.`);
                    } else {
                        console.log(`❌ API: Server ${apiResponse.status()} xətası verdi.`);
                    }
                } catch (apiErr) {
                    console.log(`⚠️ API Xətası: Sizin API serveriniz (127.0.0.1:8000) hazırda işləmir.`);
                }
                // ---------------------------------------------

            } catch (err) {
                console.log(`❌ Xəta: ${lotNumber}`);
            }
            
            await page.waitForTimeout(1000); 
        }
    }
});