window.MathJax = {
   startup: {
      pageReady: () => {
         for (const script of document.querySelectorAll('script[type^="math/tex"]')) {
            const math = document.createElement('span');
            math.innerText = script.text;
            script.parentNode.replaceChild(math, script);
         }
         return MathJax.startup.defaultPageReady().then(() => {
            document.querySelectorAll('a mjx-container').forEach(container => {
               container.addEventListener('mousedown', (event) => {
                  const link = container.closest('a');
                  if (link && event.button === 0 && !event.ctrlKey && !event.metaKey) {
                     window.location.href = link.href;
                  }
               });
            });
         });
      }
   },
   tex: {
      inlineMath: [ ['$','$'] ],
      displayMath: [ ['$$','$$'] ],
      processEscapes: true,
      processEnvironments: false
   },
   options: {
      ignoreHtmlClass: 'text-block'
   }
};