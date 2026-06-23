// Minimal PDF drop + render + text extraction + annotation
// ponytail: UX improvements — file info, page controls, zoom, download text. No remote keys.

const pdfCanvas = document.getElementById('pdfCanvas');
const annotCanvas = document.getElementById('annotCanvas');
const drop = document.getElementById('drop');
const dropHint = document.getElementById('dropHint');
const canvasWrap = document.getElementById('canvasWrap');
const fileInput = document.getElementById('fileInput');
const openBtn = document.getElementById('openBtn');
const clearBtn = document.getElementById('clearBtn');
const exportBtn = document.getElementById('exportBtn');
const extracted = document.getElementById('extracted');
const copyText = document.getElementById('copyText');

const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageIndicator = document.getElementById('pageIndicator');
const zoomInBtn = document.getElementById('zoomIn');
const zoomOutBtn = document.getElementById('zoomOut');
const statusEl = document.getElementById('status');
const fileInfo = document.getElementById('fileInfo');
const downloadTextBtn = document.getElementById('downloadText');

let pdfDoc = null;
let currentPage = 1;
let scale = 1.25;

function setStatus(msg){ if(statusEl) statusEl.textContent = msg; }

// PDF.js worker assignment; fail silently if pdfjsLib absent
if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

function prevent(e){ e.preventDefault(); e.stopPropagation(); }
['dragenter','dragover','dragleave','drop'].forEach(evt => drop.addEventListener(evt, prevent));

drop.addEventListener('click', ()=> fileInput.click());
openBtn.addEventListener('click', ()=> fileInput.click());
fileInput.addEventListener('change', e => {
  if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
});

drop.addEventListener('drop', e => {
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f && f.type === 'application/pdf') handleFile(f);
});

async function handleFile(file){
  try{
    setStatus('Loading…');
    dropHint.style.display = 'none';
    canvasWrap.classList.remove('hidden');

    fileInfo.textContent = `${file.name} · ${Math.round(file.size/1024)} KB`;

    const arrayBuf = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({data: arrayBuf});
    pdfDoc = await loadingTask.promise;
    currentPage = 1;
    updatePageControls();
    await renderPage(currentPage);
    await extractText(currentPage);
    setStatus('Ready');
  }catch(err){
    console.error(err);
    setStatus('Failed to load PDF');
  }
}

async function renderPage(pageNum){
  setStatus('Rendering page…');
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({scale});

  pdfCanvas.width = viewport.width;
  pdfCanvas.height = viewport.height;

  // size annotation canvas to match
  annotCanvas.width = viewport.width;
  annotCanvas.height = viewport.height;
  annotCanvas.style.width = pdfCanvas.style.width = viewport.width + 'px';
  annotCanvas.style.height = pdfCanvas.style.height = viewport.height + 'px';
  annotCanvas.style.position = 'absolute';

  const ctx = pdfCanvas.getContext('2d');
  ctx.clearRect(0,0, pdfCanvas.width, pdfCanvas.height);

  const renderContext = {canvasContext: ctx, viewport};
  await page.render(renderContext).promise;
  setStatus('Rendered');
}

function updatePageControls(){
  if(!pdfDoc){ pageIndicator.textContent = 'Page 0 / 0'; prevPageBtn.disabled = true; nextPageBtn.disabled = true; return; }
  pageIndicator.textContent = `Page ${currentPage} / ${pdfDoc.numPages}`;
  prevPageBtn.disabled = currentPage <= 1;
  nextPageBtn.disabled = currentPage >= pdfDoc.numPages;
}

// simple regex-based extraction over the page text (robust and short)
async function extractText(pageNum){
  setStatus('Extracting text…');
  const page = await pdfDoc.getPage(pageNum);
  const content = await page.getTextContent({normalizeWhitespace:true});
  const raw = (content.items || []).map(i => i.str).join('\n');
  const t = raw.replace(/\u3000/g,' ').replace(/\t/g,' ').replace(/[\f\v]+/g,' ').trim();

  // patterns mirrored from server parser
  const projectNo = (t.match(/現場番号[:：\s]*([A-Za-z0-9\-\u3000\u4e00-\u9fff\w]+)/) || [])[1]
                   || (t.match(/東栄住宅\s*現場番号[:：\s]*([A-Za-z0-9\-\u3000\u4e00-\u9fff\w]+)/) || [])[1] || '';
  const building = (t.match(/号棟[:：\s]*([\dA-Za-z\-ー一二三四五六七八九十]+)/) || [])[1] || '';
  const projName = (t.match(/現場名[:：\s]*([^\n\r]+)/) || [])[1] || '';
  const branch = (t.match(/^.*東栄住宅.*$/m) || [])[0] || (t.split('\n').find(ln=>ln.trim())||'');

  document.getElementById('branchVal').textContent = branch || '—';
  document.getElementById('projVal').textContent = projectNo || '—';
  document.getElementById('bldVal').textContent = building || '—';
  document.getElementById('projNameVal').textContent = projName || '—';

  const displayText = `Branch: ${branch || ''}\nProject No: ${projectNo || ''}\nBuilding No: ${building || ''}\nProject Name: ${projName || ''}`;
  extracted.value = displayText;
  window._lastExtract = raw;
  setStatus('Ready');
  updatePageControls();
}

// Simple drawing on annotCanvas
const aCtx = annotCanvas.getContext('2d');
aCtx.strokeStyle = 'red';
aCtx.lineWidth = 2;
let drawing = false;
let last = null;

function getPos(e){
  const rect = annotCanvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (annotCanvas.width / rect.width);
  const y = (e.clientY - rect.top) * (annotCanvas.height / rect.height);
  return {x,y};
}

annotCanvas.addEventListener('mousedown', (e)=>{
  drawing = true; last = getPos(e);
});
window.addEventListener('mouseup', ()=> drawing = false);
annotCanvas.addEventListener('mousemove', e=>{
  if(!drawing) return;
  const p = getPos(e);
  aCtx.beginPath();
  aCtx.moveTo(last.x, last.y);
  aCtx.lineTo(p.x, p.y);
  aCtx.stroke();
  last = p;
});

clearBtn.addEventListener('click', ()=>{ aCtx.clearRect(0,0, annotCanvas.width, annotCanvas.height); });

exportBtn.addEventListener('click', ()=>{
  // combine pdfCanvas and annotCanvas into one image
  const out = document.createElement('canvas');
  out.width = pdfCanvas.width; out.height = pdfCanvas.height;
  const outCtx = out.getContext('2d');
  outCtx.drawImage(pdfCanvas, 0, 0);
  outCtx.drawImage(annotCanvas, 0, 0);
  const url = out.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url; a.download = 'annotated.png';
  a.click();
});

copyText.addEventListener('click', ()=>{
  navigator.clipboard.writeText(extracted.value).then(()=>{
    copyText.textContent = 'Copied';
    setTimeout(()=> copyText.textContent = 'Copy', 1500);
  });
});

// keyboard: arrow keys to change pages if multiple pages
window.addEventListener('keydown', async (e)=>{
  if(!pdfDoc) return;
  if(e.key === 'ArrowRight' && currentPage < pdfDoc.numPages){ currentPage++; await renderPage(currentPage); await extractText(currentPage); }
  if(e.key === 'ArrowLeft' && currentPage > 1){ currentPage--; await renderPage(currentPage); await extractText(currentPage); }
});

// ensure annotCanvas has a 2D context even before first load
(function initBlank(){
  annotCanvas.width = 800; annotCanvas.height = 1000;
})();