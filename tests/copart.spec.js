import { test, expect } from '@playwright/test';
import fs from 'fs';

test.setTimeout(240000); 

test('Copart Təqvim - Günlərə Görə Ayır və Fayllaşdır', async ({ page }) => {
    // 1. LOGİN
    await page.goto('https://www.copart.com/login');
    await page.locator('#username').fill('86757');
    await page.locator('#password').fill('GLBGLBGLB311321@@@');
    await page.locator('button:has-text("Sign into your account")').first().click();
    
    await page.waitForURL('**/dashboard/**', { timeout: 60000 });
    console.log("✅ Login olundu.");

    // 2. TƏQVİMƏ KEÇİD
    console.log("📅 16-22 Mart həftəsi analiz edilir...");
    await page.goto('https://www.copart.com/auctionCalendar?date=2026-03-16');
    
    await page.waitForSelector('li.auction-yard-loctaion', { timeout: 60000 });
    await page.waitForTimeout(5000); 

    // 3. DATALARI GÜNLƏRƏ GÖRƏ TOPLAYIRIQ
    const groupedData = await page.evaluate(() => {
        const results = {}; // { "2026-03-16": [...], "2026-03-17": [...] }
        
        const dayCells = document.querySelectorAll('td[data-date]');
        
        dayCells.forEach(cell => {
            const dateStr = cell.getAttribute('data-date');
            
            // YALNIZ 16-22 MART ARALIĞI
            if (dateStr >= '2026-03-16' && dateStr <= '2026-03-22') {
                const links = cell.querySelectorAll('li.auction-yard-loctaion a');
                
                if (links.length > 0) {
                    results[dateStr] = [];
                    links.forEach(link => {
                        results[dateStr].push({
                            Mekan: link.innerText.trim(),
                            URL: link.href
                        });
                    });
                }
            }
        });
        return results;
    });

    // 4. HƏR GÜNÜ AYRI FAYLA YAZIRIQ
    const dates = Object.keys(groupedData);
    
    if (dates.length > 0) {
        dates.forEach(date => {
            const fileName = `Copart_${date}.csv`;
            const header = "Mekan,Link\n";
            const rows = groupedData[date].map(item => `"${item.Mekan}","${item.URL}"`).join('\n');
            
            fs.writeFileSync(fileName, header + rows);
            console.log(`💾 ${date} günü üçün ${groupedData[date].length} hərrac tapıldı -> ${fileName}`);
        });
        console.log("\n🎉 Əməliyyat tamamlandı! Hər gün üçün ayrı CSV yaradıldı.");
    } else {
        console.log("❌ Təəssüf ki, təyin olunan tarixlərdə məlumat tapılmadı.");
    }
});