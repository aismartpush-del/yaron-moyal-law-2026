/* Normal website interactions: links, buttons and native FAQ accordion.
   Previous copy-on-click functionality was removed. */
(function(){
  'use strict';
  // Every practice-area card leads to the existing consultation form.
  // Keep all displayed wording and card design unchanged.
  document.querySelectorAll('a.practice-card').forEach(function(card){
    card.setAttribute('href', '#contact-form');
  });

  document.querySelectorAll('.faq-answer[href="#contact"]').forEach(function(answer){
    // FAQ answers are informational text, not redirects to the contact section.
    answer.removeAttribute('href');
  });
})();
