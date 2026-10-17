import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const svgPath = path.resolve(__dirname, '../../../../GhostCursorIcon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf-8');

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="background: #111827; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif;">
        <div style="display: flex; gap: 32px; align-items: center;">
          <!-- Large preview -->
          <div style="width: 200px; height: 200px; background: #1f2937; padding: 24px; border-radius: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
            <div style="width: 100%; height: 100%;">${svgContent}</div>
          </div>
          <!-- Chat bubble preview on purple/indigo gradient -->
          <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);">
            <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
              ${svgContent}
            </div>
          </div>
          <!-- Chat bubble preview on white background -->
          <div style="width: 60px; height: 60px; border-radius: 50%; background: #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);">
            <div style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
              ${svgContent}
            </div>
          </div>
        </div>
      </body>
    </html>
  `);

  const outPath = path.join(__dirname, 'screenshots', 'icon-preview.png');
  await page.screenshot({ path: outPath });
  await browser.close();
  console.log('Saved to:', outPath);
}

main().catch(console.error);
