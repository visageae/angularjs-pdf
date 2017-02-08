A simple fork from http://github.com/sayanee/angularjs-pdf
Display the whole pdf documents 1 page per canvas instead of just one page so we can embed it in an html page and scroll through all the pages.

Instead of `<canvas id=pdf-canvas>` use : `<div id='container-id'>` or pass a containerid attribute in the options
Removed the zoom, goto next and previous page ability as it doesn't really make sense when you display the full document