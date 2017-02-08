/*! Angular-PDF Version: 1.5.0 | Released under an MIT license */
(function () {

  'use strict';

  angular.module('pdf', []).directive('ngPdf', [ '$window', function ($window) {
    var renderTask = [];
    var pdfLoaderTask = null;
    var debug = false;

    var backingScale = function (canvas) {
      var ctx = canvas.getContext('2d');
      var dpr = window.devicePixelRatio || 1;
      var bsr = ctx.webkitBackingStorePixelRatio ||
        ctx.mozBackingStorePixelRatio ||
        ctx.msBackingStorePixelRatio ||
        ctx.oBackingStorePixelRatio ||
        ctx.backingStorePixelRatio || 1;

      return dpr / bsr;
    };

    var setCanvasDimensions = function (canvas, w, h) {
      var ratio = backingScale(canvas);
      canvas.width = Math.floor(w * ratio);
      canvas.height = Math.floor(h * ratio);
      canvas.style.width = Math.floor(w) + 'px';
      canvas.style.height = Math.floor(h) + 'px';
      canvas.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);
      return canvas;
    };
    return {
      restrict: 'E',
      templateUrl: function (element, attr) {
        return attr.templateUrl ? attr.templateUrl : 'partials/viewer.html';
      },
      link: function (scope, element, attrs) {
        element.css('display', 'block');
        var url = scope.pdfUrl;
        var httpHeaders = scope.httpHeaders;
        var pdfDoc = null;
        var pageToDisplay = isFinite(attrs.page) ? parseInt(attrs.page) : 1;
        var pageFit = attrs.scale === 'page-fit';
        var scale = attrs.scale > 0 ? attrs.scale : 1;
        var containerId = attrs.containerid || 'pdf-container';
        var container = document.getElementById(containerId);

        debug = attrs.hasOwnProperty('debug') ? attrs.debug : false;
        var creds = attrs.usecredentials;
        var windowEl = angular.element($window);

        windowEl.on('scroll', function () {
          scope.$apply(function () {
            scope.scroll = windowEl[0].scrollY;
          });
        });

        PDFJS.disableWorker = true;
        scope.pageNum = pageToDisplay;

        scope.renderDocument = function () {
          for (var i = 1; i <= pdfDoc.numPages; i = i + 1) {
            var canvas = document.createElement('canvas');
            container.appendChild(canvas);
            if (i < pdfDoc.numPages) {
              var separation = document.createElement('hr');
              container.appendChild(separation);
            }
            scope.renderPage(i,canvas);
          }
        };

        scope.renderPage = function (num, canvas) {
          if (renderTask[num]) {
            renderTask[num]._internalRenderTask.cancel();
          }

          pdfDoc.getPage(num).then(function (page) {
            var viewport;
            var pageWidthScale;
            var renderContext;

            if (pageFit) {
              viewport = page.getViewport(1);
              var clientRect = element[0].getBoundingClientRect();
              pageWidthScale = clientRect.width / viewport.width;
              scale = pageWidthScale;
            }
            viewport = page.getViewport(scale);
            var ctx = canvas.getContext('2d');
            setCanvasDimensions(canvas, viewport.width, viewport.height);

            renderContext = {
              canvasContext: ctx,
              viewport: viewport
            };

            renderTask[num] = page.render(renderContext);
            renderTask[num].promise.then(function () {
              if (typeof scope.onPageRender === 'function') {
                scope.onPageRender();
              }
            }).catch(function (reason) {
              console.log(reason);
            });
          });
        };

        scope.zoomIn = function () {
          pageFit = false;
          scale = parseFloat(scale) + 0.2;
          scope.renderDocument();
          return scale;
        };

        scope.zoomOut = function () {
          pageFit = false;
          scale = parseFloat(scale) - 0.2;
          scope.renderDocument();
          return scale;
        };

        scope.fit = function () {
          pageFit = true;
          scope.renderDocument();
        };

        function clearContainer() {
          if (container) {
            while (container.firstChild) {
              container.removeChild(container.firstChild);
            }
          }
        }

        function renderPDF() {
          clearContainer();

          var params = {
            'url': url,
            'withCredentials': creds
          };

          if (httpHeaders) {
            params.httpHeaders = httpHeaders;
          }

          if (url && url.length) {
            pdfLoaderTask = PDFJS.getDocument(params);
            pdfLoaderTask.onProgress = scope.onProgress;
            pdfLoaderTask.onPassword = scope.onPassword;
            pdfLoaderTask.then(
              function (_pdfDoc) {
                if (typeof scope.onLoad === 'function') {
                  scope.onLoad();
                }

                pdfDoc = _pdfDoc;
                scope.renderDocument();

                scope.$apply(function () {
                  scope.pageCount = _pdfDoc.numPages;
                });
              }, function (error) {
                if (error) {
                  if (typeof scope.onError === 'function') {
                    scope.onError(error);
                  }
                }
              }
            );
          }
        }

        scope.$watch('pdfUrl', function (newVal) {
          if (newVal !== '') {
            if (debug) {
              console.log('pdfUrl value change detected: ', scope.pdfUrl);
            }
            url = newVal;
            if (pdfLoaderTask) {
              pdfLoaderTask.destroy().then(function () {
                renderPDF();
              });
            } else {
              renderPDF();
            }
          }
        });

      }
    };
  } ]);
})();
