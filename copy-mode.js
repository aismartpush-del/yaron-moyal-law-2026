/* Normal website interactions: links, buttons and native FAQ accordion.
   Previous copy-on-click functionality was removed. */
(function(){
  'use strict';
  document.querySelectorAll('.faq-answer[href="#contact"]').forEach(function(answer){
    // FAQ answers are informational text, not redirects to the contact section.
    answer.removeAttribute('href');
  });
})();
