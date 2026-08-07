import { execFileSync } from "node:child_process";
import { unlinkSync } from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME_PATH = process.env.STATELESS_CHROME_PATH
  ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const DOCS = [
  { md: "docs/게임_소개.md", title: "STATE//LESS 게임 소개", pdf: "docs/게임_소개.pdf" },
  { md: "docs/AI_활용_기술.md", title: "STATE//LESS AI 활용 기술 문서", pdf: "docs/AI_활용_기술.pdf" },
];

const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });

for (const doc of DOCS) {
  const tmpHtml = doc.md.replace(/\.md$/, ".tmp.html");
  execFileSync("pandoc", [doc.md, "-s", "-c", "pdf-style.css", "--metadata", `title=${doc.title}`, "-o", tmpHtml]);

  const page = await browser.newPage();
  await page.goto(`file://${process.cwd()}/${tmpHtml}`, { waitUntil: "networkidle0" });
  await page.pdf({ path: doc.pdf, printBackground: true, preferCSSPageSize: true });
  await page.close();
  unlinkSync(tmpHtml);
  console.log(`generated ${doc.pdf}`);
}

await browser.close();
