define(["require", "exports", './SvgCanvas', './SvgUtility', './SvgElement'], function (require, exports, SvgCanvas_1, SvgUtility_1, SvgElement_1) {
    var notifyAddedEvent;
    function registerElementCreateEvent(eventFn) {
        notifyAddedEvent = eventFn;
    }
    exports.registerElementCreateEvent = registerElementCreateEvent;
    ;
    var SvgElementModel = (function () {
        //构造函数
        function SvgElementModel(svgCanvaselement, links) {
            var _this = this;
            this.showText = false;
            this.svgCanvaselement = svgCanvaselement;
            this.svgCanvaselementRootNode = svgCanvaselement.parentNode;
            this.links = links;
            //添加事件
            this.svgCanvaselement.onmousedown = function (evt) { _this.StartDrag(evt); };
        }
        Object.defineProperty(SvgElementModel.prototype, "svgCanvasWidth", {
            get: function () {
                return new Number(this.svgCanvaselement.getAttribute("width"));
            },
            //设置 画布宽度
            set: function (newWidth) {
                this.svgCanvaselement.setAttribute("width", newWidth.toString());
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementModel.prototype, "svgCanvasHeight", {
            //获取 画布宽度
            get: function () {
                return new Number(this.svgCanvaselement.getAttribute("height"));
            },
            set: function (newheight) {
                this.svgCanvaselement.setAttribute("height", newheight.toString());
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementModel.prototype, "BusinessType", {
            get: function () {
                return this.businessType;
            },
            set: function (type) {
                this.businessType = type;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementModel.prototype, "Links", {
            get: function () {
                return this.links;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementModel.prototype, "DefaultText", {
            get: function () {
                return this.defaultText;
            },
            set: function (text) {
                this.defaultText = text;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(SvgElementModel.prototype, "ShowText", {
            get: function () {
                return this.showText;
            },
            set: function (isShow) {
                this.showText = isShow;
            },
            enumerable: true,
            configurable: true
        });
        SvgElementModel.prototype.StartDrag = function (evt) {
            if (this.svgElementModelAdorner == null)
                this.svgElementModelAdorner = new SvgElementModelAdorner(this, evt);
        };
        SvgElementModel.prototype.getSvgContentElement = function () {
            return this.getSvgElementByClassName("Content");
        };
        SvgElementModel.prototype.getSvgElementByClassName = function (className) {
            if (this.svgCanvaselement.childNodes.length == 0)
                return null;
            for (var index = 0; index < this.svgCanvaselement.childNodes.length; index++) {
                var node = this.svgCanvaselement.childNodes[index];
                if (node != null && node.nodeType == 1) {
                    if (node.getAttribute("class").toString() == className) {
                        return node;
                    }
                }
            }
            return null;
        };
        SvgElementModel.canvasScale = 1;
        return SvgElementModel;
    })();
    exports.SvgElementModel = SvgElementModel;
    //容器类
    var SvgElementModelAdorner = (function () {
        function SvgElementModelAdorner(svgElementModel, evt) {
            this.svgElementModel = svgElementModel;
            this.CreateSvgElementModelAdorner(evt);
        }
        //创建容器
        SvgElementModelAdorner.prototype.CreateSvgElementModelAdorner = function (evt) {
            var _this = this;
            var body = document.body;
            var div = document.createElement("div");
            var svgElement = document.createElementNS(SvgUtility_1.default.svgNamespace, 'svg');
            this.width = this.svgElementModel.svgCanvasWidth;
            this.height = this.svgElementModel.svgCanvasHeight;
            var svgContent = this.svgElementModel.getSvgContentElement();
            div.style.cursor = "move";
            this.div = div;
            this.div.setAttribute("class", "modelAdorner");
            this.div.style.width = this.width + "px";
            this.div.style.height = this.height + "px";
            this.div.style.left = evt.clientX - evt.offsetX + "px";
            this.div.style.top = evt.clientY - evt.offsetY + "px";
            svgElement.setAttribute("width", this.width.toString());
            svgElement.setAttribute("height", this.height.toString());
            svgElement.appendChild(svgContent.cloneNode(true));
            this.div.appendChild(svgElement);
            body.appendChild(this.div);
            body.onmousemove = function (evt) { _this.DoDrag(evt); };
            this.div.onmouseup = function (evt) { _this.EndDrag(evt); };
        };
        SvgElementModelAdorner.prototype.DoDrag = function (evt) {
            this.div.style.left = evt.clientX - this.width / 2 + "px";
            this.div.style.top = evt.clientY - this.height / 2 + "px";
        };
        SvgElementModelAdorner.prototype.EndDrag = function (evt) {
            this.DestroySvgElementModelAdorner(evt);
        };
        SvgElementModelAdorner.prototype.DestroySvgElementModelAdorner = function (evt) {
            //处理当前画布 内容
            if (this.div != null) {
                var body = document.body;
                body.removeChild(this.div);
                this.svgElementModel.svgElementModelAdorner = null;
                if (SvgCanvas_1.SvgCanvas.CurrentCanvas != null) {
                    var canvasRect = SvgCanvas_1.SvgCanvas.CurrentCanvas.getBoundingClientRect();
                    if (evt.clientX > canvasRect.left && evt.clientX < canvasRect.right && evt.clientY > canvasRect.top && evt.clientY < canvasRect.bottom) {
                        var viewPointElement = this.svgElementModel.getSvgContentElement();
                        if (viewPointElement != null) {
                            var shapeItem = new SvgElement_1.SvgElementShapeItem(viewPointElement.cloneNode(true), SvgCanvas_1.SvgCanvas.CurrentCanvas);
                            var x = (evt.clientX - canvasRect.left - this.width * SvgElementModel.canvasScale / 2) / SvgElementModel.canvasScale;
                            var y = (evt.clientY - canvasRect.top - this.height * SvgElementModel.canvasScale / 2) / SvgElementModel.canvasScale;
                            shapeItem.SetTanslate(x, y);
                            shapeItem.Links = this.svgElementModel.Links;
                            shapeItem.BusinessType = this.svgElementModel.BusinessType;
                            shapeItem.SetText(this.svgElementModel.DefaultText, !this.svgElementModel.ShowText);
                            SvgCanvas_1.SvgCanvas.CurrentCanvas.PaperFitToContent(shapeItem);
                            notifyAddedEvent(SvgCanvas_1.SvgCanvas.CurrentCanvas, shapeItem);
                        }
                    }
                }
            }
        };
        return SvgElementModelAdorner;
    })();
    exports.SvgElementModelAdorner = SvgElementModelAdorner;
});
