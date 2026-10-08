(function(){
  'use strict';

  const root = document.querySelector('.site');
  if(!root) return;

  document.body.classList.add('copy-mode-enabled');

  const feedback = document.createElement('div');
  feedback.className = 'copy-feedback';
  feedback.setAttribute('role','status');
  feedback.setAttribute('aria-live','polite');
  document.body.appendChild(feedback);

  let feedbackTimer = 0;

  function showFeedback(message, target){
    window.clearTimeout(feedbackTimer);
    feedback.textContent = message;
    feedback.classList.add('is-visible');
    if(target){
      target.classList.add('copy-flash');
      window.setTimeout(function(){ target.classList.remove('copy-flash'); }, 420);
    }
    feedbackTimer = window.setTimeout(function(){
      feedback.classList.remove('is-visible');
    }, 1500);
  }

  function legacyCopyText(text){
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly','');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0,field.value.length);
    const copied = document.execCommand('copy');
    field.remove();
    if(!copied) throw new Error('copy failed');
  }

  function copyText(text){
    if(navigator.clipboard && navigator.clipboard.writeText){
      return navigator.clipboard.writeText(text).catch(function(){
        legacyCopyText(text);
      });
    }
    legacyCopyText(text);
    return Promise.resolve();
  }

  function legacyCopyRich(html,plainText){
    return new Promise(function(resolve,reject){
      function onCopy(event){
        document.removeEventListener('copy',onCopy,true);
        if(!event.clipboardData){
          reject(new Error('clipboard data unavailable'));
          return;
        }
        event.preventDefault();
        event.clipboardData.setData('text/html',html);
        event.clipboardData.setData('text/plain',plainText);
        resolve();
      }
      document.addEventListener('copy',onCopy,true);
      if(!document.execCommand('copy')){
        document.removeEventListener('copy',onCopy,true);
        reject(new Error('rich copy failed'));
      }
    });
  }

  function copyImage(image){
    const source = image.currentSrc || image.src;
    const alt = image.alt || 'תמונה';
    if(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem){
      const png = fetch(source,{cache:'force-cache'}).then(function(response){
        if(!response.ok) throw new Error('image fetch failed');
        return response.blob();
      }).then(function(blob){
        if(blob.type === 'image/png') return blob;
        throw new Error('unsupported image format');
      });
      return navigator.clipboard.write([
        new window.ClipboardItem({'image/png':png})
      ]).catch(function(){
        return legacyCopyRich('<img src="' + source + '" alt="' + alt.replace(/"/g,'&quot;') + '">',source);
      });
    }
    return legacyCopyRich('<img src="' + source + '" alt="' + alt.replace(/"/g,'&quot;') + '">',source);
  }

  function svgToPng(svg){
    return new Promise(function(resolve,reject){
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns','http://www.w3.org/2000/svg');
      const box = svg.viewBox && svg.viewBox.baseVal;
      const width = Math.max(1,Math.round((box && box.width) || svg.getBoundingClientRect().width || 64));
      const height = Math.max(1,Math.round((box && box.height) || svg.getBoundingClientRect().height || 64));
      clone.setAttribute('width',width);
      clone.setAttribute('height',height);
      const markup = new XMLSerializer().serializeToString(clone);
      const url = URL.createObjectURL(new Blob([markup],{type:'image/svg+xml;charset=utf-8'}));
      const image = new Image();
      image.onload = function(){
        try{
          const scale = Math.min(4,Math.max(2,window.devicePixelRatio || 1));
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const context = canvas.getContext('2d');
          context.scale(scale,scale);
          context.drawImage(image,0,0,width,height);
          canvas.toBlob(function(blob){
            URL.revokeObjectURL(url);
            if(blob) resolve({blob:blob,markup:markup});
            else reject(new Error('icon conversion failed'));
          },'image/png');
        }catch(error){
          URL.revokeObjectURL(url);
          reject(error);
        }
      };
      image.onerror = function(){
        URL.revokeObjectURL(url);
        reject(new Error('icon loading failed'));
      };
      image.src = url;
    });
  }

  function copySvg(svg){
    const png = svgToPng(svg);
    if(navigator.clipboard && navigator.clipboard.write && window.ClipboardItem){
      return navigator.clipboard.write([
        new window.ClipboardItem({'image/png':png.then(function(result){ return result.blob; })})
      ]).catch(function(){
        return png.then(function(result){
          return legacyCopyRich(result.markup,result.markup);
        });
      });
    }
    return png.then(function(result){
      return legacyCopyRich(result.markup,result.markup);
    });
  }

  function selectedText(){
    const selection = window.getSelection ? window.getSelection() : null;
    return selection ? selection.toString().trim() : '';
  }

  function readableText(element){
    const selected = selectedText();
    if(selected) return selected;
    return (element.innerText || element.textContent || element.getAttribute('aria-label') || '').replace(/\s+/g,' ').trim();
  }

  root.addEventListener('click',function(event){
    if(event.target.closest('input,textarea,select,.mobile-nav-toggle')) return;

    const faqQuestion = event.target.closest('.faq-question');
    if(faqQuestion){
      const question = readableText(faqQuestion);
      if(question){
        Promise.resolve(copyText(question)).then(function(){
          showFeedback('השאלה הועתקה',faqQuestion);
        }).catch(function(){
          showFeedback('השאלה נפתחה — ניתן להעתיק בלחיצה ארוכה',faqQuestion);
        });
      }
      return;
    }

    const image = event.target.closest('img');
    const svg = event.target.closest('svg');
    const textElement = event.target.closest('h1,h2,h3,h4,p,span,a,button,summary,label,strong,em');
    const actionable = image || svg || textElement;
    if(!actionable) return;

    event.preventDefault();
    event.stopPropagation();

    let operation;
    let message;

    if(image){
      operation = copyImage(image);
      message = 'התמונה הועתקה';
    }else if(svg){
      operation = copySvg(svg);
      message = 'האייקון הועתק';
    }else{
      const text = readableText(textElement);
      if(!text) return;
      operation = copyText(text);
      message = 'הטקסט הועתק';
    }

    Promise.resolve(operation).then(function(){
      showFeedback(message,actionable);
    }).catch(function(){
      showFeedback('לחיצה ארוכה או קליק ימני יאפשרו העתקה',actionable);
    });
  },true);
})();
