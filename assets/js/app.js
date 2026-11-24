(() => {
'use strict';
const $ = (id) => document.getElementById(id);
const state = { files: [], results: [] };
const allowed = new Set(['pdf','docx','doc','txt','md','markdown','html','htm','csv']);
const maxSize = 25 * 1024 * 1024;
if (window.pdfjsLib) pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
$('year').textContent = new Date().getFullYear();
const formatBytes = n => n < 1024 ? n + ' B' : n < 1048576 ? (n/1024).toFixed(1)+' KB' : (n/1048576).toFixed(2)+' MB';
const ext = name => (name.split('.').pop() || '').toLowerCase();
const baseName = name => name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g,'_').slice(0,100) || 'document';
const showStatus = (message, type='') => { const el=$('status'); el.textContent=message; el.className='status '+type; el.hidden=false; };
const hideStatus = () => { $('status').hidden=true; };
function renderFiles() {
 $('fileSection').hidden = !state.files.length; $('fileList').innerHTML='';
 state.files.forEach((file,index) => {
  const item=document.createElement('div'); item.className='file-item';
  const type=document.createElement('span'); type.className='file-type'; type.textContent=ext(file.name).toUpperCase().slice(0,4);
  const meta=document.createElement('div'); meta.className='file-meta';
  const name=document.createElement('strong'); name.textContent=file.name;
  const size=document.createElement('small'); size.textContent=formatBytes(file.size);
  meta.append(name,size);
  const remove=document.createElement('button'); remove.className='remove-btn'; remove.type='button'; remove.textContent='×'; remove.setAttribute('aria-label','Remove '+file.name);
  remove.addEventListener('click',()=>{state.files.splice(index,1);renderFiles();hideStatus();});
  item.append(type,meta,remove); $('fileList').append(item);
 });
 $('convertBtn').disabled=!state.files.length;
}
function addFiles(list) {
 const accepted=[]; const rejected=[];
 for(const file of Array.from(list||[])) {
  const extension=ext(file.name);
  if(!allowed.has(extension)){rejected.push(file.name+' (unsupported type)');continue;}
  if(file.size>maxSize){rejected.push(file.name+' (over 25 MB)');continue;}
  if(!state.files.some(f=>f.name===file.name&&f.size===file.size&&f.lastModified===file.lastModified)){accepted.push(file);}
 }
 state.files.push(...accepted); renderFiles();
 if(rejected.length) showStatus('Skipped: '+rejected.join(', '),'error');
 else if(accepted.length) {hideStatus();$('results').hidden=true;}
}
$('browseBtn').addEventListener('click',e=>{e.stopPropagation();$('fileInput').click();});
$('dropZone').addEventListener('click',e=>{if(e.target.closest('button'))return;$('fileInput').click();});
$('dropZone').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('fileInput').click();}});
$('fileInput').addEventListener('change',e=>{addFiles(e.target.files);e.target.value='';});
['dragenter','dragover'].forEach(type=>$('dropZone').addEventListener(type,e=>{e.preventDefault();$('dropZone').classList.add('dragover');}));
['dragleave','drop'].forEach(type=>$('dropZone').addEventListener(type,e=>{e.preventDefault();$('dropZone').classList.remove('dragover');}));
$('dropZone').addEventListener('drop',e=>addFiles(e.dataTransfer.files));
$('clearBtn').addEventListener('click',()=>{state.files=[];state.results=[];renderFiles();$('results').hidden=true;hideStatus();});
async function readDocument(file) {
 const extension=ext(file.name);
 if(extension==='pdf') {
  if(!window.pdfjsLib) throw new Error('PDF reader library did not load. Check your internet connection and refresh.');
  const data=new Uint8Array(await file.arrayBuffer()); const pdf=await pdfjsLib.getDocument({data}).promise; let pages=[];
  for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();pages.push(content.items.map(x=>x.str).join(' '));}
  return {text:pages.join('\n\n'),html:'<pre>'+escapeHtml(pages.join('\n\n'))+'</pre>'};
 }
 if(extension==='docx') {
  if(!window.mammoth) throw new Error('Word reader library did not load. Check your internet connection and refresh.');
  const result=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()});
  const textResult=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
  return {text:textResult.value,html:result.value};
 }
 const text=await file.text();
 if(extension==='html'||extension==='htm') {
  const doc=new DOMParser().parseFromString(text,'text/html');
  return {text:doc.body.innerText||doc.documentElement.textContent||'',html:text};
 }
 if(extension==='md'||extension==='markdown') return {text,html:markdownToHtml(text)};
 if(extension==='csv') return {text,html:csvToHtml(text)};
 if(extension==='doc') throw new Error('Legacy .doc files are not reliably supported in browsers. Open it in Word or LibreOffice and save as .docx.');
 return {text,html:'<pre>'+escapeHtml(text)+'</pre>'};
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function markdownToHtml(md) {
 return md.split(/\r?\n/).map(line=>{
  const h=line.match(/^(#{1,6})\s+(.*)$/); if(h)return '<h'+h[1].length+'>'+inlineMarkdown(h[2])+'</h'+h[1].length+'>';
  if(/^[-*+]\s+/.test(line))return '<p>• '+inlineMarkdown(line.replace(/^[-*+]\s+/,''))+'</p>';
  if(/^\s*$/.test(line))return '';
  return '<p>'+inlineMarkdown(line)+'</p>';
 }).join('\n');
}
function inlineMarkdown(s){return escapeHtml(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>').replace(/`(.+?)`/g,'<code>$1</code>');}
function csvToHtml(csv) {
 const rows=csv.split(/\r?\n/).filter(Boolean).map(line=>line.split(','));
 if(!rows.length)return '';
 return '<table border="1" cellpadding="5" cellspacing="0">'+rows.map((row,i)=>'<tr>'+row.map(cell=>'<'+(i===0?'th':'td')+'>'+escapeHtml(cell.trim().replace(/^"|"$/g,''))+'</'+(i===0?'th':'td')+'>').join('')+'</tr>').join('')+'</table>';
}
async function makeBlob(doc,format) {
 if(format==='txt'||format==='md') return new Blob([doc.text],{type:'text/plain;charset=utf-8'});
 if(format==='html') return new Blob(['<!doctype html><html><head><meta charset="utf-8"><title>Converted document</title></head><body>'+doc.html+'</body></html>'],{type:'text/html;charset=utf-8'});
 if(format==='pdf') {
  if(!window.jspdf?.jsPDF) throw new Error('PDF export library did not load. Check your internet connection and refresh.');
  const pdf=new jspdf.jsPDF({unit:'pt',format:'a4'}); const margin=48; const width=pdf.internal.pageSize.getWidth()-margin*2;
  const lines=pdf.splitTextToSize(doc.text||' ',width); let y=margin; const lineHeight=15;
  lines.forEach(line=>{if(y>pdf.internal.pageSize.getHeight()-margin){pdf.addPage();y=margin;}pdf.text(line,margin,y);y+=lineHeight;});
  return pdf.output('blob');
 }
 if(format==='docx') {
  if(!window.docx) throw new Error('Word export library did not load. Check your internet connection and refresh.');
  const {Document,Packer,Paragraph,TextRun,HeadingLevel}=docx;
  const paragraphs=(doc.text||'').split(/\r?\n/).map(line=>new Paragraph({children:[new TextRun(line)]}));
  const word=new Document({sections:[{properties:{},children:paragraphs.length?paragraphs:[new Paragraph('')]}]});
  return await Packer.toBlob(word);
 }
 throw new Error('Unsupported output format.');
}
function downloadBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function renderResults() {
 $('results').hidden=!state.results.length;$('resultList').innerHTML='';
 state.results.forEach(result=>{
  const item=document.createElement('div');item.className='file-item';
  const type=document.createElement('span');type.className='file-type';type.textContent=result.format.toUpperCase();
  const meta=document.createElement('div');meta.className='file-meta';const name=document.createElement('strong');name.textContent=result.name;const size=document.createElement('small');size.textContent=formatBytes(result.blob.size);meta.append(name,size);
  const button=document.createElement('button');button.type='button';button.className='result-action';button.textContent='Download';button.addEventListener('click',()=>downloadBlob(result.blob,result.name));
  item.append(type,meta,button);$('resultList').append(item);
 });
}
$('convertBtn').addEventListener('click',async()=>{
 const files=[...state.files],format=$('outputFormat').value;state.results=[];$('results').hidden=true;$('convertBtn').disabled=true;
 let completed=0,errors=[];
 for(const file of files) {
  showStatus('Converting '+(completed+1)+' of '+files.length+': '+file.name);
  try{const doc=await readDocument(file);const blob=await makeBlob(doc,format);state.results.push({name:baseName(file.name)+'.'+format,format,blob});}
  catch(error){errors.push(file.name+': '+(error.message||'Conversion failed'));}
  completed++;renderResults();
 }
 $('convertBtn').disabled=false;
 if(errors.length)showStatus(completed-errors.length+' of '+files.length+' converted. '+errors.join(' | '),state.results.length?'':'error');
 else showStatus('Successfully converted '+state.results.length+' file(s).','success');
});
$('downloadZipBtn').addEventListener('click',async()=>{
 if(!state.results.length)return;
 if(!window.JSZip){showStatus('ZIP library did not load. Download files individually.','error');return;}
 const zip=new JSZip();state.results.forEach(r=>zip.file(r.name,r.blob));
 try{const blob=await zip.generateAsync({type:'blob'});downloadBlob(blob,'converted-documents.zip');}
 catch(e){showStatus('Could not create ZIP: '+e.message,'error');}
});
$('themeToggle').addEventListener('click',()=>{document.body.classList.toggle('dark');localStorage.setItem('document-converter-theme',document.body.classList.contains('dark')?'dark':'light');});
try{if(localStorage.getItem('document-converter-theme')==='dark')document.body.classList.add('dark');}catch(e){}
})();