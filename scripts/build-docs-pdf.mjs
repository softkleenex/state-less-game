import { execFileSync } from "node:child_process";
import { unlinkSync } from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME_PATH = process.env.STATELESS_CHROME_PATH
  ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const DOCS = [
  { md: "docs/게임_소개.md", title: "STATE//LESS 게임 소개", pdf: "docs/게임_소개.pdf", css: "pdf-style.css" },
  { md: "docs/AI_활용_기술.md", title: "STATE//LESS AI 활용 기술 문서", pdf: "docs/AI_활용_기술.pdf", css: "pdf-style.css" },
  {
    md: "docs/포트폴리오_NHN2026.md",
    title: "NHN Game×AI Hackathon 2026 포트폴리오",
    pdf: "docs/포트폴리오_NHN2026.pdf",
    css: "portfolio-style.css",
    bodyClass: "portfolio-doc",
    // This doc's cover section is hand-written raw HTML (nested <div>s indented
    // for readability). Pandoc's default "markdown" reader re-parses content
    // inside raw HTML blocks as markdown (the markdown_in_html_blocks
    // extension), which turns the indented inner lines into escaped code
    // blocks instead of leaving them as literal HTML. The `gfm` reader treats
    // raw HTML blocks as opaque per CommonMark, so the indentation is safe.
    from: "gfm",
  },
];

const browser = await puppeteer.launch({ executablePath: CHROME_PATH, headless: true });

for (const doc of DOCS) {
  const tmpHtml = doc.md.replace(/\.md$/, ".tmp.html");
  const pandocArgs = [doc.md, "-s", "-c", doc.css, "--metadata", `title=${doc.title}`, "-o", tmpHtml];
  if (doc.from) pandocArgs.push("-f", doc.from);
  if (doc.bodyClass) {
    pandocArgs.push("-V", `body-class=${doc.bodyClass}`, "--template", "scripts/pandoc-body-class.html");
  }
  execFileSync("pandoc", pandocArgs);

  const page = await browser.newPage();
  await page.goto(`file://${process.cwd()}/${tmpHtml}`, { waitUntil: "networkidle0" });
  await page.pdf({ path: doc.pdf, printBackground: true, preferCSSPageSize: true });
  await page.close();
  unlinkSync(tmpHtml);
  console.log(`generated ${doc.pdf}`);
}

await browser.close();
